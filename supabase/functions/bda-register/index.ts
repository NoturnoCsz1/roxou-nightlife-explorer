// BDA — recebimento seguro de inscrições (público, sem autenticação)
// Toda a validação é server-side. O cliente nunca escreve direto nas tabelas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  ageFromBirthDate,
  createOpaqueToken,
  decodeImage,
  encryptSensitive,
  hashWithSalt,
  isValidCpf,
  maskCpf,
  sanitizeText,
} from "../_shared/bdaCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CONSENT_KEYS = [
  "participacao_evento",
  "tratamento_dados",
  "uso_imagem",
  "exibicao_publica",
  "comunicacoes",
] as const;

const TERMS_VERSION = "v1-provisorio-2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();

    // ---------- antispam ----------
    if (sanitizeText(body?.website, 50)) return json({ error: "Requisição inválida." }, 400);
    if (typeof body?.elapsedMs === "number" && body.elapsedMs < 4000) {
      return json({ error: "Preencha o formulário com calma antes de enviar." }, 429);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const salt = Deno.env.get("BDA_TOKEN_SALT") ?? "bda";
    const ipHash = await hashWithSalt(ip, salt);
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 300);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from("bda_submission_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((recent ?? 0) >= 3) {
      return json({ error: "Muitas inscrições enviadas. Tente novamente mais tarde." }, 429);
    }

    // ---------- validação estrutural ----------
    const category = body?.category === "dupla" ? "dupla" : "solo";
    const parts = Array.isArray(body?.participants) ? body.participants : [];
    const expected = category === "dupla" ? 2 : 1;
    if (parts.length !== expected) {
      return json({ error: `Categoria ${category} exige ${expected} participante(s).` }, 400);
    }

    const prepared: any[] = [];
    for (const [i, p] of parts.entries()) {
      const fullName = sanitizeText(p?.fullName, 120);
      const publicName = sanitizeText(p?.publicName, 40);
      const birthDate = sanitizeText(p?.birthDate, 10);
      const email = sanitizeText(p?.email, 160).toLowerCase();
      const phone = sanitizeText(p?.phone, 30);
      if (fullName.length < 5) return json({ error: `Nome completo inválido (participante ${i + 1}).` }, 400);
      if (publicName.length < 2) return json({ error: `Nome público inválido (participante ${i + 1}).` }, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return json({ error: `Data de nascimento inválida (participante ${i + 1}).` }, 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: `E-mail inválido (participante ${i + 1}).` }, 400);
      if (phone.replace(/\D/g, "").length < 10) return json({ error: `Telefone inválido (participante ${i + 1}).` }, 400);

      const age = ageFromBirthDate(birthDate);
      if (age < 0 || age > 110) return json({ error: `Data de nascimento inválida (participante ${i + 1}).` }, 400);
      const isMinor = age < 18;

      const consents = p?.consents ?? {};
      if (!consents.tratamento_dados) {
        return json({ error: "O consentimento de tratamento de dados é obrigatório." }, 400);
      }
      if (isMinor && !consents.participacao_evento) {
        return json({ error: "Para menores de 18 anos, a autorização de participação é obrigatória." }, 400);
      }

      let guardian: any = null;
      if (isMinor) {
        const g = p?.guardian ?? {};
        const gName = sanitizeText(g?.fullName, 120);
        const gEmail = sanitizeText(g?.email, 160).toLowerCase();
        const gPhone = sanitizeText(g?.phone, 30);
        const gCpf = sanitizeText(g?.cpf, 20).replace(/\D/g, "");
        const relationship = sanitizeText(g?.relationship, 40);
        if (gName.length < 5) return json({ error: "Nome do responsável inválido." }, 400);
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gEmail)) return json({ error: "E-mail do responsável inválido." }, 400);
        if (gPhone.replace(/\D/g, "").length < 10) return json({ error: "Telefone do responsável inválido." }, 400);
        if (!isValidCpf(gCpf)) return json({ error: "CPF do responsável inválido." }, 400);
        if (!relationship) return json({ error: "Informe o vínculo com o participante." }, 400);
        if (!g?.declarationAccepted || !g?.authorityConfirmed) {
          return json({ error: "As declarações do responsável são obrigatórias." }, 400);
        }
        guardian = {
          full_name: gName,
          email: gEmail,
          phone: gPhone,
          relationship,
          birth_date: /^\d{4}-\d{2}-\d{2}$/.test(sanitizeText(g?.birthDate, 10))
            ? sanitizeText(g?.birthDate, 10)
            : null,
          cpf_encrypted: await encryptSensitive(gCpf),
          cpf_masked: maskCpf(gCpf),
          cpf_hash: await hashWithSalt(gCpf, salt),
          declaration_accepted: true,
          authority_confirmed: true,
        };
      }

      const photo = typeof p?.photo === "string" ? decodeImage(p.photo) : null;
      const photoPublic = typeof p?.photoPublic === "string" ? decodeImage(p.photoPublic, 800_000) : null;
      if (p?.photo && !photo) {
        return json({ error: "Foto inválida. Envie JPG, PNG ou WEBP de até 3 MB." }, 400);
      }

      prepared.push({
        participant: {
          slot: i + 1,
          full_name: fullName,
          public_name: publicName,
          birth_date: birthDate,
          city: sanitizeText(p?.city, 80) || null,
          phone,
          email,
          instagram: sanitizeText(p?.instagram, 60) || null,
          notes: sanitizeText(p?.notes, 500) || null,
          show_public: false,
          show_city_public: !!consents.exibicao_cidade && !isMinor,
        },
        isMinor,
        guardian,
        consents,
        photo,
        photoPublic,
      });
    }

    // ---------- persistência ----------
    const anyMinor = prepared.some((p) => p.isMinor);
    const status = anyMinor ? "aguardando_responsavel" : "aguardando_analise";

    const { data: reg, error: regErr } = await supabase
      .from("bda_registrations")
      .insert({
        category,
        team_name: category === "dupla" ? sanitizeText(body?.teamName, 60) || null : null,
        status,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (regErr) throw regErr;

    const pendingGuardianEmails: string[] = [];

    for (const item of prepared) {
      const { data: participant, error: pErr } = await supabase
        .from("bda_participants")
        .insert({ ...item.participant, registration_id: reg.id })
        .select("id")
        .single();
      if (pErr) throw pErr;

      // fotos em bucket privado
      if (item.photo) {
        const path = `originals/${reg.id}/${crypto.randomUUID()}.bin`;
        const up = await supabase.storage
          .from("bda-photos")
          .upload(path, item.photo.bytes, { contentType: item.photo.contentType, upsert: false });
        if (!up.error) {
          await supabase.from("bda_participants").update({ photo_original_path: path }).eq("id", participant.id);
        }
      }
      if (item.photoPublic) {
        const path = `optimized/${participant.id}.bin`;
        await supabase.storage
          .from("bda-photos")
          .upload(path, item.photoPublic.bytes, {
            contentType: item.photoPublic.contentType,
            upsert: true,
          });
      }

      if (item.guardian) {
        const { token, hash } = await createOpaqueToken();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("bda_guardians").insert({
          ...item.guardian,
          participant_id: participant.id,
          confirm_token_hash: hash,
          confirm_token_expires_at: expires,
        });
        pendingGuardianEmails.push(item.guardian.email);
        // Integração de e-mail ainda não configurada: o token fica disponível
        // apenas para reenvio pelo painel administrativo.
        void token;
      }

      const consentRows = CONSENT_KEYS.map((key) => ({
        registration_id: reg.id,
        participant_id: participant.id,
        consent_key: key,
        terms_version: TERMS_VERSION,
        granted: !!item.consents?.[key],
        granted_at: item.consents?.[key] ? new Date().toISOString() : null,
        actor: item.isMinor ? "responsavel" : "participante",
        ip_address: ipHash,
        user_agent: userAgent,
      }));
      await supabase.from("bda_consents").insert(consentRows);
    }

    await supabase.from("bda_registration_status_history").insert({
      registration_id: reg.id,
      from_status: null,
      to_status: status,
      note: "Inscrição enviada pelo formulário público",
    });
    await supabase.from("bda_submission_attempts").insert({ ip_hash: ipHash });

    return json({
      ok: true,
      status,
      requiresGuardian: anyMinor,
      guardianEmails: pendingGuardianEmails.length,
      emailIntegrationPending: true,
    });
  } catch (e) {
    console.error("bda-register error", e);
    return json({ error: "Não foi possível registrar a inscrição agora." }, 500);
  }
});
