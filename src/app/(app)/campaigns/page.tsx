import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CampaignsView } from "@/components/campaigns/CampaignsView";

async function getCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { sends: true } },
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    campaigns.map(async (c) => {
      const [agg, fin] = await Promise.all([
        prisma.send.aggregate({
          where: { campaignId: c.id },
          _sum: { volume: true, leads: true, opens: true },
          _avg: { openRate: true },
        }),
        prisma.send.aggregate({
          where: { campaignId: c.id },
          _sum: { revenue: true, profit: true },
        }),
      ]);
      return {
        ...c,
        totalSends: c._count.sends,
        totalVolume: agg._sum.volume || 0,
        totalLeads: agg._sum.leads || 0,
        avgOpenRate: agg._avg.openRate || 0,
        totalRevenue: fin._sum.revenue ? parseFloat(fin._sum.revenue.toString()) : 0,
        totalProfit: fin._sum.profit ? parseFloat(fin._sum.profit.toString()) : 0,
      };
    })
  );
}

async function getClients() {
  return prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export default async function CampaignsPage() {
  const [campaigns, clients] = await Promise.all([getCampaigns(), getClients()]);

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Manage campaigns and track performance by campaign"
      />
      <CampaignsView initialCampaigns={campaigns} clients={clients} />
    </div>
  );
}
