import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: number;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "default";
  className?: string;
}

const colorMap = {
  blue: "text-brand-400 bg-brand-500/10 border-brand-500/20",
  green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  purple: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  red: "text-red-400 bg-red-500/10 border-red-500/20",
  default: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  color = "default",
  className,
}: StatCardProps) {
  return (
    <div className={cn("card p-4", className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
              colorMap[color]
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      {trend !== undefined && (
        <p
          className={cn(
            "text-xs mt-2 font-medium",
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          )}
        >
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}% vs last period
        </p>
      )}
    </div>
  );
}
