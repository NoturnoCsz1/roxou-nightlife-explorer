import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (p: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(p), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: caller is the passenger
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const { ride_request_id } = await req.json();
    if (!ride_request_id || typeof ride_request_id !== "string") {
      return json({ error: "ride_request_id required" }, 400);
    }

    // Load ride and verify passenger ownership + opt-in
    const { data: ride } = await supabase
      .from("ride_requests")
      .select("id, passenger_id, event_name, receive_transport_proposals, drivers_notified_at, status")
      .eq("id", ride_request_id)
      .maybeSingle();

    if (!ride) return json({ error: "Ride not found" }, 404);
    if (ride.passenger_id !== claims.claims.sub) return json({ error: "Forbidden" }, 403);
    if (ride.receive_transport_proposals === false || ride.status !== "open") {
      return json({ ok: true, skipped: "opt_out_or_closed" });
    }
    // Anti-spam: do not re-notify within 60min for same ride
    if (ride.drivers_notified_at) {
      const last = new Date(ride.drivers_notified_at).getTime();
      if (Date.now() - last < 60 * 60 * 1000) {
        return json({ ok: true, skipped: "recently_notified" });
      }
    }

    // Approved drivers, opt-in, not banned/suspended
    const { data: drivers } = await supabase
      .from("driver_applications")
      .select("email, full_name, driver_status, receive_driver_lead_emails")
      .eq("driver_status", "approved")
      .eq("receive_driver_lead_emails", true);

    const recipients = (drivers || [])
      .map((d) => (d.email || "").trim().toLowerCase())
      .filter((e) => /\S+@\S+\.\S+/.test(e));

    if (recipients.length === 0) {
      return json({ ok: true, sent: 0, skipped: "no_recipients" });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND not configured" }, 500);

    const subject = "Novo pedido de transporte disponível na Roxou";
    const text = `Olá, existe um novo pedido de transporte disponível na Roxou.

Acesse sua área de motorista para visualizar:
https://roxou.com.br/motorista

Você pode desativar essas notificações quando quiser.`;
    const html = `<p>Olá, existe um novo pedido de transporte disponível na Roxou.</p>
<p>Acesse sua área de motorista: <a href="https://roxou.com.br/motorista">roxou.com.br/motorista</a></p>
<p style="font-size:12px;color:#666">Você pode desativar essas notificações quando quiser.</p>`;

    // Send via Resend connector gateway (BCC batch to avoid leaking emails)
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let sent = 0;
    if (LOVABLE_API_KEY) {
      // Send in chunks (BCC); fallback per-message
      const chunkSize = 40;
      for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize);
        const r = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "Roxou <onboarding@resend.dev>",
            to: ["motoristas@roxou.com.br"],
            bcc: chunk,
            subject,
            html,
            text,
          }),
        });
        if (r.ok) sent += chunk.length;
      }
    } else {
      // Direct Resend API fallback
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Roxou <onboarding@resend.dev>",
          to: ["motoristas@roxou.com.br"],
          bcc: recipients,
          subject,
          html,
          text,
        }),
      });
      if (r.ok) sent = recipients.length;
    }

    await supabase
      .from("ride_requests")
      .update({ drivers_notified_at: new Date().toISOString() } as any)
      .eq("id", ride_request_id);

    return json({ ok: true, sent });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
