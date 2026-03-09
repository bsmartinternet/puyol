"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/utils";
import toast from "react-hot-toast";

interface Campaign {
  id: string;
  name: string;
  vertical: string | null;
  geo: string | null;
  notes: string | null;
  client: { id: string; name: string };
  totalSends: number;
  totalVolume: number;
  totalLeads: number;
  avgOpenRate: number;
  totalRevenue: number;
  totalProfit: number;
}

interface CampaignsViewProps {
  initialCampaigns: Campaign[];
  clients: { id: string; name: string }[];
}

export function CampaignsView({ initialCampaigns, clients }: CampaignsViewProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", clientId: "", vertical: "", geo: "", notes: "" });
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!form.name.trim() || !form.clientId) return;
    setAdding(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const campaign = await res.json();
        const client = clients.find((c) => c.id === form.clientId)!;
        setCampaigns((prev) => [
          ...prev,
          { ...campaign, client, totalSends: 0, totalVolume: 0, totalLeads: 0, avgOpenRate: 0, totalRevenue: 0, totalProfit: 0 },
        ]);
        setForm({ name: "", clientId: "", vertical: "", geo: "", notes: "" });
        setShowAdd(false);
        toast.success("Campaign created");
      }
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setAdding(false);
    }
  }

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }));

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Campaign
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-white mb-4">New Campaign</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input value={form.name} onChange={set("name")} className="input" placeholder="Campaign name" />
              </div>
              <div>
                <label className="label">Client *</label>
                <select value={form.clientId} onChange={set("clientId")} className="input">
                  <option value="">Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Vertical</label>
                  <input value={form.vertical} onChange={set("vertical")} className="input" placeholder="health" />
                </div>
                <div>
                  <label className="label">Geo</label>
                  <input value={form.geo} onChange={set("geo")} className="input" placeholder="US" />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={set("notes")} className="input resize-none" rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdd} disabled={adding || !form.name || !form.clientId} className="btn-primary flex-1">
                  {adding ? "Adding..." : "Add Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <div key={c.id} className="card p-4 hover:border-surface-4 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-600/20 rounded-lg border border-violet-600/30 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.client.name}</p>
                </div>
              </div>
              {c.geo && (
                <span className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs">
                  {c.geo}
                </span>
              )}
            </div>

            {c.vertical && (
              <span className="badge bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs mb-3">
                {c.vertical}
              </span>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Revenue</p>
                <p className="text-white font-medium mt-0.5">{formatCurrency(c.totalRevenue)}</p>
              </div>
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Profit</p>
                <p className={`font-medium mt-0.5 ${c.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(c.totalProfit)}
                </p>
              </div>
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Sends</p>
                <p className="text-white font-medium mt-0.5">{c.totalSends}</p>
              </div>
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Avg OR</p>
                <p className="text-white font-medium mt-0.5">{formatPercent(c.avgOpenRate)}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-surface-2 flex justify-between">
              <span className="text-xs text-slate-500">{formatNumber(c.totalLeads)} leads</span>
              <Link href={`/sends?campaignId=${c.id}`} className="text-xs text-brand-400 hover:text-brand-300">
                View sends →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
