// Partner Instagram + Aura sync via Meta Business Discovery
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCronOrAdmin, corsHeaders } from "../_shared/requireAdmin.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function normalizeHandle(raw?: string | null): string | null {
  if (!raw) return null;
  let v = String(raw).trim();
  if (!v) return null;
  // strip URL
  const m = v.match(/instagram\.com\/([^/?#]+)/i);
  if (m) v = m[1];
  v = v.replace(/^@+/, "").replace(/\/+$/, "").trim();
  if (!v || v.includes(" ")) return null;
  return v.toLowerCase();
}

async function getAccessToken(): Promise<{ token: string; igId: string } | null> {
  const { data } = await admin
    .from("instagram_accounts")
    .select("access_token, ig_account_id, status")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.access_token || !data?.ig_account_id) return null;
  return { token: data.access_token, igId: data.ig_account_id };
}

async function businessDiscovery(igId: string, token: string, handle: string) {
  const fields =
    `business_discovery.username(${handle}){username,name,biography,profile_picture_url,followers_count,media_count,website,media.limit(6){id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count}}`;
  const url = `https://graph.facebook.com/v21.0/${igId}?fields=${encodeURIComponent(fields)}&access_token=${token}`;
  const r = await fetch(url);
  const json = await r.json();
  return { ok: r.ok, status: r.status, json };
}

function classifyError(err: any): { status: string; message: string } {
  const msg = (err?.message || "").toLowerCase();
  const code = err?.code;
  const sub = err?.error_subcode;
  if (sub === 2207013 || msg.includes("does not exist") || msg.includes("não existe")) {
    return { status: "not_found", message: "Perfil não encontrado no Instagram." };
  }
  if (msg.includes("private") || msg.includes("privado")) {
    return { status: "private", message: "Perfil privado." };
  }
  if (msg.includes("not a business") || msg.includes("not business") || msg.includes("must be a business")) {
    return { status: "no_permission", message: "Perfil não é Business/Creator (sem Business Discovery)." };
  }
  if (code === 10 || code === 200 || code === 190) {
    return { status: "no_permission", message: err?.message || "Sem permissão da Meta API." };
  }
  return { status: "error", message: err?.message || "Erro desconhecido" };
}

async function runAura(partner: any, bd: any) {
  if (!LOVABLE_API_KEY) return null;
  const captions = (bd?.media?.data || []).map((m: any) => m.caption).filter(Boolean).slice(0, 6);
  const prompt = `Você é a Aura, IA da Roxou (guia de rolês). Analise este estabelecimento e responda APENAS JSON válido com este formato exato:
{
  "summary": "string curta 1-2 frases sobre o local",
  "audience": "string curta sobre público (ex: universitário, casais, premium)",
  "vibe": "string curta sobre clima do rolê",
  "tags": ["array","de","tags","minúsculas","máximo 8"],
  "category_guess": "bar|pub|balada|casa de shows|restaurante|lounge|cultural|universitario",
  "event_frequency": "alta|média|baixa",
  "activity_score": número 0-100,
  "best_day": "Sexta|Sábado|... ou null"
}

Dados do parceiro:
- Nome: ${partner.name}
- Tipo cadastrado: ${partner.type}
- Cidade: ${partner.city}
- Bio Instagram: ${bd?.biography || "(sem bio)"}
- Seguidores: ${bd?.followers_count ?? "?"}
- Mídias: ${bd?.media_count ?? "?"}
- Captions recentes: ${captions.join(" | ").slice(0, 1500)}

Responda SOMENTE o JSON, sem markdown.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const txt = data?.choices?.[0]?.message?.content || "";
    const cleaned = txt.replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function syncOne(partnerId: string, token: string, igId: string) {
  const { data: partner, error: pErr } = await admin
    .from("partners").select("*").eq("id", partnerId).maybeSingle();
  if (pErr || !partner) return { partnerId, ok: false, status: "error", error: "Parceiro não encontrado" };

  const handle = normalizeHandle(partner.instagram_username || partner.instagram);
  if (!handle) {
    await admin.from("partners").update({
      instagram_sync_status: "error",
      instagram_sync_error: "Sem @ cadastrado",
      instagram_last_sync_at: new Date().toISOString(),
    }).eq("id", partnerId);
    return { partnerId, ok: false, status: "error", error: "Sem @" };
  }

  const { ok, json } = await businessDiscovery(igId, token, handle);
  if (!ok || json?.error) {
    const cls = classifyError(json?.error || { message: "Falha desconhecida" });
    await admin.from("partners").update({
      instagram_username: handle,
      instagram_sync_status: cls.status,
      instagram_sync_error: cls.message,
      instagram_last_sync_at: new Date().toISOString(),
      instagram_raw_json: json,
    }).eq("id", partnerId);
    return { partnerId, ok: false, status: cls.status, error: cls.message };
  }

  const bd = json?.business_discovery;
  if (!bd) {
    await admin.from("partners").update({
      instagram_username: handle,
      instagram_sync_status: "no_permission",
      instagram_sync_error: "Business Discovery não retornou dados",
      instagram_last_sync_at: new Date().toISOString(),
      instagram_raw_json: json,
    }).eq("id", partnerId);
    return { partnerId, ok: false, status: "no_permission" };
  }

  const recentPosts = (bd.media?.data || []).map((m: any) => ({
    id: m.id,
    caption: m.caption,
    media_type: m.media_type,
    media_url: m.media_url,
    thumbnail_url: m.thumbnail_url,
    permalink: m.permalink,
    timestamp: m.timestamp,
    like_count: m.like_count,
    comments_count: m.comments_count,
  }));

  const aura = await runAura(partner, bd);
  const locked: string[] = partner.manual_locked_fields || [];

  const update: any = {
    instagram_username: handle,
    instagram_profile_url: `https://instagram.com/${handle}`,
    instagram_id: bd.id || null,
    instagram_name: bd.name || null,
    instagram_bio: bd.biography || null,
    instagram_profile_picture_url: bd.profile_picture_url || null,
    instagram_website: bd.website || null,
    instagram_followers_count: bd.followers_count ?? null,
    instagram_media_count: bd.media_count ?? null,
    instagram_last_sync_at: new Date().toISOString(),
    instagram_sync_status: "synced",
    instagram_sync_error: null,
    instagram_raw_json: bd,
    instagram_recent_posts: recentPosts,
  };

  if (aura) {
    update.aura_partner_summary = aura.summary || null;
    update.aura_partner_tags = Array.isArray(aura.tags) ? aura.tags.slice(0, 12) : [];
    update.aura_partner_score = typeof aura.activity_score === "number" ? Math.round(aura.activity_score) : null;
    update.aura_suggestions = aura;
    update.aura_last_run_at = new Date().toISOString();
  }

  // Respect manual locks for these soft fields
  if (locked.includes("logo_url")) delete update.instagram_profile_picture_url;
  if (locked.includes("aura_partner_summary")) delete update.aura_partner_summary;

  await admin.from("partners").update(update).eq("id", partnerId);
  return { partnerId, ok: true, status: "synced", followers: bd.followers_count };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireCronOrAdmin(req);
  if (!auth.ok) return auth.response;


  try {
    const body = await req.json().catch(() => ({}));
    const { partner_id, all, stale_hours = 24 } = body || {};

    const tok = await getAccessToken();
    if (!tok) {
      return new Response(JSON.stringify({ error: "Conta Meta não conectada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (partner_id) {
      const result = await syncOne(partner_id, tok.token, tok.igId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (all || body?.cron) {
      const cutoff = new Date(Date.now() - Number(stale_hours) * 3600 * 1000).toISOString();
      const { data: partners } = await admin
        .from("partners")
        .select("id, instagram, instagram_username, instagram_last_sync_at")
        .or(`instagram.not.is.null,instagram_username.not.is.null`)
        .limit(500);

      const candidates = (partners || []).filter((p) => {
        const handle = normalizeHandle(p.instagram_username || p.instagram);
        if (!handle) return false;
        if (!p.instagram_last_sync_at) return true;
        return p.instagram_last_sync_at < cutoff;
      });

      const results: any[] = [];
      // Sequential with small delay to avoid rate limits
      for (const p of candidates) {
        try {
          const r = await syncOne(p.id, tok.token, tok.igId);
          results.push(r);
        } catch (e: any) {
          results.push({ partnerId: p.id, ok: false, error: e?.message });
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      const summary = {
        total: candidates.length,
        synced: results.filter((r) => r.status === "synced").length,
        not_found: results.filter((r) => r.status === "not_found").length,
        private: results.filter((r) => r.status === "private").length,
        no_permission: results.filter((r) => r.status === "no_permission").length,
        error: results.filter((r) => r.status === "error").length,
      };

      await admin.from("automation_logs").insert({
        job_name: "partner-instagram-sync",
        status: "completed",
        details: summary as any,
      });

      return new Response(JSON.stringify({ ok: true, summary, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Forneça partner_id ou all=true" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
