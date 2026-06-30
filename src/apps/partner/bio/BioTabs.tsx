/**
 * Roxou Bio V1.1 — Polished tabs
 *
 * Tudo em um módulo único para reduzir custo e centralizar componentes.
 * Reutiliza 100% dos services em `@/services/bio` — zero novas tabelas/RPCs.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Plus,
  Copy,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Instagram,
  Music2,
  Youtube,
  Globe,
  MessageCircle,
  Calendar,
  Crown,
  Bus,
  Utensils,
  QrCode,
  Link as LinkIcon,
  TrendingUp,
  Share2,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  updateBio,
  listLinksByBio,
  upsertLink,
  deleteLink,
  listMenu,
  upsertCategory,
  deleteCategory,
  upsertItem,
  deleteItem,
  listQrCodes,
  upsertQrCode,
  type BioProfile,
  type BioLink,
  type MenuCategory,
  type MenuItem,
  type BioQrCode,
} from "@/services/bio";
import { generateQrPngDataUrl, downloadDataUrl } from "@/lib/qrcode";

/* ============ Helpers ============ */
function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function classifySource(referrer: string | null, source: string | null): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("qr")) return "QR Code";
  if (s.includes("instagram")) return "Instagram";
  if (s.includes("whatsapp")) return "WhatsApp";
  const r = (referrer ?? "").toLowerCase();
  if (!r) return "Direto";
  if (r.includes("instagram")) return "Instagram";
  if (r.includes("google")) return "Google";
  if (r.includes("whatsapp") || r.includes("wa.me")) return "WhatsApp";
  if (r.includes("facebook")) return "Facebook";
  if (r.includes("roxou")) return "Roxou";
  if (r.includes("tiktok")) return "TikTok";
  return "Outros";
}

function autoIconFor(url: string) {
  const u = url.toLowerCase();
  if (u.includes("wa.me") || u.includes("whatsapp")) return MessageCircle;
  if (u.includes("instagram")) return Instagram;
  if (u.includes("tiktok")) return Music2;
  if (u.includes("youtube")) return Youtube;
  return Globe;
}

