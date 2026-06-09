const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY") || "";
  const masked = key ? `${key.slice(0,6)}...${key.slice(-4)} (len=${key.length})` : "MISSING";

  const tests: any = { key_present: !!key, key_masked: masked };

  // Test 1: Geocoding API
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent("Av. da Saudade, 960, Presidente Prudente, SP, Brasil")}&key=${key}`;
    const r = await fetch(url);
    const j = await r.json();
    tests.geocoding = { http: r.status, status: j.status, error_message: j.error_message, results: j.results?.length ?? 0 };
  } catch (e) { tests.geocoding = { error: String(e) }; }

  // Test 2: Places API (New)
  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName" },
      body: JSON.stringify({ textQuery: "Quinta Aula Presidente Prudente" }),
    });
    const j = await r.json();
    tests.places_new = { http: r.status, error: j.error, count: j.places?.length };
  } catch (e) { tests.places_new = { error: String(e) }; }

  // Test 3: Places API (Legacy)
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=test&inputtype=textquery&key=${key}`);
    const j = await r.json();
    tests.places_legacy = { http: r.status, status: j.status, error_message: j.error_message };
  } catch (e) { tests.places_legacy = { error: String(e) }; }

  // Test 4: Maps JS API key validation (staticmap as proxy for JS key validity)
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=100x100&key=${key}`);
    tests.staticmap = { http: r.status, content_type: r.headers.get("content-type") };
  } catch (e) { tests.staticmap = { error: String(e) }; }

  return new Response(JSON.stringify(tests, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
});
