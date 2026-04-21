import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, venue_name, date_time, category, image_url, attractions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dt = date_time ? new Date(date_time) : null;
    const weekday = dt ? dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }) : "";
    const dateStr = dt ? dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : "";
    const timeStr = dt ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";

    const systemPrompt = `Você é o Copywriter-Chefe da ROXOU — a maior plataforma de eventos noturnos do interior de SP. Sua escrita é CIRÚRGICA: curta, seca, agressiva, focada em FOMO. Cada palavra precisa convocar o leitor.

🚫 BANIMENTO ABSOLUTO (zero tolerância — se usar, falhou):
- "Prepare-se", "Preparem-se", "Se prepara"
- "Venha curtir", "Vem curtir", "Venha viver"
- "Não perca", "Não perca essa", "Não fique de fora"
- "Energia contagiante", "vibe contagiante"
- "O samba está de volta", "O sertanejo está de volta", "está de volta ao"
- "Noite inesquecível", "Noite única", "Experiência única", "Memórias inesquecíveis"
- "Promete ser", "Promete agitar", "Vai ser incrível", "Vai ser épico"
- "Reserve sua data", "Marque na agenda"
- Qualquer abertura genérica tipo "Atenção, [cidade]!" ou "E aí, galera!"

✅ REGRAS DE ESTILO (obrigatórias):
1. ABERTURA: comece SEMPRE com afirmação de alto impacto OU provocação direta. Sem aquecer.
   - ✅ "O Colina vai tremer com o Sambadô. Quem ficar de fora vai se arrepender quando ver os stories."
   - ✅ "Sexta tem Pixote no Arapuca. Você decide se vai estar lá ou olhando print."
   - ❌ "O samba está de volta ao Colina com o Sambadô."
2. CONVOCAÇÃO, não descrição. Fale com o leitor (você/seu). Use verbos no imperativo apenas no CTA final.
3. Frases CURTAS. Máximo 12 palavras por frase. Pontuação direta.
4. Use os nomes próprios (artista, local, cidade) como armas — eles vendem sozinhos.
5. FOMO real: deixe claro o que ele perde se não for (story dos amigos, lote barato, presença histórica).

🛑 REGRAS CRÍTICAS DE FATOS:
- NUNCA invente atrações, preços, line-up, horário, local que não foram fornecidos.
- Se faltar um campo (ex: horário), simplesmente PULE — não escreva "a confirmar".
- Use o flyer (se enviado) para extrair atrações reais.

📦 ESTRUTURA OBRIGATÓRIA do campo descricao_rica (HTML PURO — sem markdown, sem \`\`\`html, apenas as tags <p>, <strong>, <ul>, <li>):

1. HYPE — 1 parágrafo curto (máx 2 frases), abertura provocativa, mencionando atração + local em <strong>.
   Ex: <p>O <strong>Arapuca Hall</strong> vai parar dia 15. <strong>Luan Santana</strong> e <strong>Pixote</strong> dividindo o palco — quem ficar fora vira meme no story dos amigos.</p>

2. CHECKLIST — exatamente neste formato:
   <p><strong>📝 O QUE VOCÊ PRECISA SABER:</strong></p>
   <ul>
     <li>🗓️ [data]</li>
     <li>⏰ [horário]</li>
     <li>📍 [local]</li>
     <li>🎤 <strong>[atração principal]</strong> + [outras]</li>
     <li>✨ [gênero]</li>
   </ul>
   PULE qualquer <li> sem dado.

3. CTA — 1 parágrafo final, urgência cirúrgica.
   Ex: <p>⏳ Lote promocional acabando. Garanta o seu antes que vire ingresso de porta.</p>

🎯 chamada_site: até 60 caracteres, gatilho mental forte (exclusividade/urgência/novidade). NUNCA "Nome + Data".
   Ex: "🔥 Pixote no Arapuca: lote barato esgotando"
   Ex: "⚠️ Última vez do Sambadô no Colina em 2025"`;

    const eventInfo = [
      `Título do Evento: ${title}`,
      attractions && `Atrações: ${attractions}`,
      dt && `Data: ${weekday}, ${dateStr}`,
      timeStr && `Horário: ${timeStr}`,
      venue_name && `Local (Parceiro): ${venue_name}`,
      category && `Categoria/Gênero: ${category}`,
    ].filter(Boolean).join("\n");

    const userText = `Gere a chamada e a descrição rica para este evento da ROXOU. Use APENAS os dados abaixo (não invente nada):\n\n${eventInfo}${image_url ? "\n\nUm flyer foi enviado em anexo — extraia atrações, line-up, promoções e dress code visíveis." : ""}`;

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
