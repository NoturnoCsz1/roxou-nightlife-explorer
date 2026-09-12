/**
 * Roxou Bio — serviço OFICIAL (Supabase oficial do Partner Pro).
 *
 * Fonte única de verdade:
 *   configuração visual .... public.venue_bio_profiles
 *   identidade/slug ........ public.venues (+ venues.slug)
 *   links .................. public.short_links (encurtador roxou.click)
 *   eventos ................ public.events
 *   página pública ......... RPC public.public_get_venue_bio(slug)
 *
 * Escrita da Bio EXCLUSIVAMENTE via RPC `partner_upsert_venue_bio`.
 * Nenhum INSERT/UPDATE direto em `venue_bio_profiles` pela interface.
 * Nenhuma dependência da base legada (bio_profiles/bio_links/bio_qr_codes).
 */
import { officialClient } from "@modules/partner/converged/client";
import { SHORT_LINK_BASE_URL } from "@modules/partner/growth/converged/shortLinksOfficialService";

export const BIO_TABLE = "venue_bio_profiles" as const;
export const BIO_UPSERT_RPC = "partner_upsert_venue_bio" as const;
export const BIO_PUBLIC_RPC = "public_get_venue_bio" as const;
export const SHORT_LINKS_TABLE = "short_links" as const;

/** Domínio público oficial da Roxou Bio. */
export const BIO_PUBLIC_BASE_URL = "https://parceiro.roxou.click";

export const BIO_THEMES = [
  { value: "roxou_dark", label: "Roxou Dark" },
  { value: "roxou_neon", label: "Roxou Neon" },
  { value: "minimal_light", label: "Minimal Light" },
  { value: "minimal_dark", label: "Minimal Dark" },
] as const;

export type BioTheme = (typeof BIO_THEMES)[number]["value"];

/** Post do Instagram destacado manualmente (sem Meta API, sem scraper). */
export interface BioInstagramPost {
  url: string;
  enabled: boolean;
  position: number;
}

export interface VenueBioProfile {
  id: string;
  organization_id: string;
  venue_id: string;
  headline: string | null;
  about: string | null;
  theme: BioTheme;
  accent_color: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  show_events: boolean;
  show_reservations: boolean;
  show_vip: boolean;
  show_giveaways: boolean;
  show_links: boolean;
  show_menu: boolean;
  show_address: boolean;
  show_whatsapp: boolean;
  show_instagram: boolean;
  show_website: boolean;
  show_map: boolean;
  show_hours: boolean;
  instagram_featured_posts: BioInstagramPost[] | null;
  primary_cta_label: string | null;
  primary_cta_url: string | null;
  is_published: boolean;
  published_at: string | null;
  updated_at: string | null;
}

export type VenueBioPatch = Partial<
  Pick<
    VenueBioProfile,
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
    | "instagram_featured_posts"
    | "primary_cta_label"
    | "primary_cta_url"
    | "is_published"
  >
>;

const BIO_SELECT =
  "id, organization_id, venue_id, headline, about, theme, accent_color, avatar_url, cover_url, show_events, show_reservations, show_vip, show_giveaways, show_links, show_menu, show_address, show_whatsapp, show_instagram, show_website, show_map, show_hours, instagram_featured_posts, primary_cta_label, primary_cta_url, is_published, published_at, updated_at";

const PATCH_KEYS: (keyof VenueBioPatch)[] = [
  "headline",
  "about",
  "theme",
  "accent_color",
  "avatar_url",
  "cover_url",
  "show_events",
  "show_reservations",
  "show_vip",
  "show_giveaways",
  "show_links",
  "show_menu",
  "show_address",
  "show_whatsapp",
  "show_instagram",
  "show_website",
  "show_map",
  "show_hours",
  "instagram_featured_posts",
  "primary_cta_label",
  "primary_cta_url",
  "is_published",
];

/** Máximo de posts do Instagram destacados na Bio. */
export const MAX_INSTAGRAM_POSTS = 6;

