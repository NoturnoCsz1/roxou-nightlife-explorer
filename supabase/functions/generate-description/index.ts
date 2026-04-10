import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, venue_name, date_time, category, image_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dt = date_time ? new Date(date_time) : null;
    const weekday = dt ? dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }) : "";
    const dateStr = dt ? dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : "";
    const timeStr = dt ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";

    const systemPrompt = `Você é o copywriter oficial do ROXOU, o principal guia de eventos e vida noturna de Presidente Prudente - SP.

Sua missão: criar descrições irresistíveis que façam as pessoas quererem ir ao evento.

FORMATO OBRIGATÓRIO (siga exatamente este padrão):
Linha 1: Emoji temático + frase de impacto sobre o evento (gancho emocional)
Linha 2: (vazia)
Linha 3: 📅 Dia da semana, data por extenso
Linha 4: 🕐 Horário (se disponível)
Linha 5: 📍 Nome do local (se disponível)
Linha 6: (vazia)
Linha 7-8: 1-2 frases curtas sobre o que esperar (atrações, vibe, estilo musical). Use emojis relevantes no início de cada frase.
Linha 9: (vazia)  
Linha 10: 👉 Garanta sua presença — mais info no ROXOU!

REGRAS DE ESTILO:
- Tom: jovem, urbano, animado e convidativo
- Use emojis com moderação e propósito (🎶 🔥 🍻 🎤 💃 🎧 🎸 🎉 ✨)
- Adapte o emoji da primeira linha à categoria: 🎶 música, 🍻 bar/balada, 🎤 show, 🎭 teatro, 🏖️ pool party, etc.
- Frases curtas e punchy — máximo 500 caracteres no total
- NÃO use hashtags
- NÃO repita o título do evento literalmente na primeira linha
- NÃO invente informações (atrações, preços, etc.) que não foram fornecidas
- Se tiver imagem do flyer, extraia detalhes visuais relevantes (atrações listadas, tema, dress code)
- Responda APENAS com o texto da descrição, sem aspas nem explicações`;

    const eventInfo = [
      `Evento: ${title}`,
      venue_name && `Local: ${venue_name}`,
      dt && `Data: ${weekday}, ${dateStr} às ${timeStr}`,
      category && `Categoria: ${category}`,
    ].filter(Boolean).join("\n");

    const userPrompt = `Crie uma descrição curta e atrativa para este evento:\n\n${eventInfo}`;

    const messages: any[] = [];

    if (image_url) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt + "\n\nUse a imagem do flyer para extrair detalhes adicionais relevantes (atrações, tema, estilo)." },
          { type: "image_url", image_url: { url: image_url } },
        ],
      });
    } else {
      messages.push({ role: "system", content: systemPrompt });
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
