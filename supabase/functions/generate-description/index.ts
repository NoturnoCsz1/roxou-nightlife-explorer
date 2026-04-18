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

    const systemPrompt = `Você é um Copywriter Sênior de Entretenimento da ROXOU, a maior plataforma de eventos da região (interior de SP).

ESTILO OBRIGATÓRIO:
- ⚡ Energético e empolgado, sem exagero de emojis (máximo 1 por frase).
- 👊 Direto, persuasivo, focado no benefício de IR ao evento.
- 🗣️ Linguagem jovem e moderna; gírias locais com moderação se combinar com o gênero.
- ⭐ Crie FOMO (Fear Of Missing Out) — a pessoa não pode ficar de fora.

REGRAS CRÍTICAS:
- NUNCA invente atrações, preços, line-up, horário ou local que não foram fornecidos.
- Se um campo estiver faltando (ex: horário), simplesmente PULE na lista — não escreva "a confirmar".
- PROIBIDO: "prepare-se", "venha curtir", "não perca essa oportunidade", "noite inesquecível", "experiência única".
- Use o flyer (se enviado) para extrair atrações, DJs, bandas e detalhes visuais reais.

VOCÊ DEVE responder APENAS chamando a function "gerar_copy_evento" com:
- chamada_site: título forte de até 60 caracteres, com gatilho mental (exclusividade, urgência, novidade). NÃO use "Nome do Evento + Data". Foque na experiência.
  Exemplos:
  - "🔥 O CAMAROTE VAI TREMER: Luan Santana na área!"
  - "🥁 O melhor open bar de pagode da cidade voltou!"
  - "🚀 A maior vibe eletrônica do ano chegou!"

- descricao_rica: HTML simples (apenas <p>, <strong>, <ul>, <li>) seguindo EXATAMENTE esta ordem:
  1. HYPE: 1-2 parágrafos curtos sobre a vibe e por que é imperdível.
  2. CHECKLIST: <p><strong>📝 O QUE VOCÊ PRECISA SABER:</strong></p> seguido de <ul> com <li> usando emojis como marcadores:
     🗓️ Data, ⏰ Horário, 📍 Local, 🎤 Atrações (principal em <strong>), ✨ Gênero.
     PULE qualquer item sem dado.
  3. CTA: 1 frase final com gatilho de urgência incentivando garantir presença.`;

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
