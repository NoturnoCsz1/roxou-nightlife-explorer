import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EVENTOU_EXPLORE = "https://eventou.com.br/explorar";
const TARGET_CITY = "presidente prudente";
const MAX_NEW_SCRAPE = 10;
const CONCURRENCY = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!firecrawlKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Firecrawl not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check for enrich mode
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* empty body = normal scan */ }

  if (body.mode === "enrich") {
    return await handleEnrich(firecrawlKey, supabase);
  }

  const stats = {
    pagesScraped: 0,
    eventsFound: 0,
    newInserted: 0,
    duplicates: 0,
    dupReasons: { url: 0, external_id: 0, title_venue_date: 0, existing_event: 0, db_constraint: 0 } as Record<string, number>,
    errors: 0,
    urlsDiscovered: 0,
    skippedNonCity: 0,
    phase: "idle",
    timeMs: 0,
  };
  const startTime = Date.now();

  const json = (s: typeof stats) =>
    new Response(JSON.stringify({ success: true, stats: { ...s, timeMs: Date.now() - startTime } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Phase 1: Discover URLs (scrape + map in parallel)
    stats.phase = "discovering";
    console.log("Phase 1: Discovering event URLs");

    const [scrapeRes, mapRes] = await Promise.all([
      fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: EVENTOU_EXPLORE,
          formats: ["links"],
          onlyMainContent: true,
          waitFor: 2000,
        }),
      }),
      fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: EVENTOU_EXPLORE,
          search: "presidente prudente",
          limit: 200,
          includeSubdomains: false,
        }),
      }),
    ]);

    const [scrapeData, mapData] = await Promise.all([scrapeRes.json(), mapRes.json()]);
    stats.pagesScraped = 1;

    const scrapeLinks: string[] = scrapeData.data?.links || scrapeData.links || [];
    const mappedLinks: string[] = mapData.links || [];
    console.log(`Scrape: ${scrapeLinks.length} links, Map: ${mappedLinks.length} links`);

    // Combine & filter event URLs
    const allLinks = [...new Set([...scrapeLinks, ...mappedLinks])];
    const eventUrls = allLinks.filter((url) => {
      try {
        const u = new URL(url);
        return (
          (u.pathname.startsWith("/evento/") || u.pathname.startsWith("/eventos/")) &&
          !u.pathname.endsWith("/explorar")
        );
      } catch {
        return false;
      }
    });

    stats.urlsDiscovered = allLinks.length;
    stats.eventsFound = eventUrls.length;
    console.log(`Found ${eventUrls.length} event URLs`);

    if (eventUrls.length === 0) return json(stats);

    // Phase 2: Early dedup — check URLs, external_ids, and title+venue combos
    stats.phase = "deduplicating";
    console.log("Phase 2: Dedup check");

    // Load ALL existing imports for comprehensive dedup
    const existingUrls = new Set<string>();
    const existingExtIds = new Set<string>();
    const existingTitleVenueDate = new Set<string>();
    const existingEventKeys = new Set<string>();

    // Fetch in chunks of 50
    for (let i = 0; i < eventUrls.length; i += 50) {
      const chunk = eventUrls.slice(i, i + 50);
      const { data: existing } = await supabase
        .from("eventou_imports")
        .select("eventou_url, external_id, title, venue_name, date_time")
        .in("eventou_url", chunk);
      (existing || []).forEach((e: any) => {
        existingUrls.add(e.eventou_url);
        if (e.external_id) existingExtIds.add(e.external_id);
        const key = buildDedupKey(e.title, e.venue_name, e.date_time);
        if (key) existingTitleVenueDate.add(key);
      });
    }

    // Also load recent imports not matched by URL (for title+venue dedup)
    const { data: recentImports } = await supabase
      .from("eventou_imports")
      .select("external_id, title, venue_name, date_time")
      .order("created_at", { ascending: false })
      .limit(500);
    (recentImports || []).forEach((e: any) => {
      if (e.external_id) existingExtIds.add(e.external_id);
      const key = buildDedupKey(e.title, e.venue_name, e.date_time);
      if (key) existingTitleVenueDate.add(key);
    });

    // Also check the main events table (published + draft) for title+venue+date dedup
    const { data: existingEvents } = await supabase
      .from("events")
      .select("title, venue_name, date_time")
      .order("created_at", { ascending: false })
      .limit(500);
    (existingEvents || []).forEach((e: any) => {
      const key = buildDedupKey(e.title, e.venue_name, e.date_time);
      if (key) existingEventKeys.add(key);
    });

    // Filter: skip URLs already imported or with known external_id
    const newUrls = eventUrls.filter((u) => {
      if (existingUrls.has(u)) { stats.dupReasons.url++; stats.duplicates++; return false; }
      const slug = u.split("/").pop() || "";
      if (slug && existingExtIds.has(slug)) { stats.dupReasons.external_id++; stats.duplicates++; return false; }
      return true;
    }).slice(0, MAX_NEW_SCRAPE);

    console.log(`${stats.duplicates} already imported, ${newUrls.length} new to scrape`);

    if (newUrls.length === 0) return json(stats);

    // Phase 3: Scrape new pages in parallel batches
    stats.phase = "scraping";
    console.log(`Phase 3: Scraping ${newUrls.length} pages (concurrency=${CONCURRENCY})`);

    // Pre-load partner names for matching
    const { data: allPartners } = await supabase.from("partners").select("id, name, address");
    const partners = allPartners || [];

    // Pass dedup sets to scrapeAndInsert
    const dedupCtx = { existingExtIds, existingTitleVenueDate, existingEventKeys };

    for (let i = 0; i < newUrls.length; i += CONCURRENCY) {
      const batch = newUrls.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((eventUrl) => scrapeAndInsert(eventUrl, firecrawlKey, supabase, partners, stats, dedupCtx))
      );
      results.forEach((r) => {
        if (r.status === "rejected") {
          console.error("Batch item failed:", r.reason);
          stats.errors++;
        }
      });
    }

    stats.phase = "done";
    stats.timeMs = Date.now() - startTime;
    console.log("Scan complete:", stats);
    return json(stats);
  } catch (err) {
    console.error("Fatal error:", err);
    stats.phase = "error";
    stats.timeMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error", stats }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/* ── Enrich mode: re-scrape existing imports missing metadata ── */
async function handleEnrich(firecrawlKey: string, supabase: any) {
  const startTime = Date.now();
  const stats = { total: 0, enriched: 0, errors: 0, skipped: 0, timeMs: 0 };

  try {
    // Find pending imports missing address, organizer, or image_url
    const { data: rows, error } = await supabase
      .from("eventou_imports")
      .select("id, eventou_url, title")
      .eq("import_status", "pending")
      .or("address.is.null,organizer.is.null,image_url.is.null")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !rows?.length) {
      stats.timeMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({ success: true, mode: "enrich", stats, message: rows?.length === 0 ? "No rows to enrich" : error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    stats.total = rows.length;
    console.log(`Enrich: ${rows.length} rows to process`);

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (row: any) => {
          try {
            const detailRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                url: row.eventou_url,
                formats: ["markdown", "html"],
                onlyMainContent: false,
                waitFor: 1500,
              }),
            });

            const detailData = await detailRes.json();
            if (!detailRes.ok) {
              console.error("Enrich scrape failed for", row.eventou_url);
              stats.errors++;
              return;
            }

            const meta = detailData.data?.metadata || detailData.metadata || {};
            const md = detailData.data?.markdown || detailData.markdown || "";
            const html = detailData.data?.html || detailData.html || "";

            const updates: Record<string, any> = {};

            const imageUrl = extractImage(meta, html);
            if (imageUrl) updates.image_url = imageUrl;

            const venue = extractVenue(md, html);
            if (venue && venue !== "será?") updates.venue_name = venue;

            const address = extractAddress(md, html);
            if (address) updates.address = address.slice(0, 500);

            const organizer = extractOrganizer(md, html);
            if (organizer) updates.organizer = organizer.slice(0, 500);

            const dateTime = extractDateTime(md, html);
            if (dateTime) updates.date_time = dateTime;

            // Clean title (remove " - Eventou" suffix)
            if (row.title?.endsWith(" - Eventou")) {
              updates.title = row.title.replace(/ - Eventou$/, "");
            }

            if (Object.keys(updates).length === 0) {
              stats.skipped++;
              console.log(`Enrich: no new data for "${row.title}"`);
              return;
            }

            const { error: updateError } = await supabase
              .from("eventou_imports")
              .update(updates)
              .eq("id", row.id);

            if (updateError) {
              console.error("Enrich update error:", updateError);
              stats.errors++;
            } else {
              stats.enriched++;
              console.log(`Enriched: "${row.title}" with fields: ${Object.keys(updates).join(", ")}`);
            }
          } catch (e) {
            console.error("Enrich row error:", e);
            stats.errors++;
          }
        })
      );
    }

    stats.timeMs = Date.now() - startTime;
    console.log("Enrich complete:", stats);
    return new Response(
      JSON.stringify({ success: true, mode: "enrich", stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    stats.timeMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({ success: false, mode: "enrich", error: err instanceof Error ? err.message : "Unknown", stats }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}


function normalize(s: string | null): string {
  if (!s) return "";
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function buildDedupKey(title: string | null, venue: string | null, dateTime: string | null): string | null {
  const t = normalize(title);
  if (!t) return null;
  const v = normalize(venue);
  const d = dateTime ? dateTime.slice(0, 10) : "";
  return `${t}|${v}|${d}`;
}

/* ── scrape a single event URL and insert ── */
async function scrapeAndInsert(
  eventUrl: string,
  firecrawlKey: string,
  supabase: any,
  partners: { id: string; name: string }[],
  stats: any,
  dedupCtx: { existingExtIds: Set<string>; existingTitleVenueDate: Set<string>; existingEventKeys: Set<string> }
) {
  stats.pagesScraped++;

  const detailRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url: eventUrl,
      formats: ["markdown", "html"],
      onlyMainContent: false,
      waitFor: 1500,
    }),
  });

  const detailData = await detailRes.json();
  if (!detailRes.ok) {
    console.error("Scrape failed for", eventUrl);
    stats.errors++;
    return;
  }

  const meta = detailData.data?.metadata || detailData.metadata || {};
  const md = detailData.data?.markdown || detailData.markdown || "";
  const html = detailData.data?.html || detailData.html || "";

  const title = meta.ogTitle || meta.title || extractTitle(md);
  if (!title) {
    stats.errors++;
    return;
  }

  // City filter
  const detectedCity = extractCity(md);
  if (detectedCity && !detectedCity.toLowerCase().includes(TARGET_CITY)) {
    stats.skippedNonCity++;
    return;
  }

  const description = meta.ogDescription || meta.description || extractDescription(md);

  // Enhanced image extraction (priority chain)
  const imageUrl = extractImage(meta, html);

  // Enhanced venue extraction
  const venue = extractVenue(md, html);

  // Enhanced address extraction
  const address = extractAddress(md, html);

  // Enhanced organizer extraction
  const organizer = extractOrganizer(md, html);

            const dateTime = extractDateTime(md, html);

  // Dedup: check external_id (slug) and normalized title+venue+date
  const slug = eventUrl.split("/").pop() || "";
  if (slug && dedupCtx.existingExtIds.has(slug)) {
    console.log("Duplicate by external_id:", slug);
    stats.duplicates++;
    stats.dupReasons.external_id++;
    return;
  }

  const dedupKey = buildDedupKey(title, venue, dateTime);

  // Check against existing events table
  if (dedupKey && dedupCtx.existingEventKeys.has(dedupKey)) {
    console.log("Duplicate: already in events table:", title);
    stats.duplicates++;
    stats.dupReasons.existing_event++;
    return;
  }

  // Check against existing imports
  if (dedupKey && dedupCtx.existingTitleVenueDate.has(dedupKey)) {
    console.log("Duplicate by title+venue+date:", title);
    stats.duplicates++;
    stats.dupReasons.title_venue_date++;
    return;
  }

  // Mark as seen to prevent intra-batch duplicates
  if (slug) dedupCtx.existingExtIds.add(slug);
  if (dedupKey) dedupCtx.existingTitleVenueDate.add(dedupKey);

  // Match partner by venue name, address, organizer, or title
  let partnerId: string | null = null;
  const matchNorm = (s: string | null) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim() : "";
  const streetKey = (s: string | null) => {
    if (!s) return "";
    let n = matchNorm(s);
    n = n.replace(/\b(r|rua)\b/g,"rua").replace(/\b(av|avenida)\b/g,"avenida")
      .replace(/\b(ten|tenente)\b/g,"tenente").replace(/\b(cel|coronel)\b/g,"coronel")
      .replace(/\b(dr|doutor|dra|doutora)\b/g,"doutor").replace(/\b(pres|presidente)\b/g,"presidente")
      .replace(/\b(com|comendador)\b/g,"comendador").replace(/\b(rod|rodovia)\b/g,"rodovia")
      .replace(/\b(al|alameda)\b/g,"alameda").replace(/\b(trav|travessa)\b/g,"travessa");
    const m = n.match(/(?:rua|avenida|alameda|travessa|rodovia)?\s*(.+?)\s*(\d{1,5})/);
    return m ? `${m[1].trim()} ${m[2]}` : n.slice(0, 40);
  };

  const titleNorm = matchNorm(title);
  const venueNorm = matchNorm(venue);
  const addrKey = streetKey(address);
  const orgNorm = matchNorm(organizer);

  let bestScore = 0;
  for (const p of partners) {
    const pn = matchNorm(p.name);
    const pk = streetKey(p.address);
    let score = 0;
    if (venueNorm && pn && (venueNorm === pn || (venueNorm.length >= 4 && (venueNorm.includes(pn) || pn.includes(venueNorm))))) score += 10;
    if (orgNorm && pn && orgNorm.length >= 4 && (orgNorm.includes(pn) || pn.includes(orgNorm))) score += 7;
    if (titleNorm && pn && pn.length >= 4 && titleNorm.includes(pn)) score += 6;
    if (addrKey && pk && addrKey.length >= 6 && (addrKey.includes(pk) || pk.includes(addrKey))) score += 9;
    if (score > bestScore) { bestScore = score; partnerId = p.id; }
  }

  console.log(`Inserting: "${title}" | venue="${venue}" | organizer="${organizer}" | address="${address}" | image=${!!imageUrl}`);

  const { error: insertError } = await supabase.from("eventou_imports").insert({
    eventou_url: eventUrl,
    external_id: slug,
    title,
    description: description?.slice(0, 2000) || null,
    venue_name: venue,
    city: "Presidente Prudente",
    state: "SP",
    date_time: dateTime,
    image_url: imageUrl,
    partner_id: partnerId,
    import_status: "pending",
    organizer: organizer?.slice(0, 500) || null,
    address: address?.slice(0, 500) || null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      stats.duplicates++;
      stats.dupReasons.db_constraint++;
    } else {
      console.error("Insert error:", insertError);
      stats.errors++;
    }
  } else {
    stats.newInserted++;
  }
}

