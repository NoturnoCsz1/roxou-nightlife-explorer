/**
 * PartnerBioHubPage — /bio (Partner Pro, backend OFICIAL)
 *
 * Editor completo da Roxou Bio do estabelecimento autenticado.
 *  - Configuração visual .... public.venue_bio_profiles (escrita só por RPC)
 *  - Identidade/slug ........ public.venues
 *  - Links .................. public.short_links (encurtador roxou.click)
 *  - Imagens ................ bucket oficial `venues` (nunca base64 no banco)
 *  - Eventos/Reservas/VIP/Sorteios ... módulos oficiais já existentes
 *
 * Zero dependência da base legada (bio_profiles / bio_links / bio_qr_codes).
 * A identidade vem do cache de sessão já otimizado (usePartnerSessionContext):
 * nenhuma nova resolução de sessão por rota.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Instagram,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PartnerScreen } from "../components/PartnerScreen";
import { usePartnerSessionContext } from "../contexts/PartnerSessionContext";
import {
  getVenueProfile,
  uploadVenueImage,
  type VenueProfileRow,
} from "../services/partnerProfile";
import {
  BIO_LINK_ICONS,
  BIO_THEMES,
  bioLinkUrl,
  bioPublicUrl,
  createBioLink,
  createVenueBio,
  getVenueBio,
  listBioCandidateLinks,
  MAX_INSTAGRAM_POSTS,
  publishVenueBio,
  removeBioLink,
  reorderBioLinks,
  setLinkOnBio,
  unpublishVenueBio,
  updateBioLink,
  upsertVenueBio,
  type BioInstagramPost,
  type BioLinkIcon,
  type BioShortLink,
  type VenueBioPatch,
  type VenueBioProfile,
} from "@modules/partner/bio/converged/venueBioService";

type FormState = Required<
  Pick<
    VenueBioPatch,
    | "headline"
    | "about"
    | "theme"
    | "accent_color"
    | "avatar_url"
    | "cover_url"
    | "show_events"
    | "show_reservations"
    | "show_vip"
    | "show_giveaways"
    | "show_links"
    | "show_menu"
    | "show_address"
    | "show_whatsapp"
    | "show_instagram"
    | "show_website"
    | "show_map"
    | "show_hours"
    | "reservations_cta_url"
    | "vip_cta_url"
    | "primary_cta_label"
    | "primary_cta_url"
  >
> & { instagram_featured_posts: BioInstagramPost[] };

function toForm(bio: VenueBioProfile): FormState {
  return {
    headline: bio.headline ?? "",
    about: bio.about ?? "",
    theme: bio.theme,
    accent_color: bio.accent_color ?? "",
    avatar_url: bio.avatar_url ?? "",
    cover_url: bio.cover_url ?? "",
    show_events: bio.show_events,
    show_reservations: bio.show_reservations,
    show_vip: bio.show_vip,
    show_giveaways: bio.show_giveaways,
    show_links: bio.show_links,
    show_menu: bio.show_menu,
    show_address: bio.show_address ?? true,
    show_whatsapp: bio.show_whatsapp ?? true,
    show_instagram: bio.show_instagram ?? true,
    show_website: bio.show_website ?? true,
    show_map: bio.show_map ?? true,
    show_hours: bio.show_hours ?? false,
    reservations_cta_url: bio.reservations_cta_url ?? "",
    vip_cta_url: bio.vip_cta_url ?? "",
    primary_cta_label: bio.primary_cta_label ?? "",
    primary_cta_url: bio.primary_cta_url ?? "",
    instagram_featured_posts: Array.isArray(bio.instagram_featured_posts)
      ? bio.instagram_featured_posts
      : [],
  };
}

/** "Ferramentas na sua Bio" — cada item aponta para um módulo oficial. */
const TOOLS: {
  key: keyof FormState;
  label: string;
  hint: string;
  ctaKey?: "reservations_cta_url" | "vip_cta_url";
  disabled?: boolean;
}[] = [
  { key: "show_events", label: "Eventos", hint: "Agenda oficial do estabelecimento" },
  { key: "show_links", label: "Links", hint: "Encurtador oficial roxou.click" },
  {
    key: "show_reservations",
    label: "Reservas",
    hint: "Módulo oficial de reservas",
    ctaKey: "reservations_cta_url",
  },
  {
    key: "show_vip",
    label: "Lista VIP",
    hint: "Módulo oficial de listas VIP",
    ctaKey: "vip_cta_url",
  },
  { key: "show_giveaways", label: "Sorteios", hint: "Módulo oficial de sorteios" },
  {
    key: "show_menu",
    label: "Cardápio",
    hint: "Recurso ainda indisponível na Roxou",
    disabled: true,
  },
];

