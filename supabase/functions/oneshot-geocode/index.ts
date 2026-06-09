// Temporary one-shot. Geocodes partners with full address and saves lat/lng/place_id/formatted_address.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXCLUDED_SLUGS = new Set(["bar-da-12", "prudente-rodeio-bulls"]);

function norm(s?: string) {
  return (s || "").replace(/\s+/g, " ").replace(/,\s*,+/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim();
}
function expandAbbr(s: string) {
  return s
    .replace(/\bAv\.?\b/gi, "Avenida")
    .replace(/\bR\.?\b/gi, "Rua")
    .replace(/\bPq\.?\b/gi, "Parque")
    .replace(/\bPça\.?\b/gi, "Praça")
    .replace(/\bPraca\b/gi, "Praça")
    .replace(/\bRod\.?\b/gi, "Rodovia")
    .replace(/\bEstr\.?\b/gi, "Estrada");
}
function normalizeCity(s: string) {
  let out = s
    .replace(/\bPres(idente)?\.?\s+Prudente\b/gi, "Presidente Prudente")
    .replace(/\bP\.\s*Prudente\b/gi, "Presidente Prudente");
  if (!/Presidente\s+Prudente/i.test(out)) {
    out = out.replace(/(^|[,\s])Prudente\b(?!\s*\w)/gi, "$1Presidente Prudente");
  }
  return out;
}
function cleanDuplicateCity(s: string) {
  return s
    .replace(/Presidente(\s+Presidente)+\s+Prudente/gi, "Presidente Prudente")
    .replace(/(Presidente\s+Prudente)(\s+Presidente\s+Prudente)+/gi, "$1")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}
function stripCepAndState(s: string) {
  return s
    .replace(/\b\d{5}-?\d{3}\b/g, "")
    .replace(/\s*-\s*SP\b/gi, "")
    .replace(/[,\s-]+$/g, "")
    .trim();
}
function stripEmbeddedCity(s: string, cityCanonical: string) {
  const r = new RegExp(`[,\\s-]+${cityCanonical.replace(/\s+/g, "\\s+")}\\b.*$`, "i");
  return s.replace(r, "").replace(/[,\s-]+$/, "").trim();
}
function stripNumber(s: string) {
  return s.replace(/,\s*\d+\w*\s*$/, "").replace(/\s+\d+\w*$/, "").trim();
}

async function geocode(p: any, apiKey: string) {
  const cityFinal = norm(normalizeCity(p.city || "")) || "Presidente Prudente";
  const addressClean = stripCepAndState(norm(p.address));
  const addressN = stripEmbeddedCity(normalizeCity(addressClean), cityFinal);
  const addrNoNeighborhood = addressN.replace(/\s*-\s*[^,]*$/, "").trim();
  const addrExpanded = expandAbbr(addressN);
  const addrNoNumber = stripNumber(addrNoNeighborhood);
  const nbh = norm(p.neighborhood);

  const raw: string[][] = [
    [addressN, cityFinal, "SP", "Brasil"],
    [addressN, nbh, cityFinal, "SP", "Brasil"],
    [addrNoNeighborhood, cityFinal, "SP", "Brasil"],
    [expandAbbr(addrNoNeighborhood), cityFinal, "SP", "Brasil"],
    [addrExpanded, cityFinal, "SP", "Brasil"],
    [addrNoNumber, cityFinal, "SP", "Brasil"],
  ];
  const candidates = raw
    .map((parts) => cleanDuplicateCity(parts.filter(Boolean).join(", ")))
    .filter((q, i, a) => q.length > 4 && a.indexOf(q) === i);

  let lastStatus = "ZERO_RESULTS";
  for (const query of candidates) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=pt-BR&region=br&components=${encodeURIComponent("country:BR")}&key=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();
    lastStatus = data.status;
    if (data.status === "OK" && data.results?.length) {
      return { ok: true, result: data.results[0], usedQuery: query };
    }
    if (data.status === "REQUEST_DENIED") return { ok: false, error: "REQUEST_DENIED" };
  }
  return { ok: false, error: lastStatus };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
  const admin = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

  const body = await req.json().catch(() => ({}));
  const prioritySlugs: string[] = body.slugs || [];

  let query = admin
    .from("partners")
    .select("id, name, slug, address, neighborhood, city, latitude, longitude, maps_place_id, featured_home")
    .eq("active", true)
    .is("latitude", null)
    .not("address", "is", null)
    .not("city", "is", null);

  const { data: partners, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  const eligible = (partners || []).filter((p) => {
    if (EXCLUDED_SLUGS.has(p.slug)) return false;
    if (!p.address?.trim()) return false;
    if (!/[0-9]/.test(p.address)) return false; // ambiguous (no number)
    return true;
  });

  // Sort: priority slugs first, then featured, then rest
  eligible.sort((a, b) => {
    const ai = prioritySlugs.indexOf(a.slug);
    const bi = prioritySlugs.indexOf(b.slug);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return (b.featured_home ? 1 : 0) - (a.featured_home ? 1 : 0);
  });

  const results: any[] = [];
  for (const p of eligible) {
    try {
      const g = await geocode(p, apiKey);
      if (g.ok && g.result) {
        const r = g.result;
        const upd = await admin
          .from("partners")
          .update({
            latitude: r.geometry.location.lat,
            longitude: r.geometry.location.lng,
            maps_place_id: r.place_id,
            formatted_address: r.formatted_address,
          })
          .eq("id", p.id);
        results.push({
          slug: p.slug,
          ok: true,
          place_id: r.place_id,
          formatted: r.formatted_address,
          used_query: g.usedQuery,
          partial: !!r.partial_match,
          update_error: upd.error?.message,
        });
      } else {
        results.push({ slug: p.slug, ok: false, error: g.error });
      }
    } catch (e: any) {
      results.push({ slug: p.slug, ok: false, error: e?.message || String(e) });
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  const summary = {
    total_eligible: eligible.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    with_place_id: results.filter((r) => r.ok && r.place_id).length,
    partial_matches: results.filter((r) => r.ok && r.partial).length,
  };
  return new Response(JSON.stringify({ ok: true, summary, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
