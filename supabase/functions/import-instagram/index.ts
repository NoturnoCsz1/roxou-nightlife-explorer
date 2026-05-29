import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin, corsHeaders } from "../_shared/requireAdmin.ts";


interface DebugInfo {
  firecrawl_returned_content: boolean;
  markdown_length: number;
  metadata_keys: string[];
  og_image_found: boolean;
  caption_found: boolean;
  login_wall_detected: boolean;
  blocked_page_detected: boolean;
  extracted_title: string;
  error_detail?: string;
}

function buildDebugInfo(overrides: Partial<DebugInfo> = {}): DebugInfo {
  return {
    firecrawl_returned_content: false,
    markdown_length: 0,
    metadata_keys: [],
    og_image_found: false,
    caption_found: false,
    login_wall_detected: false,
    blocked_page_detected: false,
    extracted_title: "",
    ...overrides,
  };
}

async function scrapeWithFirecrawl(url: string) {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
      waitFor: 3000,
    }),
  });

  const data = await resp.json();
  if (!resp.ok || !data.success) {
    console.error("Firecrawl error:", data);
    throw new Error(data.error || "Firecrawl scrape failed");
  }

  return data;
}

function detectLoginWall(html: string, markdown: string): boolean {
  const indicators = [
    "login",
    "log in",
    "sign up",
    "create an account",
    "entrar",
    "cadastre-se",
  ];
  const lowerHtml = (html || "").toLowerCase();
  const lowerMd = (markdown || "").toLowerCase();
  const combined = lowerHtml + " " + lowerMd;

  // Instagram login wall typically has very short content with login prompts
  const hasLoginIndicator = indicators.some((i) => combined.includes(i));
  const isShortContent = markdown.length < 200;
  return hasLoginIndicator && isShortContent;
}

function detectBlockedPage(html: string, markdown: string): boolean {
  const blockedIndicators = [
    "sorry, this page isn't available",
    "esta página não está disponível",
    "content isn't available",
    "conteúdo não está disponível",
    "page not found",
  ];
  const combined = ((html || "") + " " + (markdown || "")).toLowerCase();
  return blockedIndicators.some((i) => combined.includes(i));
}

function extractFromFirecrawl(data: any): {
  caption: string;
  imageUrl: string;
  pageTitle: string;
  instagramHandle: string;
  debug: Partial<DebugInfo>;
} {
  const html = data.data?.html || data.html || "";
  const markdown = data.data?.markdown || data.markdown || "";
  const metadata = data.data?.metadata || data.metadata || {};

  const metadataKeys = Object.keys(metadata);
  const loginWall = detectLoginWall(html, markdown);
  const blockedPage = detectBlockedPage(html, markdown);

  // Extract og:image from HTML
  let imageUrl = "";
  const ogImageMatch =
    html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) ||
    html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
  if (ogImageMatch) imageUrl = ogImageMatch[1];
  if (!imageUrl && metadata.ogImage) imageUrl = metadata.ogImage;

  // Extract og:description as caption
  let caption = "";
  const ogDescMatch =
    html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i) ||
    html.match(/content="([^"]+)"\s+(?:property|name)="og:description"/i);
  if (ogDescMatch)
    caption = ogDescMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  if (!caption && metadata.description) caption = metadata.description;

  // Use markdown as fallback/supplement for caption
  if (!caption && markdown.length > 50) caption = markdown.substring(0, 2000);

  // Extract page title
  let pageTitle = metadata.title || "";
  if (!pageTitle) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) pageTitle = titleMatch[1];
  }

  // Extract Instagram handle
  let instagramHandle = "";
  const handleFromTitle = pageTitle.match(/@([a-zA-Z0-9_.]+)/);
  if (handleFromTitle) instagramHandle = handleFromTitle[1];
  if (!instagramHandle) {
    const handleFromCaption = caption.match(/@([a-zA-Z0-9_.]+)/);
    if (handleFromCaption) instagramHandle = handleFromCaption[1];
  }

  const debug: Partial<DebugInfo> = {
    firecrawl_returned_content: !!(html || markdown),
    markdown_length: markdown.length,
    metadata_keys: metadataKeys,
    og_image_found: !!imageUrl,
    caption_found: !!(caption && caption.length > 10),
    login_wall_detected: loginWall,
    blocked_page_detected: blockedPage,
    extracted_title: pageTitle.substring(0, 100),
  };

  return { caption, imageUrl, pageTitle, instagramHandle, debug };
}

