import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url, caption: manualCaption } = body;

    // Validate: need either a URL or a manual caption
    if (!url && !manualCaption) {
      return new Response(
        JSON.stringify({ error: "Forneça uma URL do Instagram ou cole a legenda manualmente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (url && !url.includes("instagram.com/p/") && !url.includes("instagram.com/reel/")) {
      return new Response(
        JSON.stringify({ error: "URL de post do Instagram inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get caption and image - either from URL fetch or manual input
    let caption = manualCaption || "";
    let imageUrl = "";
    let pageTitle = "";

    let fetchFailed = false;
    if (url) {
      try {
        const pageResp = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          },
        });
        const html = await pageResp.text();

        const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) ||
          html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
        if (ogImageMatch) imageUrl = ogImageMatch[1];

        const ogDescMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i) ||
          html.match(/content="([^"]+)"\s+(?:property|name)="og:description"/i);
        if (ogDescMatch && !caption) caption = ogDescMatch[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

        const ogTitleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i) ||
          html.match(/content="([^"]+)"\s+(?:property|name)="og:title"/i);
        if (ogTitleMatch) pageTitle = ogTitleMatch[1];

        if (!pageTitle) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) pageTitle = titleMatch[1];
        }

        // Check if metadata is weak/blocked (Instagram login wall, empty page, etc.)
        const hasUsefulContent = (caption && caption.length > 20) || (pageTitle && !pageTitle.toLowerCase().includes("instagram") && pageTitle.length > 10);
        if (!hasUsefulContent) {
          fetchFailed = true;
          console.log("Weak metadata detected - caption length:", caption.length, "pageTitle:", pageTitle);
        }
      } catch (fetchErr) {
        console.error("Failed to fetch Instagram page:", fetchErr);
        fetchFailed = true;
      }
    }

    // If URL fetch produced weak/no data, return early with warning
    if (url && !manualCaption && fetchFailed) {
      return new Response(JSON.stringify({
        success: false,
        weak_metadata: true,
        error: "Não foi possível ler o post automaticamente com confiança. Use o modo manual.",
        extracted: { title: "", description: "", date: "", time: "", venue_name: "", category: "", city: "", instagram: "", ticket_url: "", image_url: imageUrl || "" },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract Instagram handle from text
    let instagramHandle = "";
    const handleFromTitle = pageTitle.match(/@([a-zA-Z0-9_.]+)/);
    if (handleFromTitle) instagramHandle = handleFromTitle[1];
    if (!instagramHandle) {
      const handleFromCaption = caption.match(/@([a-zA-Z0-9_.]+)/);
      if (handleFromCaption) instagramHandle = handleFromCaption[1];
    }

    // Step 2: Use AI to extract structured event data from caption
    let extractedData: Record<string, string> = {};

    if (caption || pageTitle) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured");
      } else {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `Você é um assistente que extrai informações de eventos a partir de textos de posts do Instagram de casas noturnas, bares e eventos em cidades brasileiras. Responda APENAS com a chamada da função, sem texto adicional.`,
                },
                {
                  role: "user",
                  content: `Extraia as informações do evento a partir deste texto de post do Instagram:\n\nTítulo da página: ${pageTitle}\n\nLegenda: ${caption}\n\nHandle do Instagram: @${instagramHandle}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_event",
                    description: "Extrai dados estruturados de um evento",
                    parameters: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Nome/título do evento" },
                        description: { type: "string", description: "Descrição do evento" },
                        date: { type: "string", description: "Data no formato YYYY-MM-DD se encontrada" },
                        time: { type: "string", description: "Horário no formato HH:MM se encontrado" },
                        venue_name: { type: "string", description: "Nome do local/casa" },
                        category: {
                          type: "string",
                          enum: ["balada", "show", "bar", "festival", "sertanejo", "funk", "eletronica", "festa"],
                          description: "Categoria do evento",
                        },
                        city: { type: "string", description: "Cidade do evento" },
                        instagram: { type: "string", description: "Handle do Instagram sem @" },
                        ticket_url: { type: "string", description: "Link de ingresso ou reserva se mencionado" },
                      },
                      required: ["title"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "extract_event" } },
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              extractedData = JSON.parse(toolCall.function.arguments);
            }
          } else {
            const errText = await aiResp.text();
            console.error("AI gateway error:", aiResp.status, errText);
          }
        } catch (aiErr) {
          console.error("AI extraction error:", aiErr);
        }
      }
    }

    const result = {
      success: true,
      raw: { caption, imageUrl, pageTitle, instagramHandle },
      extracted: {
        title: extractedData.title || "",
        description: extractedData.description || caption || "",
        date: extractedData.date || "",
        time: extractedData.time || "",
        venue_name: extractedData.venue_name || "",
        category: extractedData.category || "festa",
        city: extractedData.city || "",
        instagram: extractedData.instagram || instagramHandle || "",
        ticket_url: extractedData.ticket_url || "",
        image_url: imageUrl || "",
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-instagram error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
