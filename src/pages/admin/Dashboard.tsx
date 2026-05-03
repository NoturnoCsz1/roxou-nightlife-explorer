import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarCheck, Clock, Eye, Monitor, MousePointerClick, Globe, Instagram, Users, ChevronDown, Flame, Star, AlertTriangle, ArrowUpRight, ImageOff, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Softer glass card base used across the dashboard */
const GLASS = "rounded-2xl border border-border/20 bg-card/40 backdrop-blur-xl shadow-[0_4px_24px_-12px_hsl(var(--primary)/0.15)]";

/* ── KPI card with growth subtext ── */
const KpiCard = ({ label, value, icon: Icon, accent = "primary", subtext }: {
  label: string; value: number; icon: React.ElementType;
  accent?: "primary" | "accent" | "green";
  subtext?: { text: string; positive?: boolean } | null;
}) => {
  const colors = {
    primary: "text-primary bg-primary/10",
    accent: "text-accent bg-accent/10",
    green: "text-green-400 bg-green-500/10",
  };
  return (
    <div className={cn("flex flex-col items-center gap-1 p-3.5", GLASS)}>
      <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl", colors[accent])}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <span className="text-2xl font-bold text-foreground tabular-nums leading-tight">{value}</span>
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      {subtext && (
        <span className={cn(
          "text-[10px] font-semibold tabular-nums leading-none mt-0.5",
          subtext.positive ? "text-green-400" : "text-muted-foreground"
        )}>
          {subtext.text}
        </span>
      )}
    </div>
  );
};

