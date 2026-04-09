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
  const stats = {
    pagesScraped: 0,
    eventsFound: 0,
    newInserted: 0,
    duplicates: 0,
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

    // Filter: skip URLs already imported or with known external_id
    const newUrls = eventUrls.filter((u) => {
      if (existingUrls.has(u)) return false;
      const slug = u.split("/").pop() || "";
      if (slug && existingExtIds.has(slug)) return false;
      return true;
    }).slice(0, MAX_NEW_SCRAPE);

    stats.duplicates = eventUrls.length - newUrls.length;
    console.log(`${stats.duplicates} already imported, ${newUrls.length} new to scrape`);

    if (newUrls.length === 0) return json(stats);

    // Phase 3: Scrape new pages in parallel batches
    stats.phase = "scraping";
    console.log(`Phase 3: Scraping ${newUrls.length} pages (concurrency=${CONCURRENCY})`);

    // Pre-load partner names for matching
    const { data: allPartners } = await supabase.from("partners").select("id, name");
    const partners = allPartners || [];

    // Pass dedup sets to scrapeAndInsert
    const dedupCtx = { existingExtIds, existingTitleVenueDate };

    for (let i = 0; i < newUrls.length; i += CONCURRENCY) {
      const batch = newUrls.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((eventUrl) => scrapeAndInsert(eventUrl, firecrawlKey, supabase, partners, stats))
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

/* ── scrape a single event URL and insert ── */
async function scrapeAndInsert(
  eventUrl: string,
  firecrawlKey: string,
  supabase: any,
  partners: { id: string; name: string }[],
  stats: any
) {
  stats.pagesScraped++;

  const detailRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url: eventUrl,
      formats: ["markdown"],
      onlyMainContent: true,
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
  const imageUrl = meta.ogImage || meta["og:image"] || null;
  const venue = extractVenue(md);
  const dateTime = extractDateTime(md);

  // Dedup by title + venue
  if (venue) {
    const { data: dupCheck } = await supabase
      .from("eventou_imports")
      .select("id")
      .eq("title", title)
      .eq("venue_name", venue)
      .limit(1);
    if (dupCheck && dupCheck.length > 0) {
      stats.duplicates++;
      return;
    }
  }

  // Match partner by venue name (in-memory)
  let partnerId: string | null = null;
  if (venue) {
    const venueLower = venue.toLowerCase();
    const match = partners.find((p) => venueLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(venueLower));
    if (match) partnerId = match.id;
  }

  const slug = eventUrl.split("/").pop() || "";

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
  });

  if (insertError) {
    if (insertError.code === "23505") {
      stats.duplicates++;
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

function extractVenue(md: string): string | null {
  const patterns = [
    /(?:Local|Onde|Endereço|Local do evento)[:\s]+(.+)/i,
    /📍\s*(.+)/,
  ];
  for (const p of patterns) {
    const m = md.match(p);
    if (m) return m[1].trim().slice(0, 200);
  }
  return null;
}

function extractDateTime(md: string): string | null {
  const isoMatch = md.match(/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/);
  if (isoMatch) return new Date(isoMatch[1]).toISOString();

  const brMatch = md.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const timeMatch = md.match(/(\d{1,2})[h:](\d{2})/);
    const h = timeMatch ? timeMatch[1] : "20";
    const min = timeMatch ? timeMatch[2] : "00";
    return new Date(
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:00-03:00`
    ).toISOString();
  }

  return null;
}
