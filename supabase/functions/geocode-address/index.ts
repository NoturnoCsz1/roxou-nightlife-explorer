import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Validar JWT + role admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    // 2. Validar input
    const body = await req.json();
    const address: string | undefined = body?.address;
    const city: string | undefined = body?.city;
    const state: string | undefined = body?.state;
    const country: string | undefined = body?.country;
    const neighborhood: string | undefined = body?.neighborhood;
    const name: string | undefined = body?.name;
    if (!address || typeof address !== "string" || address.length < 3 || address.length > 300) {
      return json({ ok: false, error: "Endereço inválido" }, 400);
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return json({ ok: false, error: "API KEY ausente" }, 500);
    }

    const norm = (s?: string) =>
      (s || "").replace(/\s+/g, " ").replace(/,\s*,+/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim();

    // Expand common BR abbreviations
    const expandAbbr = (s: string) =>
      s
        .replace(/\bAv\.?\b/gi, "Avenida")
        .replace(/\bR\.?\b/gi, "Rua")
        .replace(/\bPq\.?\b/gi, "Parque")
        .replace(/\bPça\.?\b/gi, "Praça")
        .replace(/\bPraca\b/gi, "Praça")
        .replace(/\bRod\.?\b/gi, "Rodovia")
        .replace(/\bEstr\.?\b/gi, "Estrada");

    // Normalize abbreviated city names (Pres. Prudente, P. Prudente, etc.)
    const normalizeCity = (s: string) => {
      let out = s
        .replace(/\bPres(idente)?\.?\s+Prudente\b/gi, "Presidente Prudente")
        .replace(/\bP\.\s*Prudente\b/gi, "Presidente Prudente");
      // Only expand bare "Prudente" if "Presidente Prudente" not already present
      if (!/Presidente\s+Prudente/i.test(out)) {
        out = out.replace(/(^|[,\s])Prudente\b(?!\s*\w)/gi, "$1Presidente Prudente");
      }
      return out;
    };

    // Remove duplicated city tokens like "Presidente Presidente Prudente"
    const cleanDuplicateCity = (s: string) =>
      s
        .replace(/Presidente(\s+Presidente)+\s+Prudente/gi, "Presidente Prudente")
        .replace(/(Presidente\s+Prudente)(\s+Presidente\s+Prudente)+/gi, "$1")
        .replace(/\s+,/g, ",")
        .replace(/,\s*,+/g, ",")
        .replace(/\s+/g, " ")
        .trim();

    // Strip CEP (00000-000 or 00000000) and trailing "- SP" / state suffixes
    const stripCepAndState = (s: string) =>
      s
        .replace(/\b\d{5}-?\d{3}\b/g, "")
        .replace(/\s*-\s*SP\b/gi, "")
        .replace(/[,\s-]+$/g, "")
        .trim();

    // Remove embedded city from the address string so we can append the canonical one
    const stripEmbeddedCity = (s: string, cityCanonical: string) => {
      const cityRegex = new RegExp(`[,\\s-]+${cityCanonical.replace(/\s+/g, "\\s+")}\\b.*$`, "i");
      return s.replace(cityRegex, "").replace(/[,\s-]+$/, "").trim();
    };
    // Strip apostrophes / weird chars from establishment NAME query only
    const sanitizeName = (s: string) =>
      s.replace(/[''`´]/g, "").replace(/[^\w\sáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ.&-]/g, " ").replace(/\s+/g, " ").trim();
    // Strip number from "Rua X, 123" -> "Rua X"
    const stripNumber = (s: string) => s.replace(/,\s*\d+\w*\s*$/, "").replace(/\s+\d+\w*$/, "").trim();

    const cityFinal = norm(normalizeCity(city || "")) || "Presidente Prudente";
    const stateFinal = norm(state) || "SP";
    const countryFinal = norm(country) || "Brasil";
    const addressNormalizedCity = normalizeCity(norm(address));
    const addressN = stripEmbeddedCity(addressNormalizedCity, cityFinal);
    const addrNoNeighborhood = addressN.replace(/\s*-\s*[^,]*$/, "").trim();
    const addrExpanded = expandAbbr(addressN);
    const addrNoNumber = stripNumber(addrNoNeighborhood);
    const nbh = norm(neighborhood);
    const nameSan = sanitizeName(norm(name) || "");

    const rawCandidates: string[][] = [
      // A) full address + city/state/country
      [addressN, cityFinal, stateFinal, countryFinal],
      // A2) full + neighborhood
      [addressN, nbh, cityFinal, stateFinal, countryFinal],
      // B) without neighborhood after hyphen
      [addrNoNeighborhood, cityFinal, stateFinal, countryFinal],
      // B2) expanded abbreviations
      [expandAbbr(addrNoNeighborhood), cityFinal, stateFinal, countryFinal],
      [addrExpanded, cityFinal, stateFinal, countryFinal],
      // C) without number
      [addrNoNumber, cityFinal, stateFinal, countryFinal],
      [expandAbbr(addrNoNumber), cityFinal, stateFinal, countryFinal],
      // D) name + city
      [nameSan, cityFinal, stateFinal, countryFinal],
      // E) neighborhood + city
      [nbh, cityFinal, stateFinal, countryFinal],
    ];

    const candidates = rawCandidates
      .map((parts) => parts.filter(Boolean).join(", "))
      .filter((q, i, a) => q.length > 4 && a.indexOf(q) === i);

    let result: any = null;
    let lastStatus = "ZERO_RESULTS";
    let usedQuery = "";
    const tried: string[] = [];
    for (const query of candidates) {
      tried.push(query);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=pt-BR&region=br&components=${encodeURIComponent("country:BR")}&key=${apiKey}`;
      const r = await fetch(url);
      const data = await r.json();
      lastStatus = data.status;
      if (data.status === "OK" && data.results?.length) {
        result = data.results[0];
        usedQuery = query;
        break;
      }
      if (data.status === "REQUEST_DENIED") break;
    }

    if (!result) {
      return json({ ok: false, error: "Endereço não encontrado", status: lastStatus, tried });
    }

    return json({
      ok: true,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      used_query: usedQuery,
      tried,
      partial_match: !!result.partial_match,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
