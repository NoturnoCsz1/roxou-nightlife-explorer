import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_CATEGORIES = [
  "show", "festival", "bar", "universitario", "restaurante",
  "balada", "festa", "futebol", "cultural", "lounge", "espetinho",
  // legados aceitos para retrocompatibilidade
  "funk", "eletronica", "sertanejo",
];

const ALLOWED_SUBS = [
  "funk", "pagode_samba", "rock", "pop_rock", "eletronica", "sertanejo", "mpb",
  "show", "festival", "bar", "universitario", "restaurante",
  "balada", "festa", "futebol", "cultural", "lounge", "espetinho",
];

const systemPrompt = `Você é um extrator de metadados de flyers/banners de eventos da noite brasileira.

Receba a imagem de um flyer e responda APENAS com um JSON válido (sem markdown, sem comentários) com os seguintes campos:

{
  "title": string,            // Título RICO E CONVINCENTE no formato "[ATRAÇÃO] NO [LOCAL] — [FRASE DE IMPACTO]" SEMPRE EM CAIXA ALTA (máx 80 caracteres). NÃO copie literalmente o texto do flyer; CONSTRUA combinando atração principal + local + frase de desejo. Se não houver local claro, use só "[ATRAÇÃO] — [FRASE DE IMPACTO]". VARIE a frase de impacto a cada chamada para que múltiplos flyers do mesmo evento gerem títulos únicos. Exemplos de Frases de Impacto: "NOITE HISTÓRICA", "O MELHOR DA REGIÃO", "SÁBADO IMPERDÍVEL", "ROLÊ DO MÊS", "VIBE INSANA", "NOITE PREMIUM", "SE PREPARA", "ESPERA NÃO", "ENERGIA PURA", "PISTA EXPLOSIVA", "EXPERIÊNCIA ÚNICA". Exemplos completos: "LUAN SANTANA NO ARENA — NOITE HISTÓRICA", "BAILE DO MC IG NO GALPÃO 51 — VIBE INSANA", "SAMBA DA QUINTA NO BEAR LOUNGE — ROLÊ DO MÊS".
  "date_iso": string|null,    // Data e hora no formato "YYYY-MM-DDTHH:MM" no fuso de São Paulo. null se não houver.
  "venue_name": string|null,  // Nome do local (bar, casa, club). null se não souber.
  "address": string|null,     // Endereço se aparecer no flyer.
  "instagram": string|null,   // @handle do organizador/local se aparecer.
  "category": string,         // OBRIGATÓRIO uma de: show, festival, bar, universitario, restaurante, balada, festa, futebol, cultural, lounge, espetinho
  "sub_category": string,     // OBRIGATÓRIO uma de: funk, pagode_samba, rock, pop_rock, eletronica, sertanejo, mpb (ou repita a category se não houver gênero musical)
  "ticket_url": null,         // SEMPRE retorne null. Não extraia link de ingresso.
  "venue_confidence": "high"|"medium"|"low",
  "confidence": "high"|"medium"|"low"
}

REGRAS DE TAXONOMIA (mapeamento direto do flyer → category/sub_category):
- "samba", "pagode", "roda de samba" → category="festa", sub_category="pagode_samba"
- "funk", "baile funk", "MC ", "DJ funk" → category="festa", sub_category="funk"
- "sertanejo", "modão" → category="festa", sub_category="sertanejo"
- "rock", "metal" → category="show", sub_category="rock"
- "pop rock", "indie", "alternativo" → category="show", sub_category="pop_rock"
- "MPB", "bossa", "samba-canção" → category="show", sub_category="mpb"
- "eletrônica", "techno", "house", "trance", "rave" → category="festa", sub_category="eletronica"
- "festival", "edição", "open air", line-ups com 3+ atrações → category="festival"
- "universitário", "open bar", "calourada", "atlética" → category="universitario"
- "futebol", "jogo", "transmissão", "copa", "brasileirão" → category="futebol"
- "cultural", "exposição", "teatro", "literário", "cineclube", "sarau" → category="cultural"
- "lounge", "rooftop", "drinks autorais", "ambiente intimista", nome do local contém "Lounge" → category="lounge"
- "espetinho", "espeto", "espetaria", "churrasquinho", nome do local contém "Espetinho/Espetaria" → category="espetinho"
- "rodízio", "happy hour", "boteco", "chopp" sem música destacada → category="bar"
- "rodízio gastronômico", "jantar harmonizado", "menu degustação" → category="restaurante"
- "balada", "club", "night" sem gênero específico → category="balada"
- Show de artista sem rótulo de gênero claro → category="show", sub_category="show"
- Festa genérica → category="festa", sub_category="festa"

OUTRAS REGRAS:
- "title": SEMPRE em CAIXA ALTA, formato "ATRAÇÃO NO LOCAL — FRASE DE IMPACTO" (use travessão "—" como separador), máx 80 caracteres, sem aspas decorativas. VARIE a frase de impacto.
- Se o flyer disser "SÁBADO 22/11 23H", devolva date_iso baseado no ano corrente.
- "ticket_url": SEMPRE null. Nunca extraia link de ingresso.
- "venue_name": só preencha se tiver razoável certeza do nome do local.
- NUNCA invente endereço, parceiro ou link.
- Resposta DEVE ser JSON puro.`;

function safeJson(text: string): any {
  let t = text.trim();
  // strip code fences if model added them
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {}
  // try to find first {...}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, current_year } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const year = current_year || new Date().getFullYear();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Extraia os metadados deste flyer. Ano corrente: ${year}. Responda apenas o JSON.` },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        temperature: 0.7,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "payment_required" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeJson(raw);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "parse_failed", raw }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // sanitize
    const cat = ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : "festa";
    const subRaw = typeof parsed.sub_category === "string" && parsed.sub_category ? parsed.sub_category : cat;
    const sub = ALLOWED_SUBS.includes(subRaw) ? subRaw : cat;

    // ticket_url: forçado null (regra de negócio: lote nunca extrai link)
    const ticketUrl = null;

    return new Response(JSON.stringify({
      title: parsed.title || "",
      date_iso: parsed.date_iso || null,
      venue_name: parsed.venue_name || null,
      venue_confidence: parsed.venue_confidence || "low",
      address: parsed.address || null,
      instagram: parsed.instagram || null,
      category: cat,
      sub_category: sub,
      ticket_url: ticketUrl,
      confidence: parsed.confidence || "medium",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
