// Instagram Webhook (Meta Graph API)
// GET  -> verification handshake
// POST -> recebe DMs / comentários e responde via Prudente IA

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VERIFY_TOKEN = Deno.env.get("INSTAGRAM_VERIFY_TOKEN") || "ROXOU_IA_2026_SECURE";

const SYSTEM_PROMPT = `Você é a ROXOU IA, atendente oficial do Instagram @roxou.pp em Presidente Prudente.

PRIORIDADES (responda nessa ordem se houver dúvida):
1. EXPO PRUDENTE 2026 — micro-site oficial em https://roxou.com.br/expo2026 (shows, rodeio, programação, ingressos).
2. LANÇAMENTO V3 — a nova ROXOU vai ao ar SEGUNDA-FEIRA às 18:00. Convide para entrar na lista VIP em https://roxou.com.br.
3. Eventos, bares e rolês locais de Presidente Prudente.

ESTILO: amigável, direto, brasileiro, no máximo 2-3 frases. Use 1 emoji quando fizer sentido. Nunca invente datas, preços ou shows que não foram confirmados. Sempre direcione para o site quando o usuário quiser detalhes.`;

async function callAI(userText: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return "Em breve respondo! 💜 Acompanha em roxou.com.br";

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      console.error("[ai] error", res.status, await res.text());
      return "Tô meio ocupada agora 💜 dá uma olhada em roxou.com.br/expo2026!";
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || "Saca só roxou.com.br 💜";
  } catch (err) {
    console.error("[ai] catch", err);
    return "Tô meio ocupada agora 💜 dá uma olhada em roxou.com.br/expo2026!";
  }
}

async function getToken(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("instagram_config")
    .select("access_token")
    .eq("handle", "roxou.pp")
    .eq("status", "active")
    .maybeSingle();
  return data?.access_token ?? null;
}

async function replyToDM(token: string, recipientId: string, text: string) {
  const res = await fetch(`https://graph.instagram.com/v21.0/me/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  if (!res.ok) console.error("[dm-reply] failed", res.status, await res.text());
}

async function replyToComment(token: string, commentId: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies`, {
    method: "POST",
    body: new URLSearchParams({ message: text, access_token: token }),
  });
  if (!res.ok) console.error("[comment-reply] failed", res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // 1) Verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      console.log("[webhook] verification OK");
      return new Response(challenge, { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // 2) Events — ack rápido + processa em background
  if (req.method === "POST") {
    // 🔒 HMAC validation (X-Hub-Signature-256)
    const rawBody = await req.arrayBuffer();
    const sigHeader = req.headers.get("x-hub-signature-256") || req.headers.get("X-Hub-Signature-256");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appSecret) {
      console.error("[webhook] META_APP_SECRET missing");
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }
    if (!sigHeader || !sigHeader.startsWith("sha256=")) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(appSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const macBuf = await crypto.subtle.sign("HMAC", key, rawBody);
      const expected = Array.from(new Uint8Array(macBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const provided = sigHeader.slice("sha256=".length).toLowerCase();
      // constant-time compare
      if (expected.length !== provided.length) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      let diff = 0;
      for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
      if (diff !== 0) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
    } catch (e) {
      console.error("[webhook] hmac error", e);
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    let payload: any;
    try { payload = JSON.parse(new TextDecoder().decode(rawBody)); }
    catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    console.log("[webhook] event received (verified)");

    // Processa async sem bloquear o ack
    (async () => {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const token = await getToken(supabase);
        if (!token) { console.warn("[webhook] no token in instagram_config"); return; }

        for (const entry of payload.entry || []) {
          // DMs
          for (const ev of entry.messaging || []) {
            const senderId = ev.sender?.id;
            const text = ev.message?.text;
            const isEcho = ev.message?.is_echo;
            if (senderId && text && !isEcho) {
              const reply = await callAI(text);
              await replyToDM(token, senderId, reply);
            }
          }
          // Comentários
          for (const change of entry.changes || []) {
            if (change.field === "comments") {
              const v = change.value || {};
              const commentId = v.id;
              const text = v.text;
              const fromId = v.from?.id;
              // não responde a si mesmo
              if (commentId && text && fromId && fromId !== entry.id) {
                const reply = await callAI(text);
                await replyToComment(token, commentId, reply);
              }
            }
          }
        }
      } catch (err) {
        console.error("[webhook] async error:", err);
      }
    })();

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
});
