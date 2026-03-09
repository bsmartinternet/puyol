import { cn } from "@/lib/utils";

type Status = "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ERROR" | string;

const statusConfig: Record<string, { label: string; classes: string }> = {
  PENDING: { label: "Pending", classes: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
  ACTIVE: { label: "Active", classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  PAUSED: { label: "Paused", classes: "bg-slate-500/10 text-slate-400 border border-slate-500/20" },
  COMPLETED: { label: "Completed", classes: "bg-brand-500/10 text-brand-400 border border-brand-500/20" },
  ERROR: { label: "Error", classes: "bg-red-500/10 text-red-400 border border-red-500/20" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] || {
    label: status,
    classes: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  };

  return (
    <span className={cn("badge text-xs", config.classes)}>
      {config.label}
    </span>
  );
}
