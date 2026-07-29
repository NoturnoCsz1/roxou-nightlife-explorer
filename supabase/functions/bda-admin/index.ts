// BDA — ações administrativas sobre inscrições (somente admin autenticado).
// Toda ação sensível gera log de auditoria.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin, corsHeaders } from "../_shared/requireAdmin.ts";
import { createOpaqueToken, decryptSensitive, sanitizeText } from "../_shared/bdaCrypto.ts";

const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const STATUSES = [
  "rascunho",
  "aguardando_responsavel",
  "aguardando_analise",
  "aprovada_privada",
  "aprovada_publica",
  "pendencia",
  "recusada",
  "cancelada",
];

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 ano

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const adminId = auth.userId;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const log = (action: string, entity: string, entityId: string | null, before: unknown, after: unknown) =>
    supabase.from("bda_admin_audit_logs").insert({
      admin_user_id: adminId === "cron" || adminId === "service_role" ? null : adminId,
      action,
      entity,
      entity_id: entityId,
      before_data: before ?? null,
      after_data: after ?? null,
    });

  try {
    const body = await req.json();
    const action = sanitizeText(body?.action, 40);

    if (action === "set_status") {
      const registrationId = sanitizeText(body?.registrationId, 40);
      const status = sanitizeText(body?.status, 30);
      const note = sanitizeText(body?.note, 500);
      if (!STATUSES.includes(status)) return json({ error: "Status inválido." }, 400);

      const { data: before } = await supabase
        .from("bda_registrations")
        .select("id, status")
        .eq("id", registrationId)
        .single();
      if (!before) return json({ error: "Inscrição não encontrada." }, 404);

      await supabase
        .from("bda_registrations")
        .update({ status, admin_notes: note || undefined })
        .eq("id", registrationId);
      await supabase.from("bda_registration_status_history").insert({
        registration_id: registrationId,
        from_status: before.status,
        to_status: status,
        changed_by: adminId,
        note: note || null,
      });
      await log("set_status", "bda_registrations", registrationId, before, { status, note });

      // Ao aprovar publicamente, publica a foto otimizada apenas de quem autorizou.
      if (status === "aprovada_publica") {
        const { data: participants } = await supabase
          .from("bda_participants")
          .select("id")
          .eq("registration_id", registrationId);
        for (const p of participants ?? []) {
          const { data: consent } = await supabase
            .from("bda_consents")
            .select("granted, revoked_at")
            .eq("participant_id", p.id)
            .eq("consent_key", "exibicao_publica")
            .maybeSingle();
          if (!consent?.granted || consent?.revoked_at) continue;
          const { data: signed } = await supabase.storage
            .from("bda-photos")
            .createSignedUrl(`optimized/${p.id}.bin`, SIGNED_URL_TTL);
          await supabase
            .from("bda_participants")
            .update({ show_public: true, photo_public_url: signed?.signedUrl ?? null })
            .eq("id", p.id);
        }
      }
      if (["aprovada_privada", "recusada", "cancelada", "pendencia"].includes(status)) {
        await supabase
          .from("bda_participants")
          .update({ show_public: false, photo_public_url: null })
          .eq("registration_id", registrationId);
      }
      return json({ ok: true });
    }

    if (action === "remove_public_photo") {
      const participantId = sanitizeText(body?.participantId, 40);
      const { data: before } = await supabase
        .from("bda_participants")
        .select("id, photo_public_url, show_public")
        .eq("id", participantId)
        .single();
      await supabase
        .from("bda_participants")
        .update({ photo_public_url: null, show_public: false })
        .eq("id", participantId);
      await supabase.storage.from("bda-photos").remove([`optimized/${participantId}.bin`]);
      await log("remove_public_photo", "bda_participants", participantId, before, { photo_public_url: null });
      return json({ ok: true });
    }

    if (action === "reveal_cpf") {
      const guardianId = sanitizeText(body?.guardianId, 40);
      const { data: guardian } = await supabase
        .from("bda_guardians")
        .select("id, cpf_encrypted")
        .eq("id", guardianId)
        .single();
      if (!guardian?.cpf_encrypted) return json({ error: "CPF não disponível." }, 404);
      const cpf = await decryptSensitive(guardian.cpf_encrypted as unknown as string);
      await log("reveal_cpf", "bda_guardians", guardianId, null, { revealed: true });
      return json({ ok: true, cpf });
    }

    if (action === "guardian_link") {
      const guardianId = sanitizeText(body?.guardianId, 40);
      const { token, hash } = await createOpaqueToken();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("bda_guardians")
        .update({ confirm_token_hash: hash, confirm_token_expires_at: expires, confirm_token_used_at: null })
        .eq("id", guardianId);
      if (error) throw error;
      await log("guardian_link_regenerated", "bda_guardians", guardianId, null, { expires });
      return json({ ok: true, token, expiresAt: expires });
    }

    if (action === "admin_note") {
      const registrationId = sanitizeText(body?.registrationId, 40);
      const note = sanitizeText(body?.note, 1000);
      const { data: before } = await supabase
        .from("bda_registrations")
        .select("id, admin_notes")
        .eq("id", registrationId)
        .single();
      await supabase.from("bda_registrations").update({ admin_notes: note }).eq("id", registrationId);
      await log("admin_note", "bda_registrations", registrationId, before, { admin_notes: note });
      return json({ ok: true });
    }

    if (action === "revoke_consent") {
      const consentId = sanitizeText(body?.consentId, 40);
      const { data: before } = await supabase
        .from("bda_consents")
        .select("id, granted, revoked_at, participant_id, consent_key")
        .eq("id", consentId)
        .single();
      await supabase
        .from("bda_consents")
        .update({ granted: false, revoked_at: new Date().toISOString() })
        .eq("id", consentId);
      if (before?.consent_key === "exibicao_publica" && before?.participant_id) {
        await supabase
          .from("bda_participants")
          .update({ show_public: false, photo_public_url: null })
          .eq("id", before.participant_id);
      }
      await log("revoke_consent", "bda_consents", consentId, before, { granted: false });
      return json({ ok: true });
    }

    if (action === "log_export") {
      const rowCount = Number(body?.rowCount) || 0;
      const filter = sanitizeText(body?.filter, 40) || "todas";
      await log("export_csv", "bda_registrations", null, null, { rowCount, filter });
      return json({ ok: true });
    }

    return json({ error: "Ação não suportada." }, 400);
  } catch (e) {
    console.error("bda-admin error", e);
    return json({ error: "Falha ao executar a ação administrativa." }, 500);
  }
});