export function isInstagramPostUrl(value: string): boolean {
  return /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/.test(
    value.trim(),
  );
}

/** Normaliza a lista de posts: valida URL, limita a 6 e reindexa posições. */
export function normalizeInstagramPosts(
  posts: BioInstagramPost[],
): BioInstagramPost[] {
  const out: BioInstagramPost[] = [];
  for (const post of posts) {
    const url = (post?.url ?? "").trim();
    if (!url) continue;
    if (!isInstagramPostUrl(url)) {
      throw new Error("Link do Instagram inválido. Use o endereço do post ou reel.");
    }
    out.push({ url, enabled: post.enabled !== false, position: out.length });
    if (out.length >= MAX_INSTAGRAM_POSTS) break;
  }
  return out;
}

/* ------------------------------------------------------------ validação UI */
/** Guarda-corpo de UI. A validação definitiva é do banco (CHECK constraints). */
export function isHexColor(value: string | null | undefined): boolean {
  return value == null || value === "" || /^#[0-9a-fA-F]{6}$/.test(value);
}

export function isSafePublicUrl(value: string | null | undefined): boolean {
  return value == null || value === "" || /^https?:\/\/[^\s<>"']+$/i.test(value);
}

/** URL pública conceitual da Bio a partir do slug oficial do venue. */
export function bioPublicUrl(slug: string): string {
  return `${BIO_PUBLIC_BASE_URL}/${slug}`;
}

/** URL oficial do encurtador (todo clique público passa por aqui). */
export function bioLinkUrl(slug: string): string {
  return `${SHORT_LINK_BASE_URL}/${slug}`;
}

/**
 * Normaliza o patch: remove chaves não permitidas e `undefined`, trima textos
 * (string vazia vira `null` => limpa o campo), e valida cor/URLs.
 */
export function buildBioPatch(raw: VenueBioPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PATCH_KEYS) {
    if (!(key in raw)) continue;
    const value = raw[key] as unknown;
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      out[key] = trimmed === "" ? null : trimmed;
      continue;
    }
    out[key] = value;
  }

  if (typeof out.theme === "string" && !BIO_THEMES.some((t) => t.value === out.theme)) {
    throw new Error("Tema inválido.");
  }
  if (out.theme === null) throw new Error("Tema é obrigatório.");
  if ("accent_color" in out && !isHexColor(out.accent_color as string | null)) {
    throw new Error("Cor inválida. Use o formato #RRGGBB.");
  }
  for (const urlKey of [
    "avatar_url",
    "cover_url",
    "primary_cta_url",
  ] as const) {
    if (urlKey in out && !isSafePublicUrl(out[urlKey] as string | null)) {
      throw new Error("URL inválida. Use http:// ou https://.");
    }
  }
  if ("instagram_featured_posts" in out) {
    const posts = out.instagram_featured_posts;
    if (!Array.isArray(posts)) {
      throw new Error("Lista de posts do Instagram inválida.");
    }
    out.instagram_featured_posts = normalizeInstagramPosts(
      posts as BioInstagramPost[],
    );
  }
  return out;
}

/* ------------------------------------------------------------------ leitura */
export async function getVenueBio(venueId: string): Promise<VenueBioProfile | null> {
  if (!venueId) return null;
  const { data, error } = await officialClient()
    .from(BIO_TABLE)
    .select(BIO_SELECT)
    .eq("venue_id", venueId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[Bio] getVenueBio failed:", error);
    throw error;
  }
  return (data as unknown as VenueBioProfile | null) ?? null;
}

