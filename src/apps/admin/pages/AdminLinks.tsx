/**
 * Admin → Encurtador de Links
 * Lista + criação/edição inline + analytics detalhado por link.
 * Todos os acessos são gated por RLS (has_role admin). Cliques públicos
 * são registrados exclusivamente pela Edge Function `r`.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Link2, Plus, Copy, ExternalLink, Pause, Play, Trash2,
  QrCode, BarChart3, Search, X, Check, RefreshCw, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import QRCode from "qrcode";

const RESERVED = new Set([
  "admin","api","auth","login","logout","partner","parceiro","r",
  "health","assets","static","favicon","robots","sitemap",
]);
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const PUBLIC_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://roxou.com.br";

type ShortLink = {
  id: string;
  slug: string;
  destination_url: string;
  title: string;
  description: string | null;
  campaign_name: string | null;
  is_active: boolean;
  expires_at: string | null;
  max_clicks: number | null;
  click_count: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  tags: string[];
  created_at: string;
};

type Overview = {
  total_links: number;
  active_links: number;
  total_clicks: number;
  clicks_7d: number;
  clicks_30d: number;
  unique_visitors_30d: number;
  bot_clicks_30d: number;
};

function randomSlug(len = 6): string {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) s += abc[bytes[i] % abc.length];
  return s;
}

function validateUrl(u: string): string | null {
  try {
    const url = new URL(u.trim());
    if (!/^https?:$/.test(url.protocol)) return "URL deve começar com http:// ou https://";
    return null;
  } catch { return "URL inválida"; }
}

function shortUrl(slug: string) { return `${PUBLIC_BASE}/r/${slug}`; }

// ---------- Analytics modal ----------
function AnalyticsPanel({ link, onClose }: { link: ShortLink; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data: res, error } = await supabase.rpc("short_link_analytics" as never, { _link_id: link.id } as never);
      if (!alive) return;
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      setData(res ?? null);
      setLoading(false);
    };
    load();
    const t = setInterval(load, 45_000);
    QRCode.toDataURL(shortUrl(link.slug), { margin: 1, width: 480, color: { dark: "#0b0217", light: "#ffffff" } })
      .then(setQr).catch(() => {});
    return () => { alive = false; clearInterval(t); };
  }, [link.id, link.slug]);

  const totals = data?.totals ?? {};
  const timeline: Array<{ date: string; clicks: number; uniques: number }> = data?.timeline ?? [];
  const sources: Array<{ source: string; clicks: number }> = data?.sources ?? [];
  const devices: Record<string, number> = data?.devices ?? {};
  const browsers: Record<string, number> = data?.browsers ?? {};
  const os: Record<string, number> = data?.os ?? {};

  const maxDay = Math.max(1, ...timeline.map(t => t.clicks));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-3">
      <div className="w-full max-w-4xl bg-card border border-border rounded-2xl my-6">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg truncate">{link.title}</h2>
            <a href={shortUrl(link.slug)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">
              {shortUrl(link.slug)}
            </a>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="p-4 md:p-6 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Cliques totais", totals.total ?? 0],
                ["Humanos", totals.human ?? 0],
                ["Únicos (est.)", totals.unique_visitors ?? 0],
                ["Bots", totals.bots ?? 0],
                ["Últimas 24h", totals.last_24h ?? 0],
                ["7 dias", totals.last_7d ?? 0],
                ["30 dias", totals.last_30d ?? 0],
                ["Registrados", link.click_count],
              ].map(([label, val]) => (
                <div key={label as string} className="rounded-xl border border-border/50 bg-card/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="text-xl font-bold text-foreground">{val as number}</div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Cliques por dia (30d)
              </h3>
              {timeline.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem dados ainda.</div>
              ) : (
                <div className="flex items-end gap-1 h-32 border border-border/40 rounded-xl p-2 bg-background/40">
                  {timeline.map((t) => (
                    <div key={t.date} className="flex-1 flex flex-col items-center justify-end group relative">
                      <div className="w-full bg-primary/70 hover:bg-primary rounded-t" style={{ height: `${(t.clicks / maxDay) * 100}%` }} />
                      <div className="absolute -top-8 hidden group-hover:block bg-popover text-xs px-2 py-1 rounded shadow border border-border whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("pt-BR")}: {t.clicks}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sources / devices */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Origens</h3>
                <ul className="space-y-1 text-sm">
                  {sources.length === 0 && <li className="text-muted-foreground">—</li>}
                  {sources.map((s) => (
                    <li key={s.source} className="flex justify-between border-b border-border/30 py-1">
                      <span>{s.source}</span><span className="font-mono">{s.clicks}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Dispositivos</h3>
                  <ul className="text-sm space-y-1">
                    {Object.entries(devices).map(([k, v]) => (
                      <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span className="font-mono">{v}</span></li>
                    ))}
                    {Object.keys(devices).length === 0 && <li className="text-muted-foreground">—</li>}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Browsers</h3>
                    <ul className="text-sm space-y-1">
                      {Object.entries(browsers).map(([k, v]) => (<li key={k} className="flex justify-between"><span>{k}</span><span className="font-mono">{v}</span></li>))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">SO</h3>
                    <ul className="text-sm space-y-1">
                      {Object.entries(os).map(([k, v]) => (<li key={k} className="flex justify-between"><span>{k}</span><span className="font-mono">{v}</span></li>))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {qr && (
              <div className="flex flex-col md:flex-row items-center gap-4 border-t border-border/50 pt-4">
                <img src={qr} alt="QR Code" className="w-40 h-40 rounded-xl border border-border bg-white" />
                <div className="flex-1 text-sm text-muted-foreground">
                  QR aponta para <code className="text-foreground">{shortUrl(link.slug)}</code>.
                  Você pode alterar o destino sem trocar o QR.
                  <div className="mt-3">
                    <a href={qr} download={`roxou-${link.slug}.png`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
                      Baixar PNG
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Form modal ----------
type FormState = Partial<ShortLink> & { id?: string };

function LinkForm({ initial, onClose, onSaved }: { initial: FormState | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(() => initial ?? {
    slug: "", destination_url: "", title: "", is_active: true, tags: [],
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  const upd = (k: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [k]: v as never }));

  const submit = async () => {
    const slug = (form.slug ?? "").toLowerCase().trim();
    if (!SLUG_RE.test(slug)) return toast({ title: "Slug inválido", description: "Use letras, números, - ou _ (mín 2 chars).", variant: "destructive" });
    if (RESERVED.has(slug)) return toast({ title: "Slug reservado", description: "Este slug é reservado pelo sistema.", variant: "destructive" });
    const urlErr = validateUrl(form.destination_url ?? "");
    if (urlErr) return toast({ title: "URL inválida", description: urlErr, variant: "destructive" });
    if (!form.title?.trim()) return toast({ title: "Título obrigatório", variant: "destructive" });

    setSaving(true);
    const payload = {
      slug,
      destination_url: form.destination_url!.trim(),
      title: form.title!.trim(),
      description: form.description || null,
      campaign_name: form.campaign_name || null,
      is_active: form.is_active ?? true,
      expires_at: form.expires_at || null,
      max_clicks: form.max_clicks ? Number(form.max_clicks) : null,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
      tags: form.tags ?? [],
    };
    let err;
    if (isEdit) {
      ({ error: err } = await supabase.from("short_links").update(payload).eq("id", initial!.id!));
    } else {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) { setSaving(false); return toast({ title: "Sessão expirada", variant: "destructive" }); }
      ({ error: err } = await supabase.from("short_links").insert({ ...payload, created_by: uid }));
    }
    setSaving(false);
    if (err) return toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    toast({ title: isEdit ? "Link atualizado" : "Link criado" });
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-3">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl my-6">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <h2 className="font-display font-bold text-lg">{isEdit ? "Editar link" : "Novo link"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Título *</label>
            <input value={form.title ?? ""} onChange={e => upd("title", e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Expo 2026 — ingressos"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Slug *</label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 flex items-center bg-background border border-border rounded-lg overflow-hidden">
                <span className="px-3 py-2 text-xs text-muted-foreground border-r border-border">roxou.com.br/r/</span>
                <input value={form.slug ?? ""} onChange={e => upd("slug", e.target.value.toLowerCase())} disabled={isEdit} className="flex-1 bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-60" placeholder="expo"/>
              </div>
              {!isEdit && (
                <button type="button" onClick={() => upd("slug", randomSlug())} className="px-3 rounded-lg bg-muted hover:bg-muted/70 text-sm" title="Gerar slug"><RefreshCw className="w-4 h-4"/></button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">URL de destino *</label>
            <input value={form.destination_url ?? ""} onChange={e => upd("destination_url", e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm" placeholder="https://..."/>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
            <textarea value={form.description ?? ""} onChange={e => upd("description", e.target.value)} rows={2} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Campanha</label>
              <input value={form.campaign_name ?? ""} onChange={e => upd("campaign_name", e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tags (separadas por vírgula)</label>
              <input value={(form.tags ?? []).join(", ")} onChange={e => upd("tags", e.target.value.split(",").map(t=>t.trim()).filter(Boolean))} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const).map(k => (
              <div key={k}>
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">{k}</label>
                <input value={(form[k] as string) ?? ""} onChange={e => upd(k, e.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs"/>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Expira em</label>
              <input type="datetime-local" value={form.expires_at ? form.expires_at.slice(0,16) : ""} onChange={e => upd("expires_at", e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Limite de cliques</label>
              <input type="number" min={0} value={form.max_clicks ?? ""} onChange={e => upd("max_clicks", e.target.value ? Number(e.target.value) : null)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"/>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active ?? true} onChange={e => upd("is_active", e.target.checked)}/>
            Link ativo
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border/60">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm">Cancelar</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin"/>}
            {isEdit ? "Salvar" : "Criar link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function AdminLinks() {
  const [rows, setRows] = useState<ShortLink[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShortLink | null>(null);
  const [analytics, setAnalytics] = useState<ShortLink | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, ov] = await Promise.all([
      supabase.from("short_links").select("*").order("created_at", { ascending: false }),
      supabase.rpc("short_links_overview" as never),
    ]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRows((data ?? []) as ShortLink[]);
    setOverview((ov.data as Overview) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.slug.toLowerCase().includes(s) ||
      r.title.toLowerCase().includes(s) ||
      r.destination_url.toLowerCase().includes(s) ||
      (r.campaign_name ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  const copy = async (slug: string) => {
    await navigator.clipboard.writeText(shortUrl(slug));
    toast({ title: "Link copiado" });
  };

  const toggleActive = async (r: ShortLink) => {
    const { error } = await supabase.from("short_links").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (r: ShortLink) => {
    if (!confirm(`Excluir o link "${r.title}"? Cliques históricos também serão removidos.`)) return;
    const { error } = await supabase.from("short_links").delete().eq("id", r.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Link excluído" });
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-foreground">Encurtador Roxou</h1>
            <p className="text-sm text-muted-foreground">Crie, gerencie e analise links curtos oficiais.</p>
          </div>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Novo link
        </button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Links totais", overview?.total_links ?? 0],
          ["Ativos", overview?.active_links ?? 0],
          ["Cliques totais", overview?.total_clicks ?? 0],
          ["Últimos 7 dias", overview?.clicks_7d ?? 0],
          ["Últimos 30 dias", overview?.clicks_30d ?? 0],
          ["Únicos 30d (est.)", overview?.unique_visitors_30d ?? 0],
          ["Bots 30d", overview?.bot_clicks_30d ?? 0],
        ].map(([label, val]) => (
          <div key={label as string} className="rounded-xl border border-border/50 bg-card/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-xl font-bold text-foreground">{val as number}</div>
          </div>
        ))}
      </section>

      {/* Search */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por slug, título, URL ou campanha…" className="flex-1 bg-transparent outline-none text-sm"/>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum link ainda. Clique em "Novo link" para começar.</div>
        ) : (
          <ul className="divide-y divide-border/40">
            {filtered.map((r) => (
              <li key={r.id} className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${r.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    <div className="font-semibold text-sm truncate">{r.title}</div>
                    {r.campaign_name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{r.campaign_name}</span>}
                  </div>
                  <div className="text-xs text-primary font-mono mt-0.5 truncate">/r/{r.slug}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.destination_url}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span title="Cliques"><b className="text-foreground">{r.click_count}</b> cliques</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => copy(r.slug)} className="p-2 rounded-lg hover:bg-muted" title="Copiar"><Copy className="w-4 h-4"/></button>
                  <a href={r.destination_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-muted" title="Abrir destino"><ExternalLink className="w-4 h-4"/></a>
                  <button onClick={() => setAnalytics(r)} className="p-2 rounded-lg hover:bg-muted" title="Analytics"><BarChart3 className="w-4 h-4"/></button>
                  <button onClick={() => setAnalytics(r)} className="p-2 rounded-lg hover:bg-muted" title="QR Code"><QrCode className="w-4 h-4"/></button>
                  <button onClick={() => toggleActive(r)} className="p-2 rounded-lg hover:bg-muted" title={r.is_active ? "Pausar" : "Ativar"}>
                    {r.is_active ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
                  </button>
                  <button onClick={() => { setEditing(r); setFormOpen(true); }} className="p-2 rounded-lg hover:bg-muted" title="Editar"><Check className="w-4 h-4"/></button>
                  <button onClick={() => remove(r)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive" title="Excluir"><Trash2 className="w-4 h-4"/></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <LinkForm initial={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      )}
      {analytics && <AnalyticsPanel link={analytics} onClose={() => setAnalytics(null)} />}
    </div>
  );
}
