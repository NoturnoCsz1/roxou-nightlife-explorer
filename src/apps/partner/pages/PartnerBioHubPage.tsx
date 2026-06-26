/**
 * PartnerBioHubPage — /partner/bio
 *
 * Hub único com abas (perfil, links, menu, analytics, qr, configurações).
 * Sub-rotas /partner/bio/perfil etc. caem aqui via parâmetro tab.
 *
 * Não duplica nenhum sistema: usa exclusivamente `services/bio.ts`.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePartnerAuth } from "@/apps/partner/hooks/usePartnerAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getBioByPartner,
  createBioForPartner,
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
  getBioAnalyticsSummary,
  type BioProfile,
  type BioLink,
  type MenuCategory,
  type MenuItem,
  type BioQrCode,
} from "@/services/bio";
import { Trash2, Plus, ExternalLink, Copy } from "lucide-react";

const VALID_TABS = ["perfil", "links", "menu", "analytics", "qr", "configuracoes"] as const;
type TabId = (typeof VALID_TABS)[number];

export default function PartnerBioHubPage() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const tab: TabId = (VALID_TABS as readonly string[]).includes(params.tab ?? "")
    ? (params.tab as TabId)
    : "perfil";

  const { selectedPartner, selectedPartnerId } = usePartnerAuth();
  const [bio, setBio] = useState<BioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getBioByPartner(selectedPartnerId)
      .then(setBio)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [selectedPartnerId]);

  async function handleCreate() {
    if (!selectedPartnerId || !selectedPartner) return;
    setCreating(true);
    try {
      // Buscar dados extras direto da tabela partners
      const { data: p } = await supabase
        .from("partners")
        .select("id, name, slug, logo_url, cover_url, whatsapp, instagram, address, city, latitude, longitude")
        .eq("id", selectedPartnerId)
        .maybeSingle();
      const created = await createBioForPartner({
        id: selectedPartnerId,
        name: p?.name ?? selectedPartner.name,
        slug: (p?.slug as string | null) ?? selectedPartner.slug,
        logo_url: (p?.logo_url as string | null) ?? selectedPartner.logo_url,
        cover_url: (p?.cover_url as string | null) ?? null,
        whatsapp: (p?.whatsapp as string | null) ?? null,
        instagram: (p?.instagram as string | null) ?? null,
        address: (p?.address as string | null) ?? null,
        city: (p?.city as string | null) ?? selectedPartner.city,
        latitude: (p?.latitude as number | null) ?? null,
        longitude: (p?.longitude as number | null) ?? null,
      });
      setBio(created);
      toast.success("Bio criada!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!selectedPartnerId) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <p>Selecione um estabelecimento para gerenciar sua Bio Roxou.</p>
        </Card>
      </div>
    );
  }

  if (!bio) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border-purple-500/20">
          <h1 className="text-2xl font-bold">Crie sua Bio Roxou em 1 minuto</h1>
          <p className="text-muted-foreground">
            Uma página premium com seu cardápio, eventos, reservas, lista VIP e transportes — tudo automático.
          </p>
          <Button onClick={handleCreate} disabled={creating} size="lg">
            {creating ? "Criando..." : "Criar minha Bio"}
          </Button>
        </Card>
      </div>
    );
  }

  const publicUrl = `/bio/${bio.slug}`;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Roxou Bio</h1>
          <p className="text-sm text-muted-foreground">
            Sua bio pública:{" "}
            <Link to={publicUrl} target="_blank" rel="noopener noreferrer" className="underline">
              /bio/{bio.slug}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
              toast.success("Link copiado");
            }}
          >
            <Copy className="h-4 w-4 mr-1" /> Copiar link
          </Button>
          <Button asChild size="sm" variant="secondary">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Abrir
            </a>
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => navigate(`/bio/${v === "perfil" ? "" : v}`)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="menu">Cardápio</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="qr">QR</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil"><PerfilTab bio={bio} onUpdated={setBio} /></TabsContent>
        <TabsContent value="links"><LinksTab bio={bio} /></TabsContent>
        <TabsContent value="menu"><MenuTab bio={bio} /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab bio={bio} /></TabsContent>
        <TabsContent value="qr"><QrTab bio={bio} /></TabsContent>
        <TabsContent value="configuracoes"><ConfigTab bio={bio} onUpdated={setBio} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Perfil ---------------- */
