import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { SendsTable } from "@/components/sends/SendsTable";

async function getFilterOptions() {
  const [clients, campaigns, geos, esps] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.send.findMany({
      select: { geo: true },
      distinct: ["geo"],
      where: { geo: { not: null } },
    }),
    prisma.send.findMany({
      select: { esp: true },
      distinct: ["esp"],
      where: { esp: { not: null } },
    }),
  ]);

  return {
    clients,
    campaigns,
    geos: geos.map((g) => g.geo).filter(Boolean) as string[],
    esps: esps.map((e) => e.esp).filter(Boolean) as string[],
  };
}

export default async function SendsPage() {
  const filterOptions = await getFilterOptions();

  return (
    <div>
      <PageHeader
        title="Sends"
        description="All email sends imported from Inboxroad and other sources"
      />
      <SendsTable filterOptions={filterOptions} />
    </div>
  );
}
