import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Instagram, Loader2, Link2, Send, FileText, CheckCircle2, XCircle, Plus, Copy, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IgAccount {
  id: string;
  username: string;
  ig_account_id: string;
  status: string;
  token_expires_at: string | null;
  created_at: string;
}

interface IgPost {
  id: string;
  caption: string | null;
  image_url: string | null;
  status: string;
  ig_media_id: string | null;
  error_detail: string | null;
  published_at: string | null;
  created_at: string;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-yellow-400/10 text-yellow-400" },
  published: { label: "Publicado", cls: "bg-green-400/10 text-green-400" },
  failed: { label: "Erro", cls: "bg-destructive/10 text-destructive" },
  scheduled: { label: "Agendado", cls: "bg-primary/10 text-primary" },
};

const InstagramAdmin = () => {
  const [searchParams] = useSearchParams();
  const [account, setAccount] = useState<IgAccount | null>(null);
  const [posts, setPosts] = useState<IgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  // New post form
  const [newCaption, setNewCaption] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      toast.success("Conta Instagram conectada com sucesso!");
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [accRes, postsRes] = await Promise.all([
      supabase.from("instagram_accounts" as any).select("*").eq("status", "active").order("created_at", { ascending: false }).limit(1),
      supabase.from("instagram_posts" as any).select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAccount((accRes.data as any)?.[0] || null);
    setPosts((postsRes.data as any as IgPost[]) || []);
    setLoading(false);
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-oauth", {
        body: {},
        method: "GET",
      });
      // Use query param approach
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-oauth?action=auth_url`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const result = await res.json();
      if (result.authUrl) {
        window.open(result.authUrl, "_blank", "width=600,height=700");
      } else {
        toast.error("Erro ao obter URL de autenticação", { description: result.error });
      }
    } catch (err: any) {
      toast.error("Erro na conexão", { description: err.message });
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveDraft() {
    if (!newImageUrl.trim()) {
      toast.error("URL da imagem é obrigatória");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("instagram_posts" as any).insert({
      caption: newCaption || null,
      image_url: newImageUrl,
      status: "draft",
      created_by: userData.user?.id || "00000000-0000-0000-0000-000000000000",
      instagram_account_id: account?.id || null,
    } as any);
    if (error) {
      toast.error("Erro ao salvar rascunho");
    } else {
      toast.success("Rascunho salvo!");
      setNewCaption("");
      setNewImageUrl("");
      setShowForm(false);
      loadData();
    }
    setSaving(false);
  }

  async function handlePublish(postId: string) {
    if (!account) {
      toast.error("Conecte uma conta Instagram primeiro");
      return;
    }
    setPublishing(postId);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-publish", {
        body: { post_id: postId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Post publicado no Instagram!");
      } else {
        toast.error("Erro ao publicar", { description: data?.error });
      }
    } catch (err: any) {
      toast.error("Erro ao publicar", { description: err.message });
    } finally {
      setPublishing(null);
      loadData();
    }
  }

  async function handleDelete(postId: string) {
    await supabase.from("instagram_posts" as any).delete().eq("id", postId);
    toast.success("Post removido");
    loadData();
  }

  const tokenExpiry = account?.token_expires_at ? new Date(account.token_expires_at) : null;
  const tokenExpiresSoon = tokenExpiry && tokenExpiry.getTime() - Date.now() < 7 * 86400000;

  return (
    <div className="space-y-4 md:ml-44">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Instagram className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Instagram</h1>
            <p className="text-[10px] text-muted-foreground">Publicação direta na conta oficial ROXOU</p>
          </div>
        </div>
        <button onClick={loadData} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Connection status */}
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Conta Conectada
            </h2>
            {account ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Instagram className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">@{account.username}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Conectado em {new Date(account.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="ml-auto rounded-full bg-green-400/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                    Ativo
                  </span>
                </div>
                {tokenExpiresSoon && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-yellow-400/10 px-3 py-2 text-[10px] text-yellow-400">
                    <AlertTriangle className="h-3 w-3" />
                    Token expira em {tokenExpiry ? Math.ceil((tokenExpiry.getTime() - Date.now()) / 86400000) : "?"} dias.
                    <button onClick={handleConnect} className="font-semibold underline ml-1">Reconectar</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Nenhuma conta conectada. Conecte a conta profissional do Instagram do ROXOU.</p>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                >
                  {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Instagram className="h-3.5 w-3.5" />}
                  Conectar Instagram
                </button>
                <p className="text-[9px] text-muted-foreground/60">
                  Requer: Meta App configurado + conta Instagram Business vinculada a Facebook Page
                </p>
              </div>
            )}
          </div>

          {/* New post form */}
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo Post
              </h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="text-[10px] text-primary font-semibold"
              >
                {showForm ? "Cancelar" : "Criar"}
              </button>
            </div>
            {showForm && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">URL da Imagem *</label>
                  <input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Legenda</label>
                  <textarea
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    rows={4}
                    placeholder="Escreva a legenda do post..."
                    className="mt-1 w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
                {newImageUrl && (
                  <img src={newImageUrl} alt="Preview" className="rounded-lg max-h-40 mx-auto border border-border/20" />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50 transition"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    Salvar Rascunho
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Posts list */}
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Posts ({posts.length})
            </h2>
            {posts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum post criado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {posts.map((post) => {
                  const badge = statusBadge[post.status] || statusBadge.draft;
                  return (
                    <div key={post.id} className="rounded-lg border border-border/30 bg-card/50 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {post.image_url && (
                            <img src={post.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                          )}
                          <div>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(post.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        {post.published_at && (
                          <span className="text-[9px] text-green-400 flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>

                      {post.caption && (
                        <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground bg-background/50 rounded-md p-2 font-sans leading-relaxed max-h-24 overflow-y-auto">
                          {post.caption}
                        </pre>
                      )}

                      {post.error_detail && (
                        <div className="flex items-start gap-1 text-[10px] text-destructive bg-destructive/5 rounded-md p-2">
                          <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                          {post.error_detail}
                        </div>
                      )}

                      <div className="flex gap-1.5 flex-wrap">
                        {post.status === "draft" && (
                          <>
                            <button
                              onClick={() => handlePublish(post.id)}
                              disabled={!account || publishing === post.id}
                              className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                            >
                              {publishing === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              PUBLICAR
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/20 transition"
                            >
                              <XCircle className="h-3 w-3" /> EXCLUIR
                            </button>
                          </>
                        )}
                        {post.status === "failed" && (
                          <button
                            onClick={() => handlePublish(post.id)}
                            disabled={!account || publishing === post.id}
                            className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
                          >
                            {publishing === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            TENTAR NOVAMENTE
                          </button>
                        )}
                        {post.caption && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(post.caption!); toast.success("Legenda copiada!"); }}
                            className="flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
                          >
                            <Copy className="h-3 w-3" /> COPIAR
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InstagramAdmin;
