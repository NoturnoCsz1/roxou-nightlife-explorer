import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Action: get auth URL
  if (action === "auth_url") {
    const redirectUri = `${SUPABASE_URL}/functions/v1/instagram-oauth?action=callback`;
    const scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";
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

  // Action: check connection status
  if (action === "status") {
    const { data } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ account: data?.[0] || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Action inválida" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
