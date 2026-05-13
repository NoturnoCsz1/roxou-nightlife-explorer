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

// === Normalize Instagram handle (mirrors src/lib/instagramHandle.ts) ===
const INSTAGRAM_HOST_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\//i;
function normalizeInstagramHandle(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input).trim();
  if (!s) return "";
  s = s.replace(INSTAGRAM_HOST_REGEX, "");
  s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^@+/, "");
  s = s.split("/")[0].split("?")[0].split("#")[0].trim().toLowerCase();
  return s;
}

// === Janela de 5 dias (SP timezone-aware) ===
const POST_WINDOW_DAYS = 5;
function isPostWithinWindow(timestamp?: string | null): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (isNaN(t)) return false;
  const cutoff = Date.now() - POST_WINDOW_DAYS * 86400_000;
  return t >= cutoff && t <= Date.now() + 60_000;
}

// === Classificador heurístico (sem IA) ===
const EVENT_KW = ["hoje","amanha","sábado","sabado","sexta","quinta","domingo","lineup","atração","atracao","show","ao vivo","open bar","openbar","festa","baile","edição","edicao","entrada","ingresso","reservas","começa às","comeca as","a partir das"," 20h"," 21h"," 22h"," 23h","música ao vivo","musica ao vivo"];
const PROMO_KW = ["promoção","promocao","combo","desconto","compre","leve","delivery","peça agora","peca agora","oferta","imperdível","imperdivel","preço especial","preco especial","dose dupla","happy hour","cardápio","cardapio","frete grátis","frete gratis"];
const ANNOUNCE_KW = ["comunicado","funcionamento","horário especial","horario especial","fechado","abriremos","não abriremos","nao abriremos","manutenção","manutencao","aviso","informamos"];

