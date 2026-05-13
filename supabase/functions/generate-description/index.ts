import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────────────────────────────────────
// 🎵 Mapeamento de gênero/categoria para "tipo de atração" exibido na legenda
// ─────────────────────────────────────────────────────────────────────────────
const ATTRACTION_LABEL: Record<string, { label: string; emoji: string; vibe: string }> = {
  sertanejo:    { label: "Sertanejo ao vivo",       emoji: "🤠", vibe: "modão, viola e mesa cheia de amigo" },
  funk:         { label: "Funk",                    emoji: "🔊", vibe: "grave no peito, baile pesado e pista ligada" },
  pagode_samba: { label: "Pagode e Samba",          emoji: "🥁", vibe: "roda de samba, batuque e refrão coletivo" },
  eletronica:   { label: "Eletrônica / DJ Set",     emoji: "🪩", vibe: "set imersivo, luzes e madrugada na pista" },
  rock:         { label: "Rock ao vivo",            emoji: "🎸", vibe: "guitarra, refrão gritado e energia de palco" },
  pop_rock:     { label: "Pop / Rock cover",        emoji: "🎤", vibe: "hits conhecidos, banda no palco e clima de bar com som" },
  mpb:          { label: "MPB / Voz e violão",      emoji: "🎶", vibe: "intimismo, violão e Brasil cantado" },
  standup:      { label: "Stand-up Comedy",         emoji: "🎭", vibe: "humor ao vivo, drinks e clima descontraído" },
  universitario:{ label: "Festa universitária",     emoji: "🎓", vibe: "resenha, galera nova e energia até tarde" },
  festa:        { label: "Festa",                   emoji: "🎉", vibe: "pista, drinks e noite alta" },
  balada:       { label: "Balada",                  emoji: "🪩", vibe: "pista cheia, DJ no comando e madrugada ligada" },
  bar:          { label: "Bar / Música ao vivo",    emoji: "🍺", vibe: "som ao vivo, mesa cheia e clima de boteco" },
  show:         { label: "Show ao vivo",            emoji: "🎤", vibe: "palco, banda e público cantando junto" },
  cultural:     { label: "Evento cultural",         emoji: "🎭", vibe: "experiência cultural e encontro" },
  restaurante:  { label: "Gastronomia",             emoji: "🍽️", vibe: "comida boa, ambiente caprichado e clima de jantar" },
};

