import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const campaigns = await prisma.campaign.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { sends: true } },
    },
    orderBy: { name: "asc" },
  });

  const campaignsWithMetrics = await Promise.all(
    campaigns.map(async (campaign) => {
      const agg = await prisma.send.aggregate({
        where: { campaignId: campaign.id },
        _sum: {
          volume: true,
          opens: true,
          clicks: true,
          leads: true,
        },
      });

      const fin = await prisma.send.aggregate({
        where: { campaignId: campaign.id },
        _sum: { revenue: true, profit: true },
      });

      return {
        ...campaign,
        metrics: {
          totalSends: campaign._count.sends,
          totalVolume: agg._sum.volume || 0,
          totalLeads: agg._sum.leads || 0,
          totalRevenue: fin._sum.revenue
            ? parseFloat(fin._sum.revenue.toString())
            : 0,
          totalProfit: fin._sum.profit
            ? parseFloat(fin._sum.profit.toString())
            : 0,
        },
      };
    })
  );

  return NextResponse.json(campaignsWithMetrics);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      clientId: body.clientId,
      vertical: body.vertical || null,
      geo: body.geo || null,
      notes: body.notes || null,
    },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json(campaign, { status: 201 });
}
