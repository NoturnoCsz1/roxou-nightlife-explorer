/**
 * Encurtador — interface do Partner Pro sobre o Encurtador de Links Roxou
 * (roxou.click) OFICIAL.
 *
 * Fonte de verdade: tabela `short_links` do Supabase oficial, com cliques
 * reais em `clicks_count` / `last_clicked_at`. Nenhuma métrica é estimada.
 *
 * IMPORTANTE: a tabela oficial ainda NÃO possui `venue_id` /
 * `organization_id`, então o vínculo do parceiro é feito por `created_by`
 * (usuário autenticado da sessão). Quando a coluna de estabelecimento
 * existir no backend oficial, basta trocar o filtro aqui.
 */
import { officialClient } from "@modules/partner/converged/client";

export const SHORT_LINKS_TABLE = "short_links" as const;
export const SHORT_LINK_BASE_URL = "https://roxou.click";

export interface OfficialShortLink {
  id: string;
  title: string | null;
  slug: string;
  target_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  is_active: boolean;
  clicks_count: number | null;
  last_clicked_at: string | null;
  created_by: string | null;
  created_at: string;
}

const SELECT_COLS =
  "id, title, slug, target_url, utm_source, utm_medium, utm_campaign, is_active, clicks_count, last_clicked_at, created_by, created_at";

export function shortLinkUrl(slug: string): string {
  return `${SHORT_LINK_BASE_URL}/${slug}`;
}

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function listMyShortLinks(
  userId: string,
): Promise<OfficialShortLink[]> {
  if (!userId) return [];
  const { data, error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .select(SELECT_COLS)
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as OfficialShortLink[];
}

export interface ShortLinkInput {
  title?: string | null;
  slug: string;
  target_url: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export async function createShortLink(
  input: ShortLinkInput,
  userId: string,
): Promise<OfficialShortLink> {
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error("Informe um código para o link.");
  const target = input.target_url?.trim();
  if (!target || !/^https?:\/\//i.test(target)) {
    throw new Error("Informe uma URL de destino válida (https://...).");
  }

  const { data, error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .insert({
      title: input.title?.trim() || null,
      slug,
      target_url: target,
      utm_source: input.utm_source?.trim() || null,
      utm_medium: input.utm_medium?.trim() || null,
      utm_campaign: input.utm_campaign?.trim() || null,
      is_active: true,
      created_by: userId,
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return data as unknown as OfficialShortLink;
}

export async function setShortLinkActive(
  id: string,
  userId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await officialClient()
    .from(SHORT_LINKS_TABLE)
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("created_by", userId);
  if (error) throw error;
}
