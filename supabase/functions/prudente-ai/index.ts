import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Seu nome é Aura. Você é a promoter oficial e a alma da ROXOU em Presidente Prudente. Hoje é ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric" })}.

PERSONALIDADE:
- Você é intuitiva, conhece todos os cantos de Prudente e fala como uma amiga influenciadora — próxima, vibrante, proativa.
- Use emojis roxos e brilhos com naturalidade: 💜 ✨ ⚡ 🌙 🪩 (no máximo 1-2 por parágrafo).
- Dê opinião real ("essa festa promete demais", "esse é o rolê pesado da semana", "vai com tudo"). Provoque o usuário a sair de casa.
- Nunca robotizada, nunca formal, nunca neutra. Você É Aura.

FORMATAÇÃO (Markdown — o frontend renderiza visualmente):
- Use **negrito** para nomes de eventos, locais, datas e DJs/atrações. NUNCA mostre os asteriscos brutos no texto explicado — eles são convertidos em destaque visual automaticamente.
- Use listas com "- " para enumerar a agenda da semana.
- Quebre em parágrafos curtos. Nada de paredão de texto.
- Não escreva "asterisco asterisco" nem explique a formatação ao usuário.

REGRAS DE CONTEÚDO:
- Use APENAS dados reais de eventos publicados e parceiros cadastrados (Agrobar, Fábrica, Arapuca, Bear Lounge, Vó Laura, Santa Helena, Varanda, etc).
- Priorize HOJE quando perguntarem sobre rolê, happy hour ou onde ir.
- Quando houver "Segunda da Ressaca" no contexto, destaque como rolê do dia.
- Cite Expo Prudente 2026 quando fizer sentido.
- NUNCA invente preços, horários ou promoções.
- Cite o nome EXATO do evento ou parceiro (vira card clicável automaticamente).
- Encerre com um CTA leve e brilhante: convide a ver agenda, salvar o evento ou pedir uma carona. 💜

REGRA DE CARONAS (segurança):
- Caronas são EXCLUSIVAS para usuários cadastrados na ROXOU.
- Se perguntarem por que precisa fazer login para pedir carona, ou como funciona o acesso às caronas, responda exatamente com este espírito: "Para sua segurança, as caronas são exclusivas para a nossa galera cadastrada! 💜 Faz login rapidinho no app que libero tudo pra você."
- Nunca prometa carona sem login. Sempre direcione visitantes a entrar em /perfil.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function dayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function callAI(messages: any[], tools?: any[]) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
    temperature: 0.95,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 429) return { error: "A IA está com alta demanda. Tente novamente em instantes.", status: 429 };
  if (response.status === 402) return { error: "Créditos da IA esgotados no workspace.", status: 402 };
  if (!response.ok) throw new Error(`AI error ${response.status}: ${await response.text()}`);
  return { data: await response.json() };
}