function resolveAttraction(category?: string, subCategory?: string): { label: string; emoji: string; vibe: string } {
  const sub = String(subCategory || "").toLowerCase().trim();
  const cat = String(category || "").toLowerCase().trim();
  return ATTRACTION_LABEL[sub] || ATTRACTION_LABEL[cat] || { label: "Música e resenha", emoji: "🎶", vibe: "noite com música e ambiente animado" };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 CTAs rotativas — pool ampliado, escolhido por seed (sem IA)
// ─────────────────────────────────────────────────────────────────────────────
const CTA_BANK: string[] = [
  "Confira todos os detalhes e salve esse rolê na sua agenda da ROXOU.",
  "Veja horários, local e mais eventos parecidos na agenda da ROXOU.",
  "Quer descobrir o que rola hoje em Presidente Prudente? Acesse a agenda completa na ROXOU.",
  "Abra o evento completo na ROXOU e compartilhe com a galera que vai contigo.",
  "Entre na ROXOU e veja os rolês mais quentes da semana em Prudente.",
  "Garanta esse evento na sua agenda e descubra outros rolês na ROXOU.",
  "Veja mais fotos, horários e eventos parecidos no perfil do local na ROXOU.",
  "A noite muda rápido — confira tudo o que está em alta agora na ROXOU.",
  "Salva esse rolê, marca os amigos e descubra mais opções de noite na ROXOU.",
  "Acesse a ROXOU para conferir o local, próximos eventos e como chegar.",
];

function pickFromBank<T>(bank: T[], seed: number): T {
  const idx = ((seed % bank.length) + bank.length) % bank.length;
  return bank[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// 📅 Formatação oficial de data/hora a partir do banco (timezone SP)
// ─────────────────────────────────────────────────────────────────────────────
function formatOfficialDate(iso: string): { dateLong: string; timeLabel: string; weekday: string } {
  const dt = new Date(iso);
  const dateLong = dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const timeLabel = time.replace(":", "h").replace(/^0/, "");
  const weekday = dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" });
  return { dateLong, timeLabel, weekday };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📍 Endereço resumido elegante
// ─────────────────────────────────────────────────────────────────────────────
function buildAddressLine(venue?: string | null, neighborhood?: string | null, city?: string | null, address?: string | null): string {
  const parts: string[] = [];
  if (venue) parts.push(venue);
  const loc: string[] = [];
  if (neighborhood) loc.push(neighborhood);
  if (city) loc.push(city);
  // se faltar bairro/cidade mas tiver endereço cru, extrai a última vírgula
  if (loc.length === 0 && address) {
    const tail = address.split(",").slice(-2).map(s => s.trim()).filter(Boolean).join(", ");
    if (tail) loc.push(tail);
  }
  const right = loc.join(", ");
  if (parts.length && right) return `${parts.join(" ")} — ${right}`;
  if (parts.length) return parts.join(" ");
  return right || "Local a confirmar";
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏠 Resumo heurístico do local (sem IA) caso o parceiro não tenha descrição
// ─────────────────────────────────────────────────────────────────────────────
const VENUE_HEURISTIC: Record<string, string[]> = {
  bar:        ["é um dos bares queridinhos da cidade, com clima descontraído e noites de música ao vivo.", "reúne uma clientela fiel em torno de drinks bem servidos e som ao vivo."],
  balada:     ["é uma das casas noturnas mais movimentadas da cidade, com pista cheia até tarde.", "é referência em noites longas, DJs e madrugada animada em Prudente."],
  restaurante:["mistura gastronomia caprichada e ambiente acolhedor para encontros à noite.", "é parada certa para quem quer comer bem antes ou durante o rolê."],
  "casa de show": ["é uma casa de show consagrada na cidade, com agenda forte de atrações.", "recebe shows ao vivo e atrações regionais ao longo do ano."],
  default:    ["é um espaço conhecido na noite de Presidente Prudente.", "faz parte do circuito de rolês da cidade."],
};

function buildVenueBlurb(venueName?: string | null, partnerType?: string | null, providedDescription?: string | null): string | null {
  const desc = (providedDescription || "").trim();
  if (desc) return desc.length > 240 ? desc.slice(0, 237) + "..." : desc;
  if (!venueName) return null;
  const key = String(partnerType || "").toLowerCase().trim();
  const pool = VENUE_HEURISTIC[key] || VENUE_HEURISTIC.default;
  // pseudo-random estável pelo nome
  const seed = Array.from(venueName).reduce((a, c) => a + c.charCodeAt(0), 0);
  const phrase = pool[seed % pool.length];
  return `O ${venueName} ${phrase}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 IA leve: gera APENAS hype contextual + chamada curta (sem datas/preços)
// ─────────────────────────────────────────────────────────────────────────────
async function callAI(messages: any[], tools: any[], temperature: number, apiKey: string) {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools,
      tool_choice: { type: "function", function: { name: "gerar_hype" } },
      temperature,
    }),
  });
}

const FORBIDDEN_RE = /\b(?:imperd[ií]vel|n[ãa]o (?:perca|fique de fora)|prepare-se|preparem-se|venha curtir|vem curtir|noite inesquec[ií]vel|experi[êe]ncia [úu]nica|promete (?:ser|agitar|ser [ée]pico)|energia contagiante|vibe contagiante|reserve sua data)\b/gi;

function stripForbidden(s: string): string {
  return (s || "").replace(FORBIDDEN_RE, "").replace(/\s{2,}/g, " ").trim();
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      title,
      venue_name,
      date_time,
      category,
      sub_category,
      image_url,
      attractions,
      seed_index,
      neighborhood,
      address,
      city,
      partner_id,
      venue_description: venueDescIn,
      partner_type: partnerTypeIn,
      previous_descriptions = [],
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!date_time) {
      return new Response(JSON.stringify({ error: "date_time é obrigatório (fonte oficial). Flyer não é fonte de data/hora." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Enriquecimento opcional via partner_id (descrição do local + tipo)
    let venueDesc: string | null = venueDescIn || null;
    let partnerType: string | null = partnerTypeIn || null;
    let partnerNeighborhood: string | null = neighborhood || null;
    let partnerCity: string | null = city || null;
    let partnerAddress: string | null = address || null;

    if (partner_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: p } = await supabase
          .from("partners")
          .select("type, neighborhood, city, address, formatted_address, short_description, full_description")
          .eq("id", partner_id)
          .maybeSingle();
        if (p) {
          if (!venueDesc) venueDesc = p.short_description || p.full_description || null;
          if (!partnerType) partnerType = p.type || null;
          if (!partnerNeighborhood) partnerNeighborhood = p.neighborhood || null;
          if (!partnerCity) partnerCity = p.city || null;
          if (!partnerAddress) partnerAddress = p.address || p.formatted_address || null;
        }
      } catch (_e) { /* segue sem bloquear */ }
    }

    // ── Dados estruturados (FONTE OFICIAL)
    const { dateLong, timeLabel, weekday } = formatOfficialDate(date_time);
    const attraction = resolveAttraction(category, sub_category);
    const addressLine = buildAddressLine(venue_name, partnerNeighborhood, partnerCity, partnerAddress);
    const venueBlurb = buildVenueBlurb(venue_name, partnerType, venueDesc);

    const seed = Number.isFinite(Number(seed_index)) ? Number(seed_index) : Math.floor(Math.random() * 9999);
    const cta = pickFromBank(CTA_BANK, seed);

    // ─────────────────────────────────────────────────────────────────────
    // CAMADA IA (leve): só hype + chamada curta. Nada de datas/preços/horários.
    // ─────────────────────────────────────────────────────────────────────
    const systemPrompt = `Você é o Copywriter-Chefe da ROXOU — portal premium de eventos do interior de SP.

🛑 REGRAS ABSOLUTAS DE FATOS (zero tolerância a alucinação):
- NUNCA invente nem cite: data, dia da semana, horário, preço, ingresso, lote, open bar, desconto, promoção, line-up extra, idade mínima.
- Esses dados são adicionados POR FORA, automaticamente, a partir do banco oficial.
- Se o flyer (imagem) sugerir data/hora/preço diferente, IGNORE — o banco vence.
- Você só recebe o tipo de atração e o nome do local. Use APENAS esses fatos.

🚫 BANIMENTO LEXICAL (frases proibidas):
"imperdível", "não perca", "não fique de fora", "prepare-se", "venha curtir", "noite inesquecível", "experiência única", "promete ser/agitar/ser épico", "energia contagiante", "vibe contagiante", "reserve sua data".

✍️ TAREFA — gere DOIS textos curtos:

1. "hype" — 2 frases curtas (máx 30 palavras no total). Contextualiza o evento com personalidade do tipo de atração e cita o nome do local + atração principal. Linguagem humana, específica, sem clichê. NÃO mencione data, dia, horário ou preço.
   Exemplos do tom certo:
   • "Hélio Okuma desembarca no Cult Bar para uma noite de stand-up e muita resenha em Presidente Prudente."
   • "O Vó Laura arma mais um modão de mesa cheia, viola na veia e coro da galera."

2. "chamada_site" — título curto (até 60 caracteres), específico do evento, com gatilho mental forte. Sem data, sem hora, sem preço.

Frases curtas, ponto final, zero emoji nesses dois campos.`;

    const userInfo = [
      `Título do evento: ${title}`,
      attractions ? `Atrações: ${attractions}` : null,
      venue_name ? `Local: ${venue_name}` : null,
      `Tipo de atração: ${attraction.label}`,
      `Vibe do tipo: ${attraction.vibe}`,
      partnerType ? `Tipo de estabelecimento: ${partnerType}` : null,
      partnerNeighborhood ? `Bairro: ${partnerNeighborhood}` : null,
      partnerCity ? `Cidade: ${partnerCity}` : null,
      `Seed de variação: ${seed}`,
    ].filter(Boolean).join("\n");

    const tools = [{
      type: "function",
      function: {
        name: "gerar_hype",
        description: "Retorna hype curto (2 frases) e chamada curta para o site.",
        parameters: {
          type: "object",
          properties: {
            hype: { type: "string", description: "2 frases contextuais sobre o evento. Sem data/hora/preço." },
            chamada_site: { type: "string", description: "Título de até 60 caracteres com gatilho mental." },
          },
          required: ["hype", "chamada_site"],
          additionalProperties: false,
        },
      },
    }];

    // OBS: NÃO enviamos image_url para o modelo. O flyer não é fonte confiável de fatos.
    // Mantemos a chamada texto-only para reduzir custo e eliminar hallucination de data/hora.
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Gere hype e chamada para este evento da ROXOU. Use APENAS os dados abaixo:\n\n${userInfo}` },
    ];

    let hype = "";
    let chamadaSite = "";

    const aiResp = await callAI(messages, tools, 0.85, LOVABLE_API_KEY);
    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResp.ok) {
      const data = await aiResp.json();
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      if (tc?.function?.arguments) {
        try {
          const args = JSON.parse(tc.function.arguments);
          hype = stripForbidden(String(args.hype || "")).replace(/^["'`]+|["'`]+$/g, "").trim();
          chamadaSite = stripForbidden(String(args.chamada_site || "")).replace(/^["'`]+|["'`]+$/g, "").trim();
        } catch (_e) { /* fallback abaixo */ }
      }
    }

    // ── Fallback determinístico se a IA falhar
    if (!hype) {
      hype = venue_name
        ? `${title} no ${venue_name}: ${attraction.vibe}.`
        : `${title}: ${attraction.vibe}.`;
    }
    if (!chamadaSite) {
      chamadaSite = title.length > 60 ? title.slice(0, 57) + "..." : title;
    }

    // ─────────────────────────────────────────────────────────────────────
    // MONTAGEM DETERMINÍSTICA DA DESCRIÇÃO RICA (HTML)
    //   — datas/hora/local vêm SEMPRE daqui, não da IA.
    // ─────────────────────────────────────────────────────────────────────
    const html: string[] = [];
    html.push(`<p>${escapeHtml(hype)}</p>`);

    html.push(`<p><strong>📝 O que você precisa saber:</strong></p>`);
    html.push(`<ul>`);
    html.push(`<li>📅 ${escapeHtml(weekday.charAt(0).toUpperCase() + weekday.slice(1))}, ${escapeHtml(dateLong)}</li>`);
    html.push(`<li>🕒 ${escapeHtml(timeLabel)}</li>`);
    html.push(`<li>📍 ${escapeHtml(addressLine)}</li>`);
    html.push(`<li>${attraction.emoji} <strong>${escapeHtml(attraction.label)}</strong></li>`);
    html.push(`</ul>`);

    if (venueBlurb) {
      html.push(`<p>${escapeHtml(venueBlurb)}</p>`);
    }

    html.push(`<p>${escapeHtml(cta)}</p>`);

    const descricao_rica = html.join("");

    return new Response(
      JSON.stringify({
        chamada_site: chamadaSite,
        descricao_rica,
        description: descricao_rica,
        used_flyer: false,
        cta_index: ((seed % CTA_BANK.length) + CTA_BANK.length) % CTA_BANK.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("generate-description error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