/* ── insight card with link arrow ── */
const InsightCard = ({ icon: Icon, title, description, color, href }: {
  icon: React.ElementType; title: string; description: string; color: string; href?: string;
}) => (
  <div className={cn("relative flex items-start gap-3 p-4 group transition", GLASS, href && "hover:border-border/50")}>
    <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl shrink-0", color)}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1 pr-6">
      <p className="text-xs font-bold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{description}</p>
    </div>
    {href && (
      <Link
        to={href}
        aria-label={`Abrir ${title}`}
        className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary opacity-70 group-hover:opacity-100 hover:bg-primary/20 transition"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    )}
  </div>
);

/* ── pending action chip ── */
const PendingChip = ({ to, icon: Icon, count, label, tone }: {
  to: string; icon: React.ElementType; count: number; label: string; tone: "amber" | "rose";
}) => {
  const tones = {
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <Link
      to={to}
      className={cn("flex items-center gap-2.5 p-3 transition hover:scale-[1.02]", GLASS)}
    >
      <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl border", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground tabular-nums leading-none">{count}</p>
        <p className="text-[10px] text-muted-foreground font-medium mt-1 leading-none">{label}</p>
      </div>
    </Link>
  );
};

/* ── quick action (purple glow on hover) ── */
const QuickAction = ({ to, icon: Icon, label, color }: {
  to: string; icon: React.ElementType; label: string; color: string;
}) => (
  <Link
    to={to}
    className={cn(
      "flex flex-col items-center gap-2 p-4 transition-all duration-300",
      "hover:border-primary/40 hover:scale-[1.03]",
      "hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.55),0_0_48px_-8px_hsl(var(--primary)/0.3)]",
      GLASS
    )}
  >
    <div className={cn("flex items-center justify-center h-10 w-10 rounded-xl", color)}>
      <Icon className="h-5 w-5" />
    </div>
    <span className="text-[11px] font-semibold text-foreground">{label}</span>
  </Link>
);

/* ── friendly empty state ── */
const EmptyState = ({ message = "Tudo em ordem por aqui!" }: { message?: string }) => (
  <div className={cn("flex items-center justify-center gap-2 p-5", GLASS)}>
    <span className="text-lg" aria-hidden>🎉</span>
    <span className="text-xs font-medium text-muted-foreground">{message}</span>
  </div>
);

/* ── performance metric (inside collapsible) ── */
const PerfMetric = ({ label, value, icon: Icon }: {
  label: string; value: number; icon: React.ElementType;
}) => (
  <div className="flex items-center gap-3 rounded-xl border border-border/15 bg-card/30 backdrop-blur-md p-3">
    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <p className="text-lg font-bold text-foreground tabular-nums">{value.toLocaleString("pt-BR")}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { cityFilter } = useAdminProfile();
  const [perfOpen, setPerfOpen] = useState(false);

  const [kpis, setKpis] = useState({ today: 0, week: 0, total: 0 });
  const [kpiGrowth, setKpiGrowth] = useState<{ today: number; week: number }>({ today: 0, week: 0 });
  const [perf, setPerf] = useState({ views: 0, visitors: 0, clicks: 0 });
  const [realtime, setRealtime] = useState({ activeUsers: 0, pageViews: 0, sessions: 0 });
  const [igStats, setIgStats] = useState<{ followers: number | null; reach: number | null; impressions: number | null }>({ followers: null, reach: null, impressions: null });
  const [trending, setTrending] = useState<{ title: string; views: number; growth: number; slug: string } | null>(null);
  const [topEvent, setTopEvent] = useState<{ title: string; views: number; slug: string } | null>(null);
  const [opportunities, setOpportunities] = useState<string[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ type: "event" | "partner"; title: string; date: string; id: string }[]>([]);
  const [pending, setPending] = useState({ noCover: 0, noDescription: 0 });
  const [autoDrafts, setAutoDrafts] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7);
    const lastWeekRefDate = new Date(); lastWeekRefDate.setDate(lastWeekRefDate.getDate() - 1);
    const lastWeekRefAhead = new Date(lastWeekRefDate); lastWeekRefAhead.setDate(lastWeekRefAhead.getDate() + 7);
    const since7d = new Date(); since7d.setDate(since7d.getDate() - 7);
    const since7dISO = since7d.toISOString();

    let eventsQ = supabase.from("events").select("id, title, slug, status, date_time, created_at, image_url, description");
    let partnersQ = supabase.from("partners").select("id, name, created_at");
    if (cityFilter) {
      eventsQ = eventsQ.eq("city", cityFilter);
      partnersQ = partnersQ.eq("city", cityFilter);
    }

    const [eventsRes, partnersRes, sessionsRes, viewsCountRes, clicksCountRes] = await Promise.all([
      eventsQ,
      partnersQ,
      supabase.from("visitor_sessions").select("id", { count: "exact", head: true }),
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", since7dISO),
      supabase.from("ticket_clicks").select("id", { count: "exact", head: true }).gte("created_at", since7dISO),
    ]);

    const evts = eventsRes.data || [];
    const parts = partnersRes.data || [];
    const published = evts.filter(e => e.status === "published");
    const todayEvts = published.filter(e => e.date_time >= todayStart.toISOString() && e.date_time <= todayEnd.toISOString());
    const weekEvts = published.filter(e => e.date_time >= now.toISOString() && e.date_time <= weekAhead.toISOString());

    // Growth comparison: yesterday's "today" snapshot & last-week-equivalent 7-day window
    const yesterdayEvts = published.filter(e => e.date_time >= yesterdayStart.toISOString() && e.date_time < todayStart.toISOString());
    const lastWeekEvts = published.filter(e => e.date_time >= lastWeekRefDate.toISOString() && e.date_time <= lastWeekRefAhead.toISOString());

    setKpis({ today: todayEvts.length, week: weekEvts.length, total: evts.length });
    setKpiGrowth({
      today: todayEvts.length - yesterdayEvts.length,
      week: weekEvts.length - lastWeekEvts.length,
    });
    setPerf({ views: viewsCountRes.count ?? 0, visitors: sessionsRes.count ?? 0, clicks: clicksCountRes.count ?? 0 });

    // Pending actions: published events missing image or description
    const noCover = published.filter(e => !e.image_url || e.image_url.trim() === "").length;
    const noDescription = published.filter(e => !e.description || e.description.trim().length < 20).length;
    setPending({ noCover, noDescription });

    // Rascunhos do Radar IA aguardando revisão
    const { count: autoCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .eq("verification_source", "auto-discovery");
    setAutoDrafts(autoCount || 0);

    // Insights: trending + most viewed
    const views7d = await fetchAllRows<{ page_path: string; created_at: string }>(
      () => supabase.from("page_views").select("page_path, created_at").gte("created_at", since7dISO)
    );

    const slugTitle = new Map(evts.map(e => [e.slug, e.title]));
    const eventViewMap: Record<string, number> = {};
    views7d.forEach(v => {
      const m = v.page_path.match(/^\/evento\/(.+)$/);
      if (m && slugTitle.has(m[1])) eventViewMap[m[1]] = (eventViewMap[m[1]] || 0) + 1;
    });

    // Top event
    const topEntry = Object.entries(eventViewMap).sort((a, b) => b[1] - a[1])[0];
    if (topEntry) setTopEvent({ title: slugTitle.get(topEntry[0]) || topEntry[0], views: topEntry[1], slug: topEntry[0] });

    // Trending (24h vs prev 24h)
    const since24h = new Date(); since24h.setHours(since24h.getHours() - 24);
    const prev24hStart = new Date(since24h); prev24hStart.setHours(prev24hStart.getHours() - 24);
    const views24h: Record<string, number> = {};
    const prevViews24h: Record<string, number> = {};
    views7d.forEach(v => {
      const m = v.page_path.match(/^\/evento\/(.+)$/);
      if (!m || !slugTitle.has(m[1])) return;
      const t = new Date(v.created_at).getTime();
      if (t >= since24h.getTime()) views24h[m[1]] = (views24h[m[1]] || 0) + 1;
      else if (t >= prev24hStart.getTime()) prevViews24h[m[1]] = (prevViews24h[m[1]] || 0) + 1;
    });
    let bestSlug = ""; let bestGrowth = 0; let bestViews = 0;
    Object.entries(views24h).forEach(([slug, curr]) => {
      const prev = prevViews24h[slug] || 0;
      const growth = prev >= 1 ? ((curr - prev) / prev) * 100 : curr >= 5 ? curr * 100 : 0;
      if (curr >= 3 && growth > bestGrowth) { bestGrowth = growth; bestSlug = slug; bestViews = curr; }
    });
    if (bestSlug) setTrending({ title: slugTitle.get(bestSlug) || bestSlug, views: bestViews, growth: bestGrowth, slug: bestSlug });

    // Opportunities
    const nowISO = now.toISOString();
    const lowPerf = published.filter(e => e.date_time > nowISO && (eventViewMap[e.slug] || 0) <= 1).slice(0, 3);
    setOpportunities(lowPerf.map(e => e.title));

    // Recent activity
    const recentEvts = evts.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3).map(e => ({ type: "event" as const, title: e.title, date: e.created_at, id: e.id }));
    const recentParts = parts.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 2).map(p => ({ type: "partner" as const, title: p.name, date: p.created_at, id: p.id }));
    setRecentActivity([...recentEvts, ...recentParts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5));
    setLoading(false);
  }, [cityFilter]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Realtime polling: active users (5min), pageviews (30min), sessions (24h)
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const thirtyMin = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [activeRes, pvRes, sessionsRes] = await Promise.all([
        supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", fiveMin),
        supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", thirtyMin),
        supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("started_at", since24h),
      ]);
      if (!cancelled) {
        setRealtime({
          activeUsers: activeRes.count ?? 0,
          pageViews: pvRes.count ?? 0,
          sessions: sessionsRes.count ?? 0,
        });
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Instagram stats — null until OAuth /insights is wired (avoids misleading zeros)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("instagram_accounts")
        .select("status")
        .eq("username", "roxou.pp")
        .maybeSingle();
      if (cancelled) return;
      if (data?.status === "active") setIgStats({ followers: null, reach: null, impressions: null });
    })();
    return () => { cancelled = true; };
  }, []);

  const formatGrowth = (delta: number, unit: string) => {
    if (delta === 0) return { text: `Sem variação ${unit}`, positive: false };
    const sign = delta > 0 ? "+" : "";
    return { text: `${sign}${delta} ${unit}`, positive: delta > 0 };
  };

  return (
    <div className="space-y-6 md:ml-44 overflow-hidden min-w-0">
      {/* ── Selo Monitoramento Ativo ── */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent backdrop-blur-xl px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400"></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Monitoramento Ativo</span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">GA4 + Instagram + Radar IA</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/70">G-MLN9W59D9J</span>
      </div>

      {/* ── 1. KPIs ── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo</h2>
        <div className="grid grid-cols-3 gap-3">
          {loading ? (
            <>
              <Skeleton className={cn("h-[110px]", GLASS)} />
              <Skeleton className={cn("h-[110px]", GLASS)} />
              <Skeleton className={cn("h-[110px]", GLASS)} />
            </>
          ) : (
            <>
              <KpiCard label="Hoje" value={kpis.today} icon={CalendarCheck} accent="green" subtext={formatGrowth(kpiGrowth.today, "vs. ontem")} />
              <KpiCard label="Próx. 7 dias" value={kpis.week} icon={Clock} accent="accent" subtext={formatGrowth(kpiGrowth.week, "vs. semana passada")} />
              <KpiCard label="Total" value={kpis.total} icon={CalendarDays} accent="primary" />
            </>
          )}
        </div>
      </section>

      {/* ── Performance em Tempo Real (GA4 + Instagram) ── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400"></span>
          </span>
          Performance em Tempo Real
          <span className="ml-auto text-[9px] font-normal text-muted-foreground/70 normal-case tracking-normal">
            GA4 · G-MLN9W59D9J
          </span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* GA4: Active users */}
          <div className={cn("p-4", GLASS)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-green-500/15 text-green-400">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Ativos agora</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{realtime.activeUsers}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Últimos 5 minutos</p>
          </div>

          {/* GA4: Page views */}
          <div className={cn("p-4", GLASS)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/15 text-primary">
                <Eye className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Page Views</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{realtime.pageViews}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Últimos 30 minutos</p>
          </div>

          {/* Instagram: Followers */}
          <div className={cn("p-4", GLASS)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-pink-500/15 text-pink-400">
                <Instagram className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Seguidores</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {igStats.followers !== null ? igStats.followers.toLocaleString("pt-BR") : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">@roxou.pp</p>
          </div>

          {/* Instagram: Reach */}
          <div className={cn("p-4", GLASS)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/15 text-accent">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Alcance</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {igStats.reach !== null ? igStats.reach.toLocaleString("pt-BR") : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Últimos 7 dias</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Insights</h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className={cn("h-[88px]", GLASS)} />
            <Skeleton className={cn("h-[88px]", GLASS)} />
          </div>
        ) : trending || topEvent ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {trending && (
              <InsightCard
                icon={Flame}
                title="Evento em alta"
                description={`"${trending.title}" · ${trending.views} views 24h (+${trending.growth.toFixed(0)}%)`}
                color="bg-orange-500/10 text-orange-400"
                href={`/evento/${trending.slug}`}
              />
            )}
            {topEvent && (
              <InsightCard
                icon={Star}
                title="Mais visto (7d)"
                description={`"${topEvent.title}" com ${topEvent.views} visualizações`}
                color="bg-primary/10 text-primary"
                href={`/evento/${topEvent.slug}`}
              />
            )}
          </div>
        ) : (
          <EmptyState message="Tudo em ordem por aqui!" />
        )}
      </section>

      {/* ── 3. Ações Pendentes ── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações Pendentes</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className={cn("h-[68px]", GLASS)} />
            <Skeleton className={cn("h-[68px]", GLASS)} />
          </div>
        ) : pending.noCover > 0 || pending.noDescription > 0 || autoDrafts > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {autoDrafts > 0 && (
              <PendingChip
                to="/admin/eventos?source=auto-discovery"
                icon={TrendingUp}
                count={autoDrafts}
                label="Novos rascunhos do Radar IA"
                tone="amber"
              />
            )}
            <PendingChip
              to="/admin/eventos"
              icon={ImageOff}
              count={pending.noCover}
              label="Eventos sem capa"
              tone="amber"
            />
            <PendingChip
              to="/admin/eventos"
              icon={FileText}
              count={pending.noDescription}
              label="Descrições pendentes"
              tone="rose"
            />
          </div>
        ) : (
          <EmptyState message="Nenhuma ação pendente — tudo em ordem!" />
        )}
      </section>

      {/* ── 4. Ações rápidas ── */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Ações rápidas</span>
          <Link
            to="/admin/instagram"
            className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold text-green-400 normal-case tracking-normal hover:bg-green-500/20 transition"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400"></span>
            </span>
            Instagram ONLINE & AUTOMATIZADO
          </Link>
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction to="/admin/eventou" icon={Globe} label="Eventou" color="bg-blue-500/10 text-blue-400" />
          <QuickAction to="/admin/instagram" icon={Instagram} label="Instagram" color="bg-pink-500/10 text-pink-400" />
          <QuickAction to="/admin/eventos" icon={CalendarDays} label="Eventos" color="bg-primary/10 text-primary" />
          <QuickAction to="/admin/parceiros" icon={Users} label="Parceiros" color="bg-accent/10 text-accent" />
        </div>
      </section>

      {/* ── 5. Desempenho (colapsável) ── */}
      <Collapsible open={perfOpen} onOpenChange={setPerfOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Desempenho · 7 dias
          </h2>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", perfOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid gap-2">
            <PerfMetric label="Page Views" value={perf.views} icon={Eye} />
            <PerfMetric label="Visitantes Únicos" value={perf.visitors} icon={Monitor} />
            <PerfMetric label="Cliques Ingresso" value={perf.clicks} icon={MousePointerClick} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── 6. Oportunidades ── */}
      {opportunities.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Oportunidades</h2>
          <div className={cn("p-4 space-y-2", GLASS)}>
            {opportunities.map((title, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-foreground/80 truncate">"{title}" tem poucas views</span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">Considere divulgar esses eventos nas redes sociais</p>
          </div>
        </section>
      )}

      {/* ── 7. Atividade recente ── */}
      {recentActivity.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Atividade recente</h2>
          <div className={cn("p-4", GLASS)}>
            <ul className="space-y-1">
              {recentActivity.map(item => (
                <li key={item.id}>
                  <Link
                    to={item.type === "event" ? `/admin/eventos/${item.id}/editar` : `/admin/parceiros/${item.id}/editar`}
                    className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded-xl text-xs hover:bg-muted/40 transition group"
                  >
                    <div className={cn("flex items-center justify-center h-7 w-7 rounded-lg shrink-0",
                      item.type === "event" ? "bg-primary/10" : "bg-accent/10"
                    )}>
                      {item.type === "event"
                        ? <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        : <Users className="h-3.5 w-3.5 text-accent" />
                      }
                    </div>
                    <span className="truncate flex-1 font-medium group-hover:text-primary transition">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(item.date).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
