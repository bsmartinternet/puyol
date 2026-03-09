"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/utils";
import toast from "react-hot-toast";

interface Client {
  id: string;
  name: string;
  notes: string | null;
  totalSends: number;
  totalCampaigns: number;
  totalVolume: number;
  totalLeads: number;
  avgOpenRate: number;
  totalRevenue: number;
  totalProfit: number;
}

export function ClientsView({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), notes }),
      });
      if (res.ok) {
        const client = await res.json();
        setClients((prev) => [
          ...prev,
          { ...client, totalSends: 0, totalCampaigns: 0, totalVolume: 0, totalLeads: 0, avgOpenRate: 0, totalRevenue: 0, totalProfit: 0 },
        ]);
        setName("");
        setNotes("");
        setShowAdd(false);
        toast.success("Client created");
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch {
      toast.error("Failed to create client");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-white mb-4">New Client</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Client name" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdd} disabled={adding || !name.trim()} className="btn-primary flex-1">
                  {adding ? "Adding..." : "Add Client"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="card p-4 hover:border-surface-4 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-600/20 rounded-lg border border-brand-600/30 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-500">{client.totalSends} sends · {client.totalCampaigns} campaigns</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Revenue</p>
                <p className="text-white font-medium mt-0.5">{formatCurrency(client.totalRevenue)}</p>
              </div>
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Profit</p>
                <p className={`font-medium mt-0.5 ${client.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(client.totalProfit)}
                </p>
              </div>
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Volume</p>
                <p className="text-white font-medium mt-0.5">{formatNumber(client.totalVolume)}</p>
              </div>
              <div className="bg-surface-2 rounded p-2">
                <p className="text-slate-500">Avg OR</p>
                <p className="text-white font-medium mt-0.5">{formatPercent(client.avgOpenRate)}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-surface-2 flex justify-between items-center">
              <span className="text-xs text-slate-500">{formatNumber(client.totalLeads)} leads</span>
              <Link
                href={`/sends?clientId=${client.id}`}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                View sends →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
