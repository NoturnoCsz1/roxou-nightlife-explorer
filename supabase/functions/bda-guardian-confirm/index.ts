// BDA — confirmação do responsável por link único com token forte e expiração.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { hashToken, sanitizeText } from "../_shared/bdaCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const token = sanitizeText(body?.token ?? url.searchParams.get("token"), 128);
    if (!token || token.length < 32) return json({ error: "Link inválido." }, 400);

    const hash = await hashToken(token);
    const { data: guardian } = await supabase
      .from("bda_guardians")
      .select("id, full_name, participant_id, confirm_token_expires_at, confirm_token_used_at, confirmed_at, refused_at")
      .eq("confirm_token_hash", hash)
      .maybeSingle();

    if (!guardian) return json({ error: "Link inválido ou já utilizado." }, 404);
    if (guardian.confirm_token_used_at) return json({ error: "Este link já foi utilizado.", used: true }, 410);
    if (guardian.confirm_token_expires_at && new Date(guardian.confirm_token_expires_at) < new Date()) {
      return json({ error: "Este link expirou. Solicite um novo à organização.", expired: true }, 410);
    }

    const { data: participant } = await supabase
      .from("bda_participants")
      .select("id, public_name, registration_id")
      .eq("id", guardian.participant_id)
      .single();
    const { data: registration } = await supabase
      .from("bda_registrations")
      .select("id, category, team_name, status")
      .eq("id", participant!.registration_id)
      .single();

    if (req.method === "GET") {
      return json({
        ok: true,
        guardianName: guardian.full_name,
        participantPublicName: participant?.public_name,
        category: registration?.category,
        teamName: registration?.team_name,
      });
    }

    const decision = body?.decision === "accept" ? "accept" : "refuse";
    const now = new Date().toISOString();

    await supabase
      .from("bda_guardians")
      .update({
        confirm_token_used_at: now,
        confirmed_at: decision === "accept" ? now : null,
        refused_at: decision === "refuse" ? now : null,
      })
      .eq("id", guardian.id);

    if (decision === "refuse") {
      await supabase.from("bda_registrations").update({ status: "recusada" }).eq("id", registration!.id);
      await supabase.from("bda_registration_status_history").insert({
        registration_id: registration!.id,
        from_status: registration!.status,
        to_status: "recusada",
        note: "Responsável recusou a autorização",
      });
      return json({ ok: true, decision });
    }

    // Se todos os menores da inscrição já confirmaram, avança o status.
    const { data: minors } = await supabase
      .from("bda_participants")
      .select("id")
      .eq("registration_id", registration!.id)
      .eq("is_minor", true);
    const ids = (minors ?? []).map((m) => m.id);
    const { data: guardians } = await supabase
      .from("bda_guardians")
      .select("participant_id, confirmed_at")
      .in("participant_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const allConfirmed =
      ids.length > 0 && ids.every((id) => guardians?.some((g) => g.participant_id === id && g.confirmed_at));

    if (allConfirmed) {
      await supabase.from("bda_registrations").update({ status: "aguardando_analise" }).eq("id", registration!.id);
      await supabase.from("bda_registration_status_history").insert({
        registration_id: registration!.id,
        from_status: registration!.status,
        to_status: "aguardando_analise",
        note: "Autorização do responsável confirmada",
      });
    }

    return json({ ok: true, decision, registrationStatus: allConfirmed ? "aguardando_analise" : registration!.status });
  } catch (e) {
    console.error("bda-guardian-confirm error", e);
    return json({ error: "Não foi possível processar a confirmação." }, 500);
  }
});
