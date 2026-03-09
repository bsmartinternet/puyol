import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { SyncPanel } from "@/components/sync/SyncPanel";
import { formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";

async function getSyncLogs() {
  return prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });
}

function SyncStatusIcon({ status }: { status: string }) {
  if (status === "SUCCESS") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === "ERROR") return <XCircle className="w-4 h-4 text-red-400" />;
  return <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />;
}

export default async function SyncPage() {
  const logs = await getSyncLogs();

  return (
    <div>
      <PageHeader
        title="Synchronization"
        description="Manage API sync with Inboxroad and view sync history"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <SyncPanel />
        </div>

        {/* Sync logs */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-2">
            <h3 className="text-sm font-semibold text-white">Sync History</h3>
          </div>
          <div className="divide-y divide-surface-2">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No syncs yet
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                  <SyncStatusIcon status={log.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white capitalize">{log.source}</span>
                      <span className={`badge text-xs ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : log.status === "ERROR"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    {log.error ? (
                      <p className="text-xs text-red-400 mt-0.5 truncate">{log.error}</p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {log.itemsNew} new · {log.itemsUpdated} updated · {log.itemsSynced} total
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">{formatDate(log.startedAt)}</p>
                    {log.finishedAt && (
                      <p className="text-xs text-slate-600">
                        {Math.round((log.finishedAt.getTime() - log.startedAt.getTime()) / 1000)}s
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
