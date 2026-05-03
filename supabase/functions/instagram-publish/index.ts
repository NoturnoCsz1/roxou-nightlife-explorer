import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { post_id } = await req.json();
    if (!post_id) throw new Error("post_id é obrigatório");

    // Get post
    const { data: post, error: postErr } = await supabase
      .from("instagram_posts")
      .select("*")
      .eq("id", post_id)
      .single();
    if (postErr || !post) throw new Error("Post não encontrado");
    if (post.status === "published") throw new Error("Post já publicado");
    if (!post.image_url) throw new Error("Post sem imagem");

    // Get account (oauth) — fallback para instagram_config (token manual)
    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let igAccountId = account?.ig_account_id;
    let accessToken = account?.access_token;

    if (!accessToken) {
      const { data: cfg } = await supabase
        .from("instagram_config")
        .select("access_token, ig_user_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cfg?.access_token) {
        accessToken = cfg.access_token;
        if (!igAccountId && cfg.ig_user_id) igAccountId = cfg.ig_user_id;
      }
    }

    if (!accessToken) throw new Error("Nenhum token Instagram disponível");

    // Resolve ig user id automaticamente se ausente
    if (!igAccountId) {
      const meRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=id&access_token=${accessToken}`);
      const meData = await meRes.json();
      if (meData?.id) igAccountId = meData.id;
      else throw new Error("Não foi possível identificar a conta Instagram");
    }

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      image_url: post.image_url,
      access_token: accessToken,
    });
    if (post.caption) containerParams.set("caption", post.caption);

    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      { method: "POST", body: containerParams }
    );
    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(`Container: ${containerData.error.message}`);

    const creationId = containerData.id;

    // Step 2: Wait for container to be ready (poll)
    let ready = false;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(
        `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${accessToken}`
      );
      const statusData = await statusRes.json();
      if (statusData.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (statusData.status_code === "ERROR") {
        throw new Error("Erro no processamento da imagem pelo Instagram");
      }
    }

    if (!ready) throw new Error("Timeout aguardando processamento da imagem");

    // Step 3: Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
      {
        method: "POST",
        body: new URLSearchParams({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(`Publish: ${publishData.error.message}`);

    // Update post status
    await supabase.from("instagram_posts").update({
      status: "published",
      ig_media_id: publishData.id,
      published_at: new Date().toISOString(),
      error_detail: null,
    }).eq("id", post_id);

    return new Response(JSON.stringify({ success: true, mediaId: publishData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Publish error:", err);

    // Update post with error
    try {
      const { post_id } = await req.clone().json().catch(() => ({ post_id: null }));
      if (post_id) {
        await supabase.from("instagram_posts").update({
          status: "failed",
          error_detail: err.message,
        }).eq("id", post_id);
      }
    } catch {}

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