function PerfilTab({ bio, onUpdated }: { bio: BioProfile; onUpdated: (b: BioProfile) => void }) {
  const [form, setForm] = useState(bio);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(bio), [bio]);

  async function save() {
    setSaving(true);
    try {
      await updateBio(bio.id, {
        display_name: form.display_name,
        headline: form.headline,
        bio: form.bio,
        avatar_url: form.avatar_url,
        cover_url: form.cover_url,
        whatsapp: form.whatsapp,
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube: form.youtube,
        spotify: form.spotify,
        website: form.website,
        address: form.address,
        city: form.city,
        theme: form.theme,
        accent_color: form.accent_color,
      });
      onUpdated({ ...bio, ...form });
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <Field label="Nome" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
      <Field label="Headline" value={form.headline ?? ""} onChange={(v) => setForm({ ...form, headline: v })} />
      <div className="space-y-1">
        <Label>Bio</Label>
        <Textarea value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Avatar URL" value={form.avatar_url ?? ""} onChange={(v) => setForm({ ...form, avatar_url: v })} />
        <Field label="Capa URL" value={form.cover_url ?? ""} onChange={(v) => setForm({ ...form, cover_url: v })} />
        <Field label="WhatsApp" value={form.whatsapp ?? ""} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="(18) 99999-9999" />
        <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => setForm({ ...form, instagram: v })} />
        <Field label="TikTok" value={form.tiktok ?? ""} onChange={(v) => setForm({ ...form, tiktok: v })} />
        <Field label="YouTube" value={form.youtube ?? ""} onChange={(v) => setForm({ ...form, youtube: v })} />
        <Field label="Website" value={form.website ?? ""} onChange={(v) => setForm({ ...form, website: v })} />
        <Field label="Cor de destaque" value={form.accent_color ?? ""} onChange={(v) => setForm({ ...form, accent_color: v })} placeholder="#a855f7" />
        <Field label="Endereço" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} />
        <Field label="Cidade" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
      </div>
      <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
    </Card>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------------- Links ---------------- */