/* ------------------------------------------------------------------ escrita */
export async function upsertVenueBio(
  callerId: string,
  venueId: string,
  patch: VenueBioPatch,
): Promise<string | null> {
  if (!callerId) throw new Error("Sessão não autenticada.");
  if (!venueId) throw new Error("Estabelecimento não resolvido na sessão.");
  const payload = buildBioPatch(patch);
  const { data, error } = await officialClient().rpc(BIO_UPSERT_RPC, {
    _caller_id: callerId,
    _venue_id: venueId,
    _patch: payload,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Cria a Bio (registro mínimo) sem publicar. */
export async function createVenueBio(callerId: string, venueId: string) {
  return upsertVenueBio(callerId, venueId, { is_published: false });
}

/** Publicação: `published_at` é sempre do trigger do banco. */
export function publishVenueBio(callerId: string, venueId: string) {
  return upsertVenueBio(callerId, venueId, { is_published: true });
}

export function unpublishVenueBio(callerId: string, venueId: string) {
  return upsertVenueBio(callerId, venueId, { is_published: false });
}

/* -------------------------------------------------------------------- links */
/** Ícones aceitos pelo banco (`short_links.bio_icon`). */
export const BIO_LINK_ICONS = [
  { value: "ticket", label: "Ingresso" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Site" },
  { value: "menu", label: "Cardápio" },
  { value: "map", label: "Como chegar" },
  { value: "shop", label: "Loja" },
  { value: "info", label: "Informação" },
  { value: "link", label: "Link" },
] as const;

export type BioLinkIcon = (typeof BIO_LINK_ICONS)[number]["value"];

export interface BioShortLink {
  id: string;
  title: string | null;
  slug: string;
  target_url: string;
  is_active: boolean;
  clicks_count: number | null;
  venue_id: string | null;
  show_on_bio: boolean;
  bio_position: number;
  bio_icon: BioLinkIcon | null;
}

const LINK_SELECT =
  "id, title, slug, target_url, is_active, clicks_count, venue_id, show_on_bio, bio_position, bio_icon, created_at";

/** Links do estabelecimento + links do usuário ainda sem vínculo de venue. */
export async function listBioCandidateLinks(
  venueId: string,
  userId: string,
): Promise<BioShortLink[]> {
  if (!venueId) return [];
  const { data, error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .select(LINK_SELECT)
    .or(`venue_id.eq.${venueId},and(venue_id.is.null,created_by.eq.${userId})`)
    .order("bio_position", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as BioShortLink[];
}

/** Vincula/desvincula o link à Bio do estabelecimento (tenancy é do banco). */
export async function setLinkOnBio(
  linkId: string,
  venueId: string,
  showOnBio: boolean,
): Promise<void> {
  const { error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .update(
      showOnBio
        ? { venue_id: venueId, show_on_bio: true }
        : { show_on_bio: false },
    )
    .eq("id", linkId);
  if (error) throw error;
}

export async function reorderBioLinks(
  venueId: string,
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await officialClient()
      .from(SHORT_LINKS_TABLE)
      .update({ bio_position: i })
      .eq("id", orderedIds[i])
      .eq("venue_id", venueId);
    if (error) throw error;
  }
}

export interface BioLinkInput {
  title: string;
  slug: string;
  target_url: string;
  bio_icon?: BioLinkIcon | null;
}

/** Normaliza o código do link (mesma regra do encurtador oficial). */
export function normalizeBioLinkSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Cria um link novo já vinculado à Bio. O link continua sendo um registro
 * normal do encurtador oficial (roxou.click) — nenhuma tabela paralela.
 */
export async function createBioLink(
  input: BioLinkInput,
  venueId: string,
  organizationId: string,
  userId: string,
  position: number,
): Promise<BioShortLink> {
  const slug = normalizeBioLinkSlug(input.slug || input.title);
  if (!slug) throw new Error("Informe um código para o link.");
  const target = input.target_url?.trim();
  if (!isSafePublicUrl(target) || !target) {
    throw new Error("Informe uma URL de destino válida (https://...).");
  }

  const { data, error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .insert({
      title: input.title?.trim() || null,
      slug,
      target_url: target,
      is_active: true,
      created_by: userId,
      venue_id: venueId,
      organization_id: organizationId,
      show_on_bio: true,
      bio_position: position,
      bio_icon: input.bio_icon ?? null,
    })
    .select(LINK_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as BioShortLink;
}

export async function updateBioLink(
  linkId: string,
  venueId: string,
  patch: Partial<Pick<BioShortLink, "title" | "target_url" | "bio_icon" | "is_active">>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if ("title" in patch) payload.title = patch.title?.trim() || null;
  if ("bio_icon" in patch) payload.bio_icon = patch.bio_icon ?? null;
  if ("is_active" in patch) payload.is_active = patch.is_active;
  if ("target_url" in patch) {
    const target = patch.target_url?.trim();
    if (!target || !isSafePublicUrl(target)) {
      throw new Error("Informe uma URL de destino válida (https://...).");
    }
    payload.target_url = target;
  }
  if (Object.keys(payload).length === 0) return;

  const { error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .update(payload)
    .eq("id", linkId)
    .eq("venue_id", venueId);
  if (error) throw error;
}

/** Remove o link da Bio sem apagar histórico de cliques do encurtador. */
export async function removeBioLink(
  linkId: string,
  venueId: string,
): Promise<void> {
  const { error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .update({ show_on_bio: false, is_active: false })
    .eq("id", linkId)
    .eq("venue_id", venueId);
  if (error) throw error;
}

/* ----------------------------------------------------------- página pública */
export interface PublicBioPayload {
  venue: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    street: string | null;
    address: string | null;
    instagram: string | null;
    whatsapp: string | null;
    website: string | null;
    opening_hours: Record<string, unknown> | null;
    description: string | null;
    logo_url: string | null;
    cover_url: string | null;
    latitude: number | null;
    longitude: number | null;
    verified: boolean | null;
  };
  bio: {
    headline: string | null;
    about: string | null;
    theme: BioTheme;
    accent_color: string | null;
    show_events: boolean;
    show_reservations: boolean;
    show_vip: boolean;
    show_giveaways: boolean;
    show_links: boolean;
    show_menu: boolean;
    show_map: boolean;
    primary_cta_label: string | null;
    primary_cta_url: string | null;
  };
  /** Links já vêm com `short_url` do roxou.click. `target_url` nunca é exposto. */
  links: {
    title: string | null;
    slug: string;
    icon: BioLinkIcon | null;
    short_url: string;
  }[];
  events: {
    id: string;
    title: string;
    slug: string | null;
    start_date: string | null;
    start_time: string | null;
    cover_image: string | null;
    ticket_url: string | null;
    is_free: boolean | null;
  }[];
  giveaways: {
    id: string;
    title: string | null;
    slug: string | null;
    prize_title: string | null;
    banner_url: string | null;
    starts_at: string | null;
    ends_at: string | null;
    status: string | null;
  }[];
  /**
   * Reservas/VIP: a Bio expõe apenas disponibilidade. A URL pública oficial
   * vive nas rotas /:partnerSlug/reservas e /:partnerSlug/vip, cujo slug vem
   * de `partners.slug` (base legada) e NÃO de `venues.slug` — por isso nenhuma
   * URL é derivada nem duplicada aqui.
   */
  reservations: { available: boolean } | null;
  vip: { available: boolean } | null;
  instagram_posts: { url: string }[];
}

/**
 * CTA do sorteio na Bio aponta para a página pública oficial do local
 * (`/local/{slug}`), única rota pública existente na Roxou — não há
 * rota pública de detalhe de sorteio no roteamento (publicRoutes.tsx).
 */
export function giveawayPublicUrl(venueSlug: string | null): string | null {
  return venueSlug ? `https://roxou.com.br/local/${venueSlug}` : null;
}

/** Única superfície de leitura da página pública. Nenhuma tabela protegida. */
export async function getPublicVenueBio(
  slug: string,
): Promise<PublicBioPayload | null> {
  if (!slug) return null;
  const { data, error } = await officialClient().rpc(BIO_PUBLIC_RPC, { _slug: slug });
  if (error) throw error;
  return (data as unknown as PublicBioPayload | null) ?? null;
}
