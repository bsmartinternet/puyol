import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncInboxroad } from "@/lib/sync";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Manual sync trigger
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role: string }).role;
  if (userRole === Role.VIEWER) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const fullSync = body.fullSync === true;

  const result = await syncInboxroad({ fullSync });

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}

// Get sync logs
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return NextResponse.json(logs);
}
