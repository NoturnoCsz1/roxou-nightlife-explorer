// Pre-build sitemap generator.
// Calls the deployed Supabase edge function `sitemap` and writes the XML
// result to public/sitemap.xml so the static host serves it with the
// correct Content-Type (application/xml) instead of falling back to SPA.
//
// Runs via the `prebuild` npm script. If the edge function is unreachable
// at build time, a minimal fallback sitemap is written so deploys never fail.

import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const EDGE_URL =
  "https://bapdgykghciiyvlqdrqx.supabase.co/functions/v1/sitemap";
const OUT_PATH = resolve("public/sitemap.xml");

const FALLBACK = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://roxou.com.br/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://roxou.com.br/agenda</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://roxou.com.br/parceiros</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://roxou.com.br/jogos</loc><changefreq>hourly</changefreq><priority>0.95</priority></url>
  <url><loc>https://roxou.com.br/noticias</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
</urlset>
`;

async function main() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20_000);
    const res = await fetch(EDGE_URL, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml.trim().startsWith("<?xml") && !xml.includes("<urlset")) {
      throw new Error("Edge function did not return XML");
    }
    writeFileSync(OUT_PATH, xml);
    console.log(`[sitemap] written from edge function (${xml.length} bytes)`);
  } catch (err) {
    console.warn(`[sitemap] edge fetch failed: ${(err as Error).message}`);
    if (!existsSync(OUT_PATH)) {
      writeFileSync(OUT_PATH, FALLBACK);
      console.warn("[sitemap] wrote minimal fallback sitemap.xml");
    } else {
      console.warn("[sitemap] kept previous public/sitemap.xml");
    }
  }
}

main();
