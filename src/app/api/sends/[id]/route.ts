import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const send = await prisma.send.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      campaign: true,
      owner: { select: { id: true, name: true, email: true } },
      changeLog: { orderBy: { changedAt: "desc" }, take: 50 },
    },
  });

  if (!send) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(send);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role: string }).role;
  if (userRole === Role.VIEWER) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();

  // Fields that can be manually edited
  const editableFields = [
    "clientId", "campaignId", "vertical", "geo", "esp", "isp",
    "leads", "revenue", "cost", "profit", "status", "ownerId",
    "notes", "tags",
  ];

  const existing = await prisma.send.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build changelog entries
  const changeLogs: {
    sendId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedBy: string | null;
  }[] = [];

  const updates: Record<string, unknown> = {};

  for (const field of editableFields) {
    if (field in body) {
      const oldValue = (existing as Record<string, unknown>)[field];
      const newValue = body[field];

      if (String(oldValue) !== String(newValue)) {
        changeLogs.push({
          sendId: params.id,
          field,
          oldValue: oldValue != null ? String(oldValue) : null,
          newValue: newValue != null ? String(newValue) : null,
          changedBy: session.user?.email || null,
        });
      }

      updates[field] = newValue;
    }
  }

  // Recalculate metrics if financial fields changed
  const revenue = parseFloat(String(updates.revenue ?? existing.revenue));
  const delivered = existing.delivered;
  const opens = existing.opens;
  const clicks = existing.clicks;
  const cost = parseFloat(String(updates.cost ?? existing.cost));

  if ("revenue" in updates || "cost" in updates) {
    updates.profit = revenue - cost;
    updates.erpm =
      delivered > 0
        ? parseFloat(((revenue / delivered) * 1000).toFixed(2))
        : 0;
  }

  const [updated] = await prisma.$transaction([
    prisma.send.update({
      where: { id: params.id },
      data: updates,
      include: {
        client: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    }),
    ...(changeLogs.length > 0
      ? [prisma.changeLog.createMany({ data: changeLogs })]
      : []),
  ]);

  return NextResponse.json(updated);
}
