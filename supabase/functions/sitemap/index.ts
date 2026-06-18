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
    .select("slug, created_at, updated_at, date_time")
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
    { loc: "/jogos", priority: "0.95", changefreq: "hourly" },
    { loc: "/resultados", priority: "0.7", changefreq: "daily" },
    { loc: "/tabela/brasileirao", priority: "0.7", changefreq: "daily" },
    { loc: "/tabela/libertadores", priority: "0.7", changefreq: "daily" },
    { loc: "/tabela/champions", priority: "0.7", changefreq: "daily" },
    { loc: "/noticias", priority: "0.8", changefreq: "daily" },
  ];

  // Sports matches (próximos 14 dias + últimos 3) — alta rotatividade SEO
  const fromIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const toIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: matches } = await supabase
    .from("sports_matches")
    .select("slug, updated_at, match_time")
    .gte("match_time", fromIso)
    .lte("match_time", toIso)
    .order("match_time", { ascending: true })
    .limit(500);


  // Fetch published Roxou noticias
  const { data: noticias } = await supabase
    .from("noticias")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Active partners with reservations enabled → /:partnerSlug/reservas
  const { data: reservationPartners } = await supabase
    .from("partner_reservation_settings")
    .select("partner_id, reservations_enabled, partners!inner(slug, active)")
    .eq("reservations_enabled", true);

  // Active public VIP lists → /vip/:public_slug
  const { data: vipLists } = await supabase
    .from("partner_vip_lists")
    .select("public_slug, updated_at")
    .not("public_slug", "is", null);

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
    { loc: "/musica-ao-vivo-em-presidente-prudente", priority: "0.8", changefreq: "daily" },
    { loc: "/o-que-fazer-em-presidente-prudente-hoje", priority: "0.9", changefreq: "daily" },
    { loc: "/expo2026", priority: "1.0", changefreq: "daily" },
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
    const lastmod = (event.updated_at || event.created_at || today).split("T")[0];
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


  // Roxou noticias
  for (const n of noticias || []) {
    const lastmod = (n.updated_at || n.published_at || today).split("T")[0];
    xml += `  <url>
    <loc>${BASE_URL}/noticia/${n.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  // Sports match pages (alta rotatividade — Discover/SEO)
  for (const m of matches || []) {
    const lastmod = (m.updated_at || today).split("T")[0];
    xml += `  <url>
    <loc>${BASE_URL}/jogo/${m.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.85</priority>
  </url>
`;
  }

  // Public reservation pages (one per active partner with reservations enabled)
  for (const rp of (reservationPartners || []) as Array<{ partners: { slug: string; active: boolean } | null }>) {
    const p = rp.partners;
    if (!p || !p.active || !p.slug) continue;
    xml += `  <url>
    <loc>${BASE_URL}/${p.slug}/reservas</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  // Public VIP list pages
  for (const v of vipLists || []) {
    if (!v.public_slug) continue;
    const lastmod = (v.updated_at || today).split("T")[0];
    xml += `  <url>
    <loc>${BASE_URL}/vip/${v.public_slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
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
