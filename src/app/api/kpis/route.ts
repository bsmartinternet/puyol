import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const clientId = searchParams.get("clientId");
  const campaignId = searchParams.get("campaignId");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.sentAt = {};
    if (from) (where.sentAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.sentAt as Record<string, Date>).lte = new Date(to);
  }
  if (clientId) where.clientId = clientId;
  if (campaignId) where.campaignId = campaignId;

  const [totals, avgMetrics, recentSends] = await Promise.all([
    prisma.send.aggregate({
      where,
      _sum: {
        volume: true,
        delivered: true,
        opens: true,
        clicks: true,
        leads: true,
      },
      _count: { id: true },
    }),
    prisma.send.aggregate({
      where: { ...where, delivered: { gt: 0 } },
      _avg: {
        openRate: true,
        ctr: true,
        erpm: true,
      },
    }),
    // Last 30 days daily breakdown for chart
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('day', "sentAt") as day,
        SUM(volume)::int as volume,
        SUM(opens)::int as opens,
        SUM(clicks)::int as clicks,
        SUM(leads)::int as leads,
        SUM(revenue)::float as revenue,
        SUM(profit)::float as profit
      FROM "Send"
      WHERE "sentAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', "sentAt")
      ORDER BY day ASC
    `,
  ]);

  // Revenue/cost/profit need separate aggregation (Decimal type)
  const financials = await prisma.send.aggregate({
    where,
    _sum: {
      revenue: true,
      cost: true,
      profit: true,
    },
  });

  return NextResponse.json({
    totalSends: totals._count.id,
    totalVolume: totals._sum.volume || 0,
    totalDelivered: totals._sum.delivered || 0,
    totalOpens: totals._sum.opens || 0,
    totalClicks: totals._sum.clicks || 0,
    totalLeads: totals._sum.leads || 0,
    totalRevenue: financials._sum.revenue
      ? parseFloat(financials._sum.revenue.toString())
      : 0,
    totalCost: financials._sum.cost
      ? parseFloat(financials._sum.cost.toString())
      : 0,
    totalProfit: financials._sum.profit
      ? parseFloat(financials._sum.profit.toString())
      : 0,
    avgOpenRate: avgMetrics._avg.openRate || 0,
    avgCtr: avgMetrics._avg.ctr || 0,
    avgErpm: avgMetrics._avg.erpm || 0,
    dailyData: recentSends,
  });
}
