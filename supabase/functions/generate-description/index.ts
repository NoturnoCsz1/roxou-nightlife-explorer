import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🎭 Personalidade por gênero (tom + cenas + palavras-âncora)
const GENRE_PERSONALITY: Record<string, { tom: string; cena: string; ancoras: string[] }> = {
  sertanejo: {
    tom: "calor humano, resenha de boteco, modão, mesa cheia de amigo",
    cena: "viola, chopp gelado, coro da galera, sofrência boa, churrasco rolando",
    ancoras: ["modão", "mesa cheia", "resenha", "viola na veia", "raiz"],
  },
  funk: {
    tom: "energia bruta, baile pesado, grave no peito, madrugada ligada",
    cena: "pista lotada, MC no microfone, bonde fechado, fluxo até o nascer do sol",
    ancoras: ["baile", "grave", "fluxo", "tropa", "automotivo"],
  },
  pagode_samba: {
    tom: "descontraído, roda de amigos, suingue, cerveja gelada na mesa",
    cena: "roda de samba, batuque, refrão coletivo, mesa redonda, partido alto",
    ancoras: ["roda", "pagodão", "coro", "suingue", "boteco"],
  },
  eletronica: {
    tom: "imersivo, pista, drop, luzes, experiência sensorial",
    cena: "DJ comandando, set longo, open air, drop esperado, madrugada eletrônica",
    ancoras: ["set", "drop", "pista", "open air", "madrugada"],
  },
  rock: {
    tom: "palco vivo, guitarra distorcida, refrão gritado, energia ao vivo",
    cena: "amplificador estourado, mosh leve, coro do público, banda suada",
    ancoras: ["palco", "riff", "ao vivo", "refrão", "energia"],
  },
  pop_rock: {
    tom: "vibe leve, refrões grudentos, hits de cover, clima de bar com banda",
    cena: "cover de banda nacional, pé na areia, banda no palco pequeno, refrão coletivo",
    ancoras: ["hits", "cover", "banda", "refrão", "bar com som"],
  },
  mpb: {
    tom: "voz e violão, intimismo, Brasil cantado, jantar com música ao vivo",
    cena: "voz e violão, jantar regado, clima reservado, repertório autoral",
    ancoras: ["voz e violão", "intimismo", "MPB", "jantar com som"],
  },
};

// 🎯 Banco de CTAs (rotação por seed para evitar repetição entre eventos do lote)
const CTA_BANK: string[] = [
  "Garanta sua mesa antes que lota.",
  "Sextou do jeito certo em Prudente.",
  "Chame os amigos e aproveite a noite.",
  "Uma noite perfeita pra curtir música ao vivo.",
  "Evento ideal pra quem é da cena.",
  "Os melhores rolês de Prudente estão na ROXOU.",
  "Confira todos os detalhes e salve na agenda.",
  "Acesse a agenda completa na ROXOU.",
  "Não fique de fora dessa noite especial.",
  "Marca quem vai contigo e fecha a mesa.",
  "Lote promocional acabando — corre.",
  "Reserve o lugar certo da galera.",
  "A casa enche cedo — chega antes.",
];

// 🪝 Banco de aberturas (rotação por seed)
const HOOK_BANK: string[] = [
  "Marque na agenda em vermelho.",
  "Vai dar nome aos bois.",
  "Quem sabe, sabe.",
  "Esse aqui é dos bons.",
  "Atenção aos sinais.",
  "Fim de semana com endereço certo.",
  "É papo reto.",
  "Pega leve no story de quem foi.",
];

