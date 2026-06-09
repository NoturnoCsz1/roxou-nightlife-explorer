// Temporary one-shot. Triggers partner-instagram-sync via service role.
import { corsHeaders } from "../_shared/requireAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const body = await req.json().catch(() => ({}));
  const ids: string[] = body.partner_ids || [];
  const results: any[] = [];
  for (const id of ids) {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/partner-instagram-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SRK}`,
        apikey: SRK,
      },
      body: JSON.stringify({ partner_id: id }),
    });
    const j = await r.json().catch(() => ({}));
    results.push({ id, status: r.status, body: j });
  }
  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
