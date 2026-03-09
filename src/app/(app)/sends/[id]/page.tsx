import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SendEditForm } from "@/components/sends/SendEditForm";
import { formatDate, formatNumber, formatCurrency, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

async function getSend(id: string) {
  return prisma.send.findUnique({
    where: { id },
    include: {
      client: true,
      campaign: true,
      owner: { select: { id: true, name: true, email: true } },
      changeLog: { orderBy: { changedAt: "desc" }, take: 20 },
    },
  });
}

async function getOptions() {
  const [clients, campaigns, users] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { clients, campaigns, users };
}

export default async function SendDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [send, options] = await Promise.all([getSend(params.id), getOptions()]);

  if (!send) notFound();

  const metrics = [
    { label: "Volume", value: formatNumber(send.volume) },
    { label: "Delivered", value: formatNumber(send.delivered) },
    { label: "Opens", value: formatNumber(send.opens) },
    { label: "Clicks", value: formatNumber(send.clicks) },
    { label: "Bounces", value: formatNumber(send.bounces) },
    { label: "Unsubscribes", value: formatNumber(send.unsubscribes) },
    { label: "Open Rate", value: formatPercent(send.openRate) },
    { label: "CTR", value: formatPercent(send.ctr) },
    { label: "eRPM", value: send.erpm ? `$${send.erpm.toFixed(2)}` : "—" },
    { label: "Leads", value: formatNumber(send.leads) },
    { label: "Revenue", value: formatCurrency(parseFloat(send.revenue.toString())) },
    { label: "Cost", value: formatCurrency(parseFloat(send.cost.toString())) },
    { label: "Profit", value: formatCurrency(parseFloat(send.profit.toString())) },
  ];

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/sends"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Sends
        </Link>
        <PageHeader
          title={send.subject || send.externalId}
          description={`${send.externalId} · ${send.source} · ${formatDate(send.sentAt)}`}
          actions={<StatusBadge status={send.status} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metrics grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {metrics.map(({ label, value }) => (
                <div key={label} className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Source info */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Source Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "External ID", value: send.externalId },
                { label: "Source", value: send.source },
                { label: "From Domain", value: send.fromDomain },
                { label: "ESP", value: send.esp },
                { label: "ISP", value: send.isp },
                { label: "Sent At", value: formatDate(send.sentAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-white mt-0.5">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Changelog */}
          {send.changeLog.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Change History</h3>
              <div className="space-y-2">
                {send.changeLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <span className="text-slate-500 whitespace-nowrap">
                      {formatDate(log.changedAt)}
                    </span>
                    <span className="text-slate-300">
                      <span className="text-slate-500">{log.changedBy} · </span>
                      <span className="font-medium text-white">{log.field}</span>
                      {" "}changed from{" "}
                      <span className="text-red-400">{log.oldValue || "empty"}</span>
                      {" "}to{" "}
                      <span className="text-emerald-400">{log.newValue || "empty"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit panel */}
        <div>
          <SendEditForm send={send} options={options} />
        </div>
      </div>
    </div>
  );
}