/* ============ HOME (Dashboard) ============ */
export function BioHomeTab({
  bio,
  partnerId,
}: {
  bio: BioProfile;
  partnerId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    views_today: number;
    views_7d: number;
    clicks_7d: number;
    whatsapp_clicks: number;
    ctr: number;
    series: Array<{ date: string; views: number; clicks: number }>;
    sources: Array<{ name: string; count: number }>;
    events_count: number;
    reservations_count: number;
    vip_count: number;
    excursions_count: number;
    menu_count: number;
    links_count: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [events, vipList, links, qrs, menu, evCount, reservs, exc] = await Promise.all([
          supabase
            .from("bio_analytics_events" as never)
            .select("event_type, created_at, referrer, source")
            .eq("bio_id", bio.id)
            .gte("created_at", since30),
          supabase.from("partner_vip_lists").select("id", { count: "exact", head: true }).eq("partner_id", partnerId),
          listLinksByBio(bio.id),
          listQrCodes(bio.id),
          listMenu(bio.id),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("partner_id", partnerId)
            .eq("status", "published")
            .gte("date_time", new Date().toISOString()),
          supabase
            .from("partner_reservations" as never)
            .select("id", { count: "exact", head: true })
            .eq("partner_id", partnerId),
          supabase
            .from("excursion_trips" as never)
            .select("id", { count: "exact", head: true })
            .eq("partner_id", partnerId)
            .gte("departure_at", new Date().toISOString()),
        ]);

        if (cancelled) return;

        const rows =
          (events.data as Array<{ event_type: string; created_at: string; referrer: string | null; source: string | null }>) ??
          [];

        const dailyMap = new Map<string, { views: number; clicks: number }>();
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          dailyMap.set(key, { views: 0, clicks: 0 });
        }
        const since7 = Date.now() - 7 * 86400000;
        let views7 = 0;
        let clicks7 = 0;
        let viewsToday = 0;
        let whats = 0;
        const sourceMap = new Map<string, number>();

        for (const r of rows) {
          const t = new Date(r.created_at).getTime();
          const k = new Date(r.created_at).toISOString().slice(0, 10);
          const slot = dailyMap.get(k);
          if (r.event_type === "bio_view") {
            if (slot) slot.views += 1;
            if (t >= since7) views7 += 1;
            if (new Date(r.created_at) >= todayStart) viewsToday += 1;
            const src = classifySource(r.referrer, r.source);
            sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
          } else {
            if (slot) slot.clicks += 1;
            if (t >= since7) clicks7 += 1;
            if (r.event_type === "whatsapp_click") whats += 1;
          }
        }

        const series = Array.from(dailyMap.entries()).map(([date, v]) => ({
          date: date.slice(5),
          views: v.views,
          clicks: v.clicks,
        }));

        setData({
          views_today: viewsToday,
          views_7d: views7,
          clicks_7d: clicks7,
          whatsapp_clicks: whats,
          ctr: views7 > 0 ? Math.round((clicks7 / views7) * 100) : 0,
          series,
          sources: Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          events_count: evCount.count ?? 0,
          reservations_count: reservs.count ?? 0,
          vip_count: vipList.count ?? 0,
          excursions_count: exc.count ?? 0,
          menu_count: menu.items.length,
          links_count: links.length,
        });
      } catch (e) {
        console.warn("[Bio Home]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bio.id, partnerId]);

  if (loading || !data) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Visitas hoje" value={data.views_today} accent="from-purple-500/20 to-fuchsia-500/10" />
        <Kpi label="Visitas 7d" value={data.views_7d} accent="from-blue-500/20 to-purple-500/10" />
        <Kpi label="Cliques 7d" value={data.clicks_7d} accent="from-pink-500/20 to-orange-500/10" />
        <Kpi label="WhatsApp" value={data.whatsapp_clicks} accent="from-emerald-500/20 to-teal-500/10" />
        <Kpi label="CTR" value={`${data.ctr}%`} accent="from-amber-500/20 to-orange-500/10" />
        <Kpi label="Eventos" value={data.events_count} />
        <Kpi label="Reservas" value={data.reservations_count} />
        <Kpi label="Excursões" value={data.excursions_count} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-purple-500" /> Últimos 30 dias
          </div>
          <span className="text-xs text-muted-foreground">visitas vs cliques</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(280 90% 60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(280 90% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(330 90% 60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(330 90% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="views" stroke="hsl(280 90% 60%)" fill="url(#gv)" strokeWidth={2} />
              <Area type="monotone" dataKey="clicks" stroke="hsl(330 90% 60%)" fill="url(#gc)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Origem dos acessos (30d)</div>
        {data.sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <div className="space-y-2">
            {data.sources.map((s) => {
              const total = data.sources.reduce((acc, x) => acc + x.count, 0) || 1;
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <Card
      className={`p-3 bg-gradient-to-br ${accent ?? "from-card to-card"} border-border/50 hover:scale-[1.02] transition-transform`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

/* ============ PROFILE (agrupado) ============ */
export function BioProfileTab({
  bio,
  onUpdated,
}: {
  bio: BioProfile;
  onUpdated: (b: BioProfile) => void;
}) {
  const [form, setForm] = useState(bio);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(bio), [bio]);

  async function save() {
    setSaving(true);
    try {
      const patch = {
        display_name: form.display_name,
        headline: form.headline,
        bio: form.bio,
        avatar_url: form.avatar_url,
        cover_url: form.cover_url,
        address: form.address,
        city: form.city,
        whatsapp: form.whatsapp,
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube: form.youtube,
        website: form.website,
        theme: form.theme,
        accent_color: form.accent_color,
      };
      await updateBio(bio.id, patch);
      onUpdated({ ...bio, ...patch });
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Section title="Informações básicas">
        <Row>
          <Field label="Nome" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
          <Field label="Cidade" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
        </Row>
        <Field label="Headline" value={form.headline ?? ""} onChange={(v) => setForm({ ...form, headline: v })} placeholder="Uma frase que te define" />
        <div className="space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Textarea rows={3} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <Row>
          <Field label="Avatar (URL)" value={form.avatar_url ?? ""} onChange={(v) => setForm({ ...form, avatar_url: v })} />
          <Field label="Capa (URL)" value={form.cover_url ?? ""} onChange={(v) => setForm({ ...form, cover_url: v })} />
        </Row>
        <Field label="Endereço" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} />
      </Section>

      <Section title="Contato e redes">
        <Row>
          <Field label="WhatsApp" value={form.whatsapp ?? ""} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="(18) 99999-9999" />
          <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="@usuario" />
        </Row>
        <Row>
          <Field label="TikTok" value={form.tiktok ?? ""} onChange={(v) => setForm({ ...form, tiktok: v })} />
          <Field label="YouTube" value={form.youtube ?? ""} onChange={(v) => setForm({ ...form, youtube: v })} />
        </Row>
        <Field label="Site" value={form.website ?? ""} onChange={(v) => setForm({ ...form, website: v })} />
      </Section>

      <Section title="Visual">
        <Row>
          <Field label="Cor de destaque" value={form.accent_color ?? ""} onChange={(v) => setForm({ ...form, accent_color: v })} placeholder="#a855f7" />
          <div className="space-y-1">
            <Label className="text-xs">Tema</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
            >
              <option value="default">Roxou (padrão)</option>
              <option value="midnight">Midnight</option>
              <option value="neon">Neon</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
        </Row>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar perfil"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ============ LINKS (cards + ordenação + ícones auto) ============ */
const CTA_TEMPLATES: Array<{ title: string; url: string; icon: typeof Calendar; description?: string }> = [
  { title: "Reservar agora", url: "#reservar", icon: Calendar, description: "Mesa garantida" },
  { title: "Entrar na Lista VIP", url: "#vip", icon: Crown, description: "Acesso preferencial" },
  { title: "Comprar ingresso", url: "#ingresso", icon: Sparkles },
  { title: "Solicitar motorista", url: "#motorista", icon: Bus },
  { title: "Ver cardápio", url: "#cardapio", icon: Utensils },
  { title: "Falar no WhatsApp", url: "https://wa.me/", icon: MessageCircle, description: "Resposta rápida" },
  { title: "Pagar via PIX", url: "#pix", icon: Sparkles },
];

export function BioLinksTab({ bio }: { bio: BioProfile }) {
  const [links, setLinks] = useState<BioLink[]>([]);
  const [draft, setDraft] = useState({ title: "", url: "", description: "" });
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      setLinks(await listLinksByBio(bio.id));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, [bio.id]);

  async function add() {
    if (!draft.title || !draft.url) {
      toast.error("Preencha título e URL");
      return;
    }
    await upsertLink({
      bio_id: bio.id,
      title: draft.title,
      url: draft.url,
      description: draft.description,
      position: links.length,
    });
    setDraft({ title: "", url: "", description: "" });
    await reload();
  }

  async function quick(t: (typeof CTA_TEMPLATES)[number]) {
    await upsertLink({
      bio_id: bio.id,
      title: t.title,
      url: t.url,
      description: t.description ?? null,
      position: links.length,
    });
    toast.success(`Adicionado: ${t.title}`);
    await reload();
  }

  async function toggle(l: BioLink) {
    await upsertLink({ ...l, is_active: !l.is_active });
    await reload();
  }
  async function duplicate(l: BioLink) {
    await upsertLink({
      bio_id: bio.id,
      title: `${l.title} (cópia)`,
      url: l.url,
      description: l.description ?? null,
      position: links.length,
    });
    await reload();
  }
  async function remove(id: string) {
    if (!confirm("Excluir este link?")) return;
    await deleteLink(id);
    await reload();
  }
  async function move(l: BioLink, dir: -1 | 1) {
    const idx = links.findIndex((x) => x.id === l.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= links.length) return;
    const other = links[swapIdx];
    await Promise.all([
      upsertLink({ ...l, position: other.position }),
      upsertLink({ ...other, position: l.position }),
    ]);
    await reload();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-purple-500" /> CTAs prontos
        </div>
        <div className="flex flex-wrap gap-2">
          {CTA_TEMPLATES.map((t) => (
            <Button key={t.title} size="sm" variant="outline" onClick={() => quick(t)} className="gap-1">
              <t.icon className="h-3 w-3" />
              {t.title}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Adicionar link personalizado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="Título" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input placeholder="https://…" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <Input placeholder="Descrição (opcional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <Button onClick={add} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </Card>

      {loading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : links.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Nenhum link ainda. Use os CTAs prontos acima ou crie um personalizado.
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((l, i) => {
            const Icon = autoIconFor(l.url);
            return (
              <Card key={l.id} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(280 90% 60% / 0.2), hsl(330 90% 60% / 0.2))" }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${l.is_active ? "" : "opacity-50 line-through"}`}>{l.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{l.url}</div>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex shrink-0">{l.click_count}</Badge>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(l, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={i === links.length - 1} onClick={() => move(l, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => toggle(l)}>
                    {l.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => duplicate(l)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(l.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ MENU (iFood-like) ============ */
export function BioMenuTab({ bio }: { bio: BioProfile }) {
  const [cats, setCats] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", category_id: "", image_url: "", description: "" });
  const [search, setSearch] = useState("");

  async function reload() {
    const { categories, items } = await listMenu(bio.id);
    setCats(categories);
    setItems(items);
  }
  useEffect(() => {
    reload();
  }, [bio.id]);

  async function addCat() {
    if (!newCat) return;
    await upsertCategory({ bio_id: bio.id, name: newCat, position: cats.length });
    setNewCat("");
    await reload();
  }
  async function addItem() {
    if (!newItem.name) {
      toast.error("Informe o nome");
      return;
    }
    await upsertItem({
      bio_id: bio.id,
      name: newItem.name,
      price: newItem.price ? Number(newItem.price) : null,
      category_id: newItem.category_id || null,
      image_url: newItem.image_url || null,
      description: newItem.description || null,
      position: items.length,
    });
    setNewItem({ name: "", price: "", category_id: "", image_url: "", description: "" });
    await reload();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold">Categorias</h3>
        <div className="flex gap-2">
          <Input placeholder="Ex: Bebidas, Porções, Lanches…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button onClick={addCat} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs">
              <span className={c.is_active ? "" : "opacity-50 line-through"}>{c.name}</span>
              <Switch
                checked={c.is_active}
                onCheckedChange={async (v) => {
                  await upsertCategory({ ...c, is_active: v });
                  await reload();
                }}
              />
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  if (!confirm(`Excluir "${c.name}"?`)) return;
                  await deleteCategory(c.id);
                  await reload();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {cats.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma categoria ainda.</span>}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Adicionar item</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Nome" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          <Input placeholder="Preço (R$)" type="number" step="0.01" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={newItem.category_id}
            onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input placeholder="Imagem (URL)" value={newItem.image_url} onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Descrição" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
        </div>
        <Button onClick={addItem} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar item…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map((it) => {
          const cat = cats.find((c) => c.id === it.category_id);
          return (
            <Card key={it.id} className="p-3 flex gap-3 items-center hover:bg-muted/30 transition-colors">
              {it.image_url ? (
                <img src={it.image_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Utensils className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{it.name}</span>
                  {it.is_featured && <Badge variant="secondary" className="text-[10px]">Destaque</Badge>}
                  {!it.is_available && <Badge variant="destructive" className="text-[10px]">Indisponível</Badge>}
                </div>
                {it.description && <div className="text-xs text-muted-foreground line-clamp-2">{it.description}</div>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-purple-500">{fmtBRL(it.price)}</span>
                  {cat && <span className="text-[10px] text-muted-foreground">· {cat.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={it.is_available}
                  onCheckedChange={async (v) => {
                    await upsertItem({ ...it, is_available: v });
                    await reload();
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm(`Excluir "${it.name}"?`)) return;
                    await deleteItem(it.id);
                    await reload();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <Utensils className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {search ? "Nada encontrado." : "Nenhum item ainda."}
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============ ANALYTICS (com filtros e breakdowns) ============ */
type Period = "today" | "7d" | "30d";

export function BioAnalyticsTab({ bio }: { bio: BioProfile }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    views: number;
    clicks: number;
    ctr: number;
    devices: Array<{ name: string; count: number }>;
    sources: Array<{ name: string; count: number }>;
    hours: Array<{ hour: number; count: number }>;
    topLinks: Array<{ link_id: string; count: number }>;
    conversions: { reservation: number; vip: number; transport: number; whatsapp: number };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
        const since = period === "today"
          ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
          : new Date(Date.now() - days * 86400000).toISOString();

        const { data: rows } = await supabase
          .from("bio_analytics_events" as never)
          .select("event_type, created_at, referrer, source, device, link_id")
          .eq("bio_id", bio.id)
          .gte("created_at", since);

        if (cancelled) return;

        const list = (rows as Array<{
          event_type: string;
          created_at: string;
          referrer: string | null;
          source: string | null;
          device: string | null;
          link_id: string | null;
        }>) ?? [];

        let views = 0,
          clicks = 0,
          rsv = 0,
          vip = 0,
          tr = 0,
          wa = 0;
        const dev = new Map<string, number>();
        const src = new Map<string, number>();
        const hr = new Map<number, number>();
        const lk = new Map<string, number>();

        for (const r of list) {
          if (r.event_type === "bio_view") {
            views++;
            const d = r.device ?? "desconhecido";
            dev.set(d, (dev.get(d) ?? 0) + 1);
            const s = classifySource(r.referrer, r.source);
            src.set(s, (src.get(s) ?? 0) + 1);
            const h = new Date(r.created_at).getHours();
            hr.set(h, (hr.get(h) ?? 0) + 1);
          } else {
            clicks++;
            if (r.event_type === "whatsapp_click") wa++;
            if (r.event_type === "reservation_click") rsv++;
            if (r.event_type === "vip_click") vip++;
            if (r.event_type === "transport_click") tr++;
            if (r.event_type === "link_click" && r.link_id) {
              lk.set(r.link_id, (lk.get(r.link_id) ?? 0) + 1);
            }
          }
        }

        setData({
          views,
          clicks,
          ctr: views > 0 ? Math.round((clicks / views) * 100) : 0,
          devices: Array.from(dev.entries()).map(([name, count]) => ({ name, count })),
          sources: Array.from(src.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          hours: Array.from({ length: 24 }).map((_, h) => ({ hour: h, count: hr.get(h) ?? 0 })),
          topLinks: Array.from(lk.entries()).map(([link_id, count]) => ({ link_id, count })).sort((a, b) => b.count - a.count).slice(0, 5),
          conversions: { reservation: rsv, vip, transport: tr, whatsapp: wa },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bio.id, period]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2">
        {(["today", "7d", "30d"] as Period[]).map((p) => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
            {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
          </Button>
        ))}
      </div>

      {loading || !data ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Visitas" value={data.views} accent="from-purple-500/20 to-fuchsia-500/10" />
            <Kpi label="Cliques" value={data.clicks} accent="from-pink-500/20 to-orange-500/10" />
            <Kpi label="CTR" value={`${data.ctr}%`} accent="from-amber-500/20 to-orange-500/10" />
          </div>

          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Conversões</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Conv label="WhatsApp" value={data.conversions.whatsapp} />
              <Conv label="Reservas" value={data.conversions.reservation} />
              <Conv label="VIP" value={data.conversions.vip} />
              <Conv label="Transporte" value={data.conversions.transport} />
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Dispositivos</div>
              {data.devices.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem dados.</p>
              ) : (
                <BarList items={data.devices} />
              )}
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Origens</div>
              {data.sources.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem dados.</p>
              ) : (
                <BarList items={data.sources} />
              )}
            </Card>
          </div>

          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Horário de pico</div>
            <div className="flex items-end gap-1 h-24">
              {data.hours.map((h) => {
                const max = Math.max(1, ...data.hours.map((x) => x.count));
                const pct = (h.count / max) * 100;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-gradient-to-t from-purple-500 to-pink-500" style={{ height: `${pct}%`, minHeight: 2 }} />
                    {h.hour % 4 === 0 && <span className="text-[9px] text-muted-foreground">{h.hour}h</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {data.topLinks.length > 0 && (
            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Links mais clicados</div>
              <div className="space-y-1 text-xs">
                {data.topLinks.map((l) => (
                  <div key={l.link_id} className="flex justify-between border-b last:border-0 py-1">
                    <span className="truncate text-muted-foreground">{l.link_id.slice(0, 8)}…</span>
                    <span className="font-semibold">{l.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Conv({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function BarList({ items }: { items: Array<{ name: string; count: number }> }) {
  const total = items.reduce((acc, x) => acc + x.count, 0) || 1;
  return (
    <div className="space-y-2">
      {items.map((s) => {
        const pct = Math.round((s.count / total) * 100);
        return (
          <div key={s.name}>
            <div className="flex justify-between text-xs mb-1">
              <span>{s.name}</span>
              <span className="text-muted-foreground">{s.count} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ QR STUDIO ============ */
type QrTemplate = { id: string; label: string; subtitle: string; icon: typeof QrCode; build: (bio: BioProfile) => { target_path: string; defaultLabel: string } };

const QR_TEMPLATES: QrTemplate[] = [
  { id: "bio", label: "QR Bio", subtitle: "Página inicial", icon: QrCode, build: (b) => ({ target_path: `/bio/${b.slug}`, defaultLabel: "Bio" }) },
  { id: "menu", label: "QR Cardápio", subtitle: "Menu completo", icon: Utensils, build: (b) => ({ target_path: `/bio/${b.slug}/menu`, defaultLabel: "Cardápio" }) },
  { id: "mesa", label: "QR Mesa", subtitle: "Identifica a mesa", icon: Utensils, build: (b) => ({ target_path: `/bio/${b.slug}/menu`, defaultLabel: "Mesa" }) },
  { id: "reserva", label: "QR Reserva", subtitle: "Reservar mesa", icon: Calendar, build: (b) => ({ target_path: `/${b.slug}/reservas`, defaultLabel: "Reservas" }) },
  { id: "vip", label: "QR Lista VIP", subtitle: "Entrar na lista", icon: Crown, build: (b) => ({ target_path: `/${b.slug}/vip`, defaultLabel: "VIP" }) },
  { id: "whats", label: "QR WhatsApp", subtitle: "Falar direto", icon: MessageCircle, build: (b) => ({ target_path: b.whatsapp ? `https://wa.me/${b.whatsapp.replace(/\D/g, "")}` : `/bio/${b.slug}`, defaultLabel: "WhatsApp" }) },
  { id: "ig", label: "QR Instagram", subtitle: "Seguir perfil", icon: Instagram, build: (b) => ({ target_path: b.instagram ? (b.instagram.startsWith("http") ? b.instagram : `https://instagram.com/${b.instagram.replace(/^@/, "")}`) : `/bio/${b.slug}`, defaultLabel: "Instagram" }) },
];

export function BioQrTab({ bio }: { bio: BioProfile }) {
  const [qrs, setQrs] = useState<BioQrCode[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<QrTemplate>(QR_TEMPLATES[0]);
  const [label, setLabel] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const base = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  async function reload() {
    setQrs(await listQrCodes(bio.id));
  }
  useEffect(() => {
    reload();
  }, [bio.id]);

  async function create() {
    const built = selectedTpl.build(bio);
    let target = built.target_path;
    if (selectedTpl.id === "mesa" && tableNumber) {
      target = `${target}?mesa=${encodeURIComponent(tableNumber)}`;
    }
    await upsertQrCode({
      bio_id: bio.id,
      label: label || (selectedTpl.id === "mesa" && tableNumber ? `Mesa ${tableNumber}` : built.defaultLabel),
      target_path: target,
      table_number: selectedTpl.id === "mesa" ? tableNumber || null : null,
    });
    setLabel("");
    setTableNumber("");
    toast.success("QR criado");
    await reload();
  }

  async function downloadPng(q: BioQrCode) {
    const fullUrl = q.target_path.startsWith("http") ? q.target_path : `${base}${q.target_path}`;
    const dataUrl = await generateQrPngDataUrl(fullUrl, 720);
    downloadDataUrl(`qr-${q.label.replace(/\s+/g, "-")}.png`, dataUrl);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Modelos de QR</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QR_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTpl(t)}
              className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
                selectedTpl.id === t.id ? "border-purple-500 bg-purple-500/10" : "border-border"
              }`}
            >
              <t.icon className="h-5 w-5 mb-1 text-purple-500" />
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="text-[10px] text-muted-foreground">{t.subtitle}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          <Input placeholder={`Etiqueta (ex: ${selectedTpl.id === "mesa" ? "Mesa 01" : "Fachada"})`} value={label} onChange={(e) => setLabel(e.target.value)} />
          {selectedTpl.id === "mesa" && (
            <Input placeholder="Nº da mesa" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
          )}
        </div>
        <Button onClick={create} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Gerar QR
        </Button>
      </Card>

      <div className="space-y-2">
        {qrs.map((q) => {
          const fullUrl = q.target_path.startsWith("http") ? q.target_path : `${base}${q.target_path}`;
          const png = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(fullUrl)}`;
          return (
            <Card key={q.id} className="p-3 flex items-center gap-3">
              <img src={png} alt={q.label} className="h-20 w-20 rounded bg-white" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{q.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{fullUrl}</div>
                <div className="text-[10px] text-muted-foreground">{q.scan_count} leituras</div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(fullUrl);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadPng(q)}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
        {qrs.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <QrCode className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhum QR criado.
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============ SETTINGS / MODULES ============ */
export function BioSettingsTab({
  bio,
  onUpdated,
}: {
  bio: BioProfile;
  onUpdated: (b: BioProfile) => void;
}) {
  const [form, setForm] = useState(bio);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(bio), [bio]);

  async function save(patch: Partial<BioProfile>) {
    setSaving(true);
    const merged = { ...form, ...patch };
    setForm(merged);
    try {
      await updateBio(bio.id, patch);
      onUpdated({ ...bio, ...patch });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const modules: Array<[keyof BioProfile, string, string]> = [
    ["show_events", "Eventos", "Próximos eventos publicados"],
    ["show_reservations", "Reservas", "Botão Reservar mesa"],
    ["show_vip", "Lista VIP", "Acesso à lista pública"],
    ["show_transport", "Transportes", "Excursões e motoristas"],
    ["show_menu", "Cardápio", "Menu digital"],
    ["show_news", "Notícias", "Últimas novidades"],
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Módulos visíveis</h3>
        <p className="text-xs text-muted-foreground">
          Ative apenas o que faz sentido para o seu negócio. Tudo é consumido automaticamente do ecossistema Roxou.
        </p>
        {modules.map(([key, label, hint]) => (
          <div key={key as string} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm">{label}</div>
              <div className="text-[11px] text-muted-foreground">{hint}</div>
            </div>
            <Switch
              checked={Boolean(form[key])}
              disabled={saving}
              onCheckedChange={(v) => save({ [key]: v } as Partial<BioProfile>)}
            />
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">CTA principal</h3>
        <Field label="Texto" value={form.primary_cta_label ?? ""} onChange={(v) => setForm({ ...form, primary_cta_label: v })} />
        <Field label="URL" value={form.primary_cta_url ?? ""} onChange={(v) => setForm({ ...form, primary_cta_url: v })} />
        <Button
          size="sm"
          onClick={() => save({ primary_cta_label: form.primary_cta_label, primary_cta_url: form.primary_cta_url })}
          disabled={saving}
        >
          Salvar
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Status</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">Bio ativa</span>
          <Switch checked={form.is_active} onCheckedChange={(v) => save({ is_active: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Bio pública</span>
          <Switch checked={form.is_public} onCheckedChange={(v) => save({ is_public: v })} />
        </div>
      </Card>
    </div>
  );
}

/* ============ SHARE PANEL ============ */
export function BioSharePanel({ bio }: { bio: BioProfile }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/bio/${bio.slug}` : `/bio/${bio.slug}`;

  function copy() {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: bio.display_name, text: bio.headline ?? "", url });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  }
  async function downloadQr() {
    const dataUrl = await generateQrPngDataUrl(url, 720);
    downloadDataUrl(`qr-${bio.slug}.png`, dataUrl);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={copy}>
        <Copy className="h-4 w-4 mr-1" /> Copiar
      </Button>
      <Button size="sm" variant="outline" onClick={share}>
        <Share2 className="h-4 w-4 mr-1" /> Compartilhar
      </Button>
      <Button size="sm" variant="outline" onClick={downloadQr}>
        <Download className="h-4 w-4 mr-1" /> Baixar QR
      </Button>
      <Button size="sm" variant="secondary" asChild>
        <a href={`/bio/${bio.slug}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4 mr-1" /> Abrir
        </a>
      </Button>
    </div>
  );
}

/* ============ LIVE PREVIEW (iframe celular) ============ */
export function BioLivePreview({ bio }: { bio: BioProfile }) {
  // Cache-busting key faz reload do iframe ao mudar metadados relevantes da bio
  const reloadKey = useMemo(() => `${bio.id}-${bio.display_name}-${bio.accent_color}-${bio.theme}`, [bio]);
  return (
    <div className="hidden lg:block sticky top-4">
      <div className="mx-auto" style={{ width: 360 }}>
        <div className="rounded-[2.5rem] border-8 border-foreground/80 bg-foreground/80 shadow-2xl overflow-hidden">
          <div className="h-6 bg-foreground/80 flex items-center justify-center">
            <div className="h-1 w-16 rounded-full bg-background/40" />
          </div>
          <div className="bg-black" style={{ height: 640 }}>
            <iframe
              key={reloadKey}
              src={`/bio/${bio.slug}?embed=1`}
              title="Preview Roxou Bio"
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Preview em tempo real · /bio/{bio.slug}
        </p>
      </div>
    </div>
  );
}

/* ============ TABS WRAPPER ============ */
export function BioTabsContainer({
  bio,
  partnerId,
  tab,
  onTabChange,
  onBioUpdated,
}: {
  bio: BioProfile;
  partnerId: string;
  tab: string;
  onTabChange: (t: string) => void;
  onBioUpdated: (b: BioProfile) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="menu">Cardápio</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="qr">QR</TabsTrigger>
        <TabsTrigger value="compartilhar">Compartilhar</TabsTrigger>
        <TabsTrigger value="configuracoes">Módulos</TabsTrigger>
      </TabsList>
      <TabsContent value="home" className="mt-4">
        <BioHomeTab bio={bio} partnerId={partnerId} />
      </TabsContent>
      <TabsContent value="perfil" className="mt-4">
        <BioProfileTab bio={bio} onUpdated={onBioUpdated} />
      </TabsContent>
      <TabsContent value="links" className="mt-4">
        <BioLinksTab bio={bio} />
      </TabsContent>
      <TabsContent value="menu" className="mt-4">
        <BioMenuTab bio={bio} />
      </TabsContent>
      <TabsContent value="analytics" className="mt-4">
        <BioAnalyticsTab bio={bio} />
      </TabsContent>
      <TabsContent value="qr" className="mt-4">
        <BioQrTab bio={bio} />
      </TabsContent>
      <TabsContent value="compartilhar" className="mt-4">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Central de compartilhamento — copie o link, envie no WhatsApp, baixe o QR e use as legendas prontas.
          </div>
          <BioSharePanel bio={bio} />
          <BioQrTab bio={bio} />
        </div>
      </TabsContent>
      <TabsContent value="configuracoes" className="mt-4">
        <BioSettingsTab bio={bio} onUpdated={onBioUpdated} />
      </TabsContent>
    </Tabs>
  );
}
