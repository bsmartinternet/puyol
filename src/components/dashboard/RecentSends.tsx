import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatNumber, formatCurrency } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export async function RecentSends() {
  const sends = await prisma.send.findMany({
    orderBy: { sentAt: "desc" },
    take: 8,
    include: {
      client: { select: { name: true } },
    },
  });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Recent Sends</h3>
        <Link
          href="/sends"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {sends.map((send) => (
          <Link
            key={send.id}
            href={`/sends/${send.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate group-hover:text-brand-300 transition-colors">
                {send.subject || send.externalId}
              </p>
              <p className="text-xs text-slate-500">
                {send.client?.name || "No client"} · {formatDate(send.sentAt)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-white">{formatNumber(send.volume)}</p>
              <StatusBadge status={send.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