/* ── extraction helpers ── */

function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "";
}

function extractDescription(md: string): string {
  const lines = md.split("\n").filter((l) => l.trim().length > 20);
  return lines.slice(0, 3).join(" ").trim().slice(0, 500);
}

function extractCity(md: string): string | null {
  const patterns = [
    /(?:Cidade|City|Local)[:\s]+([^\n]+)/i,
    /Presidente\s+Prudente/i,
    /(\w[\w\s]+)\s*[-–]\s*SP/i,
  ];
  for (const p of patterns) {
    const m = md.match(p);
    if (m) return m[0].trim().slice(0, 100);
  }
  return null;
}

/* ── Enhanced image extraction ── */
function extractImage(meta: Record<string, any>, html: string): string | null {
  // 1. og:image
  const ogImage = meta.ogImage || meta["og:image"];
  if (ogImage && isValidImageUrl(ogImage)) return ogImage;

  // 2. twitter:image
  const twitterImage = meta["twitter:image"] || meta.twitterImage;
  if (twitterImage && isValidImageUrl(twitterImage)) return twitterImage;

  // 3. JSON-LD image
  const jsonLdImage = extractJsonLdField(html, "image");
  if (jsonLdImage && isValidImageUrl(jsonLdImage)) return jsonLdImage;

  // 4. Main event image in HTML (large images, skip icons/logos)
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const m of imgMatches) {
    const src = m[1];
    if (isValidImageUrl(src) && !isSmallIcon(m[0])) return src;
  }

  return null;
}

