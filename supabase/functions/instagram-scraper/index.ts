import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PARTNERS = 20;
const MAX_POSTS_PER_PARTNER = 3;

interface Partner {
  id: string;
  instagram: string;
  name: string;
}

function normalizeHandle(raw: string): string {
  return raw.replace(/^@/, "").trim().toLowerCase();
}

function extractPostUrls(html: string, markdown: string): string[] {
  const urls = new Set<string>();
  // Match Instagram post/reel URLs from HTML and markdown
  const pattern = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)\/?/g;
  const combined = (html || "") + " " + (markdown || "");
  let match;
  while ((match = pattern.exec(combined)) !== null) {
    // Normalize to canonical form
    const shortcode = match[1];
    urls.add(`https://www.instagram.com/p/${shortcode}/`);
  }
  return Array.from(urls);
}

function extractPostCaption(html: string, markdown: string): string {
  // Try og:description first
  const ogDesc =
    html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i) ||
    html.match(/content="([^"]+)"\s+(?:property|name)="og:description"/i);
  if (ogDesc) {
    return ogDesc[1]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  if (markdown && markdown.length > 20) {
    return markdown.substring(0, 2000);
  }
  return "";
}

function extractOgImage(html: string): string {
  const match =
    html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) ||
    html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
  return match ? match[1] : "";
}

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ html: string; markdown: string } | null> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html", "links"],
        waitFor: 3000,
      }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.success) {
      console.error(`Firecrawl error for ${url}:`, data.error || resp.status);
      return null;
    }

    return {
      html: data.data?.html || data.html || "",
      markdown: data.data?.markdown || data.markdown || "",
    };
  } catch (err) {
    console.error(`Firecrawl fetch error for ${url}:`, err);
    return null;
  }
}

async function scrapePostDetails(postUrl: string, apiKey: string): Promise<{ caption: string; imageUrl: string } | null> {
  const result = await scrapeWithFirecrawl(postUrl, apiKey);
  if (!result) return null;

  return {
    caption: extractPostCaption(result.html, result.markdown),
    imageUrl: extractOgImage(result.html),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const stats = { partnersProcessed: 0, postsFound: 0, newInserted: 0, errors: 0 };

  try {
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Fetch partners with instagram handles
    const { data: partners, error: partnersErr } = await supabase
      .from("partners")
      .select("id, instagram, name")
      .not("instagram", "is", null)
      .eq("active", true)
      .limit(MAX_PARTNERS);

    if (partnersErr) throw new Error(`Failed to fetch partners: ${partnersErr.message}`);
    if (!partners || partners.length === 0) {
      console.log("No partners with Instagram handles found.");
      return new Response(JSON.stringify({ success: true, stats, message: "No partners to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${partners.length} partners...`);

    // Fetch all existing post_urls for deduplication
    const { data: existingImports } = await supabase
      .from("instagram_imports")
      .select("post_url");
    const existingUrls = new Set((existingImports || []).map((r: { post_url: string }) => r.post_url));

    for (const partner of partners as Partner[]) {
      try {
        const handle = normalizeHandle(partner.instagram);
        if (!handle) continue;

        stats.partnersProcessed++;
        const profileUrl = `https://www.instagram.com/${handle}/`;
        console.log(`Scraping profile: ${profileUrl} (${partner.name})`);

        // Scrape the profile page to discover post URLs
        const profileData = await scrapeWithFirecrawl(profileUrl, firecrawlKey);
        if (!profileData) {
          console.warn(`Could not scrape profile for @${handle}`);
          stats.errors++;
          continue;
        }

        // Extract post URLs from profile
        const postUrls = extractPostUrls(profileData.html, profileData.markdown);
        console.log(`Found ${postUrls.length} post URLs for @${handle}`);

        // Limit to MAX_POSTS_PER_PARTNER most recent
        const recentPosts = postUrls.slice(0, MAX_POSTS_PER_PARTNER);
        stats.postsFound += recentPosts.length;

        for (const postUrl of recentPosts) {
          // Deduplication check
          if (existingUrls.has(postUrl)) {
            console.log(`  Skipping duplicate: ${postUrl}`);
            continue;
          }

          // Scrape individual post for caption + image
          const postDetails = await scrapePostDetails(postUrl, firecrawlKey);

          const row = {
            partner_id: partner.id,
            instagram_handle: handle,
            post_url: postUrl,
            caption: postDetails?.caption || null,
            image_url: postDetails?.imageUrl || null,
            import_status: "pending",
            confidence: "medium",
          };

          const { error: insertErr } = await supabase.from("instagram_imports").insert(row);
          if (insertErr) {
            // Could be unique constraint violation (race condition)
            if (insertErr.message.includes("duplicate") || insertErr.message.includes("unique")) {
              console.log(`  Duplicate caught on insert: ${postUrl}`);
            } else {
              console.error(`  Insert error for ${postUrl}:`, insertErr.message);
              stats.errors++;
            }
          } else {
            stats.newInserted++;
            existingUrls.add(postUrl); // prevent re-insert in same run
            console.log(`  Inserted: ${postUrl}`);
          }
        }
      } catch (partnerErr) {
        console.error(`Error processing partner ${partner.name}:`, partnerErr);
        stats.errors++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== Scraper Complete ===`);
    console.log(`Partners: ${stats.partnersProcessed} | Posts found: ${stats.postsFound} | New: ${stats.newInserted} | Errors: ${stats.errors} | Time: ${elapsed}s`);

    return new Response(
      JSON.stringify({ success: true, stats, elapsed_seconds: parseFloat(elapsed) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("instagram-scraper fatal error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error", stats }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
