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
};

/**
 * New admin-facing category options.
 * `value` = what gets stored in the DB category column.
 * `sub`   = what gets stored in the DB sub_category column.
 * `label` = what the admin sees in the selector.
 *
 * Categorias principais primeiro, depois variações por gênero musical.
 */
export const ADMIN_CATEGORY_OPTIONS = [
  // categorias principais
  { value: "show", label: "Show", sub: "show" },
  { value: "festival", label: "Festival", sub: "festival" },
  { value: "bar", label: "Bar", sub: "bar" },
  { value: "universitario", label: "Universitário", sub: "universitario" },
  { value: "restaurante", label: "Restaurante", sub: "restaurante" },
  { value: "balada", label: "Balada", sub: "balada" },
  { value: "festa", label: "Festa", sub: "festa" },
  { value: "futebol", label: "Futebol", sub: "futebol" },
  { value: "cultural", label: "Cultural", sub: "cultural" },
  // sub-categorias musicais (mapeiam para "festa" ou "show" como categoria-mãe)
  { value: "funk", label: "Funk", sub: "funk" },
  { value: "festa", label: "Pagode / Samba", sub: "pagode_samba" },
  { value: "show", label: "Rock", sub: "rock" },
  { value: "show", label: "Pop Rock", sub: "pop_rock" },
  { value: "eletronica", label: "Eletrônico", sub: "eletronica" },
  { value: "sertanejo", label: "Sertanejo", sub: "sertanejo" },
  { value: "show", label: "MPB", sub: "mpb" },
] as const;

/** Build a composite key for admin category selection (value:sub) */
export function categoryKey(value: string, sub?: string): string {
  if (sub && sub !== value) return `${value}:${sub}`;
  const match = ADMIN_CATEGORY_OPTIONS.find((o) => o.value === value);
  return match ? `${value}:${match.sub}` : `${value}:${value}`;
}

/** Parse a composite key back to { value, sub } */
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
