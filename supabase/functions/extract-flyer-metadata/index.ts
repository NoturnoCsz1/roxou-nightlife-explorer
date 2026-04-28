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
  "title": string,            // Título RICO E CONVINCENTE no formato "[ATRAÇÃO] NO [LOCAL] [FRASE DE IMPACTO]" SEMPRE EM CAIXA ALTA (máx 80 caracteres). NÃO copie literalmente o texto do flyer; CONSTRUA combinando atração principal + local + frase de desejo. Se não houver local claro, use só "[ATRAÇÃO] [FRASE DE IMPACTO]". VARIE a frase de impacto a cada chamada para que múltiplos flyers do mesmo evento gerem títulos únicos. A frase DEVE nascer do GÊNERO MUSICAL + ARTISTA + LOCAL: sertanejo/modão = resenha, sofrência, modão, violão; eletrônico/DJ = pista, grave, luzes, madrugada; pagode/samba = roda, coro, mesa cheia; funk = baile, grave, bonde; rock = palco, guitarra, energia. Exemplos: "JOÃO MARKOS NO ARAPUCA BAR O MELHOR SERTANEJO DE PRUDENTE COLA COM A GENTE", "DJ VICTOR NA FÁBRICA GASTROBAR PISTA ACESA ATÉ TARDE", "SAMBA DA QUINTA NO BEAR LOUNGE RODA CHEIA E CORO ALTO".
  "date_iso": string|null,    // Data e hora no formato "YYYY-MM-DDTHH:MM" no fuso de São Paulo. Se não houver horário claro, use 20:00.
  "venue_name": string|null,  // Nome do local (bar, casa, club). null se não souber.
  "address": string|null,     // Endereço se aparecer no flyer.
  "instagram": string|null,   // @handle do organizador/local se aparecer.
  "category": string,         // OBRIGATÓRIO uma de: show, festival, bar, universitario, restaurante, balada, festa, futebol, cultural, lounge, espetinho
  "sub_category": string,     // OBRIGATÓRIO uma de: funk, pagode_samba, rock, pop_rock, eletronica, sertanejo, mpb (ou repita a category se não houver gênero musical)
  "ticket_url": null,         // SEMPRE retorne null. Não extraia link de ingresso.
  "venue_confidence": "high"|"medium"|"low",
  "confidence": "high"|"medium"|"low"
}

🟣 REGRA DE OURO — NATUREZA DO ESTABELECIMENTO PREVALECE SOBRE O EVENTO:
A category PRINCIPAL deve refletir o TIPO DO LOCAL, não o gênero musical do flyer. O gênero/atração vai sempre para sub_category.
- Se o nome do local contiver "Gastrobar", "Bar", "Boteco", "Pub", "Choperia" → category="bar" (sub_category = gênero musical, ex: eletronica, pagode_samba, sertanejo)
- Se o nome do local contiver "Restaurante", "Espetaria", "Espetinho", "Churrascaria" → category="restaurante" ou "espetinho" (sub_category = gênero musical se houver)
- Se o nome do local contiver "Lounge", "Rooftop" → category="lounge" (sub_category = gênero musical)
- Se o nome do local contiver "Club", "Balada", "Disco", "Night" → category="balada" (sub_category = gênero musical)
- Se o nome do local contiver "Arena", "Estádio", "Teatro", "Casa de Show" → category="show" (sub_category = gênero musical)
EXEMPLOS APLICANDO A REGRA DE OURO:
- "Fábrica Gastrobar" com DJ de eletrônica → category="bar", sub_category="eletronica" (NUNCA "balada")
- "Arapuca Bar" com show de pagode → category="bar", sub_category="pagode_samba" (NUNCA "festa")
- "Bear Lounge" com samba → category="lounge", sub_category="pagode_samba"
- "Galpão 51" (sem palavra-chave de tipo) com baile funk → category="festa", sub_category="funk"

REGRAS DE TAXONOMIA POR GÊNERO (use APENAS se o nome do local NÃO indicar tipo claro):
- "samba", "pagode", "roda de samba" → sub_category="pagode_samba" (category default = "festa")
- "funk", "baile funk", "MC ", "DJ funk" → sub_category="funk"
- "sertanejo", "modão" → sub_category="sertanejo"
- "rock", "metal" → sub_category="rock"
- "pop rock", "indie", "alternativo" → sub_category="pop_rock"
- "MPB", "bossa", "samba-canção" → sub_category="mpb"
- "eletrônica", "techno", "house", "trance", "rave" → sub_category="eletronica"
- "festival", "open air", line-ups com 3+ atrações → category="festival"
- "universitário", "open bar", "calourada", "atlética" → category="universitario"
- "futebol", "jogo", "transmissão", "copa", "brasileirão" → category="futebol"
- "cultural", "exposição", "teatro", "literário", "cineclube", "sarau" → category="cultural"

