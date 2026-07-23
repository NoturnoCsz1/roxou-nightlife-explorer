/**
 * Public short-link redirector.
 * GET /r?slug=xxx  → 302 to destination (with UTMs + preserved params)
 * Logs click server-side using service role. Never exposes internal data.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const BOT_UA = /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|slackbot|twitterbot|linkedinbot|discordbot|telegrambot|preview|monitoring|uptimerobot|pingdom|headlesschrome|chrome-lighthouse/i;
const RESERVED = new Set(["admin","api","auth","login","logout","partner","parceiro","r","health","assets","static"]);
const SAFE_PARAM_RE = /^[a-zA-Z0-9_-]{1,32}$/;

function detectDevice(ua: string): string {
  if (BOT_UA.test(ua)) return "bot";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  if (ua) return "desktop";
  return "unknown";
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  if (/opera|opr\//i.test(ua)) return "Opera";
  return "unknown";
}

function detectOS(ua: string): string {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "unknown";
}

function referrerDomain(ref: string | null): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (/instagram\.com/i.test(host)) return "Instagram";
    if (/facebook\.com|fb\.com/i.test(host)) return "Facebook";
    if (/whatsapp\.com|wa\.me/i.test(host)) return "WhatsApp";
    if (/google\./i.test(host)) return "Google";
    if (/tiktok\.com/i.test(host)) return "TikTok";
    if (/twitter\.com|x\.com|t\.co/i.test(host)) return "X/Twitter";
    if (/linkedin\.com/i.test(host)) return "LinkedIn";
    if (/youtube\.com|youtu\.be/i.test(host)) return "YouTube";
    return host;
  } catch { return null; }
}

async function hashVisitor(ip: string, ua: string, salt: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}|${ua}|${salt}|${day}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

function fallbackPage(status: number, title: string, message: string): Response {
  const html = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>${title} · Roxou</title><style>body{background:#0b0217;color:#f5f5f7;font-family:system-ui,-apple-system,Segoe UI,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}.card{max-width:420px}h1{font-size:22px;margin:0 0 8px;color:#e879f9}p{color:#a1a1aa;margin:0 0 20px}a{color:#f5f5f7;text-decoration:none;border:1px solid #52525b;padding:10px 18px;border-radius:999px;display:inline-block}</style><div class="card"><h1>${title}</h1><p>${message}</p><a href="https://roxou.com.br">Ir para a Roxou</a></div>`;
  return new Response(html, { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // slug via query (?slug=) or last path segment
    let slug = url.searchParams.get("slug") ?? "";
    if (!slug) {
      const parts = url.pathname.split("/").filter(Boolean);
      slug = parts[parts.length - 1] ?? "";
    }
    slug = slug.toLowerCase().trim();

    if (!slug || !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(slug) || RESERVED.has(slug)) {
      return fallbackPage(404, "Link inválido", "O endereço solicitado não é válido.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: link, error } = await supabase
      .from("short_links")
      .select("id, destination_url, is_active, expires_at, max_clicks, click_count, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !link) return fallbackPage(404, "Link não encontrado", "Este link curto não existe ou foi removido.");
    if (!link.is_active) return fallbackPage(410, "Link pausado", "Este link está temporariamente indisponível.");
    if (link.expires_at && new Date(link.expires_at) < new Date()) return fallbackPage(410, "Link expirado", "Este link já não está mais disponível.");
    if (link.max_clicks && Number(link.click_count) >= Number(link.max_clicks)) return fallbackPage(410, "Limite atingido", "Este link atingiu o número máximo de acessos.");

    // Build destination URL
    let destination: URL;
    try { destination = new URL(link.destination_url); } catch {
      return fallbackPage(500, "Destino inválido", "Não foi possível processar este link.");
    }
    if (!/^https?:$/.test(destination.protocol)) {
      return fallbackPage(500, "Destino inválido", "Não foi possível processar este link.");
    }

    // Apply configured UTMs (do not overwrite existing at destination)
    const utms: Record<string, string | null> = {
      utm_source: link.utm_source, utm_medium: link.utm_medium,
      utm_campaign: link.utm_campaign, utm_content: link.utm_content, utm_term: link.utm_term,
    };
    for (const [k, v] of Object.entries(utms)) {
      if (v && !destination.searchParams.has(k)) destination.searchParams.set(k, v);
    }

    // Preserve safe query params from incoming request
    const incomingUtms: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      if (k === "slug") continue;
      if (!SAFE_PARAM_RE.test(k) || v.length > 256) continue;
      if (destination.searchParams.has(k)) continue;
      destination.searchParams.set(k, v);
      if (k.startsWith("utm_")) incomingUtms[k] = v;
    }

    // Analytics (fire-and-forget)
    const ua = req.headers.get("user-agent") ?? "";
    const isBot = BOT_UA.test(ua);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const salt = Deno.env.get("SHORT_LINK_HASH_SALT") ?? "roxou-fallback-salt";
    const visitorHash = ip !== "unknown" ? await hashVisitor(ip, ua, salt) : null;
    const ref = req.headers.get("referer");
    const country = req.headers.get("x-country") || req.headers.get("cf-ipcountry");
    const city = req.headers.get("x-city") || req.headers.get("cf-ipcity");

    const clickPromise = supabase.from("short_link_clicks").insert({
      short_link_id: link.id,
      visitor_hash: visitorHash,
      referrer: ref,
      referrer_domain: referrerDomain(ref),
      utm_source: incomingUtms.utm_source ?? link.utm_source,
      utm_medium: incomingUtms.utm_medium ?? link.utm_medium,
      utm_campaign: incomingUtms.utm_campaign ?? link.utm_campaign,
      utm_content: incomingUtms.utm_content ?? link.utm_content,
      utm_term: incomingUtms.utm_term ?? link.utm_term,
      country: country ?? null,
      city: city ?? null,
      device_type: detectDevice(ua),
      browser: detectBrowser(ua),
      os: detectOS(ua),
      is_bot: isBot,
    }).then(() => supabase.rpc as never).catch(() => null);

    // Increment click count atomically via SQL (no RPC needed — use update)
    if (!isBot) {
      void supabase.from("short_links")
        .update({ click_count: Number(link.click_count) + 1 })
        .eq("id", link.id);
    }

    // Ensure click write attempt starts before redirect resolves
    void clickPromise;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: destination.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    console.error("[r] error", e);
    return fallbackPage(500, "Erro", "Não foi possível processar este link.");
  }
});