function LinksTab({ bio }: { bio: BioProfile }) {
  const [links, setLinks] = useState<BioLink[]>([]);
  const [draft, setDraft] = useState({ title: "", url: "", description: "" });

  async function reload() {
    setLinks(await listLinksByBio(bio.id));
  }
  useEffect(() => { reload(); }, [bio.id]);

  async function add() {
    if (!draft.title || !draft.url) return;
    await upsertLink({ bio_id: bio.id, title: draft.title, url: draft.url, description: draft.description, position: links.length });
    setDraft({ title: "", url: "", description: "" });
    await reload();
  }

  async function toggle(l: BioLink) {
    await upsertLink({ ...l, is_active: !l.is_active });
    await reload();
  }

  async function remove(id: string) {
    await deleteLink(id);
    await reload();
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input placeholder="Título" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <Input placeholder="URL" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        <Input placeholder="Descrição (opcional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      </div>
      <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Adicionar link</Button>
      <div className="space-y-2">
        {links.map((l) => (
          <div key={l.id} className="flex items-center gap-2 rounded border p-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{l.title}</div>
              <div className="text-xs text-muted-foreground truncate">{l.url}</div>
            </div>
            <Badge variant="outline">{l.click_count} cliques</Badge>
            <Switch checked={l.is_active} onCheckedChange={() => toggle(l)} />
            <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {links.length === 0 && <p className="text-sm text-muted-foreground">Nenhum link ainda.</p>}
      </div>
    </Card>
  );
}

/* ---------------- Menu ---------------- */
function MenuTab({ bio }: { bio: BioProfile }) {
  const [cats, setCats] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: "", category_id: "", image_url: "", description: "" });

  async function reload() {
    const { categories, items } = await listMenu(bio.id);
    setCats(categories);
    setItems(items);
  }
  useEffect(() => { reload(); }, [bio.id]);

  async function addCat() {
    if (!newCat) return;
    await upsertCategory({ bio_id: bio.id, name: newCat, position: cats.length });
    setNewCat("");
    await reload();
  }

  async function addItem() {
    if (!newItem.name) return;
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

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Categorias</h3>
        <div className="flex gap-2">
          <Input placeholder="Nova categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button onClick={addCat}>Adicionar</Button>
        </div>
        <div className="space-y-1">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded border p-2">
              <div className="flex-1">{c.name}</div>
              <Switch checked={c.is_active} onCheckedChange={async (v) => { await upsertCategory({ ...c, is_active: v }); await reload(); }} />
              <Button size="icon" variant="ghost" onClick={async () => { await deleteCategory(c.id); await reload(); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Itens</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Nome" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          <Input placeholder="Preço" type="number" step="0.01" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={newItem.category_id}
            onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input placeholder="Imagem URL" value={newItem.image_url} onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Descrição" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
        </div>
        <Button onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded border p-2">
              {it.image_url && <img src={it.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">
                  {it.price != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(it.price) : "Sem preço"}
                </div>
              </div>
              <Switch checked={it.is_available} onCheckedChange={async (v) => { await upsertItem({ ...it, is_available: v }); await reload(); }} />
              <Button size="icon" variant="ghost" onClick={async () => { await deleteItem(it.id); await reload(); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Analytics ---------------- */
function AnalyticsTab({ bio }: { bio: BioProfile }) {
  const [s, setS] = useState<Awaited<ReturnType<typeof getBioAnalyticsSummary>> | null>(null);
  useEffect(() => { getBioAnalyticsSummary(bio.id).then(setS); }, [bio.id]);
  if (!s) return <Skeleton className="h-32" />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat label="Visitas hoje" value={s.views_today} />
      <Stat label="Visitas 7d" value={s.views_7d} />
      <Stat label="Cliques 7d" value={s.clicks_7d} />
      <Stat label="WhatsApp" value={s.whatsapp_clicks} />
      <Stat label="CTR" value={`${s.ctr}%`} />
    </div>
  );
}
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

/* ---------------- QR ---------------- */
function QrTab({ bio }: { bio: BioProfile }) {
  const [qrs, setQrs] = useState<BioQrCode[]>([]);
  const [draft, setDraft] = useState({ label: "", table_number: "" });

  async function reload() { setQrs(await listQrCodes(bio.id)); }
  useEffect(() => { reload(); }, [bio.id]);

  async function add() {
    const targetPath = draft.table_number ? `/bio/${bio.slug}/menu?mesa=${encodeURIComponent(draft.table_number)}` : `/bio/${bio.slug}`;
    await upsertQrCode({
      bio_id: bio.id,
      label: draft.label || (draft.table_number ? `Mesa ${draft.table_number}` : "Bio"),
      target_path: targetPath,
      table_number: draft.table_number || null,
    });
    setDraft({ label: "", table_number: "" });
    await reload();
  }

  const base = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input placeholder="Etiqueta" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <Input placeholder="Nº da mesa (opcional)" value={draft.table_number} onChange={(e) => setDraft({ ...draft, table_number: e.target.value })} />
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Gerar QR</Button>
      </div>
      <div className="space-y-2">
        {qrs.map((q) => {
          const fullUrl = `${base}${q.target_path}`;
          const png = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(fullUrl)}`;
          return (
            <div key={q.id} className="flex items-center gap-3 rounded border p-3">
              <img src={png} alt={q.label} className="h-20 w-20" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{q.label}</div>
                <div className="text-xs text-muted-foreground truncate">{fullUrl}</div>
                <div className="text-xs text-muted-foreground">{q.scan_count} leituras</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(fullUrl); toast.success("Link copiado"); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={png} download={`qr-${q.label}.png`}>PNG</a>
              </Button>
            </div>
          );
        })}
        {qrs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum QR criado ainda.</p>}
      </div>
    </Card>
  );
}

/* ---------------- Config ---------------- */
function ConfigTab({ bio, onUpdated }: { bio: BioProfile; onUpdated: (b: BioProfile) => void }) {
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

  const modules: Array<[keyof BioProfile, string]> = [
    ["show_events", "Eventos"],
    ["show_reservations", "Reservas"],
    ["show_vip", "Lista VIP"],
    ["show_transport", "Transportes"],
    ["show_menu", "Cardápio"],
    ["show_news", "Notícias"],
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Módulos visíveis</h3>
        {modules.map(([key, label]) => (
          <div key={key as string} className="flex items-center justify-between">
            <span>{label}</span>
            <Switch
              checked={Boolean(form[key])}
              disabled={saving}
              onCheckedChange={(v) => save({ [key]: v } as Partial<BioProfile>)}
            />
          </div>
        ))}
      </div>
      <div className="space-y-3 pt-3 border-t">
        <h3 className="font-semibold">CTA principal</h3>
        <Field label="Texto do botão" value={form.primary_cta_label ?? ""} onChange={(v) => setForm({ ...form, primary_cta_label: v })} />
        <Field label="URL do botão" value={form.primary_cta_url ?? ""} onChange={(v) => setForm({ ...form, primary_cta_url: v })} />
        <Button onClick={() => save({ primary_cta_label: form.primary_cta_label, primary_cta_url: form.primary_cta_url })} disabled={saving}>
          Salvar CTA
        </Button>
      </div>
      <div className="space-y-2 pt-3 border-t">
        <h3 className="font-semibold">Status</h3>
        <div className="flex items-center justify-between">
          <span>Bio ativa</span>
          <Switch checked={form.is_active} onCheckedChange={(v) => save({ is_active: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span>Bio pública</span>
          <Switch checked={form.is_public} onCheckedChange={(v) => save({ is_public: v })} />
        </div>
      </div>
    </Card>
  );
}
