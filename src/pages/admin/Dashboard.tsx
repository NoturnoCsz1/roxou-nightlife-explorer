import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Users, CalendarCheck, Clock, Eye, Monitor, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/admin/MetricCard";
import TopPartners from "@/components/admin/TopPartners";
import TopEvents from "@/components/admin/TopEvents";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))"];

interface TopPageItem {
  page: string;
  label: string;
  views: number;
}

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    eventsToday: 0,
    activePartners: 0,
    views7d: 0,
    uniqueVisitors: 0,
  });
  const [viewsByDay, setViewsByDay] = useState<{ day: string; views: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);
  const [topPages, setTopPages] = useState<TopPageItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [recentPartners, setRecentPartners] = useState<{ id: string; name: string; created_at: string }[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const now = new Date().toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [eventsRes, partnersRes, viewsRes, sessionsRes] = await Promise.all([
      supabase.from("events").select("id, title, slug, status, date_time, created_at"),
      supabase.from("partners").select("id, name, slug, active, created_at"),
      supabase.from("page_views").select("id, page_path, device_type, created_at, session_id").gte("created_at", sevenDaysAgo.toISOString()),
      supabase.from("visitor_sessions").select("session_id"),
    ]);

    const evts = eventsRes.data || [];
    const parts = partnersRes.data || [];
    const views = viewsRes.data || [];
    const sessions = sessionsRes.data || [];

    const published = evts.filter((e) => e.status === "published");
    const upcoming = published.filter((e) => e.date_time > now);
    const today = published.filter((e) => e.date_time >= todayStart.toISOString() && e.date_time <= todayEnd.toISOString());

    setMetrics({
      totalEvents: evts.length,
      upcomingEvents: upcoming.length,
      eventsToday: today.length,
      activePartners: parts.filter((p) => p.active).length,
      views7d: views.length,
      uniqueVisitors: sessions.length,
    });

    // Build slug->title maps for friendly labels
    const eventSlugTitle = new Map(evts.map((e) => [e.slug, e.title]));
    const partnerSlugName = new Map(parts.map((p) => [p.slug, p.name]));

    // Views by day (last 7 days)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
    const dayMap: Record<string, number> = {};
    last7.forEach((d) => (dayMap[d] = 0));
    views.forEach((v) => {
      const day = v.created_at.split("T")[0];
      if (dayMap[day] !== undefined) dayMap[day]++;
    });
    setViewsByDay(last7.map((d) => ({ day: d.slice(5), views: dayMap[d] })));

    // Device breakdown
    const devMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    views.forEach((v) => {
      const t = v.device_type || "desktop";
      devMap[t] = (devMap[t] || 0) + 1;
    });
    setDeviceData(Object.entries(devMap).map(([name, value]) => ({ name, value })));

    // Top pages with friendly labels
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

    // Recent
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
  }

  return (
    <div className="space-y-6 md:ml-44">
      {/* Quick actions */}
      <div className="flex gap-2.5">
        <Link to="/admin/eventos/novo" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition">
          <Plus className="h-3.5 w-3.5" /> Novo Evento
        </Link>
        <Link to="/admin/parceiros/novo" className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground shadow-sm hover:opacity-90 transition">
          <Plus className="h-3.5 w-3.5" /> Novo Parceiro
        </Link>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Total Eventos" value={metrics.totalEvents} icon={CalendarDays} />
        <MetricCard title="Próximos" value={metrics.upcomingEvents} icon={Clock} />
        <MetricCard title="Hoje" value={metrics.eventsToday} icon={CalendarCheck} />
        <MetricCard title="Parceiros Ativos" value={metrics.activePartners} icon={Users} />
        <MetricCard title="Views (7d)" value={metrics.views7d} icon={Eye} />
        <MetricCard title="Visitantes Únicos" value={metrics.uniqueVisitors} icon={Monitor} />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Visualizações (7 dias)</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Dispositivos</h3>
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

      {/* Top pages with friendly names */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Páginas Mais Visitadas</h3>
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
        <TopEvents />
        <TopPartners />
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Últimos Eventos</h3>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum evento ainda</p>
          ) : (
            <ul className="space-y-2">
              {recentEvents.map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/eventos/${e.id}/editar`} className="flex justify-between items-center text-xs hover:text-primary transition">
                    <span className="truncate font-medium">{e.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {new Date(e.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Últimos Parceiros</h3>
          {recentPartners.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Nenhum parceiro ainda</p>
          ) : (
            <ul className="space-y-2">
              {recentPartners.map((p) => (
                <li key={p.id}>
                  <Link to={`/admin/parceiros/${p.id}/editar`} className="flex justify-between items-center text-xs hover:text-primary transition">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
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
