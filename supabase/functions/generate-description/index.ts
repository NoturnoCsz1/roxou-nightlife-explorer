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

    const systemPrompt = `Você é um redator do ROXOU, guia de eventos e vida noturna de Presidente Prudente - SP.
Gere uma descrição curta e atrativa (2-4 frases, máximo 300 caracteres) para um evento.
Tom: jovem, animado, direto, convidativo. Foque em criar expectativa.
NÃO use hashtags, emojis ou formatação especial.
NÃO repita o nome do evento no início.
NÃO invente informações que não foram fornecidas.
Responda APENAS com o texto da descrição, sem aspas.`;

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
