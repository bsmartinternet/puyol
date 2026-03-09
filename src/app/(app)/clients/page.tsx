import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClientsView } from "@/components/clients/ClientsView";

async function getClients() {
  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { sends: true, campaigns: true } },
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    clients.map(async (client) => {
      const [agg, fin] = await Promise.all([
        prisma.send.aggregate({
          where: { clientId: client.id },
          _sum: { volume: true, opens: true, leads: true },
          _avg: { openRate: true },
        }),
        prisma.send.aggregate({
          where: { clientId: client.id },
          _sum: { revenue: true, profit: true },
        }),
      ]);

      return {
        ...client,
        totalSends: client._count.sends,
        totalCampaigns: client._count.campaigns,
        totalVolume: agg._sum.volume || 0,
        totalLeads: agg._sum.leads || 0,
        avgOpenRate: agg._avg.openRate || 0,
        totalRevenue: fin._sum.revenue ? parseFloat(fin._sum.revenue.toString()) : 0,
        totalProfit: fin._sum.profit ? parseFloat(fin._sum.profit.toString()) : 0,
      };
    })
  );
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage clients and view aggregated performance by client"
      />
      <ClientsView initialClients={clients} />
    </div>
  );
}
