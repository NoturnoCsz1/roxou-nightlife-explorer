import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^@/, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const slugify = (s: string) =>
  (s || "evento")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "evento";

interface IGMedia {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
}

async function callAI(imageUrl: string, caption: string, lovableKey: string) {
  const tool = {
    type: "function",
    function: {
      name: "classify_post",
      description: "Classifica um post de Instagram",
      parameters: {
        type: "object",
        properties: {
          is_event: { type: "boolean" },
          confidence: { type: "number" },
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD se identificado" },
          time: { type: "string", description: "HH:mm se identificado" },
          artists: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
        required: ["is_event", "confidence", "reason"],
        additionalProperties: false,
      },
    },
  };

  const messages = [
    {
      role: "system",
      content:
        "Você analisa posts de Instagram de bares/casas noturnas em Presidente Prudente para detectar EVENTOS futuros. Só marque is_event=true para flyers/anúncios de evento com data clara. Foto de comida/ambiente/bastidores = false.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: `Legenda do post: ${caption || "(sem legenda)"}` },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "classify_post" } },
    }),
  });

  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  return args ? JSON.parse(args) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

  const stats = {
    partners_scanned: 0,
    drafts_created: 0,
    validation_failures: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // 1. Credenciais OAuth de instagram_accounts (handle roxou.pp)
    const { data: acct } = await supabase
      .from("instagram_accounts")
      .select("access_token,ig_account_id,username,status")
      .eq("status", "active")
      .ilike("username", "roxou.pp")
      .order("updated_at", { ascending: false })
      .maybeSingle();

    if (!acct?.access_token || !acct?.ig_account_id) {
      await supabase.from("automation_logs").insert({
        job_name: "automatic-event-hunter",
        status: "Falha de Validação",
        details: { error: "Conta roxou.pp não conectada via OAuth em instagram_accounts" },
      });
      return json({ error: "Conta Instagram não conectada via OAuth. Acesse /admin/instagram." }, 400);
    }
    const token = acct.access_token;
    const igUserId = acct.ig_account_id;

    // 2. Lista de partners com instagram preenchido
    const { data: partners } = await supabase
      .from("partners")
      .select("id,name,instagram")
      .eq("active", true)
      .not("instagram", "is", null);

    for (const p of partners || []) {
      const handleRaw = (p.instagram || "").trim();
      if (!handleRaw) continue;
      const handle = handleRaw.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
      if (!handle) continue;

      stats.partners_scanned++;

      try {
        // business_discovery
        const fields = `business_discovery.username(${handle}){username,name,media.limit(3){id,media_type,media_url,thumbnail_url,caption,permalink,timestamp}}`;
        const url = `https://graph.facebook.com/v21.0/${igUserId}?fields=${encodeURIComponent(fields)}&access_token=${token}`;
        const r = await fetch(url);
        const d = await r.json();
        const bd = d?.business_discovery;
        if (!bd) {
          const metaErr = d?.error || {};
          const errInfo = {
            handle,
            partner_id: p.id,
            http_status: r.status,
            meta_code: metaErr.code ?? null,
            meta_subcode: metaErr.error_subcode ?? null,
            meta_type: metaErr.type ?? null,
            meta_message: metaErr.message ?? "sem business_discovery",
            fbtrace_id: metaErr.fbtrace_id ?? null,
          };
          stats.errors.push(`${handle}: [${errInfo.meta_code}] ${errInfo.meta_message}`);
          await supabase.from("automation_logs").insert({
            job_name: "automatic-event-hunter",
            status: "Falha de Validação",
            details: { stage: "business_discovery", ...errInfo },
          });
          continue;
        }

        // Validação tolerante de nome
        if (norm(bd.name || "") !== norm(p.name) && norm(bd.username || "") !== norm(p.name)) {
          stats.validation_failures++;
          await supabase.from("system_alerts").insert({
            level: "warning",
            source: "event_hunter",
            message: `⚠️ Erro de Validação: @${handle} não coincide com o parceiro ${p.name}.`,
            context: { partner_id: p.id, partner_name: p.name, ig_name: bd.name, ig_username: bd.username },
          });
          continue;
        }

        const media: IGMedia[] = (bd.media?.data || []).slice(0, 3);

        for (const m of media) {
          const imageUrl = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
          if (!imageUrl) continue;

          // Dedup por permalink no draft
          if (m.permalink) {
            const { data: dup } = await supabase
              .from("events")
              .select("id")
              .eq("instagram", m.permalink)
              .maybeSingle();
            if (dup) {
              stats.skipped++;
              continue;
            }
          }

          // IA classifica
          let cls: any = null;
          try {
            cls = await callAI(imageUrl, m.caption || "", lovableKey);
          } catch (e: any) {
            stats.errors.push(`AI ${handle}/${m.id}: ${e.message}`);
            continue;
          }
          if (!cls?.is_event || cls.confidence < 0.6) {
            stats.skipped++;
            continue;
          }

          // Download da mídia para Storage
          let storedUrl = imageUrl;
          try {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
              const blob = await imgRes.arrayBuffer();
              const ext = (imgRes.headers.get("content-type") || "image/jpeg").includes("png") ? "png" : "jpg";
              const path = `auto-discovery/${p.id}/${m.id}.${ext}`;
              const { error: upErr } = await supabase.storage
                .from("event-flyers")
                .upload(path, new Uint8Array(blob), { contentType: `image/${ext}`, upsert: true });
              if (!upErr) {
                const { data: pub } = supabase.storage.from("event-flyers").getPublicUrl(path);
                storedUrl = pub.publicUrl;
              }
            }
          } catch (_e) { /* mantém URL original */ }

          // Monta date_time
          let dt: string | null = null;
          if (cls.date) {
            const t = cls.time && /^\d{2}:\d{2}$/.test(cls.time) ? cls.time : "22:00";
            dt = `${cls.date}T${t}:00-03:00`;
          } else if (m.timestamp) {
            dt = m.timestamp;
          } else {
            dt = new Date(Date.now() + 86400000).toISOString();
          }

          const baseSlug = slugify(`${cls.title || p.name}-${m.id.slice(-6)}`);

          const { error: insErr } = await supabase.from("events").insert({
            title: (cls.title || `Evento em ${p.name}`).slice(0, 200),
            slug: baseSlug,
            date_time: dt,
            category: "festa",
            partner_id: p.id,
            venue_name: p.name,
            instagram: m.permalink || null,
            description: [cls.reason, m.caption].filter(Boolean).join("\n\n").slice(0, 4000),
            status: "draft",
            verification_source: "auto-discovery",
            image_url: storedUrl,
            sub_category: (cls.artists || []).join(", ") || null,
          });

          if (insErr) {
            stats.errors.push(`insert ${handle}: ${insErr.message}`);
          } else {
            stats.drafts_created++;
          }
        }
      } catch (e: any) {
        stats.errors.push(`${handle}: ${e.message}`);
      }
    }

    const finalStatus = stats.validation_failures > 0
      ? "Falha de Validação"
      : stats.drafts_created > 0
        ? "Sucesso"
        : "Nenhum evento novo encontrado";

    await supabase.from("automation_logs").insert({
      job_name: "automatic-event-hunter",
      status: finalStatus,
      partners_scanned: stats.partners_scanned,
      drafts_created: stats.drafts_created,
      validation_failures: stats.validation_failures,
      details: stats,
    });

    return json({ ok: true, status: finalStatus, ...stats });
  } catch (err: any) {
    console.error("hunter error", err);
    await supabase.from("automation_logs").insert({
      job_name: "automatic-event-hunter",
      status: "Falha de Validação",
      details: { error: err.message },
    });
    return json({ error: err.message }, 500);
  }
});
