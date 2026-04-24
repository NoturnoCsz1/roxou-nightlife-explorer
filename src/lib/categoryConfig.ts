/**
 * Shared category / segment configuration for the entire platform.
 *
 * DB values are NEVER changed — we only map them to display labels.
 * Old stored values (balada, show, bar, festival, festa, etc.) remain valid.
 * The new `sub_category` column stores the specific genre (rock, pop_rock, mpb…).
 *
 * NEW TAXONOMY (admin-facing):
 * Categorias: Show, Festival, Bar, Universitário, Restaurante, Balada, Festa, Futebol, Cultural
 * Sub-categorias: Funk, Pagode/Samba, Rock, Pop Rock, Eletrônico, Sertanejo, MPB
 */

/** Display config for every DB category value (old + current) */
export const categoryConfig: Record<string, { label: string; badge: string }> = {
  balada: { label: "Balada", badge: "badge-balada" },
  show: { label: "Show", badge: "badge-show" },
  bar: { label: "Bar", badge: "badge-bar" },
  festival: { label: "Festival", badge: "badge-festival" },
  futebol: { label: "Futebol", badge: "badge-festival" },
  sertanejo: { label: "Sertanejo", badge: "badge-sertanejo" },
  funk: { label: "Funk", badge: "badge-funk" },
  eletronica: { label: "Eletrônico", badge: "badge-eletronica" },
  festa: { label: "Festa", badge: "badge-balada" },
  universitario: { label: "Universitário", badge: "badge-balada" },
  restaurante: { label: "Restaurante", badge: "badge-bar" },
  cultural: { label: "Cultural", badge: "badge-show" },
  lounge: { label: "Lounge", badge: "badge-bar" },
  espetinho: { label: "Espetinho", badge: "badge-bar" },
};

/** Maps sub_category values to their display labels */
export const subCategoryLabels: Record<string, string> = {
  festa: "Pagode / Samba",
  pagode_samba: "Pagode / Samba",
  funk: "Funk",
  rock: "Rock",
  pop_rock: "Pop Rock",
  mpb: "MPB",
  eletronica: "Eletrônico",
  sertanejo: "Sertanejo",
  balada: "Balada",
  festival: "Festival",
  futebol: "Futebol",
  universitario: "Universitário",
  cultural: "Cultural",
  bar: "Bar",
  show: "Show",
  restaurante: "Restaurante",
  lounge: "Lounge",
  espetinho: "Espetinho",
};

/**
 * MAIN categories — top-level event type.
 * `value` = stored in DB `category` column.
 */
export const ADMIN_MAIN_CATEGORIES = [
  { value: "show", label: "Show" },
  { value: "festival", label: "Festival" },
  { value: "bar", label: "Bar" },
  { value: "universitario", label: "Universitário" },
  { value: "restaurante", label: "Restaurante" },
  { value: "balada", label: "Balada" },
  { value: "festa", label: "Festa" },
  { value: "futebol", label: "Futebol" },
  { value: "cultural", label: "Cultural" },
] as const;

/**
 * MUSICAL sub-categories — only shown when main category supports a genre.
 * `value` = stored in DB `sub_category` column.
 */
export const ADMIN_MUSICAL_SUBS = [
  { value: "funk", label: "Funk" },
  { value: "pagode_samba", label: "Pagode / Samba" },
  { value: "rock", label: "Rock" },
  { value: "pop_rock", label: "Pop Rock" },
  { value: "eletronica", label: "Eletrônico" },
  { value: "sertanejo", label: "Sertanejo" },
  { value: "mpb", label: "MPB" },
  { value: "outros", label: "Outros" },
] as const;

/** Categories that allow a musical sub-category selector. */
export const CATEGORIES_WITH_GENRE = ["show", "festa", "balada", "bar"] as const;

export function supportsGenre(category: string): boolean {
  return (CATEGORIES_WITH_GENRE as readonly string[]).includes(category);
}

/**
 * @deprecated kept for legacy imports. Prefer ADMIN_MAIN_CATEGORIES + ADMIN_MUSICAL_SUBS.
 */
export const ADMIN_CATEGORY_OPTIONS = ADMIN_MAIN_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
  sub: c.value,
}));

export function categoryKey(value: string, sub?: string): string {
  if (sub && sub !== value) return `${value}:${sub}`;
  return `${value}:${value}`;
}

export function parseCategoryKey(key: string): { value: string; sub: string } {
  const [value, sub] = key.split(":");
  return { value, sub: sub || value };
}

/**
 * New admin-facing partner type options.
 */
export const ADMIN_PARTNER_TYPE_OPTIONS = [
  { value: "bar", label: "Bar" },
  { value: "balada", label: "Balada" },
  { value: "universitario", label: "Universitário" },
  { value: "restaurante", label: "Restaurante" },
  { value: "casa de shows", label: "Casa de Shows" },
  { value: "pub", label: "Pub" },
  { value: "lounge", label: "Lounge" },
  { value: "cultural", label: "Cultural" },
  { value: "outro", label: "Outro" },
] as const;

/**
 * Get the display label for an event, preferring the sub_category.
 * Falls back to the main category label if no sub_category exists.
 */
export function getCategoryLabel(dbValue: string, subCategory?: string | null): string {
  if (subCategory && subCategoryLabels[subCategory]) {
    return subCategoryLabels[subCategory];
  }
  return categoryConfig[dbValue]?.label || dbValue;
}

/** Get a safe badge class for any DB category value */
export function getCategoryBadge(dbValue: string): string {
  return categoryConfig[dbValue]?.badge || "bg-secondary";
}
