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
  { value: "festa", label: "Samba / Pagode" },
  { value: "funk", label: "Funk" },
  { value: "show", label: "Rock" },
  { value: "show", label: "Pop Rock" },
  { value: "show", label: "MPB" },
  { value: "eletronica", label: "Eletrônico" },
  { value: "sertanejo", label: "Sertanejo" },
  { value: "balada", label: "Universitário" },
  { value: "festival", label: "Futebol" },
] as const;

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
