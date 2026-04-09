import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EVENTOU_EXPLORE = "https://eventou.com.br/explorar";
const TARGET_CITY = "presidente prudente";

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
  const stats = { pagesScraped: 0, eventsFound: 0, newInserted: 0, duplicates: 0, errors: 0 };

  try {
    // Step 1: Scrape the explore page to get event links and data
    console.log("Scraping Eventou explore page");
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: EVENTOU_EXPLORE,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error("Scrape failed:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to scrape Eventou explore", detail: scrapeData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links: string[] = scrapeData.data?.links || scrapeData.links || [];
    stats.pagesScraped = 1;

    console.log(`Explore page: ${markdown.length} chars, ${links.length} links`);

    // Step 2: Also map for event detail URLs
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: EVENTOU_EXPLORE,
        search: "presidente prudente",
        limit: 200,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapRes.json();
    const mappedLinks: string[] = mapData.links || [];
    console.log(`Map returned ${mappedLinks.length} links`);

    // Combine all links and filter for event detail pages
    const allLinks = [...new Set([...links, ...mappedLinks])];
    const eventUrls = allLinks.filter((url) => {
      try {
        const u = new URL(url);
        // Match patterns like /evento/slug or /eventos/cidade/slug
        return (
          (u.pathname.startsWith("/evento/") || u.pathname.startsWith("/eventos/")) &&
          !u.pathname.endsWith("/explorar")
        );
      } catch {
        return false;
      }
    });

    console.log(`Found ${eventUrls.length} event URLs from combined sources`);
    stats.eventsFound = eventUrls.length;

    // Step 3: Check existing imports
    const { data: existing } = await supabase
      .from("eventou_imports")
      .select("eventou_url")
      .in("eventou_url", eventUrls.slice(0, 50));

    const existingUrls = new Set((existing || []).map((e: any) => e.eventou_url));
    const newUrls = eventUrls.filter((u) => !existingUrls.has(u)).slice(0, 15);
    stats.duplicates = eventUrls.length - newUrls.length;

    // Step 4: Scrape each new event page
    for (const eventUrl of newUrls) {
      try {
        console.log("Scraping:", eventUrl);
        stats.pagesScraped++;

        const detailRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: eventUrl,
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: 2000,
          }),
        });

        const detailData = await detailRes.json();
        if (!detailRes.ok) {
          console.error("Scrape failed for", eventUrl, detailData);
          stats.errors++;
          continue;
        }

        const meta = detailData.data?.metadata || detailData.metadata || {};
        const md = detailData.data?.markdown || detailData.markdown || "";

        const title = meta.ogTitle || meta.title || extractTitle(md);
        if (!title) {
          console.log("No title found, skipping:", eventUrl);
          stats.errors++;
          continue;
        }

        // Filter: only Presidente Prudente events
        const cityFromPage = extractCity(md) || meta.ogDescription || "";
        const isTargetCity = cityFromPage.toLowerCase().includes(TARGET_CITY);
        // If we can detect a city and it's not our target, skip
        const detectedCity = extractCity(md);
        if (detectedCity && !detectedCity.toLowerCase().includes(TARGET_CITY)) {
          console.log("Skipping non-PP event:", title, "city:", detectedCity);
          continue;
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
            console.log("Duplicate by title+venue:", title);
            stats.duplicates++;
            continue;
          }
        }

        // Auto-match partner
        let partnerId: string | null = null;
        if (venue) {
          const { data: matchedPartners } = await supabase
            .from("partners")
            .select("id")
            .ilike("name", `%${venue}%`)
            .limit(1);
          if (matchedPartners && matchedPartners.length > 0) {
            partnerId = matchedPartners[0].id;
          }
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
      } catch (err) {
        console.error("Error processing", eventUrl, err);
        stats.errors++;
      }
    }

    console.log("Scan complete:", stats);
    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error", stats }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