function pickFromBank(bank: string[], seed: number): string {
  const idx = ((seed % bank.length) + bank.length) % bank.length;
  return bank[idx];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, venue_name, date_time, category, sub_category, image_url, attractions, seed_index, neighborhood } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dt = date_time ? new Date(date_time) : null;
    const weekday = dt ? dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }) : "";
    const dateStr = dt ? dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : "";
    const timeStr = dt ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";

    const seed = Number.isFinite(Number(seed_index)) ? Number(seed_index) : Math.floor(Math.random() * 9999);
    const subKey = String(sub_category || "").toLowerCase();
    const persona = GENRE_PERSONALITY[subKey] || null;
    const ctaSuggestion = pickFromBank(CTA_BANK, seed);
    const hookSuggestion = pickFromBank(HOOK_BANK, seed + 3);

    const personaBlock = persona
      ? `🎭 PERSONALIDADE OBRIGATÓRIA (gênero ${subKey}):
- Tom: ${persona.tom}
- Cena viva: ${persona.cena}
- Palavras-âncora pra inspirar (use no máximo 2, sem virar clichê): ${persona.ancoras.join(", ")}`
      : `🎭 PERSONALIDADE: tom adequado ao tipo de evento, sem clichê.`;

    const systemPrompt = `Você é o Copywriter-Chefe da ROXOU — portal premium de eventos do interior de SP. Sua escrita é HUMANA, ESPECÍFICA, INFORMATIVA e variada. Cada evento precisa ter PERSONALIDADE PRÓPRIA — nada de molde repetido.

🚫 BANIMENTO ABSOLUTO (zero tolerância):
- "Imperdível", "Sexta Insana", "Sábado Imperdível", "rolê imperdível", "noite imperdível"
- "Prepare-se", "Preparem-se", "Se prepara"
- "Venha curtir", "Vem curtir", "Venha viver"
- "Não perca", "Não fique de fora" (no HYPE — só permitido como variação no CTA, e mesmo assim raramente)
- "Energia contagiante", "vibe contagiante"
- "está de volta ao", "o samba está de volta"
- "Noite inesquecível", "Experiência única", "Memórias inesquecíveis"
- "Promete ser", "Promete agitar", "Vai ser épico"
- "Reserve sua data", "Marque na agenda" (exceto se vier do banco de CTA)
- Aberturas tipo "Atenção, [cidade]!" / "E aí, galera!"

✅ REGRAS:
1. Abertura HUMANA e específica do evento. Cite local + atração reais. Pode usar inspiração: "${hookSuggestion}". NUNCA copie literalmente.
2. Frases curtas (máx 14 palavras). Pontuação direta.
3. NÃO copie o flyer literalmente. Reescreva como um portal de eventos profissional.
4. VARIABILIDADE: cada evento deve soar diferente. NÃO repita estrutura/abertura entre eventos.
5. Use o nome do artista, do local e o gênero como matéria-prima. Eles vendem sozinhos.
6. SEO: cite sutilmente "Presidente Prudente" ou bairro/região quando fizer sentido. Não force.

${personaBlock}

🛑 FATOS:
- NUNCA invente preços, line-up extra, horário, nada.
- Se faltar campo, PULE — não escreva "a confirmar".
- Use o flyer (se enviado) só como referência pra extrair atrações reais.

📦 ESTRUTURA OBRIGATÓRIA do descricao_rica (HTML PURO — só <p>, <strong>, <ul>, <li>):

1. HYPE — 2 a 3 frases. Contextualiza o evento com personalidade do gênero. Cite atração + local em <strong>. Pode mencionar bairro/cidade se fizer sentido.
   Ex sertanejo: <p>O <strong>Vó Laura</strong> arma mais uma noite de modão em Presidente Prudente. Quem chega cedo pega mesa boa e fica até o último coro.</p>

2. CHECKLIST — exatamente neste formato:
   <p><strong>📝 O QUE VOCÊ PRECISA SABER:</strong></p>
   <ul>
     <li>🗓️ [data]</li>
     <li>⏰ [horário]</li>
     <li>📍 [local]</li>
     <li>🎤 <strong>[atração]</strong></li>
     <li>✨ [gênero/clima]</li>
   </ul>
   PULE qualquer <li> sem dado.

3. CTA — 1 parágrafo final, variado. Você PODE usar essa sugestão como base (ou criar outra equivalente, mas EVITE clichê): "${ctaSuggestion}".

🎯 chamada_site: até 60 caracteres, gatilho mental forte, ESPECÍFICA do evento. NUNCA "Nome + Data" cru.`;

    const eventInfo = [
      `Título: ${title}`,
      attractions && `Atrações: ${attractions}`,
      dt && `Data: ${weekday}, ${dateStr}`,
      timeStr && `Horário: ${timeStr}`,
      venue_name && `Local: ${venue_name}`,
      neighborhood && `Bairro/região: ${neighborhood}`,
      category && `Categoria: ${category}`,
      sub_category && `Gênero musical: ${sub_category}`,
      `Seed de variação: ${seed} (use isto pra alternar abertura/CTA entre eventos)`,
    ].filter(Boolean).join("\n");

    const userText = `Gere a chamada e a descrição rica para este evento da ROXOU. Use APENAS os dados abaixo (não invente nada). Cada evento precisa de personalidade própria — não repita molde:\n\n${eventInfo}${image_url ? "\n\nUm flyer foi enviado em anexo — extraia atrações e promoções visíveis." : ""}`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (image_url) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: image_url } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userText });
    }

    const tools = [{
      type: "function",
      function: {
        name: "gerar_copy_evento",
        description: "Retorna a chamada curta para o site e a descrição rica em HTML do evento.",
        parameters: {
          type: "object",
          properties: {
            chamada_site: {
              type: "string",
              description: "Título forte e chamativo de até 60 caracteres com gatilho mental.",
            },
            descricao_rica: {
              type: "string",
              description: "Descrição em HTML simples (p, strong, ul, li) com Hype + Checklist + CTA.",
            },
          },
          required: ["chamada_site", "descricao_rica"],
          additionalProperties: false,
        },
      },
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: { type: "function", function: { name: "gerar_copy_evento" } },
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let chamada_site = "";
    let descricao_rica = "";

    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        chamada_site = (args.chamada_site || "").trim();
        descricao_rica = (args.descricao_rica || "").trim();
      } catch (e) {
        console.error("Failed to parse tool args:", e);
      }
    }

    // Strip any markdown fences and keep only allowed tags
    const cleanHtml = (html: string) => {
      let out = html
        .replace(/^```(?:html)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .replace(/^<html[^>]*>|<\/html>$/gi, "")
        .replace(/^<body[^>]*>|<\/body>$/gi, "")
        .trim();
      // Drop disallowed tags (keep p, strong, em, ul, ol, li, br)
      out = out.replace(/<(?!\/?(?:p|strong|em|ul|ol|li|br)\b)[^>]+>/gi, "");
      return out.trim();
    };
    descricao_rica = cleanHtml(descricao_rica);
    const bannedCopy = /\b(?:imperd[ií]vel|sexta insana|s[áa]bado imperd[ií]vel|rol[êe] imperd[ií]vel|noite imperd[ií]vel|programaç[ãa]o imperd[ií]vel)\b/gi;
    descricao_rica = descricao_rica.replace(bannedCopy, "").replace(/\s{2,}/g, " ").trim();
    chamada_site = chamada_site.replace(/^["'`]+|["'`]+$/g, "").replace(bannedCopy, "").replace(/\s{2,}/g, " ").trim();

    // Fallback for legacy callers: keep `description` field populated.
    return new Response(
      JSON.stringify({
        chamada_site,
        descricao_rica,
        description: descricao_rica, // backwards compatibility
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
