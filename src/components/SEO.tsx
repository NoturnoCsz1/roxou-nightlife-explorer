import { useEffect } from "react";
import { createPortal } from "react-dom";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
  keywords?: string;
  locale?: string;
}

const SITE_ORIGIN = "https://roxou.com.br";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "ref",
  "source",
  "when",
  "page",
  "q",
]);

const isTrackingParam = (key: string) => {
  const k = key.toLowerCase();
  if (TRACKING_PARAMS.has(k)) return true;
  if (k.startsWith("utm_")) return true;
  return false;
};

/** Build a canonical URL from current path, dropping tracking params. */
function buildCanonicalFromLocation(): string {
  if (typeof window === "undefined") return SITE_ORIGIN + "/";
  const path = window.location.pathname || "/";
  // We deliberately ignore the query string entirely for canonical purposes;
  // canonical should normalize to the bare resource URL. If a route needs a
  // canonical with kept params, it must pass `canonical` explicitly.
  return `${SITE_ORIGIN}${path}`;
}

/** Strip tracking params from an explicitly provided canonical URL. */
function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url, SITE_ORIGIN);
    const toDelete: string[] = [];
    u.searchParams.forEach((_, key) => {
      if (isTrackingParam(key)) toDelete.push(key);
    });
    for (const k of toDelete) u.searchParams.delete(k);
    // Drop trailing "?" if no params left
    const search = u.searchParams.toString();
    return `${u.origin}${u.pathname}${search ? "?" + search : ""}${u.hash || ""}`;
  } catch {
    return url;
  }
}

const SEO = ({ title, description, canonical, ogImage = "https://roxou.com.br/og-image.png", ogType = "website", jsonLd, keywords, locale = "pt_BR" }: SEOProps) => {
  const resolvedCanonical = canonical
    ? stripTrackingParams(canonical)
    : buildCanonicalFromLocation();

  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:image:alt", title, "property");
    setMeta("og:locale", locale, "property");
    setMeta("og:site_name", "ROXOU", "property");
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", title, "name");
    setMeta("twitter:description", description, "name");
    setMeta("twitter:image", ogImage, "name");

    setMeta("og:url", resolvedCanonical, "property");
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", resolvedCanonical);
  }, [title, description, resolvedCanonical, ogImage, ogType, keywords, locale]);

  if (!jsonLd) return null;

  return createPortal(
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />,
    document.head
  );
};

export default SEO;
