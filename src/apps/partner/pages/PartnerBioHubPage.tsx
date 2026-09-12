/**
 * PartnerBioHubPage — /bio (Partner Pro, backend OFICIAL)
 *
 * Editor da Roxou Bio do estabelecimento autenticado.
 *  - Configuração visual .... public.venue_bio_profiles (escrita só por RPC)
 *  - Identidade/slug ........ public.venues
 *  - Links .................. public.short_links (roxou.click)
 *  - Eventos/Reservas/VIP/Sorteios ... módulos oficiais já existentes
 *
 * Zero dependência da base legada (bio_profiles / bio_links / bio_qr_codes).
 * A identidade vem do cache de sessão já otimizado (usePartnerSessionContext):
 * nenhuma nova resolução de sessão por rota.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  RefreshCw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PartnerScreen } from "../components/PartnerScreen";
import { usePartnerSessionContext } from "../contexts/PartnerSessionContext";
import { getVenueProfile, type VenueProfileRow } from "../services/partnerProfile";
import {
  BIO_THEMES,
  bioLinkUrl,
  bioPublicUrl,
  createVenueBio,
  getVenueBio,
  listBioCandidateLinks,
  publishVenueBio,
  reorderBioLinks,
  setLinkOnBio,
  unpublishVenueBio,
  upsertVenueBio,
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
    | "primary_cta_label"
    | "primary_cta_url"
  >
>;

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
    primary_cta_label: bio.primary_cta_label ?? "",
    primary_cta_url: bio.primary_cta_url ?? "",
  };
}

const MODULES: { key: keyof FormState; label: string; hint?: string }[] = [
  { key: "show_events", label: "Eventos", hint: "Agenda oficial do estabelecimento" },
  { key: "show_links", label: "Links", hint: "Encurtador roxou.click" },
  { key: "show_reservations", label: "Reservas", hint: "Módulo oficial de reservas" },
  { key: "show_vip", label: "Lista VIP", hint: "Módulo oficial de listas" },
  { key: "show_giveaways", label: "Sorteios", hint: "Módulo oficial de sorteios" },
  {
    key: "show_menu",
    label: "Cardápio",
    hint: "Recurso ainda não disponível na Roxou",
  },
];

const PartnerBioHubPage = () => {
  const { session, isLoading: sessionLoading, venueId } = usePartnerSessionContext();
  const userId = session?.userId ?? null;

  const [venue, setVenue] = useState<VenueProfileRow | null>(null);
  const [bio, setBio] = useState<VenueBioProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [links, setLinks] = useState<BioShortLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

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
              Endereço público: <span className="font-mono">{bioPublicUrl(venue.slug)}</span>
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
        <div className="flex items-center justify-between gap-3">
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
              <p className="mt-1 truncate text-xs text-muted-foreground font-mono">
                {publicUrl}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-500">
                Estabelecimento sem slug oficial — fale com a Roxou.
              </p>
            )}
          </div>
          <Button size="sm" variant={bio.is_published ? "outline" : "default"} onClick={togglePublish} disabled={busy}>
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
        {publicPath ? (
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir página pública (teste)
          </a>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          O domínio parceiro.click ainda não está ativo no servidor; a página já
          funciona nesta build para teste.
        </p>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="accent">Cor de destaque (#RRGGBB)</Label>
            <Input
              id="accent"
              value={form.accent_color}
              onChange={(e) => patch({ accent_color: e.target.value })}
              placeholder="#A020F0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar">Logo (opcional)</Label>
            <Input
              id="avatar"
              value={form.avatar_url}
              onChange={(e) => patch({ avatar_url: e.target.value })}
              placeholder={venue?.logo_url ?? "Usa a logo do estabelecimento"}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cover">Capa (opcional)</Label>
            <Input
              id="cover"
              value={form.cover_url}
              onChange={(e) => patch({ cover_url: e.target.value })}
              placeholder={venue?.cover_image ?? "Usa a capa do estabelecimento"}
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Deixe em branco para usar a logo e a capa oficiais do estabelecimento.
        </p>
      </section>

      {/* Módulos */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Blocos exibidos</h2>
        {MODULES.map((m) => (
          <div key={m.key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{m.label}</p>
              {m.hint ? (
                <p className="text-[11px] text-muted-foreground">{m.hint}</p>
              ) : null}
            </div>
            <Switch
              checked={Boolean(form[m.key])}
              disabled={m.key === "show_menu"}
              onCheckedChange={(v) => patch({ [m.key]: v } as Partial<FormState>)}
            />
          </div>
        ))}
      </section>

      {/* Links */}
      <section className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Links na Bio
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Os links são os do encurtador oficial. Todo clique continua passando por
          roxou.click e contabilizando no tracking existente.
        </p>

        {bioLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum link na Bio ainda.</p>
        ) : (
          <ul className="space-y-2">
            {bioLinks.map((l, i) => (
              <li
                key={l.id}
                className="flex items-center gap-2 rounded-lg border border-border/40 p-2"
              >
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
    </PartnerScreen>
  );
};

export default PartnerBioHubPage;
