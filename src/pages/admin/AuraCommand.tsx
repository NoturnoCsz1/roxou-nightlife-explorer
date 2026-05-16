import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Flame, TrendingUp, Eye, Heart, ShieldAlert, Building2, Film, Radar, Bell, Check, Loader2, Bot } from "lucide-react";
import { toast } from "sonner";
import { getStartOfTodaySP } from "@/lib/dateUtils";

type Alert = {
  id: string;
  created_at: string;
  kind: string;
  severity: "info" | "warn" | "critical";
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  body: string | null;
  payload: any;
  resolved_at: string | null;
};

type EventLite = {
  id: string;
  title: string;
  slug: string;
  venue_name: string | null;
  date_time: string;
  aura_badge: string | null;
  aura_score: number | null;
  trending_score: number | null;
  hype_score: number | null;
};

type PartnerLite = {
  id: string;
  name: string;
  slug: string;
  type: string;
  aura_partner_score: number | null;
};

const severityClass: Record<string, string> = {
  info: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  warn: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  critical: "border-red-500/50 bg-red-500/10 text-red-300",
};

const kindLabel: Record<string, string> = {
  trending_spike: "🚀 Crescendo rápido",
  viral: "🔥 Viralizando",
  risk_user: "⚠ Usuário em risco",
  spam_burst: "⚠ Pico de spam",
  partner_growth: "📈 Parceiro crescendo",
  radar_repost: "🛰 Repostagem detectada",
  security_critical: "🛡 Segurança crítica",
};

