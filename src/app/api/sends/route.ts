import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50"), 200);
  const sortField = searchParams.get("sort") || "sentAt";
  const sortDir = (searchParams.get("dir") || "desc") as "asc" | "desc";
  const search = searchParams.get("q") || "";
  const clientId = searchParams.get("clientId");
  const campaignId = searchParams.get("campaignId");
  const status = searchParams.get("status");
  const geo = searchParams.get("geo");
  const esp = searchParams.get("esp");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const exportCsv = searchParams.get("export") === "csv";

  // Build where clause
  const where: Prisma.SendWhereInput = {};

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { fromDomain: { contains: search, mode: "insensitive" } },
      { externalId: { contains: search, mode: "insensitive" } },
    ];
  }

  if (clientId) where.clientId = clientId;
  if (campaignId) where.campaignId = campaignId;
  if (status) where.status = status as Prisma.EnumSendStatusFilter;
  if (geo) where.geo = { contains: geo, mode: "insensitive" };
  if (esp) where.esp = { contains: esp, mode: "insensitive" };

  if (from || to) {
    where.sentAt = {};
    if (from) (where.sentAt as Prisma.DateTimeFilter).gte = new Date(from);
    if (to) (where.sentAt as Prisma.DateTimeFilter).lte = new Date(to);
  }

  // Valid sort fields
  const validSortFields = [
    "sentAt", "subject", "volume", "delivered", "opens",
    "clicks", "leads", "revenue", "profit", "openRate", "ctr", "erpm",
  ];
  const orderBy = validSortFields.includes(sortField)
    ? { [sortField]: sortDir }
    : { sentAt: "desc" as const };

  if (exportCsv) {
    const sends = await prisma.send.findMany({
      where,
      orderBy,
      include: { client: true, campaign: true, owner: { select: { name: true } } },
    });

    const headers = [
      "ID", "External ID", "Date", "Subject", "From Domain", "ESP",
      "Client", "Campaign", "Vertical", "Geo",
      "Volume", "Delivered", "Opens", "Clicks", "Leads",
      "Revenue", "Cost", "Profit", "Open Rate", "CTR", "eRPM",
      "Status", "Owner", "Tags",
    ];

    const rows = sends.map((s) => [
      s.id, s.externalId,
      s.sentAt?.toISOString() || "",
      s.subject || "",
      s.fromDomain || "",
      s.esp || "",
      s.client?.name || "",
      s.campaign?.name || "",
      s.vertical || "",
      s.geo || "",
      s.volume, s.delivered, s.opens, s.clicks, s.leads,
      s.revenue.toString(), s.cost.toString(), s.profit.toString(),
      s.openRate?.toFixed(4) || "",
      s.ctr?.toFixed(4) || "",
      s.erpm?.toFixed(2) || "",
      s.status,
      s.owner?.name || "",
      s.tags.join("|"),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sends-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  const [sends, total] = await Promise.all([
    prisma.send.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.send.count({ where }),
  ]);

  return NextResponse.json({
    sends,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
