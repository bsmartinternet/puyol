"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatNumber, formatCurrency, formatPercent, cn } from "@/lib/utils";

interface FilterOptions {
  clients: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
  geos: string[];
  esps: string[];
}

interface Send {
  id: string;
  externalId: string;
  sentAt: string | null;
  subject: string | null;
  fromDomain: string | null;
  esp: string | null;
  geo: string | null;
  vertical: string | null;
  volume: number;
  delivered: number;
  opens: number;
  clicks: number;
  leads: number;
  revenue: string;
  profit: string;
  openRate: number | null;
  ctr: number | null;
  erpm: number | null;
  status: string;
  tags: string[];
  client: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
}

const COLUMNS = [
  { key: "sentAt", label: "Date", sortable: true },
  { key: "subject", label: "Subject", sortable: false },
  { key: "client", label: "Client", sortable: false },
  { key: "esp", label: "ESP", sortable: true },
  { key: "geo", label: "Geo", sortable: true },
  { key: "volume", label: "Volume", sortable: true },
  { key: "opens", label: "Opens", sortable: true },
  { key: "openRate", label: "OR%", sortable: true },
  { key: "ctr", label: "CTR%", sortable: true },
  { key: "leads", label: "Leads", sortable: true },
  { key: "revenue", label: "Revenue", sortable: true },
  { key: "profit", label: "Profit", sortable: true },
  { key: "status", label: "Status", sortable: true },
];

export function SendsTable({ filterOptions }: { filterOptions: FilterOptions }) {
  const [sends, setSends] = useState<Send[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [status, setStatus] = useState("");
  const [geo, setGeo] = useState("");
  const [esp, setEsp] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination & sort
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("sentAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const fetchSends = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "50",
      sort,
      dir,
    });
    if (search) params.set("q", search);
    if (clientId) params.set("clientId", clientId);
    if (campaignId) params.set("campaignId", campaignId);
    if (status) params.set("status", status);
    if (geo) params.set("geo", geo);
    if (esp) params.set("esp", esp);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/sends?${params}`);
      const data = await res.json();
      setSends(data.sends || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      console.error("Failed to fetch sends");
    } finally {
      setLoading(false);
    }
  }, [page, sort, dir, search, clientId, campaignId, status, geo, esp, from, to]);

  useEffect(() => {
    const timer = setTimeout(fetchSends, 200);
    return () => clearTimeout(timer);
  }, [fetchSends]);

  function handleSort(key: string) {
    if (sort === key) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(key);
      setDir("desc");
    }
    setPage(1);
  }

  function handleExport() {
    const params = new URLSearchParams({ export: "csv", sort, dir });
    if (search) params.set("q", search);
    if (clientId) params.set("clientId", clientId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/sends?${params}`, "_blank");
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null;
    return dir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-surface-2 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search subject, domain, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn("btn-secondary flex items-center gap-1.5", showFilters && "border-brand-500 text-brand-300")}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>

          <button onClick={handleExport} className="btn-ghost flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <span className="text-xs text-slate-500 ml-auto">
            {total.toLocaleString()} sends
          </span>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
            <select
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setPage(1); }}
              className="input text-xs"
            >
              <option value="">All Clients</option>
              {filterOptions.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={campaignId}
              onChange={(e) => { setCampaignId(e.target.value); setPage(1); }}
              className="input text-xs"
            >
              <option value="">All Campaigns</option>
              {filterOptions.campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="input text-xs"
            >
              <option value="">All Statuses</option>
              {["PENDING", "ACTIVE", "PAUSED", "COMPLETED", "ERROR"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={geo}
              onChange={(e) => { setGeo(e.target.value); setPage(1); }}
              className="input text-xs"
            >
              <option value="">All Geos</option>
              {filterOptions.geos.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={esp}
              onChange={(e) => { setEsp(e.target.value); setPage(1); }}
              className="input text-xs"
            >
              <option value="">All ESPs</option>
              {filterOptions.esps.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            <div className="flex gap-1">
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="input text-xs flex-1"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="input text-xs flex-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-2">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    "px-3 py-2.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:text-white select-none"
                  )}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
              <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-2">
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-slate-500 text-sm">
                  Loading...
                </td>
              </tr>
            ) : sends.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-slate-500 text-sm">
                  No sends found
                </td>
              </tr>
            ) : (
              sends.map((send) => (
                <tr key={send.id} className="table-row-hover">
                  <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(send.sentAt)}
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <p className="text-white text-xs truncate" title={send.subject || ""}>
                      {send.subject || send.externalId}
                    </p>
                    <p className="text-slate-500 text-xs truncate">{send.fromDomain}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-300 whitespace-nowrap">
                    {send.client?.name || <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{send.esp || "—"}</td>
                  <td className="px-3 py-2.5">
                    {send.geo && (
                      <span className="badge bg-slate-500/10 text-slate-300 border border-slate-500/20 text-xs">
                        {send.geo}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white tabular-nums">
                    {formatNumber(send.volume)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white tabular-nums">
                    {formatNumber(send.opens)}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    <span className={send.openRate && send.openRate > 0.15 ? "text-emerald-400" : "text-slate-300"}>
                      {formatPercent(send.openRate)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-slate-300">
                    {formatPercent(send.ctr)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white tabular-nums">
                    {formatNumber(send.leads)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white tabular-nums">
                    {formatCurrency(parseFloat(send.revenue))}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    <span className={parseFloat(send.profit) >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {formatCurrency(parseFloat(send.profit))}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={send.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/sends/${send.id}`}
                      className="text-brand-400 hover:text-brand-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-surface-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Page {page} of {totalPages} · {total.toLocaleString()} total
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="btn-ghost p-1.5 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-7 h-7 text-xs rounded",
                  p === page
                    ? "bg-brand-600 text-white"
                    : "btn-ghost"
                )}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="btn-ghost p-1.5 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