export default function AuraCommand() {
  const [loading, setLoading] = useState(true);
  const [pulsing, setPulsing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trending, setTrending] = useState<EventLite[]>([]);
  const [topPartners, setTopPartners] = useState<PartnerLite[]>([]);
  const [kpis, setKpis] = useState({
    publishedFuture: 0,
    enAlta: 0,
    liveNow: 0,
    activePartners: 0,
    openAlerts: 0,
    safeDrafts: 0,
    radarToday: 0,
    autoreelsPending: 0,
    pendingReports: 0,
  });

  async function load() {
    setLoading(true);
    const todayIso = getStartOfTodaySP();

    const [
      alertsRes,
      eventsRes,
      partnersRes,
      kpiPublished,
      kpiEnAlta,
      kpiPartners,
      kpiOpenAlerts,
      kpiDraftsAll,
      liveRes,
      radarRes,
      reelsRes,
      reportsRes,
    ] = await Promise.all([
      supabase.from("aura_alerts").select("*").is("resolved_at", null).order("created_at", { ascending: false }).limit(30),
      supabase
        .from("events")
        .select("id, title, slug, venue_name, date_time, aura_badge, aura_score, trending_score, hype_score")
        .eq("status", "published")
        .gte("date_time", todayIso)
        .order("aura_score", { ascending: false, nullsFirst: false })
        .limit(8),
      supabase
        .from("partners")
        .select("id, name, slug, type, aura_partner_score")
        .eq("active", true)
        .order("aura_partner_score", { ascending: false, nullsFirst: false })
        .limit(5),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published").gte("date_time", todayIso),
      supabase.from("events").select("id", { count: "exact", head: true }).in("aura_badge", ["em_alta", "viralizando", "bombando"]).gte("date_time", todayIso),
      supabase.from("partners").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("aura_alerts").select("id", { count: "exact", head: true }).is("resolved_at", null),
      supabase.from("events").select("id, title, image_url, description, venue_name, date_time").eq("status", "draft"),
      supabase.from("event_live_presence").select("id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 3 * 60 * 1000).toISOString()),
      supabase.from("instagram_scans").select("id", { count: "exact", head: true }).gte("created_at", todayIso).eq("hidden_from_radar", false),
      supabase.from("auto_reels_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("security_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setAlerts((alertsRes.data as any) || []);
    setTrending((eventsRes.data as any) || []);
    setTopPartners((partnersRes.data as any) || []);

    const drafts = (kpiDraftsAll.data as any[]) || [];
    const safe = drafts.filter(
      (e) =>
        e.title &&
        e.image_url &&
        e.venue_name &&
        e.description &&
        e.description.length > 40 &&
        e.date_time &&
        new Date(e.date_time) > new Date()
    ).length;

    setKpis({
      publishedFuture: kpiPublished.count || 0,
      enAlta: kpiEnAlta.count || 0,
      liveNow: liveRes.count || 0,
      activePartners: kpiPartners.count || 0,
      openAlerts: kpiOpenAlerts.count || 0,
      safeDrafts: safe,
      radarToday: radarRes.count || 0,
      autoreelsPending: reelsRes.count || 0,
      pendingReports: reportsRes.count || 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("aura_alerts_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "aura_alerts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPulse() {
    setPulsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("aura-pulse", { body: {} });
      if (error) throw error;
      toast.success(`Aura pulsou: ${data?.created ?? 0} novo(s) alerta(s)`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao pulsar Aura");
    } finally {
      setPulsing(false);
    }
  }

  async function resolveAlert(id: string) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("aura_alerts").update({ resolved_at: new Date().toISOString(), resolved_by: u?.user?.id || null }).eq("id", id);
    if (error) {
      toast.error("Falha ao resolver");
      return;
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Alerta resolvido");
  }

  // Status operacional global
  const overallStatus = (() => {
    if (kpis.pendingReports > 0 || kpis.openAlerts >= 5) return { label: "Crítico", cls: "border-red-500/50 bg-red-500/15 text-red-300" };
    if (kpis.openAlerts > 0 || kpis.safeDrafts === 0 && kpis.radarToday > 5) return { label: "Atenção", cls: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300" };
    return { label: "Saudável", cls: "border-green-500/40 bg-green-500/15 text-green-300" };
  })();

  // Lista de KPIs — esconde zerados (mantém sempre os essenciais)
  const kpiList: { key: string; icon: React.ReactNode; label: string; value: number; accent?: boolean; alwaysShow?: boolean }[] = [
    { key: "pub", icon: <Eye className="h-4 w-4" />, label: "Publicados (futuros)", value: kpis.publishedFuture, alwaysShow: true },
    { key: "alta", icon: <Flame className="h-4 w-4 text-orange-400" />, label: "Em alta agora", value: kpis.enAlta },
    { key: "live", icon: <TrendingUp className="h-4 w-4 text-green-400" />, label: "Ao vivo no app", value: kpis.liveNow },
    { key: "part", icon: <Building2 className="h-4 w-4" />, label: "Parceiros ativos", value: kpis.activePartners, alwaysShow: true },
    { key: "alert", icon: <Bell className="h-4 w-4 text-yellow-400" />, label: "Alertas abertos", value: kpis.openAlerts, accent: kpis.openAlerts > 0, alwaysShow: true },
    { key: "drafts", icon: <Check className="h-4 w-4 text-green-400" />, label: "Drafts seguros", value: kpis.safeDrafts },
    { key: "radar", icon: <Radar className="h-4 w-4" />, label: "Radar (hoje)", value: kpis.radarToday },
    { key: "reels", icon: <Film className="h-4 w-4" />, label: "AutoReels pendentes", value: kpis.autoreelsPending },
    { key: "rep", icon: <ShieldAlert className="h-4 w-4 text-red-400" />, label: "Denúncias pendentes", value: kpis.pendingReports, accent: kpis.pendingReports > 0 },
  ].filter((k) => k.alwaysShow || k.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-foreground inline-flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Aura Command Center
            <span className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${overallStatus.cls}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" /> {overallStatus.label}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">A Aura monitora eventos, repostagens, tendências e problemas operacionais em tempo real.</p>
        </div>
        <button
          onClick={runPulse}
          disabled={pulsing}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-50"
        >
          {pulsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
          Pulsar Aura agora
        </button>
      </div>

      {/* KPIs — esconde cards zerados (exceto essenciais) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpiList.map((k) => (
          <Kpi key={k.key} icon={k.icon} label={k.label} value={k.value} accent={k.accent} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Alertas */}
        <section className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4" /> Alertas da Aura
            <span className="text-[10px] font-normal text-muted-foreground/70">(realtime)</span>
          </h2>
          {loading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum alerta aberto. A Aura está observando.</p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {alerts.map((a) => (
                <li key={a.id} className={`rounded-xl border px-3 py-2 ${severityClass[a.severity] || severityClass.info}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">{kindLabel[a.kind] || a.kind}</div>
                      <div className="text-sm font-semibold text-foreground truncate">{a.title}</div>
                      {a.body && <div className="text-xs text-muted-foreground line-clamp-2">{a.body}</div>}
                      <div className="text-[10px] text-muted-foreground/70 mt-1">{new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
                    </div>
                    <button onClick={() => resolveAlert(a.id)} className="rounded-lg border border-border/40 px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-secondary">
                      Resolver
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Em alta */}
        <section className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-orange-400" /> Em alta agora
          </h2>
          {trending.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum evento em destaque.</p>
          ) : (
            <ul className="space-y-2">
              {trending.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/50 px-3 py-2">
                  <Link to={`/admin/eventos/${e.id}/editar`} className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{e.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {e.venue_name || "—"} · {new Date(e.date_time).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 text-[10px]">
                    {e.aura_badge && <span className="rounded-md bg-primary/15 text-primary px-2 py-0.5 font-bold uppercase">{e.aura_badge}</span>}
                    <span className="text-muted-foreground tabular-nums">{Math.round(Number(e.aura_score) || 0)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Parceiros em alta */}
        <section className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4" /> Parceiros em alta
          </h2>
          {topPartners.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados de parceiros.</p>
          ) : (
            <ul className="space-y-2">
              {topPartners.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-background/50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{p.type}</div>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold tabular-nums">{p.aura_partner_score ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Como a Aura opera */}
        <section className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" /> Como a Aura opera
          </h2>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li>🛰 <strong className="text-foreground">Radar IA</strong> — varre Instagram 2x/dia e cria drafts auto-discovery.</li>
            <li>📈 <strong className="text-foreground">Aura Ranking</strong> — recalcula <code>aura_score</code>, <code>trending_score</code> e badges a cada 15 min.</li>
            <li>🏪 <strong className="text-foreground">Partner Sync</strong> — atualiza Instagram + score dos parceiros 1x/dia.</li>
            <li>🎬 <strong className="text-foreground">AutoReels</strong> — fila com prompts CapCut/Kling/Runway/Veo prontos.</li>
            <li>🛡 <strong className="text-foreground">Moderação</strong> — score de risco + denúncias da comunidade.</li>
            <li>🔔 <strong className="text-foreground">Aura Pulse</strong> — varre tudo a cada 10 min e dispara alertas aqui.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${accent ? "border-primary/40 bg-primary/10" : "border-border/40 bg-card/40"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-2xl font-black font-display text-foreground tabular-nums">{value}</div>
    </div>
  );
}