function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  try {
    const u = new URL(url.startsWith("//") ? `https:${url}` : url);
    return /\.(jpg|jpeg|png|webp|avif)/i.test(u.pathname) || u.hostname.includes("img") || u.hostname.includes("image") || u.pathname.includes("/image");
  } catch {
    return false;
  }
}

function isSmallIcon(imgTag: string): boolean {
  const widthMatch = imgTag.match(/width=["']?(\d+)/i);
  const heightMatch = imgTag.match(/height=["']?(\d+)/i);
  if (widthMatch && parseInt(widthMatch[1]) < 100) return true;
  if (heightMatch && parseInt(heightMatch[1]) < 100) return true;
  if (/favicon|icon|logo|avatar|badge/i.test(imgTag)) return true;
  return false;
}

/* ── Enhanced venue extraction ── */
function extractVenue(md: string, html: string): string | null {
  // 1. JSON-LD location.name or location
  const jsonLdLocation = extractJsonLdField(html, "location");
  if (jsonLdLocation) {
    if (typeof jsonLdLocation === "object" && jsonLdLocation.name) {
      return cleanExtracted(jsonLdLocation.name);
    }
    if (typeof jsonLdLocation === "string") {
      return cleanExtracted(jsonLdLocation);
    }
  }

  // 2. Markdown patterns (priority order)
  const patterns = [
    /(?:Local do evento|Venue)[:\s]+(.+)/i,
    /(?:Local|Onde|Endereço)[:\s]+(.+)/i,
    /📍\s*(.+)/,
  ];
  for (const p of patterns) {
    const m = md.match(p);
    if (m) {
      const val = m[1].trim();
      // Skip if it looks like an address (has number + street pattern)
      if (val.length > 3 && val.length < 200) return cleanExtracted(val);
    }
  }

  return null;
}

/* ── Enhanced address extraction ── */
function extractAddress(md: string, html: string): string | null {
  // 1. JSON-LD address
  const jsonLdLocation = extractJsonLdField(html, "location");
  if (jsonLdLocation && typeof jsonLdLocation === "object") {
    const addr = jsonLdLocation.address;
    if (addr) {
      if (typeof addr === "string") return cleanExtracted(addr);
      if (typeof addr === "object") {
        const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion].filter(Boolean);
        if (parts.length) return cleanExtracted(parts.join(", "));
      }
    }
  }

  // 2. Markdown patterns
  const patterns = [
    /(?:Endereço|Address)[:\s]+(.+)/i,
    /(?:Rua|Av\.|Avenida|Alameda|Travessa|Rodovia)\s+[^,\n]{5,}[,\s]+\d+/i,
  ];
  for (const p of patterns) {
    const m = md.match(p);
    if (m) {
      const val = (m[1] || m[0]).trim();
      if (val.length > 5 && val.length < 300) return cleanExtracted(val);
    }
  }

  return null;
}

/* ── Enhanced organizer extraction ── */
function extractOrganizer(md: string, html: string): string | null {
  // 1. JSON-LD organizer/performer
  for (const field of ["organizer", "performer"]) {
    const val = extractJsonLdField(html, field);
    if (val) {
      if (typeof val === "object" && val.name) return cleanExtracted(val.name);
      if (typeof val === "string") return cleanExtracted(val);
    }
  }

  // 2. Markdown patterns
  const patterns = [
    /(?:Organizad(?:o|a|or)|Organização)[:\s]+(.+)/i,
    /(?:Produção|Produzido por|Realização)[:\s]+(.+)/i,
    /(?:Promoter|Promotora|Produtora)[:\s]+(.+)/i,
    /(?:Por|By)[:\s]+(.{3,60})/i,
  ];
  for (const p of patterns) {
    const m = md.match(p);
    if (m) {
      const val = m[1].trim();
      if (val.length > 2 && val.length < 200) return cleanExtracted(val);
    }
  }

  return null;
}

/* ── JSON-LD helper ── */
function extractJsonLdField(html: string, field: string): any {
  const scriptMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of scriptMatches) {
    try {
      const data = JSON.parse(m[1]);
      // Handle array of JSON-LD objects
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item[field] !== undefined) return item[field];
        // Check @graph
        if (item["@graph"] && Array.isArray(item["@graph"])) {
          for (const g of item["@graph"]) {
            if (g[field] !== undefined) return g[field];
          }
        }
      }
    } catch {
      // skip invalid JSON-LD
    }
  }
  return null;
}

