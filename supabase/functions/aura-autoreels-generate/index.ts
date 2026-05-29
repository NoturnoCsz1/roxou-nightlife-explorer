// Aura AutoReels - generates viral reel scripts via Gemini
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const STYLE_MAP: Record<string, string> = {
  funk: "funk",
  "funk-paulista": "funk",
  pagode: "pagode",
  samba: "pagode",
  sertanejo: "sertanejo",
  eletronica: "eletronico",
  "eletronica-house": "eletronico",
  techno: "eletronico",
  universitaria: "universitario",
  rock: "premium",
  jazz: "barzinho",
  mpb: "barzinho",
};

function inferStyle(category?: string | null, sub?: string | null): string {
  const k = (sub || category || "").toLowerCase();
  for (const key of Object.keys(STYLE_MAP)) {
    if (k.includes(key)) return STYLE_MAP[key];
  }
  return "premium";
}

function buildPrompt(ev: any, style: string) {
  const dateStr = new Date(ev.date_time).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `Você é a Aura, IA de viralização da Roxou (guia de rolês). Gere um roteiro de Reel curto e AGRESSIVO para Instagram/TikTok.

EVENTO:
- Título: ${ev.title}
- Local: ${ev.venue_name || "—"}
- Cidade: ${ev.city}
- Data/Hora: ${dateStr}
- Categoria: ${ev.category} / ${ev.sub_category || "—"}
- Estilo: ${style}
- Descrição: ${(ev.description || "").slice(0, 500)}

REGRAS:
- Linguagem de rolê brasileiro, jovem, urbano. NADA de clichê tipo "vem com tudo", "imperdível".
- Hook nos 2 primeiros segundos.
- 4 a 6 cenas, cada uma com 2-3s, com descrição visual cinematográfica.
- CTA forte e direto (salvar, marcar amigos, garantir lista).
- Hashtags mistas: locais + nicho + virais (10-14).
- Legenda viralizadora pronta pra colar.
- Sugerir áudio do TikTok/IG no estilo certo.
- Prompts otimizados para CapCut AI, Kling, Runway, Veo e TikTok style.

Retorne APENAS JSON válido com este shape exato:
{
  "title": "string",
  "hook": "string (frase 1-2s)",
  "scenes": [{"order": 1, "duration_s": 2.5, "visual": "descrição cinematográfica", "text_overlay": "string", "transition": "string"}],
  "captions": ["legenda principal", "variação curta"],
  "cta": "string",
  "hashtags": ["#tag1"],
  "music_style": "string descritivo + sugestão concreta",
  "visual_style": "string (paleta, mood, FX)",
  "video_prompt": "prompt direto pra gerador de vídeo IA",
  "external_prompts": {
    "capcut": "string",
    "kling": "string",
    "runway": "string",
    "veo": "string",
    "tiktok": "string (estilo de edição)"
  }
}`;
}

async function generateScript(ev: any, style: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você devolve APENAS JSON válido, sem markdown, sem comentários." },
        { role: "user", content: buildPrompt(ev, style) },
      ],
      temperature: 0.95,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gateway ${res.status}: ${txt}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { requireAdmin } = await import("../_shared/requireAdmin.ts");
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { event_id, style: forcedStyle, auto, limit = 5 } = body || {};

    let targets: any[] = [];

    if (event_id) {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, venue_name, city, category, sub_category, date_time, image_url, partner_id")
        .eq("id", event_id)
        .maybeSingle();
      if (error || !data) throw new Error("Evento não encontrado");
      targets = [data];
    } else if (auto) {
      const { data: existing } = await supabase
        .from("auto_reels_queue")
        .select("event_id")
        .not("event_id", "is", null);
      const skip = new Set((existing ?? []).map((r: any) => r.event_id));

      const { data } = await supabase
        .from("events")
        .select("id, title, description, venue_name, city, category, sub_category, date_time, image_url, partner_id, aura_score")
        .eq("status", "published")
        .gte("date_time", new Date().toISOString())
        .order("aura_score", { ascending: false })
        .limit(50);
      targets = (data ?? []).filter((e: any) => !skip.has(e.id)).slice(0, limit);
    } else {
      throw new Error("Forneça event_id ou auto:true");
    }

    const created: any[] = [];
    for (const ev of targets) {
      try {
        const style = forcedStyle || inferStyle(ev.category, ev.sub_category);
        const script = await generateScript(ev, style);

        const insert = {
          event_id: ev.id,
          partner_id: ev.partner_id,
          status: "generated",
          style,
          script_json: script,
          generated_caption: Array.isArray(script.captions) ? script.captions[0] : script.captions ?? null,
          generated_hashtags: Array.isArray(script.hashtags) ? script.hashtags : [],
          suggested_audio: script.music_style ?? null,
          video_prompt: script.video_prompt ?? null,
          external_prompts: script.external_prompts ?? {},
          preview_image_url: ev.image_url ?? null,
        };

        const { data: row, error } = await supabase
          .from("auto_reels_queue")
          .insert(insert)
          .select("id")
          .single();
        if (error) throw error;
        created.push({ id: row.id, event_id: ev.id, style });
      } catch (e) {
        console.error("reel-gen failed for", ev.id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aura-autoreels-generate error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