OUTRAS REGRAS:
- BANIMENTO ABSOLUTO NO TITLE: nunca use "IMPERDÍVEL", "SEXTA INSANA", "SÁBADO IMPERDÍVEL" nem variações genéricas como "NOITE IMPERDÍVEL", "ROLÊ IMPERDÍVEL", "VIBE INSANA", "NOITE INESQUECÍVEL", "EXPERIÊNCIA ÚNICA", "SE PREPARA".
- PARCEIROS VERIFICADOS: compare o nome do local lido no flyer com a lista de parceiros verificados enviada pelo sistema. Se houver dúvida entre criar um local novo e usar um parceiro cadastrado, priorize o parceiro verificado mais parecido.
- REGRA DE HORÁRIO: se o flyer trouxer data mas não mostrar horário claro, defina automaticamente 20:00 no date_iso.
- PRECISÃO DE DATA: se o flyer disser dia da semana + número do dia e houver conflito (ex: "Sábado, 25" mas 25 cai em domingo), priorize o número 25 e ajuste o dia da semana mentalmente; nunca troque o número do dia para satisfazer o texto do weekday.
- "title": SEMPRE em CAIXA ALTA. PROIBIDO usar hífens (-), travessões (—, –), dois pontos (:), barras (/) ou QUALQUER símbolo de separação. Use apenas ESPAÇOS entre as partes. Formato: "ATRAÇÃO NO LOCAL FRASE DE IMPACTO". Máx 80 caracteres, sem aspas decorativas. VARIE a frase de impacto usando artista, gênero e local.
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
    const { image_url, current_year, verified_partners = [] } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const year = current_year || new Date().getFullYear();

    const verifiedPartnersText = Array.isArray(verified_partners) && verified_partners.length
      ? verified_partners
          .slice(0, 80)
          .map((p: any) => `- ${p?.name || ""}${p?.instagram ? ` (${p.instagram})` : ""}${p?.address ? ` — ${p.address}` : ""}`)
          .join("\n")
      : "Nenhum parceiro verificado enviado.";

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
              { type: "text", text: `Extraia os metadados deste flyer. Ano corrente: ${year}. Parceiros verificados para comparação:\n${verifiedPartnersText}\nResponda apenas o JSON.` },
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
    let cat = ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : "festa";
    const subRaw = typeof parsed.sub_category === "string" && parsed.sub_category ? parsed.sub_category : cat;
    let sub = ALLOWED_SUBS.includes(subRaw) ? subRaw : cat;

    // 🟣 REGRA DE OURO server-side: nome do local prevalece sobre gênero do flyer
    let category_override_reason: string | null = null;
    const venueRaw: string = (parsed.venue_name || "").toString();
    const venueLower = venueRaw.toLowerCase();
    const venueMap: Array<{ keys: string[]; cat: string; label: string }> = [
      { keys: ["gastrobar", "boteco", "choperia", "pub", " bar ", "bar "], cat: "bar", label: "Bar / Gastrobar" },
      { keys: ["restaurante", "churrascaria"], cat: "restaurante", label: "Restaurante" },
      { keys: ["espetaria", "espetinho"], cat: "espetinho", label: "Espetaria / Espetinho" },
      { keys: ["lounge", "rooftop"], cat: "lounge", label: "Lounge" },
      { keys: ["arena", "estádio", "estadio", "teatro", "casa de show"], cat: "show", label: "Casa de show / Arena" },
      { keys: ["club", "balada", "disco", "night"], cat: "balada", label: "Club / Balada" },
    ];
    if (venueLower) {
      // pad with spaces to make " bar " match correctly
      const padded = ` ${venueLower} `;
      for (const rule of venueMap) {
        if (rule.keys.some(k => padded.includes(k))) {
          if (cat !== rule.cat) {
            // se IA disse "balada/festa/show" mas o local é bar/restaurante/lounge → override
            const musicCats = new Set(["balada", "festa", "show"]);
            if (musicCats.has(cat) || cat === "festa") {
              // mover gênero para sub_category se ainda não estiver
              const genreSubs = new Set(["funk", "pagode_samba", "rock", "pop_rock", "eletronica", "sertanejo", "mpb"]);
              if (!genreSubs.has(sub)) {
                // tentar inferir gênero do sub atual ou da categoria original
                if (cat === "balada") sub = "eletronica";
                else if (cat === "festa") sub = sub === "festa" ? "eletronica" : sub;
                else if (cat === "show") sub = sub === "show" ? "mpb" : sub;
              }
              category_override_reason = `Local identificado como ${rule.label}`;
              cat = rule.cat;
            }
          }
          break;
        }
      }
    }

    // título: remover hífens, travessões, dois pontos, barras (regra "sem traços")
    let title: string = (parsed.title || "").toString();
    title = title
      .replace(/\s*[—–-]\s*/g, " ")  // hifens e travessões
      .replace(/\s*[:\/|]\s*/g, " ") // dois pontos, barras, pipes
      .replace(/\b(?:IMPERD[IÍ]VEL|SEXTA INSANA|S[ÁA]BADO IMPERD[IÍ]VEL|NOITE IMPERD[IÍ]VEL|ROL[ÊE] IMPERD[IÍ]VEL|VIBE INSANA|NOITE INESQUEC[IÍ]VEL|EXPERI[ÊE]NCIA [ÚU]NICA|SE PREPARA)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

    // ticket_url: forçado null (regra de negócio: lote nunca extrai link)
    const ticketUrl = null;

    return new Response(JSON.stringify({
      title,
      date_iso: parsed.date_iso || null,
      venue_name: parsed.venue_name || null,
      venue_confidence: parsed.venue_confidence || "low",
      address: parsed.address || null,
      instagram: parsed.instagram || null,
      category: cat,
      sub_category: sub,
      ticket_url: ticketUrl,
      confidence: parsed.confidence || "medium",
      category_override_reason,
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
