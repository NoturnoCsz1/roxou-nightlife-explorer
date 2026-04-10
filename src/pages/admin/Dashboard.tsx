import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import { CalendarDays, Users, CalendarCheck, Clock, Eye, Monitor, Plus, Download, MousePointerClick, BarChart3, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import MetricCard from "@/components/admin/MetricCard";
import TopPartners from "@/components/admin/TopPartners";
import TopEvents from "@/components/admin/TopEvents";
import PeriodFilter from "@/components/admin/PeriodFilter";
import { DashboardPeriod, getPeriodRange, getPeriodLabel, getPeriodDayCount } from "@/lib/dashboardPeriod";
import DashboardAlerts from "@/components/admin/DashboardAlerts";
import InstagramContentGenerator from "@/components/admin/InstagramContentGenerator";
import { exportCSV, exportExcel } from "@/lib/dashboardExport";
import type { TopEventExport } from "@/components/admin/TopEvents";
import type { TopPartnerExport } from "@/components/admin/TopPartners";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))"];

interface TopPageItem {
  page: string;
  label: string;
  views: number;
}

const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
  </div>
);

const ChartCard = ({ children, title, icon }: { children: React.ReactNode; title: string; icon?: React.ElementType }) => (
  <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5 transition-all hover:border-border/50">
    <div className="flex items-center gap-2 mb-4">
      {icon && <icon className="h-4 w-4 text-primary" />}
      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

const Dashboard = () => {
  const { cityFilter } = useAdminProfile();
  const [period, setPeriod] = useState<DashboardPeriod>("7d");
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    eventsToday: 0,
    activePartners: 0,
    periodViews: 0,
    uniqueVisitors: 0,
    ticketClicks: 0,
  });
  const [viewsByDay, setViewsByDay] = useState<{ day: string; views: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);
  const [topPages, setTopPages] = useState<TopPageItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [recentPartners, setRecentPartners] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [clicksByDay, setClicksByDay] = useState<{ day: string; clicks: number }[]>([]);
  const [topClickedEvents, setTopClickedEvents] = useState<{ title: string; clicks: number }[]>([]);

  const topEventsRef = useRef<TopEventExport[]>([]);
  const topPartnersRef = useRef<TopPartnerExport[]>([]);

  const sinceISO = getPeriodRange(period).toISOString();

  const handleTopEventsLoaded = useCallback((data: TopEventExport[]) => {
    topEventsRef.current = data;
  }, []);

  const handleTopPartnersLoaded = useCallback((data: TopPartnerExport[]) => {
    topPartnersRef.current = data;
  }, []);

  const handleExport = useCallback((format: "csv" | "excel") => {
    const data = {
      period,
      metrics: {
        "Total Eventos": metrics.totalEvents,
        "Próximos": metrics.upcomingEvents,
        "Hoje": metrics.eventsToday,
        "Parceiros Ativos": metrics.activePartners,
        [`Views (${getPeriodLabel(period)})`]: metrics.periodViews,
        "Visitantes Únicos": metrics.uniqueVisitors,
        [`Cliques Ingresso (${getPeriodLabel(period)})`]: metrics.ticketClicks,
      },
      topPages: topPages.map((p) => ({ label: p.label, views: p.views })),
      topEvents: topEventsRef.current,
      topPartners: topPartnersRef.current,
      clicksByDay,
      topClickedEvents,
    };
    if (format === "csv") exportCSV(data);
    else exportExcel(data);
  }, [period, metrics, topPages, clicksByDay, topClickedEvents]);

  const loadDashboard = useCallback(async () => {
    const now = new Date().toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let eventsQuery = supabase.from("events").select("id, title, slug, status, date_time, created_at");
    let partnersQuery = supabase.from("partners").select("id, name, slug, active, created_at");
    if (cityFilter) {
      eventsQuery = eventsQuery.eq("city", cityFilter);
      partnersQuery = partnersQuery.eq("city", cityFilter);
    }

    const [eventsRes, partnersRes, sessionsCountRes, viewsCountRes, clicksCountRes] = await Promise.all([
      eventsQuery,
      partnersQuery,
      supabase.from("visitor_sessions").select("id", { count: "exact", head: true }),
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", sinceISO),
      supabase.from("ticket_clicks").select("id", { count: "exact", head: true }).gte("created_at", sinceISO),
    ]);

    const evts = eventsRes.data || [];
    const parts = partnersRes.data || [];

    const [views, clicks] = await Promise.all([
      fetchAllRows<{ id: string; page_path: string; device_type: string | null; created_at: string; session_id: string | null }>(
        () => supabase.from("page_views").select("id, page_path, device_type, created_at, session_id").gte("created_at", sinceISO)
      ),
      fetchAllRows<{ event_id: string; created_at: string }>(
        () => supabase.from("ticket_clicks").select("event_id, created_at").gte("created_at", sinceISO)
      ),
    ]);

    const published = evts.filter((e) => e.status === "published");
    const upcoming = published.filter((e) => e.date_time > now);
    const today = published.filter((e) => e.date_time >= todayStart.toISOString() && e.date_time <= todayEnd.toISOString());

    setMetrics({
      totalEvents: evts.length,
      upcomingEvents: upcoming.length,
      eventsToday: today.length,
      activePartners: parts.filter((p) => p.active).length,
      periodViews: viewsCountRes.count ?? views.length,
      uniqueVisitors: sessionsCountRes.count ?? 0,
      ticketClicks: clicksCountRes.count ?? clicks.length,
    });

    const eventSlugTitle = new Map(evts.map((e) => [e.slug, e.title]));
    const partnerSlugName = new Map(parts.map((p) => [p.slug, p.name]));

    const dayCount = getPeriodDayCount(period);
    const days = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (dayCount - 1 - i));
      return d.toISOString().split("T")[0];
    });
    const dayMap: Record<string, number> = {};
    days.forEach((d) => (dayMap[d] = 0));
    views.forEach((v) => {
      const day = v.created_at.split("T")[0];
      if (dayMap[day] !== undefined) dayMap[day]++;
    });
    setViewsByDay(days.map((d) => ({ day: d.slice(5), views: dayMap[d] })));

    const clickDayMap: Record<string, number> = {};
    days.forEach((d) => (clickDayMap[d] = 0));
    clicks.forEach((c) => {
      const day = c.created_at.split("T")[0];
      if (clickDayMap[day] !== undefined) clickDayMap[day]++;
    });
    setClicksByDay(days.map((d) => ({ day: d.slice(5), clicks: clickDayMap[d] })));

    const eventIdTitle = new Map(evts.map((e) => [e.id, e.title]));
    const clickEventMap: Record<string, number> = {};
    clicks.forEach((c) => {
      if (c.event_id) clickEventMap[c.event_id] = (clickEventMap[c.event_id] || 0) + 1;
    });
    setTopClickedEvents(
      Object.entries(clickEventMap)
        .map(([id, count]) => ({ title: eventIdTitle.get(id) || id, clicks: count }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5)
    );

    const devMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    views.forEach((v) => {
      const t = v.device_type || "desktop";
      devMap[t] = (devMap[t] || 0) + 1;
    });
    setDeviceData(Object.entries(devMap).map(([name, value]) => ({ name, value })));

    const pageMap: Record<string, number> = {};
    views.forEach((v) => {
      pageMap[v.page_path] = (pageMap[v.page_path] || 0) + 1;
    });
    const topPagesData = Object.entries(pageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([page, views]) => {
        let label = page;
        const eventMatch = page.match(/^\/evento\/(.+)$/);
        if (eventMatch) {
          const title = eventSlugTitle.get(eventMatch[1]);
          label = title ? `🎉 ${title}` : page;
        }
        const localMatch = page.match(/^\/local\/(.+)$/);
        if (localMatch) {
          const name = partnerSlugName.get(localMatch[1]);
          label = name ? `📍 ${name}` : page;
        }
        if (page === "/") label = "🏠 Página Inicial";
        if (page === "/hoje") label = "📅 Hoje";
        if (page === "/semana") label = "📆 Esta Semana";
        if (page === "/categorias") label = "🏷️ Categorias";
        return { page, label, views };
      });
    setTopPages(topPagesData);

    setRecentEvents(
      evts
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map(({ id, title, created_at }) => ({ id, title, created_at }))
    );
    setRecentPartners(
      parts
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map(({ id, name, created_at }) => ({ id, name, created_at }))
    );
  }, [sinceISO, period]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-5 md:ml-44 overflow-hidden min-w-0">
      {/* Header row */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2">
            <Link to="/admin/eventos/novo" className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all">
              <Plus className="h-3.5 w-3.5" /> Evento
            </Link>
            <Link to="/admin/parceiros/novo" className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition-all">
              <Plus className="h-3.5 w-3.5" /> Parceiro
            </Link>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <PeriodFilter value={period} onChange={setPeriod} />
            <div className="flex gap-1">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
              >
                <Download className="h-3 w-3" /> Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics — 2 rows on mobile, all visible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard title="Total Eventos" value={metrics.totalEvents} icon={CalendarDays} accent="primary" />
        <MetricCard title="Próximos" value={metrics.upcomingEvents} icon={Clock} accent="accent" />
        <MetricCard title="Hoje" value={metrics.eventsToday} icon={CalendarCheck} accent="green" />
        <MetricCard title="Parceiros" value={metrics.activePartners} icon={Users} accent="amber" />
      </div>

      {/* Analytics metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard title={`Views`} value={metrics.periodViews} icon={Eye} accent="primary" />
        <MetricCard title="Visitantes" value={metrics.uniqueVisitors} icon={Monitor} accent="accent" />
        <MetricCard title="Cliques" value={metrics.ticketClicks} icon={MousePointerClick} accent="green" />
      </div>

      {/* Insights */}
      <DashboardAlerts period={period} />

      {/* Main chart — views trend */}
      <ChartCard title={`Visualizações · ${getPeriodLabel(period)}`}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={viewsByDay}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} interval={period === "30d" || period === "mes" ? 4 : 0} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
              />
              <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#viewsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Two-column: Devices + Top Pages */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Devices — compact */}
        <ChartCard title="Dispositivos">
          <div className="h-36 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={50}
                  innerRadius={28}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  strokeWidth={0}
                >
                  {deviceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Top Pages */}
        <div className="md:col-span-3 rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Páginas Mais Visitadas</h3>
          <div className="space-y-2.5">
            {topPages.map((p, i) => (
              <div key={p.page} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-primary/70 w-4 shrink-0 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium truncate text-foreground/90">{p.label}</span>
                    <span className="text-[11px] font-bold text-foreground tabular-nums shrink-0">{p.views}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary/30 transition-all duration-500"
                      style={{ width: `${topPages[0] ? (p.views / topPages[0].views) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket clicks */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title={`Cliques Ingresso · ${getPeriodLabel(period)}`}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clicksByDay}>
                <defs>
                  <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} interval={period === "30d" || period === "mes" ? 4 : 0} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  }}
                />
                <Area type="monotone" dataKey="clicks" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#clicksGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Eventos Mais Clicados</h3>
          {topClickedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Nenhum clique no período</p>
          ) : (
            <div className="space-y-2.5">
              {topClickedEvents.map((e, i) => (
                <div key={e.title} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-accent/70 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium truncate text-foreground/90">{e.title}</span>
                      <span className="text-[11px] font-bold text-foreground tabular-nums shrink-0">{e.clicks}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent/30 transition-all duration-500"
                        style={{ width: `${topClickedEvents[0] ? (e.clicks / topClickedEvents[0].clicks) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top events + Top partners */}
      <div className="grid md:grid-cols-2 gap-4">
        <TopEvents since={sinceISO} onDataLoaded={handleTopEventsLoaded} />
        <TopPartners since={sinceISO} onDataLoaded={handleTopPartnersLoaded} />
      </div>

      {/* Instagram Content Generator */}
      <InstagramContentGenerator />

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Últimos Eventos</h3>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum evento ainda</p>
          ) : (
            <ul className="space-y-0.5">
              {recentEvents.map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/eventos/${e.id}/editar`} className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl text-xs hover:bg-muted/40 transition group">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 shrink-0">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="truncate min-w-0 flex-1 font-medium group-hover:text-primary transition">{e.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(e.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Últimos Parceiros</h3>
          {recentPartners.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum parceiro ainda</p>
          ) : (
            <ul className="space-y-0.5">
              {recentPartners.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/parceiros/${p.id}/editar`} className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl text-xs hover:bg-muted/40 transition group">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-accent/10 shrink-0">
                      <Users className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="truncate min-w-0 flex-1 font-medium group-hover:text-accent transition">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
