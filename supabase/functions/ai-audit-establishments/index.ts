import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ----- Instagram helpers (reuso da lógica de partner-instagram-sync) -----
function normalizeHandle(raw?: string | null): string | null {
  if (!raw) return null;
  let v = String(raw).trim();
  if (!v) return null;
  const m = v.match(/instagram\.com\/([^/?#]+)/i);
  if (m) v = m[1];
  v = v.replace(/^@+/, "").replace(/\/+$/, "").trim();
  if (!v || v.includes(" ")) return null;
  return v.toLowerCase();
}

async function fetchInstagramContext(admin: any, handle: string) {
  // Reusa instagram_accounts (Meta Business Discovery), mesma fonte do partner-instagram-sync
  try {
    const { data: acc } = await admin
      .from("instagram_accounts")
      .select("access_token, ig_account_id, status")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!acc?.access_token || !acc?.ig_account_id) {
      return { validated: false, reason: "Nenhuma conta Instagram conectada na Roxou.", data: null };
    }
    const fields =
      `business_discovery.username(${handle}){username,name,biography,followers_count,media_count,website,media.limit(6){caption,media_type,permalink,timestamp,like_count,comments_count}}`;
    const url = `https://graph.facebook.com/v21.0/${acc.ig_account_id}?fields=${encodeURIComponent(fields)}&access_token=${acc.access_token}`;
    const r = await fetch(url);
    const json = await r.json();
    if (!r.ok || json?.error || !json?.business_discovery) {
      return {
        validated: false,
        reason: json?.error?.message || "Instagram não pôde ser lido (perfil pessoal/privado ou inexistente).",
        data: null,
      };
    }
    const bd = json.business_discovery;
    return {
      validated: true,
      reason: "ok",
      data: {
        username: bd.username,
        name: bd.name,
        biography: bd.biography,
        followers_count: bd.followers_count,
        media_count: bd.media_count,
        website: bd.website,
        recent_captions: (bd.media?.data || [])
          .map((m: any) => ({
            caption: (m.caption || "").slice(0, 300),
            type: m.media_type,
            timestamp: m.timestamp,
            likes: m.like_count,
          }))
          .slice(0, 6),
      },
    };
  } catch (err: any) {
    return { validated: false, reason: err?.message || "Erro ao acessar Instagram", data: null };
  }
}


const SYSTEM_BASE = `Você é um auditor de dados da plataforma Roxou (guia de eventos noturnos no interior de SP).
Analise estabelecimentos cadastrados (bares, casas de show, baladas) e aponte problemas de qualidade.

Avalie: endereço, cidade, instagram, telefone/whatsapp, categoria/tipo, coordenadas (lat/lng),
status, vínculo com eventos, e consistência entre nome e endereço.

Considere prioridade ALTA quando:
- Estabelecimento tem eventos publicados mas falta coordenada (afeta carona/mapa)
- Status "ativo" mas dados críticos faltando
- Instagram suspeito (vazio, com espaços, sem @ válido)

Considere candidato a "Oficial Roxou" quando:
- 5+ eventos vinculados
- Todos campos preenchidos
- Instagram validado
- Coordenadas válidas

Seja objetivo, em português brasileiro, tom direto e útil.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roleOk } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleOk) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const mode: "single" | "global" | "suggest" = body.mode || "single";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    let userPrompt = "";
    let toolName = "";
    let toolSchema: any = {};

    if (mode === "single") {
      const e = body.establishment;
      if (!e) return json({ error: "missing establishment" }, 400);
      userPrompt = `Analise este estabelecimento e retorne diagnóstico estruturado:\n${JSON.stringify(e, null, 2)}`;
      toolName = "diagnose_establishment";
      toolSchema = {
        type: "object",
        properties: {
          risk: { type: "string", enum: ["baixo", "medio", "alto"] },
          summary: { type: "string", description: "Resumo executivo em 1-2 frases" },
          problems: { type: "array", items: { type: "string" } },
          suggestions: { type: "array", items: { type: "string" } },
          recommended_actions: {
            type: "array",
            items: {
              type: "string",
              enum: ["geocode", "validate_instagram", "set_ativo", "set_destaque", "set_oficial", "set_bloqueado", "edit"],
            },
          },
          priority: { type: "string", enum: ["baixa", "media", "alta"] },
          oficial_candidate: { type: "boolean" },
        },
        required: ["risk", "summary", "problems", "suggestions", "recommended_actions", "priority", "oficial_candidate"],
        additionalProperties: false,
      };
    } else if (mode === "suggest") {
      const e = body.establishment;
      if (!e) return json({ error: "missing establishment" }, 400);
      userPrompt =
        `Você é um assistente de curadoria da Roxou. Analise o estabelecimento abaixo e gere SUGESTÕES de melhoria de cadastro.\n` +
        `Use nome, instagram, endereço, descrição e contexto para inferir categoria e estilos musicais.\n` +
        `Se algum dado faltar, ainda assim arrisque a melhor sugestão plausível e indique baixa confiança.\n` +
        `A descrição sugerida deve ter 2 a 3 frases, tom direto, sem clichês ("o melhor", "incrível", "imperdível"), em pt-BR.\n\n` +
        `Estabelecimento:\n${JSON.stringify(e, null, 2)}`;
      toolName = "suggest_establishment";
      toolSchema = {
        type: "object",
        properties: {
          suggested_type: {
            type: "string",
            enum: ["bar", "balada", "casa_de_shows", "restaurante", "pub", "lounge", "boate", "cervejaria", "rooftop", "espaco_eventos", "outro"],
            description: "Categoria principal sugerida",
          },
          suggested_type_label: { type: "string", description: "Rótulo amigável (ex: 'Bar', 'Casa de Shows')" },
          suggested_music_primary: { type: "string", description: "Estilo musical principal (ex: Sertanejo, Funk, Rock, Eletrônica)" },
          suggested_music_secondary: { type: "array", items: { type: "string" }, description: "Até 3 estilos secundários" },
          suggested_description: { type: "string", description: "Descrição curta (2-3 frases) em pt-BR" },
          problems: { type: "array", items: { type: "string" }, description: "Problemas detectados nos dados atuais" },
          improvements: { type: "array", items: { type: "string" }, description: "Melhorias recomendadas (ex: adicionar logo, validar IG)" },
          confidence: { type: "string", enum: ["baixa", "media", "alta"] },
        },
        required: [
          "suggested_type", "suggested_type_label", "suggested_music_primary",
          "suggested_music_secondary", "suggested_description", "problems", "improvements", "confidence",
        ],
        additionalProperties: false,
      };
    } else {
      const list = body.establishments || [];
      userPrompt = `Analise a base de ${list.length} estabelecimentos e retorne diagnóstico geral.\n` +
        `Amostra (até 80):\n${JSON.stringify(list.slice(0, 80), null, 2)}`;
      toolName = "diagnose_base";
      toolSchema = {
        type: "object",
        properties: {
          total: { type: "number" },
          with_errors: { type: "number" },
          top_problems: { type: "array", items: { type: "string" } },
          fix_priority: { type: "array", items: { type: "string" }, description: "Nomes/slugs em ordem de prioridade" },
          oficial_candidates: { type: "array", items: { type: "string" } },
          high_traffic_bad_data: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["total", "with_errors", "top_problems", "fix_priority", "oficial_candidates", "high_traffic_bad_data", "summary"],
        additionalProperties: false,
      };
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: userPrompt },
        ],
        tools: [{ type: "function", function: { name: toolName, description: "Diagnóstico", parameters: toolSchema } }],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Limite de requisições. Tente novamente em instantes." }, 429);
    if (aiResp.status === 402) return json({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "AI returned no result" }, 500);
    const parsed = JSON.parse(args);
    return json({ result: parsed });
  } catch (e: any) {
    console.error("ai-audit error", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
