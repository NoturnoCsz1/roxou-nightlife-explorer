/**
 * Roxou Bio — service layer (MVP)
 *
 * Camada única para acessar bio_profiles, bio_links, menu_categories,
 * menu_items, bio_qr_codes e bio_analytics_events. Não duplica lógica
 * de eventos/reservas/VIP/transportes — apenas consulta as tabelas
 * existentes via services já presentes.
 */
import { supabase } from "@/integrations/supabase/client";

export type BioType = "partner" | "event" | "creator" | "promoter" | "driver" | "campaign" | "roxou_official";

export interface BioProfile {
  id: string;
  partner_id: string | null;
  event_id: string | null;
  owner_user_id: string | null;
  type: BioType;
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  theme: string;
  accent_color: string | null;
  whatsapp: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  spotify: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  is_public: boolean;
  show_events: boolean;
  show_reservations: boolean;
  show_vip: boolean;
  show_transport: boolean;
  show_menu: boolean;
  show_news: boolean;
  primary_cta_label: string | null;
  primary_cta_url: string | null;
  metadata: Record<string, unknown>;
}

export interface BioLink {
  id: string;
  bio_id: string;
  title: string;
  description: string | null;
  url: string;
  icon: string | null;
  type: string;
  position: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  click_count: number;
}

export interface MenuCategory {
  id: string;
  partner_id: string | null;
  bio_id: string | null;
  name: string;
  description: string | null;
  position: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  partner_id: string | null;
  bio_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  tags: string[];
  is_featured: boolean;
  is_available: boolean;
  position: number;
}

export interface BioQrCode {
  id: string;
  bio_id: string;
  label: string;
  target_path: string;
  table_number: string | null;
  scan_count: number;
  is_active: boolean;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function getBioBySlug(slug: string): Promise<BioProfile | null> {
  const { data, error } = await supabase
    .from("bio_profiles" as never)
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BioProfile) ?? null;
}

export async function getBioById(id: string): Promise<BioProfile | null> {
  const { data, error } = await supabase
    .from("bio_profiles" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BioProfile) ?? null;
}

export async function getBioByPartner(partnerId: string): Promise<BioProfile | null> {
  const { data, error } = await supabase
    .from("bio_profiles" as never)
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BioProfile) ?? null;
}

export async function listLinksByBio(bioId: string, onlyActive = false): Promise<BioLink[]> {
  let q = supabase.from("bio_links" as never).select("*").eq("bio_id", bioId).order("position");
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as BioLink[]) ?? [];
}

export async function listMenu(bioId: string, onlyAvailable = false) {
  const [cats, items] = await Promise.all([
    supabase.from("menu_categories" as never).select("*").eq("bio_id", bioId).order("position"),
    supabase.from("menu_items" as never).select("*").eq("bio_id", bioId).order("position"),
  ]);
  if (cats.error) throw cats.error;
  if (items.error) throw items.error;
  const categories = (cats.data as unknown as MenuCategory[]) ?? [];
  let menuItems = (items.data as unknown as MenuItem[]) ?? [];
  if (onlyAvailable) menuItems = menuItems.filter((i) => i.is_available);
  return { categories, items: menuItems };
}

export async function listQrCodes(bioId: string): Promise<BioQrCode[]> {
  const { data, error } = await supabase
    .from("bio_qr_codes" as never)
    .select("*")
    .eq("bio_id", bioId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as BioQrCode[]) ?? [];
}

export async function listAllBios(): Promise<BioProfile[]> {
  const { data, error } = await supabase
    .from("bio_profiles" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as BioProfile[]) ?? [];
}

export async function createBioForPartner(partner: {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_url?: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}): Promise<BioProfile> {
  const base = partner.slug ?? slugify(partner.name);
  let slug = base;
  // Ensure unique slug
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from("bio_profiles" as never)
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
  }
  const payload = {
    partner_id: partner.id,
    type: "partner" as const,
    slug,
    display_name: partner.name,
    avatar_url: partner.logo_url,
    cover_url: partner.cover_url ?? null,
    whatsapp: partner.whatsapp,
    instagram: partner.instagram,
    address: partner.address,
    city: partner.city,
    lat: partner.latitude,
    lng: partner.longitude,
  };
  const { data, error } = await supabase
    .from("bio_profiles" as never)
    .insert(payload as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as BioProfile;
}

export async function updateBio(id: string, patch: Partial<BioProfile>): Promise<void> {
  const { error } = await supabase.from("bio_profiles" as never).update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function upsertLink(link: Partial<BioLink> & { bio_id: string; title: string; url: string }): Promise<void> {
  if (link.id) {
    const { error } = await supabase.from("bio_links" as never).update(link as never).eq("id", link.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("bio_links" as never).insert(link as never);
    if (error) throw error;
  }
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from("bio_links" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function upsertCategory(c: Partial<MenuCategory> & { name: string; bio_id: string }): Promise<void> {
  if (c.id) {
    const { error } = await supabase.from("menu_categories" as never).update(c as never).eq("id", c.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("menu_categories" as never).insert(c as never);
    if (error) throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("menu_categories" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function upsertItem(it: Partial<MenuItem> & { name: string; bio_id: string }): Promise<void> {
  if (it.id) {
    const { error } = await supabase.from("menu_items" as never).update(it as never).eq("id", it.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("menu_items" as never).insert(it as never);
    if (error) throw error;
  }
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("menu_items" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function upsertQrCode(q: Partial<BioQrCode> & { bio_id: string; label: string; target_path: string }): Promise<void> {
  if (q.id) {
    const { error } = await supabase.from("bio_qr_codes" as never).update(q as never).eq("id", q.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("bio_qr_codes" as never).insert(q as never);
    if (error) throw error;
  }
}

export async function getBioAnalyticsSummary(bioId: string) {
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const sinceToday = new Date();
  sinceToday.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("bio_analytics_events" as never)
    .select("event_type, created_at, link_id, metadata")
    .eq("bio_id", bioId)
    .gte("created_at", since7);
  if (error) throw error;
  const rows = (data as Array<{ event_type: string; created_at: string; link_id: string | null; metadata: Record<string, unknown> }>) ?? [];
  const today = rows.filter((r) => new Date(r.created_at) >= sinceToday);
  const views = rows.filter((r) => r.event_type === "bio_view").length;
  const viewsToday = today.filter((r) => r.event_type === "bio_view").length;
  const clicks = rows.filter((r) => r.event_type !== "bio_view").length;
  const whats = rows.filter((r) => r.event_type === "whatsapp_click").length;
  const linkClicks = new Map<string, number>();
  for (const r of rows) {
    if (r.event_type === "link_click" && r.link_id) {
      linkClicks.set(r.link_id, (linkClicks.get(r.link_id) ?? 0) + 1);
    }
  }
  return {
    views_7d: views,
    views_today: viewsToday,
    clicks_7d: clicks,
    whatsapp_clicks: whats,
    ctr: views > 0 ? Math.round((clicks / views) * 100) : 0,
    top_links: Array.from(linkClicks.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
  };
}
