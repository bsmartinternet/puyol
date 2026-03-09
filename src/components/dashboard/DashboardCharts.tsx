"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { formatDateShort, formatCurrency, formatNumber } from "@/lib/utils";

interface DailyData {
  day: string;
  volume: number;
  opens: number;
  revenue: number;
  profit: number;
  leads: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-surface-2 border border-surface-3 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-medium">
            {p.name.includes("Revenue") || p.name.includes("Profit")
              ? formatCurrency(p.value)
              : formatNumber(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
};

export function DashboardCharts({ dailyData }: { dailyData: DailyData[] }) {
  const formattedData = dailyData.map((d) => ({
    ...d,
    dayLabel: formatDateShort(d.day),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Volume chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Daily Volume (30d)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="dayLabel"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="volume"
              name="Volume"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="url(#volumeGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue vs Profit chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Revenue & Profit (30d)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="dayLabel"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${formatNumber(v)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#64748b" }}
            />
            <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" opacity={0.8} radius={[2, 2, 0, 0]} />
            <Bar dataKey="profit" name="Profit" fill="#10b981" opacity={0.8} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
