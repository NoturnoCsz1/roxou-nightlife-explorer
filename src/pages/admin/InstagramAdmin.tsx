import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Instagram, Loader2, Link2, Send, FileText, CheckCircle2, XCircle, Plus, Copy, RefreshCw, AlertTriangle, Sparkles, Users, Eye, Heart, Calendar, Image as ImageIcon, Zap, MessageCircle, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InstagramContentGenerator from "@/components/admin/InstagramContentGenerator";
import InstagramStudio from "@/components/admin/InstagramStudio";
import ImageUpload from "@/components/admin/ImageUpload";

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

type TabKey = "publicacao" | "contas" | "estudio" | "conteudo";

const TABS: { key: TabKey; label: string; icon: typeof Instagram }[] = [
  { key: "publicacao", label: "Publicação", icon: Send },
  { key: "contas", label: "Contas", icon: Link2 },
  { key: "estudio", label: "Estúdio", icon: Sparkles },
  { key: "conteudo", label: "Conteúdo", icon: Sparkles },
];

const InstagramAdmin = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "publicacao";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [account, setAccount] = useState<IgAccount | null>(null);
  const [posts, setPosts] = useState<IgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const [newCaption, setNewCaption] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      toast.success("Conta Instagram conectada com sucesso!");
      (async () => {
        const t = toast.loading("Disparando varredura do Radar IA...");
        const { data, error } = await supabase.functions.invoke("automatic-event-hunter");
        toast.dismiss(t);
        if (error) {
          toast.error(`Falha no Radar IA: ${error.message}`);
        } else {
          const created = (data as any)?.drafts_created ?? 0;
          toast.success(`Radar IA: ${created} novo(s) rascunho(s) criado(s).`);
        }
      })();
    }
    const paramCaption = searchParams.get("caption");
    const paramImage = searchParams.get("image");
    if (paramCaption || paramImage) {
      setNewCaption(paramCaption || "");
      setNewImageUrl(paramImage || "");
      setShowForm(true);
      setActiveTab("publicacao");
    }
    loadData();
  }, []);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    setSearchParams({ tab });
  }

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

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-oauth?action=test`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const result = await res.json();
      setTestResult(result);
      if (result.ok) toast.success("Conexão validada com sucesso");
      else toast.error("Conexão com problemas", { description: "Veja detalhes abaixo." });
    } catch (err: any) {
      toast.error("Erro ao testar", { description: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveDraft() {
    if (!newImageUrl.trim()) { toast.error("URL da imagem é obrigatória"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const isScheduled = !!scheduleAt;
    const { error } = await supabase.from("instagram_posts" as any).insert({
      caption: newCaption || null,
      image_url: newImageUrl,
      status: isScheduled ? "scheduled" : "draft",
      created_by: userData.user?.id || "00000000-0000-0000-0000-000000000000",
      instagram_account_id: account?.id || null,
      ...(isScheduled ? { published_at: new Date(scheduleAt).toISOString() } : {}),
    } as any);
    if (error) { toast.error("Erro ao salvar"); }
    else {
      toast.success(isScheduled ? "Post agendado!" : "Rascunho salvo!");
      setNewCaption(""); setNewImageUrl(""); setScheduleAt(""); setShowForm(false);
      loadData();
    }
    setSaving(false);
  }

  async function handlePublish(postId: string) {
    if (!account) { toast.error("Conecte uma conta Instagram primeiro"); return; }
    setPublishing(postId);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-publish", { body: { post_id: postId } });
      if (error) throw error;
      if (data?.success) toast.success("Post publicado no Instagram!");
      else toast.error("Erro ao publicar", { description: data?.error });
    } catch (err: any) {
      toast.error("Erro ao publicar", { description: err.message });
    } finally { setPublishing(null); loadData(); }
  }

  async function handleDelete(postId: string) {
    await supabase.from("instagram_posts" as any).delete().eq("id", postId);
    toast.success("Post removido");
    loadData();
  }

  const tokenExpiry = account?.token_expires_at ? new Date(account.token_expires_at) : null;
  const tokenExpiresSoon = tokenExpiry && tokenExpiry.getTime() - Date.now() < 7 * 86400000;

  // Sincronização automática com Meta API
  const [syncing, setSyncing] = useState(false);
  const [syncData, setSyncData] = useState<{
    profile: { followers_count: number; media_count: number; profile_picture_url?: string; biography?: string; name?: string };
    metrics: { followers: number; media_count: number; reach_7d: number; impressions_7d: number; profile_views_7d: number; engagement_recent: number };
    media: Array<{ id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string; timestamp: string; like_count?: number; comments_count?: number }>;
    synced_at: string;
  } | null>(null);
  const [syncStage, setSyncStage] = useState<"idle" | "loading" | "ok" | "token_expired" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncIntervalRef = useRef<number | null>(null);

  async function syncInstagramData(silent = false) {
    if (!silent) setSyncing(true);
    setSyncStage("loading");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-oauth?action=sync`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const result = await res.json();
      if (result.ok) {
        setSyncData(result);
        setSyncStage("ok");
        setSyncError(null);
        if (!silent) toast.success("Dados sincronizados com a Meta");
      } else {
        setSyncStage(result.stage === "token_expired" ? "token_expired" : "error");
        setSyncError(result.message || "Falha ao sincronizar");
        if (!silent) toast.error("Falha na sincronização", { description: result.message });
      }
    } catch (err: any) {
      setSyncStage("error");
      setSyncError(err.message);
      if (!silent) toast.error("Erro ao sincronizar", { description: err.message });
    } finally {
      setSyncing(false);
    }
  }

  // Auto-sync quando há conta ativa: imediato + a cada 5 min
  useEffect(() => {
    if (!account) return;
    syncInstagramData(true);
    syncIntervalRef.current = window.setInterval(() => syncInstagramData(true), 5 * 60 * 1000);
    return () => {
      if (syncIntervalRef.current) window.clearInterval(syncIntervalRef.current);
    };
  }, [account?.id]);

  const fmtNum = (n: number) => (n || 0).toLocaleString("pt-BR");
  const lastSyncLabel = syncData?.synced_at
    ? new Date(syncData.synced_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
    : null;

  const isOnline = !!account && syncStage === "ok";
  const isTokenExpired = syncStage === "token_expired";

  return (
    <div className="space-y-4 md:ml-44">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Instagram className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Instagram</h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  isOnline
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : isTokenExpired
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-muted/20 border-border/30 text-muted-foreground"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                      isOnline ? "bg-green-500" : isTokenExpired ? "bg-destructive" : "bg-muted-foreground"
                    }`}
                  ></span>
                </span>
                {isOnline ? "Meta sincronizada" : isTokenExpired ? "Reconectar Meta" : "Aguardando Meta"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {syncStage === "loading"
                ? "Sincronizando com Meta…"
                : lastSyncLabel
                ? `Última sincronização automática: ${lastSyncLabel}`
                : "Centro de operações de conteúdo ROXOU"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncInstagramData(false)}
            disabled={syncing || !account}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Sincronizar agora
          </button>
        </div>
      </div>

      {/* Token expirado / erro */}
      {isTokenExpired && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <div className="flex items-center gap-2 text-destructive">
            <WifiOff className="h-4 w-4" />
            <div>
              <p className="text-xs font-bold">Token Meta expirado</p>
              <p className="text-[10px] opacity-80">{syncError || "Reautorize para continuar a sincronização."}</p>
            </div>
          </div>
          <button
            onClick={handleConnect}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            Reconectar Meta
          </button>
        </div>
      )}

      {/* Quick metrics — dados reais da Meta */}
      <div className="grid grid-cols-3 gap-2">
        {syncStage === "loading" && !syncData ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              icon={Users}
              label="Seguidores"
              value={fmtNum(syncData?.metrics.followers || 0)}
              hint={account ? `@${account.username}` : "—"}
            />
            <MetricCard
              icon={Eye}
              label="Alcance 7d"
              value={fmtNum(syncData?.metrics.reach_7d || 0)}
              hint={syncData ? `${fmtNum(syncData.metrics.impressions_7d)} impressões` : "—"}
            />
            <MetricCard
              icon={Heart}
              label="Engajamento"
              value={fmtNum(syncData?.metrics.engagement_recent || 0)}
              hint={syncData ? `${fmtNum(syncData.metrics.media_count)} posts` : "—"}
            />
          </>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading && activeTab !== "conteudo" && activeTab !== "estudio" ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* TAB: Contas */}
          {activeTab === "contas" && (
            <div className="space-y-3">
            {/* Pré-requisito Meta */}
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Antes de autorizar a Meta: prepare a conta Instagram</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                A API da Meta exige que <strong className="text-foreground">@roxou.pp</strong> seja uma conta <strong className="text-foreground">Business/Creator</strong> vinculada a uma Página administrada pelo mesmo usuário Meta que você for autorizar. Esta autorização é exclusiva da automação Instagram da Roxou — <strong className="text-foreground">não substitui</strong> o login dos usuários do app, que continua via Google/e-mail.
              </p>
              <ol className="text-[11px] text-muted-foreground space-y-1 pl-4 list-decimal">
                <li>No app Instagram → Configurações → Conta → <strong>Mudar para Profissional</strong> (Business).</li>
                <li>No Facebook, abra/crie uma <strong>Página</strong> administrada pelo mesmo usuário (ex: "Roxou PP").</li>
                <li>Na Página → Configurações → <strong>Instagram vinculado</strong> → conecte @roxou.pp.</li>
                <li>Volte aqui e clique em <strong>Autorizar Meta</strong> usando o usuário Meta admin da Página.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Conta Instagram conectada
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
                    <span className="ml-auto rounded-full bg-green-400/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">Ativo</span>
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
                  <p className="text-xs text-muted-foreground">Nenhuma conta Instagram conectada à automação Meta.</p>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Instagram className="h-3.5 w-3.5" />}
                    Autorizar Meta · Conectar Instagram
                  </button>
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                    Esta autorização é exclusiva da automação Instagram da Roxou (publicação, insights, Radar IA). O login dos usuários do app continua via Google/e-mail.
                  </p>
                </div>
              )}

              {/* Botão Testar Conexão Meta */}
              <div className="pt-2 border-t border-border/30">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Permissões da Meta</h3>
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-4 py-2 text-xs font-semibold text-primary transition disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  {testing ? "Testando..." : "Testar conexão Meta"}
                </button>

                {testResult && (
                  <div className="mt-3 space-y-2">
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${testResult.ok ? "bg-green-400/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
                      {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {testResult.ok ? "Conexão Meta validada — automação pronta" : "Conexão Meta incompleta — corrija os itens abaixo"}
                    </div>
                    {testResult.stage === "no_account" && (
                      <p className="text-[11px] text-muted-foreground">{testResult.message}</p>
                    )}
                    {Array.isArray(testResult.checks) && (
                      <ul className="space-y-1.5">
                        {testResult.checks.map((c: any, i: number) => (
                          <li key={i} className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2">
                            {c.ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground">{c.name}</p>
                              {c.detail && <p className="text-[10px] text-muted-foreground break-words">{c.detail}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {/* TAB: Publicação */}
          {activeTab === "publicacao" && (
            <>
              {/* New post form */}
              <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Novo Post
                  </h2>
                  <button onClick={() => setShowForm(!showForm)} className="text-[10px] text-primary font-semibold">
                    {showForm ? "Cancelar" : "Criar"}
                  </button>
                </div>
                {showForm && (
                  <div className="space-y-3">
                    <ImageUpload
                      folder="instagram"
                      currentUrl={newImageUrl}
                      onUploaded={(url) => setNewImageUrl(url)}
                      label="Imagem do post (1:1 recomendado)"
                    />
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium">Ou cole uma URL</label>
                      <input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="https://..."
                        className="mt-1 w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Legenda
                      </label>
                      <textarea value={newCaption} onChange={(e) => setNewCaption(e.target.value)} rows={5} placeholder="Escreva a legenda com hashtags..."
                        className="mt-1 w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                      <div className="text-right text-[9px] text-muted-foreground/60 mt-0.5">{newCaption.length} / 2200</div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Agendar (opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduleAt}
                        onChange={(e) => setScheduleAt(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {newImageUrl && (
                      <div className="rounded-lg border border-border/20 bg-background/40 p-2">
                        <p className="text-[10px] text-muted-foreground mb-1.5">Preview</p>
                        <img src={newImageUrl} alt="Preview" className="rounded-md max-h-56 mx-auto object-contain" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleSaveDraft} disabled={saving}
                        className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50 transition">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : scheduleAt ? <Calendar className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {scheduleAt ? "Agendar Post" : "Salvar Rascunho"}
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
                  <div>
                    <p className="text-[11px] text-muted-foreground text-center py-3">
                      Nenhum post ainda. Seu feed vai aparecer aqui.
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-sm bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 flex items-center justify-center"
                        >
                          <ImageIcon className="h-4 w-4 text-muted-foreground/20" />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Criar primeiro post
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {posts.map((post) => {
                      const badge = statusBadge[post.status] || statusBadge.draft;
                      return (
                        <div key={post.id} className="rounded-lg border border-border/30 bg-card/50 p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {post.image_url && <img src={post.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
                              <div>
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
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
                              <XCircle className="h-3 w-3 shrink-0 mt-0.5" />{post.error_detail}
                            </div>
                          )}
                          <div className="flex gap-1.5 flex-wrap">
                            {post.status === "draft" && (
                              <>
                                <button onClick={() => handlePublish(post.id)} disabled={!account || publishing === post.id}
                                  className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                                  {publishing === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} PUBLICAR
                                </button>
                                <button onClick={() => handleDelete(post.id)}
                                  className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/20 transition">
                                  <XCircle className="h-3 w-3" /> EXCLUIR
                                </button>
                              </>
                            )}
                            {post.status === "failed" && (
                              <button onClick={() => handlePublish(post.id)} disabled={!account || publishing === post.id}
                                className="flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition">
                                {publishing === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} TENTAR NOVAMENTE
                              </button>
                            )}
                            {post.caption && (
                              <button onClick={() => { navigator.clipboard.writeText(post.caption!); toast.success("Legenda copiada!"); }}
                                className="flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition">
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

          {/* TAB: Conteúdo (existing generator) */}
          {activeTab === "conteudo" && <InstagramContentGenerator />}

          {/* TAB: Estúdio (unified) */}
          {activeTab === "estudio" && <InstagramStudio />}
        </>
      )}
    </div>
  );
};

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-lg font-black text-foreground leading-none">{value}</div>
      {hint && <div className="text-[9px] text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}

export default InstagramAdmin;
