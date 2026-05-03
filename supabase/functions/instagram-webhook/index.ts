// Instagram Webhook endpoint (Meta Graph API)
// GET  -> verification handshake (hub.mode, hub.verify_token, hub.challenge)
// POST -> receives messages, comments, mentions payloads

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Verification token shared with Meta App Dashboard
const VERIFY_TOKEN = Deno.env.get("INSTAGRAM_VERIFY_TOKEN") || "ROXOU_IA_2026_SECURE";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1) Verification handshake from Meta
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      console.log("[instagram-webhook] verification OK");
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    console.warn("[instagram-webhook] verification FAILED", { mode, token });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // 2) Event payloads
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("[instagram-webhook] event:", JSON.stringify(payload));

      // TODO: route by payload.object / entry[].changes[].field
      // - "messages" -> DMs
      // - "comments" -> Post comments
      // - "mentions" -> @mentions

      // Meta requires fast 200 to acknowledge receipt
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[instagram-webhook] parse error:", err);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
});
