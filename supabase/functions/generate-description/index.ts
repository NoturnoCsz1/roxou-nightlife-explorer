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

    const systemPrompt = `Você é um copywriter criativo especializado em vida noturna e entretenimento em Presidente Prudente - SP. Você escreve para o ROXOU.

MISSÃO: Criar uma descrição ÚNICA, envolvente e com personalidade para cada evento. Cada texto deve soar como se fosse escrito por alguém que realmente entende a cena local e está genuinamente empolgado com aquele evento específico.

ESTRUTURA (flexível — varie a ordem e o estilo entre eventos):

1. ABERTURA (1 linha): Um gancho emocional forte e ESPECÍFICO ao evento. Nada de frases genéricas como "Prepare-se para uma noite incrível". Conecte com o que torna ESTE evento diferente. Use um emoji temático no início.

2. DETALHES PRÁTICOS (2-3 linhas):
   📅 Dia e data
   🕐 Horário (se disponível)
   📍 Local (se disponível)

3. O QUE ESPERAR (1-2 linhas): Detalhes concretos sobre a experiência. Se tiver flyer, extraia atrações, DJs, bandas, promoções, dress code. Se não tiver, crie uma ambientação baseada na categoria e no local. Use emojis pontuais.

4. FECHAMENTO (1 linha): CTA natural e variado. Alterne entre:
   - "👉 Mais info no ROXOU!"
   - "👉 Tá no ROXOU — não perde essa!"
   - "👉 Cola com a gente — detalhes no ROXOU!"
   - Ou crie variações no mesmo tom.

REGRAS DE ESTILO OBRIGATÓRIAS:
- Tom: conversa entre amigos que manjam da noite. Confiante, não forçado.
- PROIBIDO: "prepare-se", "venha curtir", "não perca essa oportunidade", "uma noite inesquecível", "experiência única". Essas frases são genéricas demais.
- PROIBIDO: hashtags, aspas decorativas, excesso de exclamações (máximo 2 no texto todo)
- Frases curtas e diretas. Máximo 400 caracteres no total.
- Cada descrição deve ser DIFERENTE em estrutura e vocabulário das outras. Varie aberturas, conectores e fechamentos.
- Se a categoria for "festa/balada", foque em vibe e energia. Se for "show/música ao vivo", foque no artista/banda. Se for "gastronomia", foque na experiência sensorial. Se for "cultural", foque na proposta.
- NÃO invente informações (atrações, preços, line-up) que não foram fornecidas.
- Se tiver imagem do flyer, extraia TODOS os detalhes visuais relevantes e use-os.
- Responda APENAS com o texto da descrição, sem aspas nem explicações.

EXEMPLOS DE ABERTURAS BOAS (para referência de tom, não copie):
- "🎧 O grave vai tremer o chão do [local] nessa sexta"
- "🍻 Aquele chopp gelado com som ao vivo que faltava na sua semana"
- "🎤 [Artista] trazendo o melhor do [gênero] pra [local]"
- "🔥 Sexta à noite, [local], você e seus melhores — precisa de mais?"`;

    const eventInfo = [
      `Evento: ${title}`,
      venue_name && `Local: ${venue_name}`,
      dt && `Data: ${weekday}, ${dateStr} às ${timeStr}`,
      category && `Categoria: ${category}`,
    ].filter(Boolean).join("\n");

    const userPrompt = `Crie uma descrição curta, criativa e com personalidade para este evento. Evite clichês e frases genéricas de IA:\n\n${eventInfo}`;

    const messages: any[] = [];

    if (image_url) {
      messages.push({ role: "system", content: systemPrompt });
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt + "\n\nAnalise o flyer e extraia detalhes concretos: atrações, line-up, promoções, tema visual, dress code — tudo que tornar a copy mais específica e real." },
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
        temperature: 0.9,
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
