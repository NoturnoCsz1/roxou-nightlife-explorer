/**
 * Shared category / segment configuration for the entire platform.
 *
 * DB values are NEVER changed — we only map them to display labels.
 * Old stored values (balada, show, bar, festival, festa, etc.) remain valid.
 */

/** Display config for every DB category value (old + current) */
export const categoryConfig: Record<string, { label: string; badge: string }> = {
  balada: { label: "Universitário", badge: "badge-balada" },
  show: { label: "Rock", badge: "badge-show" },
  bar: { label: "Bar", badge: "badge-bar" },
  festival: { label: "Futebol", badge: "badge-festival" },
  sertanejo: { label: "Sertanejo", badge: "badge-sertanejo" },
  funk: { label: "Funk", badge: "badge-funk" },
  eletronica: { label: "Eletrônico", badge: "badge-eletronica" },
  festa: { label: "Samba / Pagode", badge: "badge-balada" },
};

/**
 * New admin-facing category options.
 * `value` = what gets stored in the DB (backward-compatible).
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
  // Find the first matching sub for this value
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
 * Keeps old DB values working; only changes the selector labels.
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

/** Get a safe label for any DB category value */
export function getCategoryLabel(dbValue: string): string {
  return categoryConfig[dbValue]?.label || dbValue;
}

/** Get a safe badge class for any DB category value */
export function getCategoryBadge(dbValue: string): string {
  return categoryConfig[dbValue]?.badge || "bg-secondary";
}
