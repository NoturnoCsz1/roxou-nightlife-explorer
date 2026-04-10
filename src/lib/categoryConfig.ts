/**
 * Shared category / segment configuration for the entire platform.
 *
 * DB values are NEVER changed — we only map them to display labels.
 * Old stored values (balada, show, bar, festival, festa, etc.) remain valid.
 * The new `sub_category` column stores the specific genre (rock, pop_rock, mpb…).
 */

/** Display config for every DB category value (old + current) */
export const categoryConfig: Record<string, { label: string; badge: string }> = {
  balada: { label: "Universitário", badge: "badge-balada" },
  show: { label: "Show", badge: "badge-show" },
  bar: { label: "Bar", badge: "badge-bar" },
  festival: { label: "Futebol", badge: "badge-festival" },
  sertanejo: { label: "Sertanejo", badge: "badge-sertanejo" },
  funk: { label: "Funk", badge: "badge-funk" },
  eletronica: { label: "Eletrônico", badge: "badge-eletronica" },
  festa: { label: "Samba / Pagode", badge: "badge-balada" },
};

/** Maps sub_category values to their display labels */
export const subCategoryLabels: Record<string, string> = {
  festa: "Samba / Pagode",
  funk: "Funk",
  rock: "Rock",
  pop_rock: "Pop Rock",
  mpb: "MPB",
  eletronica: "Eletrônico",
  sertanejo: "Sertanejo",
  balada: "Universitário",
  festival: "Futebol",
};

/**
 * New admin-facing category options.
 * `value` = what gets stored in the DB category column (backward-compatible).
 * `sub`   = what gets stored in the DB sub_category column.
 * `label` = what the admin sees in the selector.
 */
export const ADMIN_CATEGORY_OPTIONS = [
  { value: "festa", label: "Samba / Pagode", sub: "festa" },
  { value: "funk", label: "Funk", sub: "funk" },
  { value: "show", label: "Rock", sub: "rock" },
  { value: "show", label: "Pop Rock", sub: "pop_rock" },
  { value: "show", label: "MPB", sub: "mpb" },
  { value: "eletronica", label: "Eletrônico", sub: "eletronica" },
  { value: "sertanejo", label: "Sertanejo", sub: "sertanejo" },
  { value: "balada", label: "Universitário", sub: "balada" },
  { value: "festival", label: "Futebol", sub: "festival" },
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
  { value: "balada", label: "Universitário" },
  { value: "restaurante", label: "Restaurante" },
  { value: "casa de shows", label: "Casa de Shows" },
  { value: "pub", label: "Pub" },
  { value: "lounge", label: "Lounge" },
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
