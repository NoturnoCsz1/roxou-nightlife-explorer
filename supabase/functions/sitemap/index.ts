import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://roxou.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().split("T")[0];

  // Fetch published events
  const { data: events } = await supabase
    .from("events")
    .select("slug, created_at, date_time")
    .eq("status", "published")
    .order("date_time", { ascending: false });

  // Fetch active partners
  const { data: partners } = await supabase
    .from("partners")
    .select("slug, created_at")
    .eq("active", true)
    .order("name");

  // Static pages (V3 — raiz)
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/agenda", priority: "0.9", changefreq: "daily" },
    { loc: "/descobrir", priority: "0.8", changefreq: "daily" },
    { loc: "/parceiros", priority: "0.8", changefreq: "weekly" },
    { loc: "/economize", priority: "0.7", changefreq: "weekly" },
    { loc: "/transporte", priority: "0.7", changefreq: "weekly" },
    { loc: "/sobre", priority: "0.5", changefreq: "monthly" },
    { loc: "/contato", priority: "0.5", changefreq: "monthly" },
    { loc: "/expo2026", priority: "1.0", changefreq: "daily" },
    { loc: "/expo2026/shows", priority: "0.95", changefreq: "daily" },
    { loc: "/expo2026/programacao", priority: "0.95", changefreq: "daily" },
    { loc: "/expo2026/ingressos", priority: "0.9", changefreq: "daily" },
  ];

  // Fetch published expo news
  const { data: expoNews } = await supabase
    .from("expo_news")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // SEO landing pages
  const seoLandings = [
    { loc: "/eventos-hoje-em-presidente-prudente", priority: "0.9", changefreq: "daily" },
    { loc: "/eventos-amanha-em-presidente-prudente", priority: "0.9", changefreq: "daily" },
    { loc: "/eventos-fim-de-semana-em-presidente-prudente", priority: "0.9", changefreq: "daily" },
    { loc: "/baladas-em-presidente-prudente", priority: "0.8", changefreq: "daily" },
    { loc: "/bares-em-presidente-prudente", priority: "0.8", changefreq: "daily" },
    { loc: "/shows-em-presidente-prudente", priority: "0.8", changefreq: "daily" },
    { loc: "/pagode-em-presidente-prudente", priority: "0.7", changefreq: "daily" },
    { loc: "/funk-em-presidente-prudente", priority: "0.7", changefreq: "daily" },
    { loc: "/sertanejo-em-presidente-prudente", priority: "0.7", changefreq: "daily" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of staticPages) {
    xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  for (const page of seoLandings) {
    xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Event pages
  for (const event of events || []) {
    const lastmod = (event.created_at || today).split("T")[0];
    xml += `  <url>
    <loc>${BASE_URL}/evento/${event.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  // Venue pages
  for (const partner of partners || []) {
    const lastmod = (partner.created_at || today).split("T")[0];
    xml += `  <url>
    <loc>${BASE_URL}/local/${partner.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
