import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useExpoCamarotes,
  STATUS_LABEL,
  STATUS_COLOR,
  type Camarote,
  type CamaroteStatus,
} from "@/hooks/useExpoCamarotes";
import { trackExpoEvent } from "@/lib/expoAnalytics";

type FilterStatus = "all" | CamaroteStatus;

export default function Expo2026CamarotesAdmin() {
  const { camarotes, loading } = useExpoCamarotes("admin");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Camarote | null>(null);

  const stats = useMemo(() => {
    const c = { available: 0, reserved: 0, sold: 0 };
    camarotes.forEach((x) => (c[x.status] = (c[x.status] ?? 0) + 1));
    const occupied = c.reserved + c.sold;
    const occupancy = camarotes.length
      ? Math.round((occupied / 120) * 100)
      : 0;
    return { ...c, occupancy, total: 120 };
  }, [camarotes]);

  const filtered = useMemo(() => {
    return camarotes.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search) {
        const q = search.trim();
        if (q && !String(c.number).includes(q)) return false;
      }
      return true;
    });
  }, [camarotes, filter, search]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-black">Camarotes — Expo Prudente 2026</h1>
        <p className="text-sm text-muted-foreground">
          Gestão dos 120 camarotes oficiais. Alterações sincronizam em tempo real.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Total" value={stats.total} />
        <Kpi label="Disponíveis" value={stats.available} accent="text-emerald-400" />
        <Kpi label="Reservados" value={stats.reserved} accent="text-amber-300" />
        <Kpi label="Vendidos" value={stats.sold} accent="text-rose-400" />
        <Kpi label="Ocupação" value={`${stats.occupancy}%`} accent="text-[#FFC300]" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "available", "reserved", "sold"] as FilterStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filter === s
                ? "bg-white text-black border-transparent"
                : "border-white/15 text-white/80 hover:bg-white/5"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABEL[s]}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            inputMode="numeric"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nº..."
            className="pl-9 pr-3 py-2 text-sm rounded-full bg-white/5 border border-white/10 outline-none focus:border-white/30 w-44"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin opacity-60" />
        </div>
      ) : (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
          {filtered.map((c) => (
            <button
              key={c.number}
              type="button"
              onClick={() => setEditing(c)}
              className={`aspect-square rounded-lg text-xs font-bold text-black/85 ${STATUS_COLOR[c.status]} hover:scale-105 transition-transform`}
              title={`${c.number} - ${STATUS_LABEL[c.status]}`}
            >
              {c.number}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-10">
              Nenhum camarote encontrado.
            </p>
          )}
        </div>
      )}

      {editing && (
        <EditModal
          camarote={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
        {label}
      </p>
      <p className={`text-2xl md:text-3xl font-black mt-1 ${accent ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function EditModal({
  camarote,
  onClose,
}: {
  camarote: Camarote;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<CamaroteStatus>(camarote.status);
  const [customerName, setCustomerName] = useState(camarote.customer_name ?? "");
  const [notes, setNotes] = useState(camarote.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("expo2026_camarotes" as any)
        .update({
          status,
          customer_name: customerName || null,
          notes: notes || null,
        })
        .eq("number", camarote.number);
      if (error) throw error;
      trackExpoEvent("expo_camarote_status_change", {
        camaroteNumber: camarote.number,
        from: camarote.status,
        to: status,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f0f0f] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Camarote {camarote.number}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["available", "reserved", "sold"] as CamaroteStatus[]).map((s) => (
                <label
                  key={s}
                  className={`cursor-pointer text-center py-2.5 rounded-xl text-xs font-bold border-2 transition-colors ${
                    status === s
                      ? "border-white text-white bg-white/10"
                      : "border-white/10 text-white/60 hover:border-white/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="sr-only"
                  />
                  <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle ${STATUS_COLOR[s]}`} />
                  {STATUS_LABEL[s]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-1.5 uppercase tracking-wider text-muted-foreground block">
              Nome do comprador
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/30 text-sm"
              placeholder="(opcional)"
            />
          </div>

          <div>
            <label className="text-xs font-bold mb-1.5 uppercase tracking-wider text-muted-foreground block">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/30 text-sm resize-none"
              placeholder="(opcional)"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-full text-sm font-bold border border-white/15 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-extrabold text-black disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
