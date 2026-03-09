"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export function SyncPanel() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    itemsNew: number;
    itemsUpdated: number;
    itemsSynced: number;
    durationMs: number;
    error?: string;
  } | null>(null);

  async function handleSync(fullSync: boolean) {
    setSyncing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync }),
      });
      const result = await res.json();
      setLastResult(result);

      if (result.success) {
        toast.success("Sync completed");
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Manual Sync</h3>
        <p className="text-xs text-slate-500 mt-1">
          Pull latest sends from Inboxroad into your database
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Incremental Sync"}
        </button>
        <button
          onClick={() => handleSync(true)}
          disabled={syncing}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-xs"
        >
          Full Sync (all time)
        </button>
      </div>

      <div className="bg-surface-2 rounded-lg p-3 text-xs space-y-1.5">
        <p className="text-slate-400 font-medium">How it works:</p>
        <p className="text-slate-500">• <strong className="text-slate-400">Incremental</strong> — only fetches sends since last sync</p>
        <p className="text-slate-500">• <strong className="text-slate-400">Full sync</strong> — re-imports everything from Inboxroad</p>
        <p className="text-slate-500">• Duplicates are handled via upsert (externalId)</p>
        <p className="text-slate-500">• Manual fields (revenue, client, etc.) are preserved</p>
      </div>

      {lastResult && (
        <div className={`rounded-lg p-3 text-xs border ${
          lastResult.success
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {lastResult.success ? (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Sync successful</p>
                <p className="text-emerald-500 mt-1">
                  {lastResult.itemsSynced} synced · {lastResult.itemsNew} new · {lastResult.itemsUpdated} updated
                </p>
                <p className="text-emerald-600 mt-0.5">{lastResult.durationMs}ms</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Sync failed</p>
                <p className="text-red-500 mt-1">{lastResult.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-surface-2 pt-4">
        <p className="text-xs text-slate-500 font-medium mb-2">Auto-sync</p>
        <p className="text-xs text-slate-600">
          For automatic sync, configure a cron job or use Vercel Cron to call{" "}
          <code className="bg-surface-3 px-1 rounded text-slate-400">POST /api/sync</code> periodically.
        </p>
      </div>
    </div>
  );
}
