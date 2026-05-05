import { corsHeaders } from "@supabase/supabase-js/cors";

interface Payload {
  name: string;
  email: string;
  phone: string;
  contact_type: string;
  subject: string;
  message: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ?? "contato@roxou.com.br";
const FROM_EMAIL = "Expo Prudente 2026 <onboarding@resend.dev>";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    console.error("Resend error", res.status, txt);
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");

    const body = (await req.json()) as Payload;
    const { name, email, phone, contact_type, subject, message } = body;

    if (!name || !email || !phone || !contact_type || !subject || !message || message.length < 10) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:12px;">
        <h2 style="color:#a855f7;margin:0 0 16px;">Novo contato — Expo Prudente 2026</h2>
        <table style="width:100%;border-collapse:collapse;color:#e5e5e5;">
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Nome:</b></td><td>${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>E-mail:</b></td><td>${escapeHtml(email)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Telefone:</b></td><td>${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Tipo:</b></td><td>${escapeHtml(contact_type)}</td></tr>
          <tr><td style="padding:8px 0;color:#a855f7;"><b>Assunto:</b></td><td>${escapeHtml(subject)}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#18181b;border-left:3px solid #7c3aed;border-radius:6px;">
          <b style="color:#a855f7;">Mensagem:</b><br/>
          <p style="white-space:pre-wrap;color:#e5e5e5;margin:8px 0 0;">${escapeHtml(message)}</p>
        </div>
        <p style="margin-top:16px;color:#71717a;font-size:12px;">Recebido em ${now}</p>
      </div>`;

    const userHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:12px;">
        <h2 style="color:#a855f7;">Recebemos sua mensagem!</h2>
        <p style="color:#e5e5e5;">Olá, <b>${escapeHtml(name)}</b>.</p>
        <p style="color:#e5e5e5;">Recebemos sua mensagem sobre a <b>Expo Prudente 2026</b>. Nossa equipe analisará seu contato e retornará em breve.</p>
        <div style="margin-top:24px;padding:16px;background:#18181b;border-radius:8px;border:1px solid #7c3aed;">
          <p style="margin:0;color:#a855f7;"><b>Resumo do seu contato</b></p>
          <p style="margin:8px 0 0;color:#e5e5e5;"><b>Assunto:</b> ${escapeHtml(subject)}</p>
          <p style="margin:4px 0 0;color:#e5e5e5;"><b>Tipo:</b> ${escapeHtml(contact_type)}</p>
        </div>
        <p style="margin-top:24px;color:#71717a;font-size:12px;">Roxou — O portal de eventos de Presidente Prudente</p>
      </div>`;

    await sendEmail(TO_EMAIL, "Novo contato recebido — Expo Prudente 2026", adminHtml);
    try {
      await sendEmail(email, "Recebemos sua mensagem — Expo Prudente 2026", userHtml);
    } catch (e) {
      console.error("Falha no auto-reply (seguindo)", e);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
