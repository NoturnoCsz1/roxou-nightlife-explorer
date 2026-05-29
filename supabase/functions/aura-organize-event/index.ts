import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_CATEGORIES = [
  "show", "festival", "bar", "universitario", "restaurante",
  "balada", "festa", "futebol", "cultural", "lounge", "espetinho",
];
const ALLOWED_SUBS = [
  "funk", "pagode_samba", "rock", "pop_rock", "eletronica", "sertanejo", "mpb",
  "show", "festival", "bar", "universitario", "restaurante",
  "balada", "festa", "futebol", "cultural", "lounge", "espetinho",
];

const BASE_YEAR = new Date().getFullYear();

const systemPrompt = `Você é a Aura, IA da Roxou (guia de noite em Presidente Prudente).
Receba texto bruto (legenda de Instagram, descrição de flyer, anotações) e organize um EVENTO em JSON.
Use ano base ${BASE_YEAR} se a data não tiver ano. Fuso America/Sao_Paulo.

Categorias: ${ALLOWED_CATEGORIES.join(", ")}
Subcategorias: ${ALLOWED_SUBS.join(", ")}

Frase da Aura: 1 linha curta (máx 90 caracteres), tom guia de rolê, sem clichês ("imperdível", "não pode faltar"), sem emojis no início.`;

const tool = {
  type: "function",
  function: {
    name: "organize_event",
    description: "Organiza informações de um evento a partir de texto bruto.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título em CAIXA ALTA, formato '[ATRAÇÃO] NO [LOCAL] [FRASE]', máx 80 chars" },
        description: { type: "string", description: "Descrição rica do evento, 2-4 frases" },
        date_iso: { type: ["string", "null"], description: "YYYY-MM-DDTHH:MM, fuso SP. Se incerto, null" },
        venue_name: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
        instagram: { type: ["string", "null"], description: "@handle do evento/local" },
        category: { type: "string", enum: ALLOWED_CATEGORIES },
        sub_category: { type: "string", enum: ALLOWED_SUBS },
        price: { type: ["string", "null"], description: "Texto livre: 'Free', 'R$ 30', 'Open bar R$ 80'" },
        opportunity_tags: {
          type: "array",
          items: { type: "string", enum: ["open_bar", "double_drink", "entrada_free", "promocao"] },
        },
        aura_phrase: { type: "string", description: "Frase curta da Aura (1 linha) recomendando o rolê" },
        verification_source: { type: "string", description: "Fonte: 'Instagram', 'Flyer', 'Site oficial', etc" },
      },
      required: ["title", "description", "category", "sub_category", "aura_phrase", "verification_source", "opportunity_tags"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { requireAdmin } = await import("../_shared/requireAdmin.ts");
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { text, instagram_url, image_url } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Cole pelo menos algumas linhas de texto." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const userContent: any[] = [
      { type: "text", text: `Texto bruto:\n${text.slice(0, 4000)}\n\n${instagram_url ? `Instagram do evento: ${instagram_url}` : ""}` },
    ];
    if (image_url) {
      userContent.push({ type: "image_url", image_url: { url: image_url } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "organize_event" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Aura está sobrecarregada. Tente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Lovable Cloud." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) throw new Error("Resposta sem tool_call");
    const parsed = JSON.parse(args);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aura-organize-event error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