function lowerNoAccent(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function classifyPostText(text: string): "event" | "promotion" | "announcement" | "generic" | "unknown" {
  const t = lowerNoAccent(text);
  if (!t.trim()) return "unknown";
  const ev = EVENT_KW.some((k) => t.includes(k));
  const pr = PROMO_KW.some((k) => t.includes(k));
  const an = ANNOUNCE_KW.some((k) => t.includes(k));
  const hasTime = /\b\d{1,2}h(?:\d{2})?\b/.test(t);
  if (an && !ev) return "announcement";
  if (ev || hasTime) return "event";
  if (pr) return "promotion";
  return "generic";
}

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

// === Keyword detection ===
const GENRE_KEYWORDS: Record<string, string[]> = {
  funk: ["funk", "baile", "fluxo", "mc ", "150bpm", "automotivo", "tropa"],
  pagode_samba: ["pagode", "samba", "roda de samba", "pagodão", "pagodao"],
  sertanejo: ["sertanejo", "modão", "modao", "boteco", "agro", "viola"],
  eletronica: ["eletrônica", "eletronica", "techno", "house", "rave", "open air", "set "],
  rock: ["rock", "metal", "punk"],
  pop_rock: ["pop rock", "indie", "alternativo", "cover"],
};

const TAG_KEYWORDS: Record<string, string[]> = {
  open_bar: ["open bar", "open beer", "open vodka", "openbar"],
  free: ["entrada free", "entrada gratuita", "free entry", "grátis", "gratis"],
  lista: ["lista vip", "na lista", "lista de presença", "lista amiga"],
  universitaria: ["universitária", "universitaria", "universitário", "universitario", "calourada", "atlética", "atletica"],
};

function detectKeywords(text: string): { genres: string[]; tags: string[]; sub_category: string | null } {
  const t = (text || "").toLowerCase();
  const genres: string[] = [];
  for (const [g, kws] of Object.entries(GENRE_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) genres.push(g);
  }
  const tags: string[] = [];
  for (const [tag, kws] of Object.entries(TAG_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) tags.push(tag);
  }
  return { genres, tags, sub_category: genres[0] || null };
}

// === Dedupe key ===
function buildDedupeKey(title: string, dateIso: string | null, venue: string | null, sourceHandle: string | null): string {
  const t = norm(title || "");
  const d = (dateIso || "").slice(0, 10).replace(/-/g, "");
  const v = norm(venue || "");
  const s = norm(sourceHandle || "");
  return [t, d, v, s].filter(Boolean).join("|") || `unknown-${Date.now()}`;
}

// === AI Vision ===
async function callVision(imageUrl: string, caption: string, lovableKey: string) {
  const tool = {
    type: "function",
    function: {
      name: "extract_flyer",
      description: "Extrai informações estruturadas de um flyer de evento a partir da imagem e legenda.",
      parameters: {
        type: "object",
        properties: {
          is_event: { type: "boolean", description: "É flyer/anúncio de evento futuro?" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          confidence_score: { type: "number", description: "0-1" },
          ocr_text: { type: "string", description: "Texto bruto extraído da imagem (OCR)" },
          title: { type: "string", description: "Nome principal do evento" },
          artists: { type: "array", items: { type: "string" } },
          date: { type: "string", description: "YYYY-MM-DD se identificado" },
          time: { type: "string", description: "HH:mm" },
          venue_name: { type: "string", description: "Nome do local" },
          address: { type: "string", description: "Endereço, se aparecer" },
          price: { type: "string", description: "Ex: 'R$ 30', 'Free', 'Open bar R$ 80'" },
          observations: { type: "string", description: "Observações relevantes (lista, idade mínima, etc)" },
          venue_instagram: { type: "string", description: "@ do Instagram do local, se aparecer" },
          category: { type: "string", description: "festa, show, balada, bar, universitario, etc" },
          reason: { type: "string", description: "Justificativa curta da decisão" },
        },
        required: ["is_event", "confidence", "confidence_score", "ocr_text", "reason"],
        additionalProperties: false,
      },
    },
  };

  const messages = [
    {
      role: "system",
      content:
        "Você é um analista de flyers de eventos noturnos do interior de SP. " +
        "Olhe a IMAGEM com atenção (faça OCR mental do texto do flyer) e combine com a legenda. " +
        "Extraia TUDO que estiver visível: título, artistas, data, hora, local, endereço, preço/open bar/free/lista. " +
        "REGRAS CRÍTICAS: Não invente dados. Se algo não aparece, deixe vazio. " +
        "Foto de comida/ambiente/bastidores sem flyer = is_event=false. " +
        "Confiança 'high' só quando título + data + local estão claros no flyer.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: `Legenda do post:\n${caption || "(sem legenda)"}` },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "extract_flyer" } },
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
    media_seen: 0,
    drafts_created: 0,
    skipped_duplicate: 0,
    possible_duplicate: 0,
    updated_existing: 0,
    not_event: 0,
    ignored_old_post: 0,
    ignored_promotion: 0,
    ignored_announcement: 0,
    sent_for_review: 0,
    accepted_window: 0,
    validation_failures: 0,
    errors: [] as string[],
  };

  try {
    // 1. Conta OAuth conectada
    const { data: acct } = await supabase
      .from("instagram_accounts")
      .select("access_token,ig_account_id,username,status")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!acct?.access_token || !acct?.ig_account_id) {
      return json({ error: "Conta Instagram não conectada via OAuth." }, 400);
    }
    const token = acct.access_token;
    const igUserId = acct.ig_account_id;

    // 2. Parceiros com instagram
    const { data: partners } = await supabase
      .from("partners")
      .select("id,name,instagram")
      .eq("active", true)
      .not("instagram", "is", null);

    for (const p of partners || []) {
      const handle = normalizeInstagramHandle(p.instagram);
      if (!handle) continue;
      stats.partners_scanned++;

      try {
        const fields = `business_discovery.username(${handle}){username,name,media.limit(5){id,media_type,media_url,thumbnail_url,caption,permalink,timestamp}}`;
        const url = `https://graph.facebook.com/v21.0/${igUserId}?fields=${encodeURIComponent(fields)}&access_token=${token}`;
        const r = await fetch(url);
        const d = await r.json();
        const bd = d?.business_discovery;
        if (!bd) {
          stats.errors.push(`${handle}: ${d?.error?.message || "sem business_discovery"}`);
          continue;
        }

        if (norm(bd.name || "") !== norm(p.name) && norm(bd.username || "") !== norm(p.name)) {
          stats.validation_failures++;
          continue;
        }

        const media: IGMedia[] = (bd.media?.data || []).slice(0, 5);

        for (const m of media) {
          stats.media_seen++;
          const imageUrl = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
          if (!imageUrl) continue;

          // === FILTRO BARATO 1: janela de 5 dias (ignora posts antigos) ===
          if (!isPostWithinWindow(m.timestamp)) {
            stats.ignored_old_post++;
            await supabase.from("instagram_scans").insert({
              media_id: m.id,
              permalink: m.permalink || null,
              source_handle: handle,
              partner_id: p.id,
              status: "ignored",
              reason: m.timestamp
                ? `Post fora da janela de ${POST_WINDOW_DAYS} dias (${m.timestamp})`
                : "Post sem timestamp confiável",
              raw_caption: (m.caption || "").slice(0, 2000),
              hidden_from_radar: true,
              archive_reason: "auto: fora da janela de 5 dias",
              archived_at: new Date().toISOString(),
            });
            continue;
          }

          // === FILTRO BARATO 2: classificador heurístico (sem IA) ===
          const cheapKind = classifyPostText(m.caption || "");
          if (cheapKind === "promotion" || cheapKind === "announcement") {
            await supabase.from("instagram_scans").insert({
              media_id: m.id,
              permalink: m.permalink || null,
              source_handle: handle,
              partner_id: p.id,
              status: "ignored",
              reason: cheapKind === "promotion"
                ? "Promoção detectada (sem evento)"
                : "Aviso/comunicado detectado",
              raw_caption: (m.caption || "").slice(0, 2000),
            });
            if (cheapKind === "promotion") stats.ignored_promotion++;
            else stats.ignored_announcement++;
            continue;
          }

          stats.accepted_window++;
          const { data: existingScan } = await supabase
            .from("instagram_scans")
            .select("id,event_id,status,scan_count")
            .eq("media_id", m.id)
            .maybeSingle();

          if (existingScan) {
            await supabase
              .from("instagram_scans")
              .update({
                last_seen_at: new Date().toISOString(),
                scan_count: (existingScan.scan_count || 1) + 1,
              })
              .eq("id", existingScan.id);
            // Reencontro: se já está publicado, contabiliza repost
            try { await supabase.rpc("record_radar_repost", { _scan_id: existingScan.id }); } catch {}
            stats.skipped_duplicate++;
            stats.updated_existing++;
            continue;
          }

          // === DEDUP STAGE 2: permalink já em events ===
          if (m.permalink) {
            const { data: dupEvent } = await supabase
              .from("events")
              .select("id,status")
              .eq("instagram", m.permalink)
              .maybeSingle();
            if (dupEvent) {
              await supabase.from("instagram_scans").insert({
                media_id: m.id,
                permalink: m.permalink,
                source_handle: handle,
                partner_id: p.id,
                status: "skipped_duplicate",
                reason: `Já existe evento ${dupEvent.id} (status=${dupEvent.status})`,
                event_id: dupEvent.id,
                duplicate_of_event_id: dupEvent.id,
              });
              stats.skipped_duplicate++;
              continue;
            }
          }

          // === Vision OCR + extração ===
          let cls: any = null;
          try {
            cls = await callVision(imageUrl, m.caption || "", lovableKey);
          } catch (e: any) {
            stats.errors.push(`AI ${handle}/${m.id}: ${e.message}`);
            await supabase.from("instagram_scans").insert({
              media_id: m.id,
              permalink: m.permalink || null,
              source_handle: handle,
              partner_id: p.id,
              status: "error",
              reason: e.message,
              raw_caption: m.caption || null,
            });
            continue;
          }

          const ocrText = cls?.ocr_text || "";
          const fullText = `${ocrText}\n${m.caption || ""}`;
          const detected = detectKeywords(fullText);
          const allKeywords = [...detected.genres, ...detected.tags];

          if (!cls?.is_event) {
            await supabase.from("instagram_scans").insert({
              media_id: m.id,
              permalink: m.permalink || null,
              source_handle: handle,
              partner_id: p.id,
              status: "not_event",
              reason: cls?.reason || "Não é flyer",
              raw_ocr: ocrText,
              raw_caption: m.caption || null,
              extracted_json: cls,
              keywords: allKeywords,
              ai_confidence: cls?.confidence || "low",
            });
            stats.not_event++;
            continue;
          }

          // === Monta date_time ===
          let dt: string | null = null;
          if (cls.date) {
            const t = cls.time && /^\d{1,2}:\d{2}$/.test(cls.time) ? cls.time.padStart(5, "0") : "22:00";
            dt = `${cls.date}T${t}:00-03:00`;
          } else if (m.timestamp) {
            dt = m.timestamp;
          }

          const eventTitle = (cls.title || `Evento em ${p.name}`).slice(0, 200);
          const venueName = cls.venue_name || p.name;
          const dedupeKey = buildDedupeKey(eventTitle, dt, venueName, handle);

          // === DEDUP STAGE 3: dedupe_key em events ===
          const { data: dupByKey } = await supabase
            .from("events")
            .select("id,title,status,slug")
            .eq("dedupe_key", dedupeKey)
            .maybeSingle();

          if (dupByKey) {
            await supabase.from("instagram_scans").insert({
              media_id: m.id,
              permalink: m.permalink || null,
              source_handle: handle,
              partner_id: p.id,
              status: dupByKey.status === "published" ? "skipped_duplicate" : "possible_duplicate",
              reason: `Mesmo dedupe_key: ${dupByKey.title} (${dupByKey.status})`,
              dedupe_key: dedupeKey,
              event_id: dupByKey.id,
              duplicate_of_event_id: dupByKey.id,
              raw_ocr: ocrText,
              raw_caption: m.caption || null,
              extracted_json: cls,
              keywords: allKeywords,
              ai_confidence: cls.confidence,
            });
            if (dupByKey.status === "published") stats.skipped_duplicate++;
            else stats.possible_duplicate++;
            continue;
          }

          // === DEDUP STAGE 4: similar (mesmo dia, título normalizado parecido) ===
          if (dt) {
            const day = dt.slice(0, 10);
            const { data: similar } = await supabase
              .from("events")
              .select("id,title,status,date_time,venue_name")
              .gte("date_time", `${day}T00:00:00-03:00`)
              .lte("date_time", `${day}T23:59:59-03:00`)
              .limit(20);

            const tNorm = norm(eventTitle);
            const vNorm = norm(venueName);
            const match = (similar || []).find(
              (e) => norm(e.title || "") === tNorm || (vNorm && norm(e.venue_name || "") === vNorm && tNorm.length > 4 && norm(e.title || "").includes(tNorm.slice(0, 8))),
            );
            if (match) {
              await supabase.from("instagram_scans").insert({
                media_id: m.id,
                permalink: m.permalink || null,
                source_handle: handle,
                partner_id: p.id,
                status: "possible_duplicate",
                reason: `Similar a "${match.title}" no mesmo dia`,
                dedupe_key: dedupeKey,
                duplicate_of_event_id: match.id,
                raw_ocr: ocrText,
                raw_caption: m.caption || null,
                extracted_json: cls,
                keywords: allKeywords,
                ai_confidence: cls.confidence,
              });
              stats.possible_duplicate++;
              continue;
            }
          }

          // === Confiança baixa = needs_review ===
          const needsReview = cls.confidence === "low" || (cls.confidence_score ?? 0) < 0.5;

          // === Download para storage ===
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

          const fallbackDt = dt || new Date(Date.now() + 86400000).toISOString();
          const baseSlug = slugify(`${eventTitle}-${m.id.slice(-6)}`);

          const description = [
            cls.reason,
            cls.artists?.length ? `Atrações: ${cls.artists.join(", ")}` : null,
            cls.price ? `Entrada: ${cls.price}` : null,
            cls.observations,
            m.caption,
          ].filter(Boolean).join("\n\n").slice(0, 4000);

          const { data: inserted, error: insErr } = await supabase
            .from("events")
            .insert({
              title: eventTitle,
              slug: baseSlug,
              date_time: fallbackDt,
              category: cls.category || "festa",
              sub_category: detected.sub_category,
              partner_id: p.id,
              venue_name: venueName,
              address: cls.address || null,
              instagram: m.permalink || null,
              description,
              status: "draft",
              verification_source: "auto-discovery",
              image_url: storedUrl,
              ai_confidence: cls.confidence || "medium",
              needs_review: needsReview,
              dedupe_key: dedupeKey,
            })
            .select("id")
            .single();

          if (insErr) {
            stats.errors.push(`insert ${handle}: ${insErr.message}`);
            await supabase.from("instagram_scans").insert({
              media_id: m.id,
              permalink: m.permalink || null,
              source_handle: handle,
              partner_id: p.id,
              status: "error",
              reason: insErr.message,
              dedupe_key: dedupeKey,
              raw_ocr: ocrText,
              raw_caption: m.caption || null,
              extracted_json: cls,
              keywords: allKeywords,
              ai_confidence: cls.confidence,
            });
            continue;
          }

          await supabase.from("instagram_scans").insert({
            media_id: m.id,
            permalink: m.permalink || null,
            source_handle: handle,
            partner_id: p.id,
            status: "created_draft",
            dedupe_key: dedupeKey,
            event_id: inserted!.id,
            raw_ocr: ocrText,
            raw_caption: m.caption || null,
            extracted_json: cls,
            keywords: allKeywords,
            ai_confidence: cls.confidence,
          });

          stats.drafts_created++;
        }
      } catch (e: any) {
        stats.errors.push(`${handle}: ${e.message}`);
      }
    }

    const finalStatus =
      stats.drafts_created > 0
        ? "Sucesso"
        : stats.possible_duplicate > 0
          ? "Possíveis duplicados"
          : "Nenhum evento novo";

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
    return json({ error: err.message }, 500);
  }
});
