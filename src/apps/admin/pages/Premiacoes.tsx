import { useEffect, useState } from "react";
import { Plus, Trash2, Trophy, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { formatAwardPeriod } from "@/hooks/usePartnerAwards";

type Partner = Pick<Tables<"partners">, "id" | "name" | "slug" | "city">;
type Award = Tables<"partner_awards"> & {
  partner?: Partner | null;
};

const AWARD_TYPES = [
  { value: "melhor_bar_mes", label: "Melhor Bar do Mês" },
  { value: "melhor_happy_hour", label: "Melhor Happy Hour" },
  { value: "melhor_pagode", label: "Melhor Pagode" },
  { value: "melhor_sertanejo", label: "Melhor Sertanejo" },
  { value: "melhor_espetinho", label: "Melhor Espetinho" },
  { value: "destaque_semana", label: "Destaque da Semana" },
  { value: "parceiro_revelacao", label: "Parceiro Revelação" },
];

const MONTHS = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" }, { value: 3, label: "Março" },
  { value: 4, label: "Abril" }, { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" }, { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" }, { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const labelFor = (v: string) => AWARD_TYPES.find((t) => t.value === v)?.label || v;

const Premiacoes = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date();

  const [form, setForm] = useState({
    partner_id: "",
    award_type: "melhor_bar_mes",
    title: "Melhor Bar do Mês",
    description: "",
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    image_url: "",
    active: true,
  });

  async function reload() {
    setLoading(true);
    const [{ data: ps }, { data: as }] = await Promise.all([
      supabase.from("partners").select("id, name, slug, city").eq("active", true).order("name"),
      supabase
        .from("partner_awards")
        .select("*, partner:partners(id, name, slug, city)")
        .order("year", { ascending: false, nullsFirst: false })
        .order("month", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);
    setPartners((ps || []) as Partner[]);
    setAwards((as || []) as Award[]);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.partner_id) {
      toast.error("Escolha um parceiro");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Informe um título");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("partner_awards").insert({
      partner_id: form.partner_id,
      award_type: form.award_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      month: form.month || null,
      year: form.year || null,
      image_url: form.image_url.trim() || null,
      active: form.active,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Premiação publicada");
    setForm((f) => ({ ...f, partner_id: "", description: "", image_url: "" }));
    reload();
  }

  async function toggleActive(a: Award) {
    const { error } = await supabase
      .from("partner_awards")
      .update({ active: !a.active })
      .eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(!a.active ? "Premiação ativada" : "Premiação ocultada");
    reload();
  }

  async function removeAward(id: string) {
    if (!confirm("Remover esta premiação?")) return;
    const { error } = await supabase.from("partner_awards").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removida");
    reload();
  }

  const inputCls = "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";

  return (
    <div className="md:ml-44 max-w-4xl pb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Premiações Roxou
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Eleja parceiros campeões — Melhor Bar do Mês, Happy Hour, Pagode e outros destaques.
          </p>
        </div>
        <Link
          to="/bar-do-mes"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
        >
          Ver página pública <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/30 pb-1.5">
          Nova premiação
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">Parceiro *</label>
            <select
              className={inputCls}
              value={form.partner_id}
              onChange={(e) => setForm((f) => ({ ...f, partner_id: e.target.value }))}
            >
              <option value="">— Selecione —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.city ? ` · ${p.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Tipo *</label>
            <select
              className={inputCls}
              value={form.award_type}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, award_type: v, title: labelFor(v) }));
              }}
            >
              {AWARD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Título *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Mês</label>
            <select
              className={inputCls}
              value={form.month}
              onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Ano</label>
            <input
              type="number"
              className={inputCls}
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
            <textarea
              className={`${inputCls} min-h-[80px]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Por que esse parceiro venceu?"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">Imagem (URL, opcional)</label>
            <input
              className={inputCls}
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-3.5 w-3.5 accent-primary"
            />
            Publicar imediatamente
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="admin-glow flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Publicar premiação
        </button>
      </form>

      {/* List */}
      <div className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Premiações cadastradas ({awards.length})
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : awards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma premiação ainda.</p>
        ) : (
          <div className="space-y-2">
            {awards.map((a) => (
              <div
                key={a.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  a.active ? "border-border/40 bg-card/50" : "border-border/30 bg-card/20 opacity-60"
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {formatAwardPeriod(a.month, a.year)} · {labelFor(a.award_type)}
                  </p>
                  <p className="font-semibold text-sm text-foreground truncate">
                    {a.partner?.name || "Parceiro removido"}
                  </p>
                  {a.description && (
                    <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{a.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(a)}
                    className="text-[10px] rounded-md border border-border/50 px-2 py-1 text-foreground hover:bg-secondary/50 transition"
                  >
                    {a.active ? "Ocultar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAward(a.id)}
                    className="admin-glow-destructive rounded-md border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10 transition"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Premiacoes;
