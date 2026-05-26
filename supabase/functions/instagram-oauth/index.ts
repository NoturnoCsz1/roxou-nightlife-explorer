import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, requireAdmin } from "../_shared/requireAdmin.ts";

// Sanitiza um registro de instagram_accounts: nunca retornar access_token bruto ao frontend
function safeAccount(acc: any) {
  if (!acc) return null;
  return {
    id: acc.id,
    username: acc.username,
    ig_account_id: acc.ig_account_id,
    page_id: acc.page_id,
    status: acc.status,
    token_expires_at: acc.token_expires_at,
    connected_by: acc.connected_by,
    created_at: acc.created_at,
    updated_at: acc.updated_at,
    has_token: !!acc.access_token,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const META_APP_ID = Deno.env.get("META_APP_ID");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!META_APP_ID || !META_APP_SECRET) {
    return new Response(
      JSON.stringify({ error: "META_APP_ID e META_APP_SECRET não configurados" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 🔒 Todas as ações exceto o callback OAuth exigem admin.
  // O callback é público porque é o redirect_uri que a Meta chama via GET.
  if (action !== "callback") {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Action: get auth URL
  if (action === "auth_url") {
    const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth?action=callback`;
    const scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management";
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Action: OAuth callback
  if (action === "callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response("<h2>Erro: código não recebido</h2>", {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    try {
      const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth?action=callback`;

      // 1. Exchange code for short-lived token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`
      );
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error.message);

      const shortToken = tokenData.access_token;

      // 2. Exchange for long-lived token (60 days)
      const longRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortToken}`
      );
      const longData = await longRes.json();
      if (longData.error) throw new Error(longData.error.message);

      const longToken = longData.access_token;
      const expiresIn = longData.expires_in || 5184000; // ~60 days

      // 3. Get Facebook Pages
      const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${longToken}`);
      const pagesData = await pagesRes.json();
      if (!pagesData.data?.length) throw new Error("Nenhuma página encontrada. Vincule o Instagram a uma Facebook Page.");

      const page = pagesData.data[0];
      const pageAccessToken = page.access_token;

      // 4. Get Instagram Business Account
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageAccessToken}`
      );
      const igData = await igRes.json();
      if (!igData.instagram_business_account?.id) {
        throw new Error("Conta Instagram Business não encontrada na página.");
      }

      const igAccountId = igData.instagram_business_account.id;

      // 5. Get Instagram username
      const igInfoRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=username&access_token=${pageAccessToken}`
      );
      const igInfo = await igInfoRes.json();

      // 6. Get long-lived page token (doesn't expire)
      const pageLongRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=access_token&access_token=${longToken}`
      );
      const pageLongData = await pageLongRes.json();
      const finalToken = pageLongData.access_token || pageAccessToken;

      // 7. Store in database (upsert)
      const { error: dbError } = await supabase.from("instagram_accounts").upsert(
        {
          ig_account_id: igAccountId,
          page_id: page.id,
          username: igInfo.username || "unknown",
          access_token: finalToken,
          token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          status: "active",
          connected_by: "00000000-0000-0000-0000-000000000000",
        },
        { onConflict: "ig_account_id" }
      );

      if (dbError) throw new Error(`DB error: ${dbError.message}`);

      // Redirect back to admin
      const appUrl = Deno.env.get("APP_URL") || "https://roxou.lovable.app";
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/admin/instagram?connected=true` },
      });
    } catch (err: any) {
      console.error("OAuth error:", err);
      return new Response(
        `<html><body style="font-family:sans-serif;padding:40px;background:#1a1a2e;color:#fff"><h2>❌ Erro na conexão</h2><p>${err.message}</p><a href="javascript:window.close()" style="color:#e91e8c">Fechar</a></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }
  }

  // Action: check connection status (admin-only, sem retornar token)
  if (action === "status") {
    const { data } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ account: safeAccount(data?.[0] || null) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Action: test connection (validates token + permissions + IG business discovery)
  if (action === "test") {
    const { data: acc } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!acc) {
      return new Response(
        JSON.stringify({ ok: false, stage: "no_account", message: "Nenhuma conta conectada." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = acc.access_token;
    const pageId = acc.page_id;
    const checks: Array<{ name: string; ok: boolean; detail?: string; data?: any }> = [];

    // 1. Token validity via debug_token (works for page tokens too)
    let tokenScopes: string[] = [];
    let tokenValid = false;
    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${META_APP_ID}|${META_APP_SECRET}`
      );
      const j = await r.json();
      const d = j.data || {};
      tokenValid = !!d.is_valid;
      tokenScopes = d.scopes || [];
      checks.push({
        name: "Token válido",
        ok: tokenValid,
        detail: tokenValid
          ? `Tipo: ${d.type || "?"} • App ID: ${d.app_id || "?"}`
          : (d.error?.message || j.error?.message || "Token inválido"),
        data: { type: d.type, app_id: d.app_id, expires_at: d.expires_at, scopes: tokenScopes },
      });
    } catch (e) {
      checks.push({ name: "Token válido", ok: false, detail: String(e) });
    }

    // 2. Permissions (from debug_token scopes)
    const requiredScopes = ["instagram_basic", "pages_show_list"];
    const hasRequired = requiredScopes.every((s) => tokenScopes.includes(s));
    checks.push({
      name: "Permissões concedidas",
      ok: hasRequired || tokenScopes.length > 0,
      detail: tokenScopes.length ? tokenScopes.join(", ") : "Não foi possível ler scopes via debug_token",
      data: tokenScopes,
    });

    // 3. Facebook Page linked — verifica direto pela page_id armazenada
    let pageOk = false;
    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=id,name,instagram_business_account&access_token=${token}`
      );
      const j = await r.json();
      pageOk = !j.error && !!j.id;
      checks.push({
        name: "Página do Facebook vinculada",
        ok: pageOk,
        detail: j.error?.message || `${j.name || pageId} (ID: ${j.id || pageId})`,
        data: { id: j.id, name: j.name, has_ig: !!j.instagram_business_account },
      });
    } catch (e) {
      checks.push({ name: "Página do Facebook vinculada", ok: false, detail: String(e) });
    }

    // 4. IG Business Account — verifica direto pelo ig_account_id armazenado
    const igAccountId = acc.ig_account_id;
    let igOk = false;
    if (igAccountId) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username,followers_count,media_count&access_token=${token}`
        );
        const j = await r.json();
        igOk = !j.error && !!j.id;
        checks.push({
          name: "Instagram Business",
          ok: igOk,
          detail: j.error?.message || `@${j.username} • ${j.followers_count ?? "?"} seguidores • ${j.media_count ?? 0} posts`,
          data: j,
        });
      } catch (e) {
        checks.push({ name: "Instagram Business", ok: false, detail: String(e) });
      }
    } else {
      checks.push({
        name: "Instagram Business",
        ok: false,
        detail: "ig_account_id não armazenado.",
      });
    }

    // 5. Business Discovery — Radar IA dependency
    if (igAccountId) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}?fields=business_discovery.username(roxou.pp){username,followers_count}&access_token=${token}`
        );
        const j = await r.json();
        checks.push({
          name: "Business Discovery (Radar IA)",
          ok: !j.error && !!j.business_discovery,
          detail: j.error?.message || "OK — Radar IA pode varrer perfis públicos.",
          data: j.business_discovery,
        });
      } catch (e) {
        checks.push({ name: "Business Discovery (Radar IA)", ok: false, detail: String(e) });
      }
    }

    const allOk = checks.every((c) => c.ok);
    return new Response(
      JSON.stringify({
        ok: allOk,
        username: acc.username,
        ig_account_id: acc.ig_account_id,
        token_expires_at: acc.token_expires_at,
        checks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Action: sync — busca métricas reais e mídia recente da Meta API
  if (action === "sync") {
    const { data: acc } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!acc) {
      return new Response(
        JSON.stringify({ ok: false, stage: "no_account", message: "Nenhuma conta conectada." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = acc.access_token;
    const igId = acc.ig_account_id;

    try {
      // Profile + métricas básicas
      const profRes = await fetch(
        `https://graph.facebook.com/v21.0/${igId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count&access_token=${token}`
      );
      const profile = await profRes.json();
      if (profile.error) throw new Error(profile.error.message);

      // Mídia recente (últimos 12)
      const mediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${token}`
      );
      const media = await mediaRes.json();

      // Insights (alcance e engajamento últimos 7 dias)
      let insights: any = null;
      try {
        const since = Math.floor((Date.now() - 7 * 86400000) / 1000);
        const until = Math.floor(Date.now() / 1000);
        const insRes = await fetch(
          `https://graph.facebook.com/v21.0/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${since}&until=${until}&access_token=${token}`
        );
        insights = await insRes.json();
      } catch (e) {
        insights = { error: String(e) };
      }

      // Soma reach/impressions
      let reach7d = 0;
      let impressions7d = 0;
      let profileViews7d = 0;
      if (Array.isArray(insights?.data)) {
        for (const m of insights.data) {
          const sum = (m.values || []).reduce((s: number, v: any) => s + (Number(v.value) || 0), 0);
          if (m.name === "reach") reach7d = sum;
          if (m.name === "impressions") impressions7d = sum;
          if (m.name === "profile_views") profileViews7d = sum;
        }
      }

      // Engajamento aproximado: soma likes+comments dos últimos posts
      let engagement = 0;
      if (Array.isArray(media?.data)) {
        for (const p of media.data) {
          engagement += (Number(p.like_count) || 0) + (Number(p.comments_count) || 0);
        }
      }

      const synced_at = new Date().toISOString();

      return new Response(
        JSON.stringify({
          ok: true,
          synced_at,
          account: {
            id: acc.id,
            username: profile.username || acc.username,
            ig_account_id: igId,
            token_expires_at: acc.token_expires_at,
          },
          profile: {
            name: profile.name,
            biography: profile.biography,
            profile_picture_url: profile.profile_picture_url,
            followers_count: profile.followers_count || 0,
            follows_count: profile.follows_count || 0,
            media_count: profile.media_count || 0,
          },
          metrics: {
            followers: profile.followers_count || 0,
            media_count: profile.media_count || 0,
            reach_7d: reach7d,
            impressions_7d: impressions7d,
            profile_views_7d: profileViews7d,
            engagement_recent: engagement,
          },
          media: media?.data || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      const msg = String(err?.message || err);
      const tokenExpired = /expired|invalid|OAuthException|access token/i.test(msg);
      return new Response(
        JSON.stringify({ ok: false, stage: tokenExpired ? "token_expired" : "error", message: msg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Action inválida" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
