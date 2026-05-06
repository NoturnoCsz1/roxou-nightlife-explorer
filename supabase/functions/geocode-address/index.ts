import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Validar JWT + role admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validar input
    const body = await req.json();
    const address: string | undefined = body?.address;
    const city: string | undefined = body?.city;
    const neighborhood: string | undefined = body?.neighborhood;
    const name: string | undefined = body?.name;
    if (!address || typeof address !== "string" || address.length < 3 || address.length > 300) {
      return new Response(JSON.stringify({ error: "Endereço inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const norm = (s?: string) =>
      (s || "").replace(/\s+/g, " ").replace(/,\s*,+/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim();

    const cityFinal = norm(city) || "Presidente Prudente";
    const addrNoNeighborhood = norm(address).replace(/\s*-\s*[^,]*$/, "");

    const candidates = [
      [norm(address), norm(neighborhood), cityFinal, "SP", "Brasil"],
      [norm(address), cityFinal, "SP", "Brasil"],
      [addrNoNeighborhood, cityFinal, "SP", "Brasil"],
      [norm(name), cityFinal, "SP", "Brasil"],
    ]
      .map((parts) => parts.filter(Boolean).join(", "))
      .filter((q, i, a) => q.length > 4 && a.indexOf(q) === i);

    let result: any = null;
    let lastStatus = "ZERO_RESULTS";
    let usedQuery = "";
    for (const query of candidates) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=br&key=${apiKey}`;
      const r = await fetch(url);
      const data = await r.json();
      lastStatus = data.status;
      if (data.status === "OK" && data.results?.length) {
        result = data.results[0];
        usedQuery = query;
        break;
      }
    }

    if (!result) {
      return new Response(JSON.stringify({ error: "Endereço não encontrado", status: lastStatus, tried: candidates }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id,
      used_query: usedQuery,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
