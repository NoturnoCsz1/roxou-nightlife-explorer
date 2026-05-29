import { useEffect, useState } from "react";
import { Zap, TrendingUp, TrendingDown, Flame, AlertTriangle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import { DashboardPeriod, getPeriodRange, getPeriodLabel, getPeriodDayCount } from "@/lib/dashboardPeriod";

interface Alert {
  icon: "fire" | "up" | "down" | "warning" | "star" | "zap";
  title: string;
  description: string;
  type: "positive" | "negative" | "neutral";
}

const ICON_MAP = {
  fire: Flame,
  up: TrendingUp,
  down: TrendingDown,
  warning: AlertTriangle,
  star: Star,
  zap: Zap,
};

const TYPE_STYLES = {
  positive: "border-green-500/30 bg-green-500/5",
  negative: "border-red-500/30 bg-red-500/5",
  neutral: "border-border/40 bg-card",
};

const ICON_STYLES = {
  positive: "text-green-500",
  negative: "text-red-500",
  neutral: "text-primary",
};

interface DashboardAlertsProps {
  period: DashboardPeriod;
}

const DashboardAlerts = ({ period }: DashboardAlertsProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    async function compute() {
      const sinceDate = getPeriodRange(period);
      const sinceISO = sinceDate.toISOString();

      // Compute previous period range for comparison
      const dayCount = getPeriodDayCount(period);
      const prevEnd = new Date(sinceDate);
      const prevStart = new Date(sinceDate);
      prevStart.setDate(prevStart.getDate() - dayCount);

      // Trending event: last 24h vs previous 24h
      const now24h = new Date();
      const since24h = new Date(now24h);
      since24h.setHours(since24h.getHours() - 24);
      const prev24hStart = new Date(since24h);
      prev24hStart.setHours(prev24hStart.getHours() - 24);

      const [eventsRes, views, prevViews, views24h, prevViews24h] = await Promise.all([
        supabase.from("events").select("title, slug, status, date_time").eq("status", "published"),
        fetchAllRows<{ page_path: string; created_at: string }>(
          () => supabase.from("page_views").select("page_path, created_at").gte("created_at", sinceISO)
        ),
        fetchAllRows<{ page_path: string; created_at: string }>(
          () => supabase.from("page_views").select("page_path, created_at").gte("created_at", prevStart.toISOString()).lt("created_at", sinceISO)
        ),
        fetchAllRows<{ page_path: string }>(
          () => supabase.from("page_views").select("page_path").gte("created_at", since24h.toISOString())
        ),
        fetchAllRows<{ page_path: string }>(
          () => supabase.from("page_views").select("page_path").gte("created_at", prev24hStart.toISOString()).lt("created_at", since24h.toISOString())
        ),
      ]);

      const events = eventsRes.data || [];

      const result: Alert[] = [];

      const slugToTitle = new Map(events.map((e) => [e.slug, e.title]));

      // 0. 🔥 Trending event (24h vs previous 24h)
      const views24hMap: Record<string, number> = {};
      const prevViews24hMap: Record<string, number> = {};
      views24h.forEach((v) => {
        const m = v.page_path.match(/^\/evento\/(.+)$/);
        if (m && slugToTitle.has(m[1])) views24hMap[m[1]] = (views24hMap[m[1]] || 0) + 1;
      });
      prevViews24h.forEach((v) => {
        const m = v.page_path.match(/^\/evento\/(.+)$/);
        if (m && slugToTitle.has(m[1])) prevViews24hMap[m[1]] = (prevViews24hMap[m[1]] || 0) + 1;
      });

      let trendingSlug = "";
      let trendingGrowth = 0;
      let trendingViews = 0;
      Object.entries(views24hMap).forEach(([slug, curr]) => {
        const prev = prevViews24hMap[slug] || 0;
        if (curr >= 3 && prev >= 1) {
          const growth = ((curr - prev) / prev) * 100;
          if (growth > trendingGrowth) {
            trendingGrowth = growth;
            trendingSlug = slug;
            trendingViews = curr;
          }
        } else if (curr >= 5 && prev === 0) {
          // New spike from zero
          const growth = curr * 100;
          if (growth > trendingGrowth) {
            trendingGrowth = growth;
            trendingSlug = slug;
            trendingViews = curr;
          }
        }
      });
      if (trendingSlug) {
        result.push({
          icon: "fire",
          title: "Evento em alta hoje",
          description: `"${slugToTitle.get(trendingSlug)}" com ${trendingViews} views nas últimas 24h (+${trendingGrowth.toFixed(0)}%)`,
          type: "positive",
        });
      }

      // 1. Most viewed event (period)
      const eventViewMap: Record<string, number> = {};
      views.forEach((v) => {
        const m = v.page_path.match(/^\/evento\/(.+)$/);
        if (m && slugToTitle.has(m[1])) {
          eventViewMap[m[1]] = (eventViewMap[m[1]] || 0) + 1;
        }
      });
      const topEvent = Object.entries(eventViewMap).sort((a, b) => b[1] - a[1])[0];
      if (topEvent) {
        result.push({
          icon: "star",
          title: "Evento mais visto",
          description: `"${slugToTitle.get(topEvent[0])}" com ${topEvent[1]} visualizações`,
          type: "positive",
        });
      }

      // 2. Traffic comparison with previous period
      const currentTotal = views.length;
      const prevTotal = prevViews.length;
      if (prevTotal > 0) {
        const change = ((currentTotal - prevTotal) / prevTotal) * 100;
        if (change > 15) {
          result.push({
            icon: "up",
            title: "Tráfego em alta",
            description: `+${change.toFixed(0)}% de views comparado ao período anterior (${prevTotal} → ${currentTotal})`,
            type: "positive",
          });
        } else if (change < -15) {
          result.push({
            icon: "down",
            title: "Queda no tráfego",
            description: `${change.toFixed(0)}% de views comparado ao período anterior (${prevTotal} → ${currentTotal})`,
            type: "negative",
          });
        }
      }

      // 3. Traffic spike day
      const dayMap: Record<string, number> = {};
      views.forEach((v) => {
        const day = v.created_at.split("T")[0];
        dayMap[day] = (dayMap[day] || 0) + 1;
      });
      const dayEntries = Object.entries(dayMap).sort((a, b) => b[1] - a[1]);
      if (dayEntries.length > 1) {
        const avg = views.length / dayEntries.length;
        const [spikeDay, spikeCount] = dayEntries[0];
        if (spikeCount > avg * 1.5) {
          const formatted = new Date(spikeDay + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
          result.push({
            icon: "zap",
            title: "Pico de tráfego",
            description: `${formatted} teve ${spikeCount} views — ${((spikeCount / avg - 1) * 100).toFixed(0)}% acima da média`,
            type: "neutral",
          });
        }
      }

      // 4. Low-performing published events
      const nowISO = new Date().toISOString();
      const upcomingEvents = events.filter((e) => e.date_time > nowISO);
      const lowPerformers = upcomingEvents
        .filter((e) => (eventViewMap[e.slug] || 0) <= 1)
        .slice(0, 3);
      if (lowPerformers.length > 0) {
        const names = lowPerformers.map((e) => `"${e.title}"`).join(", ");
        result.push({
          icon: "warning",
          title: `${lowPerformers.length} evento${lowPerformers.length > 1 ? "s" : ""} com poucas views`,
          description: `${names} ${lowPerformers.length > 1 ? "têm" : "tem"} poucas visualizações`,
          type: "negative",
        });
      }

      // 5. Top partner growth
      const partnerViewsCurrent: Record<string, number> = {};
      const partnerViewsPrev: Record<string, number> = {};
      views.forEach((v) => {
        const m = v.page_path.match(/^\/local\/(.+)$/);
        if (m) partnerViewsCurrent[m[1]] = (partnerViewsCurrent[m[1]] || 0) + 1;
      });
      prevViews.forEach((v) => {
        const m = v.page_path.match(/^\/local\/(.+)$/);
        if (m) partnerViewsPrev[m[1]] = (partnerViewsPrev[m[1]] || 0) + 1;
      });
      let bestGrowthSlug = "";
      let bestGrowthPct = 0;
      Object.entries(partnerViewsCurrent).forEach(([slug, curr]) => {
        const prev = partnerViewsPrev[slug] || 0;
        if (prev >= 2) {
          const pct = ((curr - prev) / prev) * 100;
          if (pct > bestGrowthPct) {
            bestGrowthPct = pct;
            bestGrowthSlug = slug;
          }
        }
      });
      if (bestGrowthSlug && bestGrowthPct > 20) {
        result.push({
          icon: "star",
          title: "Parceiro em crescimento",
          description: `"${bestGrowthSlug}" cresceu +${bestGrowthPct.toFixed(0)}% em views comparado ao período anterior`,
          type: "positive",
        });
      }

      setAlerts(result);
    }
    compute();
  }, [period]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Insights · {getPeriodLabel(period)}
        </h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {alerts.map((alert, i) => {
          const Icon = ICON_MAP[alert.icon];
          return (
            <div
              key={i}
              className={`rounded-2xl border p-4 backdrop-blur-sm transition-all hover:scale-[1.01] ${TYPE_STYLES[alert.type]}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex items-center justify-center h-8 w-8 rounded-xl shrink-0 ${
                  alert.type === "positive" ? "bg-green-500/10" :
                  alert.type === "negative" ? "bg-red-500/10" : "bg-primary/10"
                }`}>
                  <Icon className={`h-4 w-4 ${ICON_STYLES[alert.type]}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardAlerts;
