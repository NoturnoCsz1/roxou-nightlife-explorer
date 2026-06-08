import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarCheck2,
  Eye,
  MousePointerClick,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Users,
  Ticket,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * AnalyticsHero — Premium analytics block (GA4-style) for the admin dashboard.
 * Phase 1: Header + KPIs + intelligent states (skeleton / cache / timestamp).
 * Uses only Supabase data (page_views, visitor_sessions, ticket_clicks, events).
 * No backend changes, no auth changes, no query rewrites elsewhere.
 */

type Period = "today" | "7d" | "30d" | "90d";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
};

interface KpiSnapshot {
  current: number;
  previous: number;
  spark: number[]; // bucketed counts
}

interface AnalyticsSnapshot {
  ts: number;
  period: Period;
  activeUsers: KpiSnapshot;
  sessions: KpiSnapshot;
  pageViews: KpiSnapshot;
  publishedEvents: KpiSnapshot;
  partnerClicks: KpiSnapshot;
  ticketClicks: KpiSnapshot;
}

const CACHE_KEY = (p: Period) => `roxou:analytics:v1:${p}`;

const GLASS =
  "rounded-2xl border border-border/15 bg-[hsl(var(--card)/0.6)] backdrop-blur-xl shadow-[0_4px_28px_-12px_hsl(var(--primary)/0.18)]";

function getPeriodRange(period: Period) {
  const end = new Date();
  const start = new Date();
  if (period === "today") start.setHours(0, 0, 0, 0);
  else if (period === "7d") start.setDate(start.getDate() - 7);
  else if (period === "30d") start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 90);
  const prevEnd = new Date(start);
  const prevStart = new Date(start);
  const days = period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  prevStart.setDate(prevStart.getDate() - days);
  return { start, end, prevStart, prevEnd, days };
}

function bucketize(rows: { created_at: string }[], start: Date, end: Date, buckets: number): number[] {
  const out = new Array(buckets).fill(0);
  const span = end.getTime() - start.getTime();
  if (span <= 0) return out;
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t < start.getTime() || t > end.getTime()) continue;
    const idx = Math.min(buckets - 1, Math.floor(((t - start.getTime()) / span) * buckets));
    out[idx]++;
  }
  return out;
}

function formatRelative(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "agora";
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  return `há ${Math.floor(diff / 3600)} h`;
}

function readCache(period: Period): AnalyticsSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(period));
    if (!raw) return null;
    return JSON.parse(raw) as AnalyticsSnapshot;
  } catch {
    return null;
  }
}

function writeCache(snap: AnalyticsSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY(snap.period), JSON.stringify(snap));
  } catch {
    /* quota / private mode — ignore */
  }
}

/* ───────────────────────────────────────────── KPI card ── */

interface KpiCardProps {
  label: string;
  value: number;
  previous: number;
  spark: number[];
  icon: React.ElementType;
  accent: string; // tailwind text/bg classes for icon
  format?: (n: number) => string;
  comparisonLabel: string;
  loading?: boolean;
}

