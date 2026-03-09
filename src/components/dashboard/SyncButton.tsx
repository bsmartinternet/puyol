"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface SyncButtonProps {
  lastSync?: Date | null;
}

export function SyncButton({ lastSync }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullSync: false }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `Synced ${result.itemsSynced} sends (${result.itemsNew} new, ${result.itemsUpdated} updated)`
        );
        // Refresh page data
        window.location.reload();
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    } catch {
      toast.error("Sync request failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {lastSync && (
        <span className="text-xs text-slate-500">
          Last sync: {formatDate(lastSync)}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn-secondary flex items-center gap-2"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync now"}
      </button>
    </div>
  );
}
