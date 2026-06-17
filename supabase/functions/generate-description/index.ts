// supabase/functions/generate-description/index.ts
//
// ⚡ V5 — Geração 100% IA (OpenAI via Lovable Gateway) com validação anti-invenção.
//
// Saída JSON enriquecida:
//   title, description_html, short_summary, meta_title, meta_description,
//   instagram_caption, safety_notes[], warnings[]
//
// Saída retrocompatível (consumidores antigos):
//   description, description_html, chamada_site, caption_style, caption_confidence
//
// Fluxo:
//   1. Enriquece com dados do parceiro (mesmo enrich que a versão anterior).
//   2. Monta um prompt rigoroso para OpenAI (gpt-5-mini via Gateway).
//   3. Pede JSON estruturado.
//   4. Passa a resposta por validadores que REMOVEM/REGENERAM trechos
//      contendo dados inventados (horários, preços, "oficial", artistas fora
//      da lista, etc).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, corsHeaders } from "../_shared/requireAdmin.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers básicos
// ─────────────────────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function normText(s: unknown): string {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function safeJson(text: string): any {
  let t = String(text || "").trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// Normaliza ISO sem offset (datetime-local "YYYY-MM-DDTHH:MM[:SS]") para -03:00 (America/Sao_Paulo).
// 🛑 CAUSA RAIZ do bug "17h00": sem offset, o Deno parseava como UTC e ao formatar em SP subtraía 3h
// (ex.: 20:00 local → "20:00Z" → 17:00 SP). Agora forçamos o offset correto.
function normalizeToSPIso(input: string): string {
  const s = String(input || "").trim();
  if (!s) return s;
  // Já tem offset/Z?
  if (/Z$|[+\-]\d{2}:?\d{2}$/.test(s)) return s;
  // datetime-local sem segundos: YYYY-MM-DDTHH:MM
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00-03:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return `${s}-03:00`;
  // Só data: assume meia-noite SP
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00-03:00`;
  return s;
}

function formatOfficialDate(iso: string, timeIsUnknown: boolean) {
  const dt = new Date(normalizeToSPIso(iso));
  const dateLong = dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const dateShort = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const timeLabel = time.replace(":", "h").replace(/^0/, "");
  const weekdayFull = dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" });
  const weekdayShort = weekdayFull.replace("-feira", "").replace(/^./, (c) => c.toUpperCase());
  const hasRealTime = !timeIsUnknown;
  const todaySP = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const eventDaySP = dt.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const isToday = todaySP === eventDaySP;
  return { dateLong, dateShort, timeLabel, weekdayFull, weekdayShort, hasRealTime, isToday };
}


// ─────────────────────────────────────────────────────────────────────────────
// HTML sanitizer (server-side, sem libs externas — DOMPurify continua no front)
// Permite apenas <p>, <strong>, <em>, <ul>, <li>, <br>. Remove qualquer outra tag.
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_TAGS = new Set(["p", "strong", "em", "ul", "li", "br"]);
function sanitizeHtml(html: string): string {
  if (!html) return "";
  return String(html).replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag) => {
    return ALLOWED_TAGS.has(String(tag).toLowerCase()) ? match.replace(/\s[^>]*/, "") : "";
  }).replace(/\s{2,}/g, " ").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚫 Termos banidos no estilo Roxou (cara de IA / release / clichê)
// ─────────────────────────────────────────────────────────────────────────────
const FORBIDDEN_RE = /\b(?:imperd[ií]vel|n[ãa]o (?:perca|fique de fora)|prepare-se|preparem-se|venha curtir|vem curtir|noite inesquec[ií]vel|experi[êe]ncia [úu]nica|promete (?:ser|agitar)|energia contagiante|vibe contagiante|reserve sua data|celebrando|proporcionando|embalar a noite|a cidade vai parar|evento completo|clima de pura|melhor noite da sua vida|garantido|confirmado oficialmente|organiza[çc][ãa]o confirmou)\b/gi;

// Termos que só podem aparecer se houver fonte oficial (`official_source_url`)
const OFFICIAL_ONLY_RE = /\b(oficial|confirmado|garantido|anunciado oficialmente|organiza[çc][ãa]o confirmou)\b/gi;

// Detectores de horário tipo "17h", "19:00", "20h30", "às 21h"
const TIME_DETECT_RE = /(?:\b[àa]s\s+)?\b\d{1,2}\s*(?:h|:|hs)\s*\d{0,2}\b/gi;

// Detectores de preço/couvert/open bar
const PRICE_TERMS_RE = /\b(?:R\$|reais?|couvert|entrada\s+gratuita|entrada\s+free|open\s+bar|open\s+food|gr[aá]tis|free|promo[çc][ãa]o|cupom|desconto|preço|valor|ingresso|combo)\b/gi;

// ─────────────────────────────────────────────────────────────────────────────
// Anti-invenção de horário: remove qualquer menção a hora se time_is_unknown.
// Funciona em texto plano e dentro de HTML simples.
// ─────────────────────────────────────────────────────────────────────────────
function stripTimes(s: string): string {
  if (!s) return s;
  return s
    .replace(TIME_DETECT_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

function stripPriceMentions(s: string): string {
  if (!s) return s;
  // remove a frase inteira que contém termo de preço (até o próximo ponto)
  return s.replace(/[^.<>]*\b(?:R\$|reais?|couvert|entrada\s+gratuita|entrada\s+free|open\s+bar|open\s+food|gr[aá]tis|free|promo[çc][ãa]o|cupom|desconto|preço|valor|ingresso|combo)\b[^.<>]*\.?/gi, "").replace(/\s{2,}/g, " ").trim();
}

function stripOfficialClaims(s: string): string {
  if (!s) return s;
  return s.replace(OFFICIAL_ONLY_RE, "").replace(/\s{2,}/g, " ").trim();
}

function stripForbidden(s: string): string {
  return (s || "").replace(FORBIDDEN_RE, "").replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Validação anti-invenção em bloco. Recebe o objeto da IA e devolve {clean, warnings}.
// ─────────────────────────────────────────────────────────────────────────────
type ValidationCtx = {
  hasTime: boolean;
  hasPrice: boolean;
  hasOfficialSource: boolean;
  knownArtists: Set<string>;
  knownVenue: string;
  flyerText: string;
  confidenceScore: number; // 0–100
};

const TEXT_FIELDS = ["title", "description_html", "short_summary", "meta_title", "meta_description", "instagram_caption"] as const;

function validateAndClean(ai: any, ctx: ValidationCtx): { clean: any; warnings: string[]; safety_notes: string[] } {
  const out: any = { ...ai };
  const warnings: string[] = Array.isArray(ai?.warnings) ? [...ai.warnings] : [];
  const safety: string[] = Array.isArray(ai?.safety_notes) ? [...ai.safety_notes] : [];

  for (const f of TEXT_FIELDS) {
    if (typeof out[f] !== "string") { out[f] = ""; continue; }
    let v = out[f];

    // 1. Forbidden style + filler
    v = stripForbidden(v);

    // 2. Sem horário no flyer → nenhum horário no texto.
    if (!ctx.hasTime) {
      const before = v;
      v = stripTimes(v);
      if (before !== v) safety.push(`Horário removido de "${f}" (time_is_unknown=true).`);
    }

    // 3. Sem preço informado → remove qualquer menção a preço/couvert/open bar.
    if (!ctx.hasPrice) {
      const before = v;
      v = stripPriceMentions(v);
      if (before !== v) safety.push(`Menção a preço/couvert removida de "${f}" (sem dado oficial).`);
    }

    // 4. Sem fonte oficial → remove termos "oficial", "confirmado", "garantido".
    if (!ctx.hasOfficialSource) {
      const before = v;
      v = stripOfficialClaims(v);
      if (before !== v) safety.push(`Termos de oficialidade removidos de "${f}" (sem official_source_url).`);
    }

    out[f] = v.trim();
  }

  // 5. HTML: sanitize tags
  if (out.description_html) out.description_html = sanitizeHtml(out.description_html);

  // 6. Limites de tamanho de SEO
  if (out.meta_title && out.meta_title.length > 70) out.meta_title = out.meta_title.slice(0, 67).trim() + "…";
  if (out.meta_description && out.meta_description.length > 165) out.meta_description = out.meta_description.slice(0, 162).trim() + "…";
  if (out.title && out.title.length > 80) out.title = out.title.slice(0, 77).trim() + "…";

  // 7. Sinaliza baixa confiança
  if (ctx.confidenceScore < 70) {
    warnings.push("Revisar manualmente antes de publicar (confiança da IA abaixo de 70).");
  }

  // 8. Se descrição ficou vazia depois da limpeza, sinaliza
  if (!out.description_html || out.description_html.length < 40) {
    warnings.push("Descrição muito curta após validação. Edite manualmente.");
  }

  return { clean: out, warnings: Array.from(new Set(warnings)), safety_notes: Array.from(new Set(safety)) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 Chamada principal à IA — OpenAI via Lovable Gateway
// ─────────────────────────────────────────────────────────────────────────────
type AIInput = {
  event_title: string;
  artists: string[];
  date_long: string;
  date_short: string;
  weekday: string;
  time_label: string | null;
  time_is_unknown: boolean;
  assumed_time: boolean;
  assumed_time_source: string | null;
  is_today: boolean;
  venue_name: string;
  venue_description: string;
  venue_neighborhood: string;
  venue_address: string;
  venue_type: string;
  city: string;
  category: string;
  sub_category: string;
  music_style: string;
  price: string;
  ticket_url: string;
  instagram: string;
  flyer_text: string;
  official_source_url: string;
  confidence_score: number;
};

// Categorias/temas que NÃO devem receber fallback 20h (claramente diurnos/horário conhecido).
const DAYTIME_HINTS_RE = /\b(almoço|almoco|feijoada|caf[eé]|brunch|matin[eê]|infantil|kids|crian[çc]a|happy\s*hour|esportivo|transmiss[ãa]o|jogo|partida|copa|brasileir[ãa]o|libertadores|p[ií]quenique|piquenique|piscina|day\s*use)\b/i;

function shouldApplyPrudenteNightFallback(ctx: {
  city: string; category: string; sub_category: string; event_title: string; venue_type: string;
}): boolean {
  const cityOk = normText(ctx.city).includes("prudente") || ctx.city === "";
  if (!cityOk) return false;
  const blob = `${ctx.event_title} ${ctx.category} ${ctx.sub_category} ${ctx.venue_type}`;
  if (DAYTIME_HINTS_RE.test(blob)) return false;
  return true;
}


function buildSystemPrompt(): string {
  return `Você é redator da ROXOU — agenda independente da noite do interior de SP (Presidente Prudente). Estilo: humano, direto, regional, jovem, leve. PROIBIDO parecer release de assessoria ou texto genérico de IA.

Você recebe DADOS REAIS do evento. NUNCA invente:
- horário (se time_is_unknown=true, NUNCA escreva nenhuma hora);
- preço, couvert, open bar, promoção (se price vier vazio, NÃO mencione preço);
- artista que não esteja na lista "artists" nem no flyer_text;
- local (use exatamente venue_name);
- endereço.

Devolva APENAS JSON válido neste formato (sem markdown, sem comentários):
{
  "title": "Título otimizado, máx 70 caracteres, claro e pesquisável. SEM clickbait. SEM 'oficial/confirmado/garantido' a menos que haja official_source_url. Pode incluir artista (se na lista) e local (se ajudar SEO).",
  "description_html": "HTML usando APENAS <p>, <strong>, <em>, <ul>, <li>, <br>. 3 a 4 parágrafos:\\n  1) o que é o evento;\\n  2) contexto do local/vibe/público;\\n  3) infos práticas (data, horário SE confirmado, local, preço SE confirmado, link SE existir);\\n  4) CTA leve para ver na Roxou.",
  "short_summary": "Frase única, máx 140 caracteres, vendendo o evento sem clichê.",
  "meta_title": "SEO, máx 60 caracteres. Formato '<tema> em <local>/<cidade> - Roxou' ou similar.",
  "meta_description": "SEO, máx 155 caracteres. Direto, com palavras-chave naturais.",
  "instagram_caption": "Legenda pronta para colar no Instagram. Primeira linha forte. Emojis moderados (no máx 4). Estrutura:\\n🔥 [Título curto]\\n\\nResumo do evento.\\n\\n📍 Local:\\n🗓 Data:\\n🕒 Horário: (se confirmado, senão 'a confirmar')\\n\\n👉 Veja mais na Roxou:\\nroxou.com.br/agenda\\n\\n⚠️ A Roxou é uma página independente de divulgação e entretenimento. Consulte sempre os canais oficiais do evento ou estabelecimento para informações finais.",
  "safety_notes": [],
  "warnings": []
}

⛔ Frases banidas: "imperdível", "noite inesquecível", "experiência única", "não perca", "prepare-se", "vibe contagiante", "celebrando", "embalar a noite", "a melhor noite da sua vida".
⛔ Não copie literalmente o flyer. Reescreva com voz Roxou.
⛔ Se time_is_unknown=true, escreva "horário a confirmar" ou OMITA o horário. NUNCA chute "17h", "20h" ou "22h".
⛔ Não use h1/h2/scripts/links HTML no description_html.`;
}

function buildUserPrompt(data: AIInput): string {
  const fields = {
    event_title: data.event_title,
    artists: data.artists,
    date: { weekday: data.weekday, long: data.date_long, short: data.date_short, is_today: data.is_today },
    time: data.time_is_unknown ? null : data.time_label,
    time_is_unknown: data.time_is_unknown,
    venue: {
      name: data.venue_name || null,
      type: data.venue_type || null,
      description: data.venue_description || null,
      neighborhood: data.venue_neighborhood || null,
      address: data.venue_address || null,
    },
    city: data.city || null,
    category: data.category,
    sub_category: data.sub_category,
    music_style: data.music_style || null,
    price: data.price || null,
    ticket_url: data.ticket_url || null,
    instagram: data.instagram || null,
    flyer_text: data.flyer_text || null,
    official_source_url: data.official_source_url || null,
    confidence_score: data.confidence_score,
  };
  return `DADOS DO EVENTO:\n${JSON.stringify(fields, null, 2)}\n\nGere agora o JSON pedido. Lembre: nada de inventar.`;
}

async function callOpenAI(input: AIInput, apiKey: string): Promise<any> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (resp.status === 429) {
    const err: any = new Error("rate_limited");
    err.status = 429;
    throw err;
  }
  if (resp.status === 402) {
    const err: any = new Error("payment_required");
    err.status = 402;
    throw err;
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway error ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || "";
  const parsed = safeJson(raw);
  if (!parsed) throw new Error("Resposta da IA não é JSON válido.");
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 Handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const {
      title,
      event_title_raw,
      event_title_suggested,
      artists: artistsIn,
      venue_name,
      date_time,
      time_is_unknown = false,
      category,
      sub_category,
      music_style,
      neighborhood,
      address,
      city,
      partner_id,
      venue_description: venueDescIn,
      partner_type: partnerTypeIn,
      price,
      ticket_url,
      instagram,
      flyer_text,
      official_source_url,
      confidence_score,
      // legados/compat
      seed_index: _seed_index,
      previous_descriptions: _previous_descriptions = [],
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!date_time) {
      return new Response(JSON.stringify({ error: "date_time é obrigatório (fonte oficial)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enriquecimento via partner
    let partnerType: string | null = partnerTypeIn || null;
    let partnerNeighborhood: string | null = neighborhood || null;
    let partnerCity: string | null = city || null;
    let partnerSummary: string | null = venueDescIn || null;
    let partnerMusicPrimary: string | null = music_style || null;

    if (partner_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: p } = await supabase
          .from("partners")
          .select("type, neighborhood, city, short_description, full_description, music_style_primary, address")
          .eq("id", partner_id)
          .maybeSingle();
        if (p) {
          if (!partnerType) partnerType = (p as any).type || null;
          if (!partnerNeighborhood) partnerNeighborhood = (p as any).neighborhood || null;
          if (!partnerCity) partnerCity = (p as any).city || null;
          if (!partnerSummary) {
            partnerSummary = ((p as any).short_description || "")
              || ((p as any).full_description ? String((p as any).full_description).split(/(?<=\.)\s/)[0] : "")
              || null;
          }
          if (!partnerMusicPrimary) partnerMusicPrimary = (p as any).music_style_primary || null;
        }
      } catch (_e) { /* segue */ }
    }

    const dateInfo = formatOfficialDate(date_time, Boolean(time_is_unknown));
    const cleanTitle = String(title || event_title_suggested || event_title_raw || "").trim();
    const knownArtists = new Set<string>(
      (Array.isArray(artistsIn) ? artistsIn : [])
        .filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 1)
        .map((x) => normText(x)),
    );

    const aiInput: AIInput = {
      event_title: cleanTitle,
      artists: Array.from(knownArtists),
      date_long: dateInfo.dateLong,
      date_short: dateInfo.dateShort,
      weekday: dateInfo.weekdayShort,
      time_label: dateInfo.timeLabel,
      time_is_unknown: !dateInfo.hasRealTime,
      is_today: dateInfo.isToday,
      venue_name: String(venue_name || "").trim(),
      venue_description: String(partnerSummary || "").trim(),
      venue_neighborhood: String(partnerNeighborhood || "").trim(),
      venue_address: String(address || "").trim(),
      venue_type: String(partnerType || "").trim(),
      city: String(partnerCity || "").trim(),
      category: String(category || "").trim(),
      sub_category: String(sub_category || "").trim(),
      music_style: String(partnerMusicPrimary || "").trim(),
      price: String(price || "").trim(),
      ticket_url: String(ticket_url || "").trim(),
      instagram: String(instagram || "").trim(),
      flyer_text: String(flyer_text || "").trim(),
      official_source_url: String(official_source_url || "").trim(),
      confidence_score: Number.isFinite(Number(confidence_score)) ? Number(confidence_score) : 80,
    };

    // 1. IA
    let ai: any;
    try {
      ai = await callOpenAI(aiInput, LOVABLE_API_KEY);
    } catch (err: any) {
      if (err?.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited", message: "IA com limite atingido. Tente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (err?.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required", message: "Créditos da workspace esgotados. Recarregue para continuar gerando descrições." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    // 2. Validação anti-invenção
    const ctx: ValidationCtx = {
      hasTime: !aiInput.time_is_unknown,
      hasPrice: aiInput.price.length > 0,
      hasOfficialSource: aiInput.official_source_url.length > 0,
      knownArtists,
      knownVenue: normText(aiInput.venue_name),
      flyerText: normText(aiInput.flyer_text),
      confidenceScore: aiInput.confidence_score,
    };
    const { clean, warnings, safety_notes } = validateAndClean(ai, ctx);

    // 3. Resposta — campos novos + retrocompat
    const description_html = clean.description_html || "";
    const responsePayload = {
      // ✨ Novos
      title: clean.title || cleanTitle,
      description_html,
      short_summary: clean.short_summary || "",
      meta_title: clean.meta_title || "",
      meta_description: clean.meta_description || "",
      instagram_caption: clean.instagram_caption || "",
      safety_notes,
      warnings,
      ai_confidence_score: aiInput.confidence_score,
      // 🔁 Retrocompat
      chamada_site: (clean.title || cleanTitle).length > 60 ? (clean.title || cleanTitle).slice(0, 57) + "..." : (clean.title || cleanTitle),
      descricao_rica: description_html,
      description: description_html,
      caption_style: "openai_structured",
      caption_template_id: 99,
      caption_confidence: warnings.length === 0 ? "high" : warnings.length === 1 ? "medium" : "low",
      caption_warnings: warnings,
      used_flyer: Boolean(aiInput.flyer_text),
    };

    console.log("[generate-description] v5", {
      model: "openai/gpt-5-mini",
      hasTime: ctx.hasTime,
      hasPrice: ctx.hasPrice,
      hasOfficial: ctx.hasOfficialSource,
      warningsCount: warnings.length,
      safetyCount: safety_notes.length,
      confidence: aiInput.confidence_score,
    });

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-description error:", err);
    return new Response(JSON.stringify({ error: err?.message || "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