async function extractWithAI(caption: string, pageTitle: string, instagramHandle: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          content: `Você é um assistente que extrai informações de eventos a partir de textos de posts do Instagram de casas noturnas, bares e eventos em cidades brasileiras.

REGRAS OBRIGATÓRIAS:
- Extraia APENAS campos que estão EXPLICITAMENTE mencionados no texto fornecido.
- NÃO invente, adivinhe ou infira valores que não estão claramente escritos no texto.
- Se um campo não está presente no texto, retorne string vazia "".
- NÃO preencha título se não houver um nome de evento claro.
- NÃO preencha data se não houver uma data explícita.
- NÃO preencha local se não houver um nome de venue explícito.
- NÃO preencha ticket_url se não houver um link explícito.
- NÃO preencha descrição inventando texto. Use apenas o que está escrito.
- Prefira retornar campos vazios do que adivinhar valores incorretos.

Responda APENAS com a chamada da função, sem texto adicional.`,
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
                title: { type: "string", description: "Nome/título do evento. Retorne '' se não houver nome claro." },
                description: { type: "string", description: "Descrição do evento extraída diretamente do texto. Retorne '' se não houver." },
                date: { type: "string", description: "Data no formato YYYY-MM-DD. Retorne '' se não houver data explícita." },
                time: { type: "string", description: "Horário no formato HH:MM. Retorne '' se não houver horário explícito." },
                venue_name: { type: "string", description: "Nome do local/casa. Retorne '' se não estiver explícito." },
                category: {
                  type: "string",
                  enum: ["balada", "show", "bar", "festival", "sertanejo", "funk", "eletronica", "festa", ""],
                  description: "Categoria do evento. Retorne '' se não for possível determinar com certeza.",
                },
                city: { type: "string", description: "Cidade do evento. Retorne '' se não mencionada." },
                instagram: { type: "string", description: "Handle do Instagram sem @. Retorne '' se não encontrado." },
                ticket_url: { type: "string", description: "Link de ingresso ou reserva. Retorne '' se não houver link explícito." },
                confidence: { type: "string", enum: ["high", "medium", "low"], description: "Nível de confiança na extração." },
              },
              required: ["title", "confidence"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_event" } },
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error("AI gateway error:", aiResp.status, errText);
    throw new Error("AI extraction failed");
  }

  const aiData = await aiResp.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  return {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;



  try {
    const body = await req.json();
    const { url, caption: manualCaption } = body;

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

    let caption = manualCaption || "";
    let imageUrl = "";
    let pageTitle = "";
    let instagramHandle = "";
    let debug: DebugInfo = buildDebugInfo();

    // URL mode: use Firecrawl to scrape
    if (url) {
      try {
        console.log("Scraping Instagram URL with Firecrawl:", url);
        const firecrawlData = await scrapeWithFirecrawl(url);
        const extracted = extractFromFirecrawl(firecrawlData);

        if (!manualCaption) caption = extracted.caption;
        imageUrl = extracted.imageUrl;
        pageTitle = extracted.pageTitle;
        instagramHandle = extracted.instagramHandle;
        debug = buildDebugInfo(extracted.debug);

        console.log("[DEBUG] Firecrawl result:", JSON.stringify(debug));

        // Check if we got useful content
        const hasUsefulContent =
          (caption && caption.length > 20) ||
          (pageTitle && !pageTitle.toLowerCase().includes("instagram") && pageTitle.length > 10);

        if (!hasUsefulContent && !manualCaption) {
          console.log("Weak metadata from Firecrawl - caption length:", caption.length);
          return new Response(
            JSON.stringify({
              success: false,
              weak_metadata: true,
              error: "Não foi possível ler o post automaticamente com confiança. Use o modo manual.",
              debug,
              extracted: {
                title: "", description: "", date: "", time: "", venue_name: "",
                category: "", city: "", instagram: "", ticket_url: "", image_url: imageUrl || "",
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (fetchErr) {
        console.error("Firecrawl scrape failed:", fetchErr);
        debug = buildDebugInfo({
          error_detail: fetchErr instanceof Error ? fetchErr.message : "Unknown error",
        });
        console.log("[DEBUG] Firecrawl failure:", JSON.stringify(debug));

        if (!manualCaption) {
          return new Response(
            JSON.stringify({
              success: false,
              weak_metadata: true,
              error: "Não foi possível ler o post automaticamente com confiança. Use o modo manual.",
              debug,
              extracted: {
                title: "", description: "", date: "", time: "", venue_name: "",
                category: "", city: "", instagram: "", ticket_url: "", image_url: "",
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Extract handle from manual caption if needed
    if (!instagramHandle && caption) {
      const handleMatch = caption.match(/@([a-zA-Z0-9_.]+)/);
      if (handleMatch) instagramHandle = handleMatch[1];
    }

    // AI extraction
    let extractedData: Record<string, string> = {};
    if (caption || pageTitle) {
      try {
        extractedData = await extractWithAI(caption, pageTitle, instagramHandle);
      } catch (aiErr) {
        console.error("AI extraction error:", aiErr);
        debug.error_detail = aiErr instanceof Error ? aiErr.message : "AI error";
      }
    }

    const confidence = extractedData.confidence || "low";
    debug.extracted_title = extractedData.title || debug.extracted_title || "";

    // Low confidence from URL mode → fallback
    if (confidence === "low" && url && !manualCaption) {
      console.log("[DEBUG] Low confidence fallback:", JSON.stringify(debug));
      return new Response(
        JSON.stringify({
          success: false,
          weak_metadata: true,
          confidence,
          error: "Não foi possível ler o post automaticamente com confiança. Use o modo manual.",
          debug,
          extracted: {
            title: "", description: "", date: "", time: "", venue_name: "",
            category: "", city: "", instagram: instagramHandle || "", ticket_url: "", image_url: imageUrl || "",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        confidence,
        debug,
        raw: { caption, imageUrl, pageTitle, instagramHandle },
        extracted: {
          title: extractedData.title || "",
          description: extractedData.description || (manualCaption ? caption : "") || "",
          date: extractedData.date || "",
          time: extractedData.time || "",
          venue_name: extractedData.venue_name || "",
          category: extractedData.category || "",
          city: extractedData.city || "",
          instagram: extractedData.instagram || instagramHandle || "",
          ticket_url: extractedData.ticket_url || "",
          image_url: imageUrl || "",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("import-instagram error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
