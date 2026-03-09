import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Users, CalendarCheck, Clock, Eye, Monitor, Plus, Download, MousePointerClick } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/admin/MetricCard";
import TopPartners from "@/components/admin/TopPartners";
import TopEvents from "@/components/admin/TopEvents";
import PeriodFilter from "@/components/admin/PeriodFilter";
import { DashboardPeriod, getPeriodRange, getPeriodLabel, getPeriodDayCount } from "@/lib/dashboardPeriod";
import DashboardAlerts from "@/components/admin/DashboardAlerts";
import { exportCSV, exportExcel } from "@/lib/dashboardExport";
import type { TopEventExport } from "@/components/admin/TopEvents";
import type { TopPartnerExport } from "@/components/admin/TopPartners";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))"];

interface TopPageItem {
  page: string;
  label: string;
  views: number;
}

const Dashboard = () => {
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
      },
      topPages: topPages.map((p) => ({ label: p.label, views: p.views })),
      topEvents: topEventsRef.current,
      topPartners: topPartnersRef.current,
    };
    if (format === "csv") exportCSV(data);
    else exportExcel(data);
  }, [period, metrics, topPages]);

  const loadDashboard = useCallback(async () => {
    const now = new Date().toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [eventsRes, partnersRes, viewsRes, sessionsRes, clicksRes] = await Promise.all([
      supabase.from("events").select("id, title, slug, status, date_time, created_at"),
      supabase.from("partners").select("id, name, slug, active, created_at"),
      supabase.from("page_views").select("id, page_path, device_type, created_at, session_id").gte("created_at", sinceISO),
      supabase.from("visitor_sessions").select("session_id"),
      supabase.from("ticket_clicks").select("event_id, created_at").gte("created_at", sinceISO),
    ]);

    const evts = eventsRes.data || [];
    const parts = partnersRes.data || [];
    const views = viewsRes.data || [];
    const sessions = sessionsRes.data || [];
    const clicks = clicksRes.data || [];

    const published = evts.filter((e) => e.status === "published");
    const upcoming = published.filter((e) => e.date_time > now);
    const today = published.filter((e) => e.date_time >= todayStart.toISOString() && e.date_time <= todayEnd.toISOString());

    setMetrics({
      totalEvents: evts.length,
      upcomingEvents: upcoming.length,
      eventsToday: today.length,
      activePartners: parts.filter((p) => p.active).length,
      periodViews: views.length,
      uniqueVisitors: sessions.length,
      ticketClicks: clicks.length,
    });

    // Ticket clicks by day
    const clickDayMap: Record<string, number> = {};
    days.forEach((d) => (clickDayMap[d] = 0));
    clicks.forEach((c) => {
      const day = c.created_at.split("T")[0];
      if (clickDayMap[day] !== undefined) clickDayMap[day]++;
    });

    // Top clicked events
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
    <div className="space-y-6 md:ml-44">
      {/* Quick actions + period filter + export */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2.5">
            <Link to="/admin/eventos/novo" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition">
              <Plus className="h-3.5 w-3.5" /> Novo Evento
            </Link>
            <Link to="/admin/parceiros/novo" className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground shadow-sm hover:opacity-90 transition">
              <Plus className="h-3.5 w-3.5" /> Novo Parceiro
            </Link>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <PeriodFilter value={period} onChange={setPeriod} />
            <div className="flex gap-1.5">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-1 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-1 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition"
              >
                <Download className="h-3 w-3" /> Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Total Eventos" value={metrics.totalEvents} icon={CalendarDays} />
        <MetricCard title="Próximos" value={metrics.upcomingEvents} icon={Clock} />
        <MetricCard title="Hoje" value={metrics.eventsToday} icon={CalendarCheck} />
        <MetricCard title="Parceiros Ativos" value={metrics.activePartners} icon={Users} />
        <MetricCard title={`Views (${getPeriodLabel(period)})`} value={metrics.periodViews} icon={Eye} />
        <MetricCard title="Visitantes Únicos" value={metrics.uniqueVisitors} icon={Monitor} />
      </div>

      {/* Insights / Alerts */}
      <DashboardAlerts period={period} />

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Visualizações ({getPeriodLabel(period)})</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={period === "30d" || period === "mes" ? 4 : 0} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dispositivos ({getPeriodLabel(period)})</h3>
          <div className="h-44 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {deviceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top pages */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Páginas Mais Visitadas ({getPeriodLabel(period)})</h3>
        <div className="space-y-2">
          {topPages.map((p, i) => (
            <div key={p.page} className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">{p.label}</span>
                  <span className="text-xs font-bold text-foreground shrink-0">{p.views}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${topPages[0] ? (p.views / topPages[0].views) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top events + Top partners */}
      <div className="grid md:grid-cols-2 gap-4">
        <TopEvents since={sinceISO} onDataLoaded={handleTopEventsLoaded} />
        <TopPartners since={sinceISO} onDataLoaded={handleTopPartnersLoaded} />
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4 overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground mb-3">Últimos Eventos</h3>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum evento ainda</p>
          ) : (
            <ul className="space-y-1">
              {recentEvents.map((e) => (
                <li key={e.id} className="min-w-0">
                  <Link to={`/admin/eventos/${e.id}/editar`} className="flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded-lg text-xs hover:bg-muted/50 hover:text-primary transition min-w-0">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate min-w-0 flex-1 font-medium">{e.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground mb-3">Últimos Parceiros</h3>
          {recentPartners.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum parceiro ainda</p>
          ) : (
            <ul className="space-y-1">
              {recentPartners.map((p) => (
                <li key={p.id} className="min-w-0">
                  <Link to={`/admin/parceiros/${p.id}/editar`} className="flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded-lg text-xs hover:bg-muted/50 hover:text-primary transition min-w-0">
                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate min-w-0 flex-1 font-medium">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
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
