"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface SendEditFormProps {
  send: {
    id: string;
    clientId: string | null;
    campaignId: string | null;
    vertical: string | null;
    geo: string | null;
    leads: number;
    revenue: { toString(): string };
    cost: { toString(): string };
    profit: { toString(): string };
    status: string;
    ownerId: string | null;
    notes: string | null;
    tags: string[];
  };
  options: {
    clients: { id: string; name: string }[];
    campaigns: { id: string; name: string; clientId: string }[];
    users: { id: string; name: string | null }[];
  };
}

export function SendEditForm({ send, options }: SendEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientId: send.clientId || "",
    campaignId: send.campaignId || "",
    vertical: send.vertical || "",
    geo: send.geo || "",
    leads: send.leads,
    revenue: send.revenue.toString(),
    cost: send.cost.toString(),
    status: send.status,
    ownerId: send.ownerId || "",
    notes: send.notes || "",
    tags: send.tags.join(", "),
  });

  const filteredCampaigns = options.campaigns.filter(
    (c) => !form.clientId || c.clientId === form.clientId
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sends/${send.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientId: form.clientId || null,
          campaignId: form.campaignId || null,
          ownerId: form.ownerId || null,
          leads: Number(form.leads),
          revenue: parseFloat(form.revenue) || 0,
          cost: parseFloat(form.cost) || 0,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        toast.success("Send updated");
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Update failed");
      }
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  }

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="card p-4 space-y-4 sticky top-6">
      <h3 className="text-sm font-semibold text-white">Edit Send</h3>

      <div>
        <label className="label">Client</label>
        <select value={form.clientId} onChange={set("clientId")} className="input">
          <option value="">No client</option>
          {options.clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Campaign</label>
        <select value={form.campaignId} onChange={set("campaignId")} className="input">
          <option value="">No campaign</option>
          {filteredCampaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
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
        <label className="label">Status</label>
        <select value={form.status} onChange={set("status")} className="input">
          {["PENDING", "ACTIVE", "PAUSED", "COMPLETED", "ERROR"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Owner / Media Buyer</label>
        <select value={form.ownerId} onChange={set("ownerId")} className="input">
          <option value="">Unassigned</option>
          {options.users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div className="border-t border-surface-2 pt-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Business Data</p>
        <div className="space-y-3">
          <div>
            <label className="label">Leads</label>
            <input
              type="number"
              value={form.leads}
              onChange={set("leads")}
              className="input"
              min="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Revenue ($)</label>
              <input
                type="number"
                value={form.revenue}
                onChange={set("revenue")}
                className="input"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="label">Cost ($)</label>
              <input
                type="number"
                value={form.cost}
                onChange={set("cost")}
                className="input"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <div className="bg-surface-2 rounded-lg p-2.5">
            <p className="text-xs text-slate-500">Calculated profit</p>
            <p className={`text-sm font-semibold ${parseFloat(form.revenue) - parseFloat(form.cost) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ${(parseFloat(form.revenue || "0") - parseFloat(form.cost || "0")).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="label">Tags (comma separated)</label>
        <input
          value={form.tags}
          onChange={set("tags")}
          className="input"
          placeholder="tag1, tag2, tag3"
        />
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          value={form.notes}
          onChange={set("notes")}
          className="input resize-none"
          rows={3}
          placeholder="Internal notes..."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="w-4 h-4" /> Save Changes</>
        )}
      </button>
    </div>
  );
}