/* ── cleanup helper ── */
function cleanExtracted(val: string): string {
  return val.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").replace(/[*_#\[\]]/g, "").trim().slice(0, 500);
}

function extractDateTime(md: string, html?: string): string | null {
  // 1. JSON-LD startDate (highest priority)
  if (html) {
    const jsonLdStart = extractJsonLdField(html, "startDate");
    if (jsonLdStart && typeof jsonLdStart === "string") {
      try {
        const d = new Date(jsonLdStart);
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch { /* skip */ }
    }
  }

  // 2. Full ISO datetime in markdown
  const isoMatch = md.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/);
  if (isoMatch) {
    try {
      const d = new Date(isoMatch[1].replace(" ", "T") + ":00-03:00");
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch { /* skip */ }
  }

  // 3. Brazilian date patterns (dd/mm/yyyy or dd.mm.yyyy)
  const brMatch = md.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const time = extractBrazilianTime(md);
    return new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}-03:00`
    ).toISOString();
  }

  // 4. Written-out Brazilian date: "15 de maio de 2025"
  const months: Record<string, string> = {
    janeiro: "01", fevereiro: "02", marco: "03", março: "03", abril: "04",
    maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
    outubro: "10", novembro: "11", dezembro: "12",
  };
  const writtenMatch = md.match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de)?\s+(\d{4})/i);
  if (writtenMatch) {
    const day = writtenMatch[1].padStart(2, "0");
    const monthKey = writtenMatch[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const mon = months[monthKey] || "01";
    const year = writtenMatch[3];
    const time = extractBrazilianTime(md);
    return new Date(`${year}-${mon}-${day}T${time}-03:00`).toISOString();
  }

  // 5. HTML fallback: look for date patterns in raw HTML
  if (html) {
    const htmlBrMatch = html.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
    if (htmlBrMatch) {
      const [, day, month, year] = htmlBrMatch;
      const time = extractBrazilianTime(html);
      return new Date(
        `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}-03:00`
      ).toISOString();
    }
  }

  return null;
}

function extractBrazilianTime(text: string): string {
  const patterns = [
    /(?:às|as|inicio|início|abertura|a partir das|doors?|portões?)\s+(\d{1,2})[h:](\d{2})/i,
    /(?:às|as|inicio|início|abertura|a partir das|doors?|portões?)\s+(\d{1,2})h\b/i,
    /(\d{1,2})h(\d{2})\b/,
    /(\d{1,2})[h:](\d{2})\s*(?:hrs?|horas?|min)/i,
    /(?:horário|hora)[:\s]+(\d{1,2})[h:](\d{2})/i,
    /(?:horário|hora)[:\s]+(\d{1,2})h\b/i,
    /(\d{1,2})h\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const h = parseInt(m[1]);
      if (h >= 6 && h <= 23) {
        const min = m[2] || "00";
        return `${String(h).padStart(2, "0")}:${min}:00`;
      }
    }
  }
  return "22:00:00";
}