const INFO_FIELDS: {
  key: keyof FormState;
  label: string;
  value: (v: VenueProfileRow | null) => string | null;
}[] = [
  { key: "show_address", label: "Endereço", value: (v) => v?.address ?? v?.street ?? null },
  { key: "show_map", label: "Mapa / Como chegar", value: (v) => (v?.latitude ? "Localização cadastrada" : null) },
  { key: "show_whatsapp", label: "WhatsApp", value: (v) => v?.whatsapp ?? null },
  { key: "show_instagram", label: "Instagram", value: (v) => v?.instagram ?? null },
  { key: "show_website", label: "Site", value: (v) => v?.website ?? null },
  { key: "show_hours", label: "Horário de funcionamento", value: () => null },
];

const emptyLinkDraft = { title: "", slug: "", target_url: "", bio_icon: "link" as BioLinkIcon };

const PartnerBioHubPage = () => {
  const { session, isLoading: sessionLoading, venueId } = usePartnerSessionContext();
  const userId = session?.userId ?? null;
  const organizationId = session?.organizationId ?? null;

  const [venue, setVenue] = useState<VenueProfileRow | null>(null);
  const [bio, setBio] = useState<VenueBioProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [links, setLinks] = useState<BioShortLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState(emptyLinkDraft);
  const [igDraft, setIgDraft] = useState("");
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const [v, b] = await Promise.all([getVenueProfile(venueId), getVenueBio(venueId)]);
      setVenue(v);
      setBio(b);
      setForm(b ? toForm(b) : null);
      if (b && userId) setLinks(await listBioCandidateLinks(venueId, userId));
    } catch (err) {
      toast.error("Não foi possível carregar a Bio", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [venueId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const publicPath = venue?.slug ? `/p/${venue.slug}` : null;
  const publicUrl = venue?.slug ? bioPublicUrl(venue.slug) : null;

  const bioLinks = useMemo(
    () => links.filter((l) => l.show_on_bio && l.venue_id === venueId),
    [links, venueId],
  );
  const otherLinks = useMemo(
    () => links.filter((l) => !(l.show_on_bio && l.venue_id === venueId)),
    [links, venueId],
  );

  const patch = (changes: Partial<FormState>) =>
    setForm((prev) => (prev ? { ...prev, ...changes } : prev));

  async function handleCreate() {
    if (!userId || !venueId) return;
    setBusy(true);
    try {
      await createVenueBio(userId, venueId);
      toast.success("Bio criada. Configure e publique quando quiser.");
      await load();
    } catch (err) {
      toast.error("Não foi possível criar a Bio", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!userId || !venueId || !form) return;
    setBusy(true);
    try {
      await upsertVenueBio(userId, venueId, form);
      toast.success("Bio salva.");
      await load();
    } catch (err) {
      toast.error("Não foi possível salvar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish() {
    if (!userId || !venueId || !bio) return;
    setBusy(true);
    try {
      if (bio.is_published) {
        await unpublishVenueBio(userId, venueId);
        toast.success("Bio despublicada (rascunho).");
      } else {
        await publishVenueBio(userId, venueId);
        toast.success("Bio publicada.");
      }
      await load();
    } catch (err) {
      toast.error("Não foi possível alterar a publicação", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------- imagens */
  async function handleUpload(type: "logo" | "cover", file?: File | null) {
    if (!file || !organizationId) return;
    setUploading(type);
    try {
      const url = await uploadVenueImage(organizationId, file, type);
      patch(type === "logo" ? { avatar_url: url } : { cover_url: url });
      toast.success(
        type === "logo" ? "Logo enviada. Salve para aplicar." : "Capa enviada. Salve para aplicar.",
      );
    } catch (err) {
      toast.error("Não foi possível enviar a imagem", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(null);
    }
  }

  /* --------------------------------------------------------------- links */
  async function toggleLink(link: BioShortLink, next: boolean) {
    if (!venueId) return;
    try {
      await setLinkOnBio(link.id, venueId, next);
      await load();
    } catch (err) {
      toast.error("Não foi possível atualizar o link", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleCreateLink() {
    if (!venueId || !organizationId || !userId) return;
    setBusy(true);
    try {
      await createBioLink(linkDraft, venueId, organizationId, userId, bioLinks.length);
      toast.success("Link criado e adicionado à Bio.");
      setLinkDraft(emptyLinkDraft);
      setCreatingLink(false);
      await load();
    } catch (err) {
      toast.error("Não foi possível criar o link", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkIcon(link: BioShortLink, icon: BioLinkIcon) {
    if (!venueId) return;
    try {
      await updateBioLink(link.id, venueId, { bio_icon: icon });
      await load();
    } catch (err) {
      toast.error("Não foi possível atualizar o ícone", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleRemoveLink(link: BioShortLink) {
    if (!venueId) return;
    try {
      await removeBioLink(link.id, venueId);
      toast.success("Link removido da Bio.");
      await load();
    } catch (err) {
      toast.error("Não foi possível remover o link", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!venueId) return;
    const next = [...bioLinks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLinks((prev) => [...next, ...prev.filter((l) => !next.some((n) => n.id === l.id))]);
    try {
      await reorderBioLinks(
        venueId,
        next.map((l) => l.id),
      );
      await load();
    } catch (err) {
      toast.error("Não foi possível reordenar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  /* ----------------------------------------------------------- instagram */
  function addInstagramPost() {
    if (!form) return;
    const url = igDraft.trim();
    if (!url) return;
    if (form.instagram_featured_posts.length >= MAX_INSTAGRAM_POSTS) {
      toast.error(`Máximo de ${MAX_INSTAGRAM_POSTS} publicações.`);
      return;
    }
    patch({
      instagram_featured_posts: [
        ...form.instagram_featured_posts,
        { url, enabled: true, position: form.instagram_featured_posts.length },
      ],
    });
    setIgDraft("");
  }

  function removeInstagramPost(index: number) {
    if (!form) return;
    patch({
      instagram_featured_posts: form.instagram_featured_posts
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, position: i })),
    });
  }

  if (sessionLoading || loading) {
    return (
      <PartnerScreen title="Roxou Bio">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </PartnerScreen>
    );
  }

  if (!venueId) {
    return (
      <PartnerScreen title="Roxou Bio">
        <p className="text-sm text-muted-foreground">
          Nenhum estabelecimento resolvido na sessão.
        </p>
      </PartnerScreen>
    );
  }

  if (!bio || !form) {
    return (
      <PartnerScreen title="Roxou Bio" subtitle={venue?.name ?? undefined}>
        <section className="rounded-2xl border border-border/50 bg-card/40 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Crie sua Roxou Bio</h2>
          <p className="text-sm text-muted-foreground">
            Uma página única com a identidade do seu estabelecimento, seus eventos e
            seus links do roxou.click. Nada é duplicado: tudo vem dos módulos oficiais.
          </p>
          {venue?.slug ? (
            <p className="text-xs text-muted-foreground">
              Endereço público:{" "}
              <span className="font-mono break-all">{bioPublicUrl(venue.slug)}</span>
            </p>
          ) : null}
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? "Criando…" : "Criar minha Bio"}
          </Button>
        </section>
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Roxou Bio"
      subtitle={venue?.name ?? undefined}
      right={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={busy}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={busy}>
            <Save className="mr-1 h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      }
    >
      {/* Publicação */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={bio.is_published ? "default" : "secondary"}>
                {bio.is_published ? "Publicada" : "Rascunho"}
              </Badge>
              {bio.published_at ? (
                <span className="text-[11px] text-muted-foreground">
                  desde {new Date(bio.published_at).toLocaleDateString("pt-BR")}
                </span>
              ) : null}
            </div>
            {publicUrl ? (
              <p className="mt-1 break-all text-xs font-mono text-muted-foreground">
                {publicUrl}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-500">
                Estabelecimento sem slug oficial — fale com a Roxou.
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant={bio.is_published ? "outline" : "default"}
            onClick={togglePublish}
            disabled={busy}
          >
            {bio.is_published ? (
              <>
                <EyeOff className="mr-1 h-3.5 w-3.5" /> Despublicar
              </>
            ) : (
              <>
                <Eye className="mr-1 h-3.5 w-3.5" /> Publicar
              </>
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Visualizar minha Bio
            </a>
          ) : null}
          {publicPath ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir versão de teste
            </a>
          ) : null}
        </div>
      </section>

      {/* Conteúdo */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-4">
        <h2 className="text-sm font-semibold">Conteúdo</h2>
        <div className="space-y-1.5">
          <Label htmlFor="headline">Chamada</Label>
          <Input
            id="headline"
            value={form.headline}
            maxLength={120}
            onChange={(e) => patch({ headline: e.target.value })}
            placeholder="A noite começa aqui"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about">Sobre</Label>
          <Textarea
            id="about"
            rows={4}
            value={form.about}
            onChange={(e) => patch({ about: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cta-label">Botão principal — texto</Label>
            <Input
              id="cta-label"
              value={form.primary_cta_label}
              onChange={(e) => patch({ primary_cta_label: e.target.value })}
              placeholder="Comprar ingresso"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cta-url">Botão principal — URL</Label>
            <Input
              id="cta-url"
              value={form.primary_cta_url}
              onChange={(e) => patch({ primary_cta_url: e.target.value })}
              placeholder="https://roxou.click/meu-link"
            />
          </div>
        </div>
      </section>

      {/* Identidade visual */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-4">
        <h2 className="text-sm font-semibold">Identidade visual</h2>
        <div className="space-y-1.5">
          <Label>Tema</Label>
          <div className="flex flex-wrap gap-2">
            {BIO_THEMES.map((t) => (
              <Button
                key={t.value}
                type="button"
                size="sm"
                variant={form.theme === t.value ? "default" : "outline"}
                onClick={() => patch({ theme: t.value })}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accent">Cor de destaque (#RRGGBB)</Label>
          <div className="flex items-center gap-2">
            <span
              className="h-9 w-9 shrink-0 rounded-lg border border-border/60"
              style={{ backgroundColor: form.accent_color || "#A020F0" }}
            />
            <Input
              id="accent"
              value={form.accent_color}
              onChange={(e) => patch({ accent_color: e.target.value })}
              placeholder="#A020F0"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo · 1080x1080</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                {(form.avatar_url || venue?.logo_url) ? (
                  <img
                    src={form.avatar_url || venue?.logo_url || ""}
                    alt="Logo da Bio"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading !== null}
                  onClick={() => logoInput.current?.click()}
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  {uploading === "logo" ? "Enviando…" : "Enviar logo"}
                </Button>
                {form.avatar_url ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => patch({ avatar_url: "" })}
                  >
                    Usar a oficial
                  </Button>
                ) : null}
              </div>
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload("logo", e.target.files?.[0])}
              />
            </div>
          </div>

          {/* Capa */}
          <div className="space-y-2">
            <Label>Capa · 1600x600</Label>
            <div className="space-y-2">
              <div className="h-20 w-full overflow-hidden rounded-xl border border-border/60 bg-muted">
                {(form.cover_url || venue?.cover_image) ? (
                  <img
                    src={form.cover_url || venue?.cover_image || ""}
                    alt="Capa da Bio"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading !== null}
                  onClick={() => coverInput.current?.click()}
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  {uploading === "cover" ? "Enviando…" : "Enviar capa"}
                </Button>
                {form.cover_url ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => patch({ cover_url: "" })}
                  >
                    Usar a oficial
                  </Button>
                ) : null}
              </div>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload("cover", e.target.files?.[0])}
              />
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Sem imagem própria, a Bio usa a logo e a capa oficiais do estabelecimento.
          As imagens ficam no armazenamento oficial da Roxou.
        </p>
      </section>

      {/* Informações do estabelecimento */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Informações do estabelecimento</h2>
        <p className="text-[11px] text-muted-foreground">
          Os dados vêm do seu cadastro oficial. Para alterar o conteúdo, edite o
          Perfil — aqui você escolhe apenas o que aparece na Bio.
        </p>
        {INFO_FIELDS.map((f) => {
          const value = f.value(venue);
          return (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">{f.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {value || "Não cadastrado no perfil"}
                </p>
              </div>
              <Switch
                checked={Boolean(form[f.key])}
                onCheckedChange={(v) => patch({ [f.key]: v } as Partial<FormState>)}
              />
            </div>
          );
        })}
      </section>

      {/* Ferramentas na sua Bio */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Ferramentas na sua Bio</h2>
        {TOOLS.map((tool) => (
          <div key={tool.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">{tool.label}</p>
                <p className="text-[11px] text-muted-foreground">{tool.hint}</p>
              </div>
              <Switch
                checked={Boolean(form[tool.key])}
                disabled={tool.disabled}
                onCheckedChange={(v) => patch({ [tool.key]: v } as Partial<FormState>)}
              />
            </div>
            {tool.ctaKey && form[tool.key] ? (
              <Input
                value={String(form[tool.ctaKey] ?? "")}
                onChange={(e) =>
                  patch({ [tool.ctaKey as string]: e.target.value } as Partial<FormState>)
                }
                placeholder={`Link do botão de ${tool.label.toLowerCase()} (https://...)`}
              />
            ) : null}
          </div>
        ))}
      </section>

      {/* Links na Bio */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4" /> Links na Bio
          </h2>
          {!creatingLink ? (
            <Button size="sm" variant="outline" onClick={() => setCreatingLink(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar link
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Todo link usa o encurtador oficial: o clique passa por roxou.click e é
          contabilizado no relatório que você já tem.
        </p>

        {creatingLink ? (
          <div className="space-y-3 rounded-xl border border-border/40 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nl-title">Nome do botão</Label>
                <Input
                  id="nl-title"
                  value={linkDraft.title}
                  onChange={(e) => setLinkDraft({ ...linkDraft, title: e.target.value })}
                  placeholder="Comprar ingresso"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nl-slug">Código (roxou.click/…)</Label>
                <Input
                  id="nl-slug"
                  value={linkDraft.slug}
                  onChange={(e) => setLinkDraft({ ...linkDraft, slug: e.target.value })}
                  placeholder="minha-festa"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nl-url">Para onde leva</Label>
                <Input
                  id="nl-url"
                  value={linkDraft.target_url}
                  onChange={(e) => setLinkDraft({ ...linkDraft, target_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BIO_LINK_ICONS.map((icon) => (
                <Button
                  key={icon.value}
                  type="button"
                  size="sm"
                  variant={linkDraft.bio_icon === icon.value ? "default" : "outline"}
                  onClick={() => setLinkDraft({ ...linkDraft, bio_icon: icon.value })}
                >
                  {icon.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateLink} disabled={busy}>
                Criar link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCreatingLink(false);
                  setLinkDraft(emptyLinkDraft);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {bioLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum link na Bio ainda.</p>
        ) : (
          <ul className="space-y-2">
            {bioLinks.map((l, i) => (
              <li key={l.id} className="space-y-2 rounded-lg border border-border/40 p-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{l.title || l.slug}</p>
                    <p className="truncate text-[11px] font-mono text-muted-foreground">
                      {bioLinkUrl(l.slug)} · {l.clicks_count ?? 0} cliques
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === bioLinks.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Switch checked onCheckedChange={() => toggleLink(l, false)} />
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveLink(l)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {BIO_LINK_ICONS.map((icon) => (
                    <Button
                      key={icon.value}
                      type="button"
                      size="sm"
                      variant={l.bio_icon === icon.value ? "secondary" : "ghost"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleLinkIcon(l, icon.value)}
                    >
                      {icon.label}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        {otherLinks.length > 0 ? (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">Outros links disponíveis</p>
            {otherLinks.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-lg border border-border/30 p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{l.title || l.slug}</p>
                  <p className="truncate text-[11px] font-mono text-muted-foreground">
                    {bioLinkUrl(l.slug)}
                  </p>
                </div>
                <Switch checked={false} onCheckedChange={() => toggleLink(l, true)} />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Instagram e redes sociais */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Instagram className="h-4 w-4" /> Instagram e redes sociais
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Cole o endereço de até {MAX_INSTAGRAM_POSTS} publicações ou reels para
          destacar na Bio. Nada é importado automaticamente do Instagram.
        </p>
        <div className="flex gap-2">
          <Input
            value={igDraft}
            onChange={(e) => setIgDraft(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addInstagramPost}
            disabled={form.instagram_featured_posts.length >= MAX_INSTAGRAM_POSTS}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {form.instagram_featured_posts.map((post, i) => (
          <div
            key={`${post.url}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-border/40 p-2"
          >
            <p className="min-w-0 flex-1 truncate text-[11px] font-mono text-muted-foreground">
              {post.url}
            </p>
            <Switch
              checked={post.enabled}
              onCheckedChange={(v) =>
                patch({
                  instagram_featured_posts: form.instagram_featured_posts.map((p, idx) =>
                    idx === i ? { ...p, enabled: v } : p,
                  ),
                })
              }
            />
            <Button size="icon" variant="ghost" onClick={() => removeInstagramPost(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {venue?.instagram ? (
          <p className="text-[11px] text-muted-foreground">
            Perfil oficial exibido na Bio: @{venue.instagram.replace(/^@/, "")}
          </p>
        ) : null}
      </section>
    </PartnerScreen>
  );
};

export default PartnerBioHubPage;