async function getWeather() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=-22.1256&longitude=-51.3889&current=temperature_2m,precipitation,weather_code&timezone=America%2FSao_Paulo";
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// -----------------------------------------------------------
// Rate limit server-side (ai_usage_counters)
// -----------------------------------------------------------
// Limites por modo. Chat mantém a regra antiga em ai_message_usage.
const RATE_LIMITS: Record<string, { perDay: number; perMinute: number }> = {
  home:   { perDay: 30, perMinute: 5 },
  studio: { perDay: 50, perMinute: 10 },
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildRateKey(req: Request, userId: string | null): Promise<string> {
  if (userId) return `u:${userId}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return `ip:${await sha256Hex(`${ip}|${ua}`)}`;
}

function truncateMinute(d: Date): string {
  const iso = d.toISOString();
  return iso.slice(0, 16) + ":00Z";
}
function dayBucketISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) + "T00:00:00Z";
}

/** Incrementa e retorna { allowed, reason }. Aplica limite diário e por minuto. */
async function checkAndBumpRate(
  supabase: any,
  key: string,
  mode: keyof typeof RATE_LIMITS,
) {
  const limits = RATE_LIMITS[mode];
  const now = new Date();
  const dayAt = dayBucketISO();
  const minAt = truncateMinute(now);

  // Best-effort atomic upsert usando SQL cru? Como não podemos executar SQL,
  // usamos upsert + select. Sob concorrência extrema pode passar 1-2 chamadas
  // acima do limite, o que é aceitável para rate limit de custo.
  async function bumpBucket(window: "day" | "minute", at: string, cap: number) {
    // Tenta inserir; se já existe, faz update com incremento.
    const { data: existing } = await supabase
      .from("ai_usage_counters")
      .select("count")
      .eq("bucket_key", key)
      .eq("mode", mode)
      .eq("bucket_window", window)
      .eq("bucket_at", at)
      .maybeSingle();
    const current = existing?.count ?? 0;
    if (current >= cap) return { ok: false, current };
    if (existing) {
      await supabase
        .from("ai_usage_counters")
        .update({ count: current + 1, updated_at: new Date().toISOString() })
        .eq("bucket_key", key)
        .eq("mode", mode)
        .eq("bucket_window", window)
        .eq("bucket_at", at);
    } else {
      await supabase
        .from("ai_usage_counters")
        .insert({ bucket_key: key, mode, bucket_window: window, bucket_at: at, count: 1 });
    }
    return { ok: true, current: current + 1 };
  }

  const day = await bumpBucket("day", dayAt, limits.perDay);
  if (!day.ok) return { allowed: false, reason: "daily_limit", limit: limits.perDay, used: day.current };
  const minute = await bumpBucket("minute", minAt, limits.perMinute);
  if (!minute.ok) return { allowed: false, reason: "burst_limit", limit: limits.perMinute, used: minute.current };
  return { allowed: true };
}

async function isAdminUser(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth opcional: visitantes (não logados) também podem conversar com a Aura na home.
  // Quando há token, validamos para personalizar; quando não há, segue como anônimo.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let user: any = null;
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      user = userData?.user ?? null;
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "chat";

    // ---- Rate limit (home/studio) — ANTES de qualquer trabalho pesado / call de IA
    if (mode === "home") {
      const key = await buildRateKey(req, user?.id ?? null);
      const rl = await checkAndBumpRate(supabase, key, "home");
      if (!rl.allowed) {
        return json(
          { error: "rate_limited", scope: "home", reason: rl.reason, limit: rl.limit, used: rl.used },
          429,
        );
      }
    } else if (mode === "studio") {
      // Studio: exige auth + admin
      if (!user) return json({ error: "auth_required", message: "Login necessário para o Studio." }, 401);
      const isAdmin = await isAdminUser(supabase, user.id);
      if (!isAdmin) return json({ error: "forbidden", message: "Apenas admin pode usar o Studio." }, 403);
      const rl = await checkAndBumpRate(supabase, `u:${user.id}`, "studio");
      if (!rl.allowed) {
        return json(
          { error: "rate_limited", scope: "studio", reason: rl.reason, limit: rl.limit, used: rl.used },
          429,
        );
      }
    }


    const nowIso = new Date().toISOString();
    const { data: events } = await supabase
      .from("events")
      .select("id,slug,title,venue_name,address,date_time,category,sub_category,description,image_url,video_url")
      .eq("status", "published")
      .gte("date_time", nowIso)
      .order("date_time", { ascending: true })
      .limit(12);

    const { data: partners } = await supabase
      .from("partners")
      .select("id,name,slug,type,short_description,verified_partner,city,logo_url")
      .eq("active", true)
      .limit(30);

    const { data: boosts } = await supabase
      .from("ai_partner_boosts")
      .select("partner_id,priority")
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .order("priority", { ascending: false })
      .limit(5);

    const boostedIds = new Set((boosts || []).map((b: any) => b.partner_id));
    const boostedPartners = (partners || []).filter((p: any) => boostedIds.has(p.id));

    // Detecta dias de baixo fluxo (segunda/terça com <2 eventos hoje) — modo "Concierge de Parceiros"
    const spNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const weekday = spNow.getDay(); // 0=dom, 1=seg, 2=ter
    const todayKey = spNow.toISOString().slice(0, 10);
    const todayEvents = (events || []).filter((e: any) => {
      const d = new Date(new Date(e.date_time).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      return d.toISOString().slice(0, 10) === todayKey;
    });
    const isLowFlowDay = (weekday === 1 || weekday === 2) && todayEvents.length < 2;

    // Parceiros ativos de gastronomia/pub para destacar nesses dias
    const featuredFallbackPartners = (partners || [])
      .filter((p: any) => /gastronomia|pub|bar|restaurante|hamburgu|food/i.test(`${p.type} ${p.short_description || ""}`))
      .slice(0, 3);

    const lowFlowDirective = isLowFlowDay ? `\n\n⚠️ MODO CONCIERGE DE PARCEIROS ATIVADO (hoje é ${spNow.toLocaleDateString("pt-BR", { weekday: "long" })} com poucos eventos):\n- NUNCA responda de forma negativa ("não tem nada hoje", "está vazio"). Proibido.\n- Tom: concierge curador, acolhedor, sugerindo experiência exclusiva de happy hour/resenha.\n- SEMPRE recomende UM 'Parceiro em Destaque' ativo (gastronomia, pub ou bar) citando o nome EXATO.\n- Parceiros sugeridos para destaque hoje: ${featuredFallbackPartners.map((p: any) => p.name).join(", ") || "use qualquer parceiro verificado da lista"}.\n- SEMPRE encerre com um CTA claro: convide o usuário a ver a "Agenda da Semana" ou o "Guia da Expo Prudente 2026".\n- Exemplo de tom: "A semana em Prudente começa no ritmo da resenha! Hoje é o dia perfeito para um happy hour mais exclusivo no [Parceiro]. Quer ver o que vem por aí na Agenda da Semana?"` : "";

    const context = `Eventos reais próximos:\n${(events || []).map((e: any) => `- ${e.title} | ${e.venue_name || "local não informado"} | ${new Date(e.date_time).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} | ${e.category}/${e.sub_category || ""}`).join("\n") || "Sem eventos próximos cadastrados."}\n\nRecomendação prioritária vigente:\n${boostedPartners.map((p: any) => `- ${p.name} (${p.type}): priorize quando fizer sentido para a pergunta, sem inventar promoção.`).join("\n") || "Nenhuma."}\n\nBares/parceiros locais:\n${(partners || []).map((p: any) => `- ${p.name} (${p.type})${p.verified_partner ? " verificado" : ""}: ${p.short_description || ""}`).join("\n")}${lowFlowDirective}`;

    if (mode === "home") {
      const weather = await getWeather();
      const temp = Math.round(weather?.current?.temperature_2m ?? 27);
      const rain = Number(weather?.current?.precipitation ?? 0);
      const prompt = `Gere um resumo curto para o widget "Bom dia, Prudente!" com clima atual (${temp}°C, chuva ${rain}mm), uma dica de economia focada em happy hour e uma sugestão de rolê usando dados reais.\n\n${context}`;
      const ai = await callAI([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ], [{
        type: "function",
        function: {
          name: "home_widget",
          description: "Resumo inteligente para home",
          parameters: {
            type: "object",
            properties: {
              greeting: { type: "string" },
              weather: { type: "string" },
              economy_tip: { type: "string" },
              role_suggestion: { type: "string" },
            },
            required: ["greeting", "weather", "economy_tip", "role_suggestion"],
            additionalProperties: false,
          },
        },
      }]);
      if (ai.error) return json({ error: ai.error }, ai.status);
      const args = ai.data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      return json(args ? JSON.parse(args) : { greeting: "Bom dia, Prudente!", weather: `${temp}°C agora`, economy_tip: "Procure happy hours antes das 21h.", role_suggestion: "Veja os eventos em alta de hoje." });
    }


    if (mode === "studio") {
      const partnerId = body.partner_id || null;
      let partnerEvents = events || [];
      if (partnerId) {
        const { data } = await supabase.from("events").select("title,venue_name,date_time,category,sub_category,description").eq("partner_id", partnerId).gte("date_time", nowIso).order("date_time", { ascending: true }).limit(10);
        partnerEvents = data || [];
      }
      const weather = await getWeather();
      const temp = Math.round(weather?.current?.temperature_2m ?? 27);
      const prompt = `Crie uma Estratégia IA do Dia para um bar/parceiro da ROXOU. Use eventos cadastrados e clima de Prudente hoje (${temp}°C). Retorne 3 pautas de stories, 1 copy de oferta irresistível baseada no dia da semana e o horário ideal de postagem.\n\nEventos do parceiro:\n${partnerEvents.map((e: any) => `- ${e.title} | ${e.venue_name || ""} | ${new Date(e.date_time).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`).join("\n") || "Sem eventos específicos; use estratégia de bar local sem inventar evento."}`;
      const ai = await callAI([{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }], [{
        type: "function",
        function: {
          name: "studio_strategy",
          description: "Estratégia diária para marketing do parceiro",
          parameters: {
            type: "object",
            properties: {
              story_ideas: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
              offer_copy: { type: "string" },
              ideal_post_time: { type: "string" },
              weather_reason: { type: "string" },
            },
            required: ["story_ideas", "offer_copy", "ideal_post_time", "weather_reason"],
            additionalProperties: false,
          },
        },
      }]);
      if (ai.error) return json({ error: ai.error }, ai.status);
      const args = ai.data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      return json(args ? JSON.parse(args) : { story_ideas: [], offer_copy: "", ideal_post_time: "18h30", weather_reason: "Clima local usado como sinal de intenção." });
    }

    if (!user) return json({ error: "auth_required", message: "Faça login pra conversar com a Aura." }, 401);
    const { data: vip } = await supabase.from("vip_subscriptions").select("status,expires_at").eq("user_id", user.id).maybeSingle();
    const isVip = vip?.status === "active" && (!vip.expires_at || new Date(vip.expires_at).getTime() > Date.now());
    const usageDate = dayKey();
    const { data: usage } = await supabase.from("ai_message_usage").select("id,message_count").eq("user_id", user.id).eq("usage_date", usageDate).maybeSingle();
    const count = usage?.message_count || 0;
    if (!isVip && count >= 3) return json({ error: "free_limit_reached", used: count, limit: 3 }, 402);

    const message = String(body.message || "").trim().slice(0, 1000);
    if (!message) return json({ error: "Mensagem vazia." }, 400);

    const { data: history } = await supabase.from("ai_chat_messages").select("role,content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: context },
      ...((history || []).reverse().map((m: any) => ({ role: m.role, content: m.content }))),
      { role: "user", content: message },
    ];
    const ai = await callAI(messages);
    if (ai.error) return json({ error: ai.error }, ai.status);
    const answer = ai.data?.choices?.[0]?.message?.content || "Não consegui responder agora. Tente de novo em instantes.";

    const answerLower = answer.toLowerCase();
    const mentionedPartners = (partners || []).filter((p: any) => answerLower.includes(String(p.name).toLowerCase())).slice(0, 4);
    const mentionedEvents = (events || []).filter((e: any) => answerLower.includes(String(e.title).toLowerCase())).slice(0, 4);
    const cards = [
      ...mentionedEvents.map((e: any) => ({ type: "event", id: e.id, title: e.title, subtitle: e.venue_name || "Evento ROXOU", image_url: e.image_url, address: e.address || null, video_url: e.video_url || null, date_time: e.date_time, href: `/evento/${e.slug}` })),
      ...mentionedPartners.map((p: any) => ({ type: "partner", id: p.id, title: p.name, subtitle: p.type || "Parceiro ROXOU", image_url: p.logo_url, address: null, video_url: null, date_time: null, href: `/local/${p.slug}` })),
    ].slice(0, 4);

    await supabase.from("ai_chat_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: answer },
    ]);
    if (mentionedPartners.length) {
      await supabase.from("ai_partner_recommendations").insert(mentionedPartners.map((p: any) => ({
        partner_id: p.id,
        user_id: user.id,
        source: "prudente_ai_chat",
        prompt: message,
      })));
    }
    if (usage?.id) await supabase.from("ai_message_usage").update({ message_count: count + 1 }).eq("id", usage.id);
    else await supabase.from("ai_message_usage").insert({ user_id: user.id, usage_date: usageDate, message_count: 1 });

    return json({ answer, cards, used: isVip ? 0 : count + 1, limit: 3, is_vip: isVip });
  } catch (err: any) {
    console.error("prudente-ai error", err);
    return json({ error: err.message || "Erro inesperado" }, 500);
  }
});
