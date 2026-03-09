import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { RecentSends } from "@/components/dashboard/RecentSends";
import { SyncButton } from "@/components/dashboard/SyncButton";
import {
  Send,
  TrendingUp,
  Users,
  DollarSign,
  MousePointer,
  Eye,
  Activity,
  BarChart2,
} from "lucide-react";
import {
  formatNumber,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";

async function getKPIs() {
  const [totals, financials, avgMetrics] = await Promise.all([
    prisma.send.aggregate({
      _sum: { volume: true, delivered: true, opens: true, clicks: true, leads: true },
      _count: { id: true },
    }),
    prisma.send.aggregate({
      _sum: { revenue: true, cost: true, profit: true },
    }),
    prisma.send.aggregate({
      where: { delivered: { gt: 0 } },
      _avg: { openRate: true, ctr: true, erpm: true },
    }),
  ]);

  return {
    totalSends: totals._count.id,
    totalVolume: totals._sum.volume || 0,
    totalOpens: totals._sum.opens || 0,
    totalClicks: totals._sum.clicks || 0,
    totalLeads: totals._sum.leads || 0,
    totalRevenue: financials._sum.revenue
      ? parseFloat(financials._sum.revenue.toString())
      : 0,
    totalProfit: financials._sum.profit
      ? parseFloat(financials._sum.profit.toString())
      : 0,
    avgOpenRate: avgMetrics._avg.openRate || 0,
    avgCtr: avgMetrics._avg.ctr || 0,
    avgErpm: avgMetrics._avg.erpm || 0,
  };
}

async function getLastSyncTime() {
  const lastSync = await prisma.syncLog.findFirst({
    where: { status: "SUCCESS" },
    orderBy: { finishedAt: "desc" },
  });
  return lastSync?.finishedAt;
}

async function getDailyData() {
  // Last 30 days
  const sends = await prisma.send.findMany({
    where: {
      sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { sentAt: true, volume: true, opens: true, revenue: true, profit: true, leads: true },
    orderBy: { sentAt: "asc" },
  });

  // Group by day
  const byDay: Record<string, { day: string; volume: number; opens: number; revenue: number; profit: number; leads: number }> = {};
  for (const s of sends) {
    if (!s.sentAt) continue;
    const day = s.sentAt.toISOString().split("T")[0];
    if (!byDay[day]) byDay[day] = { day, volume: 0, opens: 0, revenue: 0, profit: 0, leads: 0 };
    byDay[day].volume += s.volume;
    byDay[day].opens += s.opens;
    byDay[day].revenue += parseFloat(s.revenue.toString());
    byDay[day].profit += parseFloat(s.profit.toString());
    byDay[day].leads += s.leads;
  }

  return Object.values(byDay);
}

async function getTopClients() {
  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { sends: true } },
    },
  });

  const withMetrics = await Promise.all(
    clients.map(async (c) => {
      const fin = await prisma.send.aggregate({
        where: { clientId: c.id },
        _sum: { revenue: true, profit: true, leads: true },
      });
      return {
        id: c.id,
        name: c.name,
        sends: c._count.sends,
        revenue: fin._sum.revenue ? parseFloat(fin._sum.revenue.toString()) : 0,
        profit: fin._sum.profit ? parseFloat(fin._sum.profit.toString()) : 0,
        leads: fin._sum.leads || 0,
      };
    })
  );

  return withMetrics.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const [kpis, lastSync, dailyData, topClients] = await Promise.all([
    getKPIs(),
    getLastSyncTime(),
    getDailyData(),
    getTopClients(),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${session?.user?.name || "there"}`}
        actions={<SyncButton lastSync={lastSync} />}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Sends"
          value={formatNumber(kpis.totalSends)}
          icon={Send}
          color="blue"
        />
        <StatCard
          label="Total Volume"
          value={formatNumber(kpis.totalVolume)}
          icon={Activity}
          color="default"
        />
        <StatCard
          label="Total Opens"
          value={formatNumber(kpis.totalOpens)}
          sub={`Avg OR: ${formatPercent(kpis.avgOpenRate)}`}
          icon={Eye}
          color="purple"
        />
        <StatCard
          label="Total Clicks"
          value={formatNumber(kpis.totalClicks)}
          sub={`Avg CTR: ${formatPercent(kpis.avgCtr)}`}
          icon={MousePointer}
          color="orange"
        />
        <StatCard
          label="Total Leads"
          value={formatNumber(kpis.totalLeads)}
          icon={Users}
          color="green"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          label="Total Profit"
          value={formatCurrency(kpis.totalProfit)}
          icon={TrendingUp}
          color={kpis.totalProfit >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Avg eRPM"
          value={`$${kpis.avgErpm.toFixed(2)}`}
          sub="per 1,000 delivered"
          icon={BarChart2}
          color="blue"
        />
      </div>

      {/* Charts */}
      <DashboardCharts dailyData={dailyData} />

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RecentSends />

        {/* Top Clients */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Top Clients by Revenue</h3>
          <div className="space-y-3">
            {topClients.map((client, i) => (
              <div key={client.id} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{client.name}</p>
                  <p className="text-xs text-slate-500">
                    {client.sends} sends · {formatNumber(client.leads)} leads
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {formatCurrency(client.revenue)}
                  </p>
                  <p className={`text-xs ${client.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(client.profit)} profit
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
