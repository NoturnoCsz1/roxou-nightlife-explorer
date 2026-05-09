/**
 * Image optimizer helpers for Supabase Storage Image Transform.
 *
 * Supabase exposes optimized variants via:
 *   /storage/v1/render/image/public/<bucket>/<path>?width=...&quality=...
 * which is equivalent to /storage/v1/object/public/... but resized/encoded.
 *
 * For non-Supabase URLs (Instagram CDN, externally-hosted flyers, etc.) we
 * return the original URL unchanged — never break external images.
 */

const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(OBJECT_PUBLIC) || url.includes(RENDER_PUBLIC);
}

function toRenderUrl(url: string): string {
  return url.replace(OBJECT_PUBLIC, RENDER_PUBLIC);
}

/**
 * Returns an optimized variant of a Supabase Storage URL.
 * Falls back to the original URL for external sources or invalid input.
 */
export function optimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality: number = 75
): string | undefined {
  if (!url) return undefined;
  if (typeof url !== "string") return undefined;
  if (!isSupabaseStorageUrl(url)) return url;

  try {
    const u = new URL(toRenderUrl(url));
    u.searchParams.set("width", String(width));
    u.searchParams.set("quality", String(Math.max(20, Math.min(100, quality))));
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Builds a responsive srcSet string for Supabase Storage URLs.
 * Returns undefined for external URLs (so consumers can skip srcSet entirely).
 */
export function optimizedSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality: number = 75
): string | undefined {
  if (!url || !isSupabaseStorageUrl(url)) return undefined;
  return widths
    .map((w) => {
      const optimized = optimizedImageUrl(url, w, quality);
      return optimized ? `${optimized} ${w}w` : null;
    })
    .filter(Boolean)
    .join(", ");
}