const KpiCard = ({
  label,
  value,
  previous,
  spark,
  icon: Icon,
  accent,
  format = (n) => n.toLocaleString("pt-BR"),
  comparisonLabel,
  loading,
}: KpiCardProps) => {
  const delta = value - previous;
  const pct = previous > 0 ? (delta / previous) * 100 : value > 0 ? 100 : 0;
  const positive = delta > 0;
  const neutral = delta === 0;
  const data = spark.map((v, i) => ({ i, v }));

  return (
    <div
      className={cn(
        "relative overflow-hidden p-4 transition-all duration-300",
        "hover:border-primary/30 hover:-translate-y-0.5",
        "hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.35)]",
        GLASS
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2 relative">
        <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl shrink-0", accent)}>
          <Icon className="h-4 w-4" />
        </div>
        {!loading && !neutral && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
              positive
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/25 text-rose-400"
            )}
          >
            {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {positive ? "+" : ""}
            {pct.toFixed(0)}%
          </span>
        )}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
        {label}
      </p>

      <p className="mt-1 text-2xl md:text-[28px] font-bold tabular-nums text-foreground leading-tight">
        {loading ? <span className="text-muted-foreground/50">—</span> : format(value)}
      </p>

      <p className="text-[10px] text-muted-foreground/80 mt-0.5">
        {loading ? "Sincronizando…" : `${format(previous)} · ${comparisonLabel}`}
      </p>

      {/* Sparkline */}
      <div className="h-8 mt-2 -mx-1 opacity-90">
        {data.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────── main ── */

const AnalyticsHero = ({ cityFilter }: { cityFilter?: string | null }) => {
  const [period, setPeriod] = useState<Period>("7d");
  const [snap, setSnap] = useState<AnalyticsSnapshot | null>(() => readCache("7d"));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"live" | "syncing" | "error">("syncing");
  const [, force] = useState(0);
  const tickRef = useRef<number | null>(null);

  // tick every 30s to refresh "atualizado há X min"
  useEffect(() => {
    tickRef.current = window.setInterval(() => force((n) => n + 1), 30_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const load = useCallback(
    async (p: Period) => {
      setLoading(true);
      // Hydrate immediately from cache if available
      const cached = readCache(p);
      if (cached) setSnap(cached);

      try {
        const { start, end, prevStart, prevEnd, days } = getPeriodRange(p);
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const buckets = p === "today" ? 12 : Math.min(30, days);

        // Events filter (city-scoped)
        let eventsQ = supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "published");
        if (cityFilter) eventsQ = eventsQ.eq("city", cityFilter);

        const [
          activeRes,
          sessionsCurRes,
          sessionsPrevRes,
          pvCurRes,
          pvPrevRes,
          eventsCurRes,
          ticketCurRes,
          ticketPrevRes,
          partnerCurRes,
          partnerPrevRes,
        ] = await Promise.all([
          supabase
            .from("visitor_sessions")
            .select("id", { count: "exact", head: true })
            .gte("last_seen_at", fiveMinAgo),
          // Sparkline + count exact (count is total even when rows are capped at 1000)
          supabase
            .from("visitor_sessions")
            .select("started_at", { count: "exact" })
            .gte("started_at", start.toISOString())
            .lte("started_at", end.toISOString())
            .limit(1000),
          supabase
            .from("visitor_sessions")
            .select("id", { count: "exact", head: true })
            .gte("started_at", prevStart.toISOString())
            .lt("started_at", prevEnd.toISOString()),
          supabase
            .from("page_views")
            .select("created_at, page_path", { count: "exact" })
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .limit(1000),
          supabase
            .from("page_views")
            .select("id", { count: "exact", head: true })
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", prevEnd.toISOString()),
          eventsQ,
          supabase
            .from("ticket_clicks")
            .select("created_at", { count: "exact" })
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .limit(1000),
          supabase
            .from("ticket_clicks")
            .select("id", { count: "exact", head: true })
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", prevEnd.toISOString()),
          // Partner clicks (page_path /local/*) — count exact, head only
          supabase
            .from("page_views")
            .select("id", { count: "exact", head: true })
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .ilike("page_path", "/local/%"),
          supabase
            .from("page_views")
            .select("id", { count: "exact", head: true })
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", prevEnd.toISOString())
            .ilike("page_path", "/local/%"),
        ]);

        // Sparkline data (capped at 1000 rows — fine for visual trend)
        const pvRows = (pvCurRes.data || []) as { created_at: string; page_path: string }[];
        const partnerSparkRows = pvRows.filter((r) => /^\/local\//.test(r.page_path));
        const sessionsRows = ((sessionsCurRes.data || []) as { started_at: string }[]).map((r) => ({
          created_at: r.started_at,
        }));

        const newSnap: AnalyticsSnapshot = {
          ts: Date.now(),
          period: p,
          activeUsers: {
            current: activeRes.count ?? 0,
            previous: 0,
            spark: [],
          },
          sessions: {
            current: sessionsCurRes.count ?? sessionsCurRes.data?.length ?? 0,
            previous: sessionsPrevRes.count ?? 0,
            spark: bucketize(sessionsRows, start, end, buckets),
          },
          pageViews: {
            current: pvCurRes.count ?? pvRows.length,
            previous: pvPrevRes.count ?? 0,
            spark: bucketize(pvRows, start, end, buckets),
          },
          publishedEvents: {
            current: eventsCurRes.count ?? 0,
            previous: eventsCurRes.count ?? 0,
            spark: [],
          },
          partnerClicks: {
            current: partnerCurRes.count ?? partnerSparkRows.length,
            previous: partnerPrevRes.count ?? 0,
            spark: bucketize(partnerSparkRows, start, end, buckets),
          },
          ticketClicks: {
            current: ticketCurRes.count ?? ticketCurRes.data?.length ?? 0,
            previous: ticketPrevRes.count ?? 0,
            spark: bucketize(ticketCurRes.data || [], start, end, buckets),
          },
        };

        setSnap(newSnap);
        writeCache(newSnap);
        setStatus("live");
      } catch (e) {
        console.error("[AnalyticsHero] load failed", e);
        setStatus("error");
      } finally {
        setLoading(false);
      }
    },
    [cityFilter]
  );

  useEffect(() => {
    setSnap(readCache(period));
    load(period);
  }, [period, load]);

  const comparison = useMemo(() => {
    if (period === "today") return "vs. ontem";
    if (period === "7d") return "vs. 7 dias anteriores";
    if (period === "30d") return "vs. 30 dias anteriores";
    return "vs. 90 dias anteriores";
  }, [period]);

  const isFreshLoad = loading && !snap;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div
        className={cn(
          "flex flex-col gap-3 p-4 md:p-5 md:flex-row md:items-center md:justify-between",
          GLASS,
          "border-primary/20"
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold text-foreground tracking-tight">
              Analytics Roxou
            </h1>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                status === "live"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : status === "syncing"
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                  : "bg-rose-500/10 border-rose-500/25 text-rose-400"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status === "live"
                    ? "bg-emerald-400 animate-pulse"
                    : status === "syncing"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-rose-400"
                )}
              />
              {status === "live" ? "Ao vivo" : status === "syncing" ? "Sincronizando" : "Erro"}
            </span>
          </div>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">
            Monitoramento em tempo real da plataforma
            {snap && <> · atualizado {formatRelative(snap.ts)}</>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* period selector */}
          <div
            className="inline-flex rounded-xl border border-border/20 bg-card/40 p-0.5 backdrop-blur-sm"
            role="tablist"
            aria-label="Período"
          >
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={period === p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition",
                  period === p
                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>

          <button
            onClick={() => load(period)}
            disabled={loading}
            aria-label="Atualizar"
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm",
              "text-muted-foreground hover:text-foreground hover:border-primary/30 transition",
              loading && "opacity-50"
            )}
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Visitantes ativos"
          value={snap?.activeUsers.current ?? 0}
          previous={snap?.activeUsers.previous ?? 0}
          spark={snap?.activeUsers.spark ?? []}
          icon={Activity}
          accent="bg-emerald-500/10 text-emerald-400"
          comparisonLabel="agora · 5 min"
          loading={isFreshLoad}
        />
        <KpiCard
          label="Sessões"
          value={snap?.sessions.current ?? 0}
          previous={snap?.sessions.previous ?? 0}
          spark={snap?.sessions.spark ?? []}
          icon={Users}
          accent="bg-primary/10 text-primary"
          comparisonLabel={comparison}
          loading={isFreshLoad}
        />
        <KpiCard
          label="Visualizações"
          value={snap?.pageViews.current ?? 0}
          previous={snap?.pageViews.previous ?? 0}
          spark={snap?.pageViews.spark ?? []}
          icon={Eye}
          accent="bg-accent/10 text-accent"
          comparisonLabel={comparison}
          loading={isFreshLoad}
        />
        <KpiCard
          label="Eventos publicados"
          value={snap?.publishedEvents.current ?? 0}
          previous={snap?.publishedEvents.previous ?? 0}
          spark={snap?.publishedEvents.spark ?? []}
          icon={CalendarCheck2}
          accent="bg-violet-500/10 text-violet-400"
          comparisonLabel="total ativos"
          loading={isFreshLoad}
        />
        <KpiCard
          label="Cliques parceiros"
          value={snap?.partnerClicks.current ?? 0}
          previous={snap?.partnerClicks.previous ?? 0}
          spark={snap?.partnerClicks.spark ?? []}
          icon={MousePointerClick}
          accent="bg-pink-500/10 text-pink-400"
          comparisonLabel={comparison}
          loading={isFreshLoad}
        />
        <KpiCard
          label="Cliques ingresso"
          value={snap?.ticketClicks.current ?? 0}
          previous={snap?.ticketClicks.previous ?? 0}
          spark={snap?.ticketClicks.spark ?? []}
          icon={Ticket}
          accent="bg-amber-500/10 text-amber-400"
          comparisonLabel={comparison}
          loading={isFreshLoad}
        />
      </div>
    </div>
  );
};

export default AnalyticsHero;
