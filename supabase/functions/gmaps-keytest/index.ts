const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing key" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const q = "Av. da Saudade, 960, Presidente Prudente, SP, Brasil";
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&language=pt-BR&region=br&key=${apiKey}`;
  const r = await fetch(url);
  const data = await r.json();
  const top = data.results?.[0];
  return new Response(JSON.stringify({
    http: r.status,
    status: data.status,
    error_message: data.error_message,
    key_tail: apiKey.slice(-4),
    latitude: top?.geometry?.location?.lat ?? null,
    longitude: top?.geometry?.location?.lng ?? null,
    place_id: top?.place_id ?? null,
    formatted_address: top?.formatted_address ?? null,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
