import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ?? "contato@roxou.com.br";
const FROM_EMAIL = Deno.env.get("CONTACT_FROM_EMAIL") ?? "Roxou <contato@roxou.com.br>";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface KindConfig {
  table: string;
  source: string;
  contactTypes: string[];
  brand: string;
  pageOrigin: string;
  adminSubject: string;
  userSubject: string;
  userMessage: string;
}

const KINDS: Record<string, KindConfig> = {
  expo: {
    table: "expo2026_contacts",
    source: "expo2026_contato",
    contactTypes: [
      "Dúvidas sobre o evento",
      "Proposta comercial",
      "Patrocínio",
      "Imprensa",
      "Trabalhe com a gente",
      "Outro",
    ],
    brand: "Expo Prudente 2026",
    pageOrigin: "/expo2026/contato",
    adminSubject: "Novo contato recebido — Expo Prudente 2026",
    userSubject: "Recebemos sua mensagem — Expo Prudente 2026",
    userMessage:
      "Recebemos sua mensagem sobre a <b>Expo Prudente 2026</b>. Nossa equipe analisará seu contato e retornará em breve.",
  },
  roxou: {
    table: "roxou_contacts",
    source: "roxou_contato",
    contactTypes: [
      "Divulgar evento",
      "Parceria comercial",
      "Anunciar na Roxou",
      "Imprensa",
      "Suporte",
      "Sugestão",
      "Outro",
    ],
    brand: "Roxou",
    pageOrigin: "/contato",
    adminSubject: "Novo contato recebido — Roxou",
    userSubject: "Recebemos sua mensagem — Roxou",
    userMessage:
      "Recebemos sua mensagem para a equipe da <b>Roxou</b>. Nossa equipe analisará seu contato e retornará em breve.",
  },
};

const escapeHtml = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { success: false, error: "Método não permitido" });

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY ausente");
      return jsonResponse(500, { success: false, error: "Configuração de e-mail indisponível." });
    }

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse(400, { success: false, error: "JSON inválido." });

    const kindKey = String(body.kind ?? "expo");
    const cfg = KINDS[kindKey];
    if (!cfg) return jsonResponse(400, { success: false, error: "Tipo de formulário inválido." });

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const contact_type = String(body.contact_type ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors: string[] = [];
    if (!name || name.length > 120) errors.push("name");
    if (!email || !emailRe.test(email) || email.length > 160) errors.push("email");
    if (!phone || phone.length > 30) errors.push("phone");
    if (!contact_type || !cfg.contactTypes.includes(contact_type)) errors.push("contact_type");
    if (!subject || subject.length > 200) errors.push("subject");
    if (!message || message.length < 10 || message.length > 2000) errors.push("message");

    if (errors.length) {
      return jsonResponse(400, { success: false, error: "Dados inválidos.", fields: errors });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error: dbError } = await supabase.from(cfg.table).insert({
      name, email, phone, contact_type, subject, message,
      source: cfg.source,
      status: "novo",
    });

    if (dbError) {
      console.error("DB insert error", dbError.message);
      return jsonResponse(500, { success: false, error: "Não foi possível salvar sua mensagem." });
    }

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:12px;">
        <h2 style="color:#a855f7;margin:0 0 16px;">${escapeHtml(cfg.adminSubject)}</h2>
        <table style="width:100%;border-collapse:collapse;color:#e5e5e5;">
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Nome:</b></td><td>${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>E-mail:</b></td><td>${escapeHtml(email)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Telefone/WhatsApp:</b></td><td>${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Tipo de contato:</b></td><td>${escapeHtml(contact_type)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Assunto:</b></td><td>${escapeHtml(subject)}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#18181b;border-left:3px solid #7c3aed;border-radius:6px;">
          <b style="color:#a855f7;">Mensagem:</b>
          <p style="white-space:pre-wrap;color:#e5e5e5;margin:8px 0 0;">${escapeHtml(message)}</p>
        </div>
        <p style="margin-top:16px;color:#71717a;font-size:12px;">Enviado pela página ${escapeHtml(cfg.pageOrigin)} em ${now}</p>
      </div>`;

    const userHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:12px;">
        <h2 style="color:#a855f7;">Recebemos sua mensagem!</h2>
        <p style="color:#e5e5e5;">Olá, <b>${escapeHtml(name)}</b>.</p>
        <p style="color:#e5e5e5;">${cfg.userMessage}</p>
        <div style="margin-top:24px;padding:16px;background:#18181b;border-radius:8px;border:1px solid #7c3aed;">
          <p style="margin:0;color:#a855f7;"><b>Resumo do seu contato</b></p>
          <p style="margin:8px 0 0;color:#e5e5e5;"><b>Assunto:</b> ${escapeHtml(subject)}</p>
          <p style="margin:4px 0 0;color:#e5e5e5;"><b>Tipo:</b> ${escapeHtml(contact_type)}</p>
        </div>
        <p style="margin-top:24px;color:#71717a;font-size:12px;">Roxou — O seu portal de eventos.</p>
      </div>`;

    try {
      await sendEmail(TO_EMAIL, cfg.adminSubject, adminHtml);
    } catch (e) {
      console.error("Falha enviando e-mail admin:", (e as Error).message);
      return jsonResponse(500, { success: false, error: "Não foi possível enviar sua mensagem." });
    }

    try {
      await sendEmail(email, cfg.userSubject, userHtml);
    } catch (e) {
      console.error("Falha enviando auto-reply (seguindo):", (e as Error).message);
    }

    return jsonResponse(200, { success: true, message: "Mensagem enviada com sucesso." });
  } catch (e) {
    console.error("Erro inesperado:", (e as Error).message);
    return jsonResponse(500, { success: false, error: "Não foi possível enviar sua mensagem." });
  }
});
