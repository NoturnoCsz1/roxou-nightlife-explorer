import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Users, Star, Eye, Monitor, Smartphone, Tablet, TrendingUp, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/admin/MetricCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))"];

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    totalPartners: 0,
    activeEvents: 0,
    featuredEvents: 0,
    totalViews: 0,
    uniqueVisitors: 0,
  });
  const [viewsByDay, setViewsByDay] = useState<{ day: string; views: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);
  const [topPages, setTopPages] = useState<{ page: string; views: number }[]>([]);
  const [recentEvents, setRecentEvents] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [recentPartners, setRecentPartners] = useState<{ id: string; name: string; created_at: string }[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [eventsRes, partnersRes, viewsRes, sessionsRes] = await Promise.all([
      supabase.from("events").select("id, title, status, featured, created_at"),
      supabase.from("partners").select("id, name, active, created_at"),
      supabase.from("page_views").select("id, page_path, device_type, created_at, session_id"),
      supabase.from("visitor_sessions").select("session_id"),
    ]);

    const evts = eventsRes.data || [];
    const parts = partnersRes.data || [];
    const views = viewsRes.data || [];
    const sessions = sessionsRes.data || [];

    setMetrics({
      totalEvents: evts.length,
      totalPartners: parts.length,
      activeEvents: evts.filter((e) => e.status === "published").length,
      featuredEvents: evts.filter((e) => e.featured).length,
      totalViews: views.length,
      uniqueVisitors: sessions.length,
    });

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

    // Top pages
    const pageMap: Record<string, number> = {};
    views.forEach((v) => {
      pageMap[v.page_path] = (pageMap[v.page_path] || 0) + 1;
    });
    setTopPages(
      Object.entries(pageMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, views]) => ({ page, views }))
    );

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
    <div className="space-y-5 md:ml-44">
      {/* Quick actions */}
      <div className="flex gap-2">
        <Link to="/admin/eventos/novo" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Novo Evento
        </Link>
        <Link to="/admin/parceiros/novo" className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">
          <Plus className="h-3.5 w-3.5" /> Novo Parceiro
        </Link>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <MetricCard title="Total Eventos" value={metrics.totalEvents} icon={CalendarDays} />
        <MetricCard title="Parceiros" value={metrics.totalPartners} icon={Users} />
        <MetricCard title="Eventos Ativos" value={metrics.activeEvents} icon={TrendingUp} />
        <MetricCard title="Em Destaque" value={metrics.featuredEvents} icon={Star} />
        <MetricCard title="Visualizações" value={metrics.totalViews} icon={Eye} />
        <MetricCard title="Visitantes Únicos" value={metrics.uniqueVisitors} icon={Monitor} />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Views line chart */}
        <div className="rounded-xl border border-border/40 bg-card p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Visualizações (7 dias)</h3>
          <div className="h-40">
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

        {/* Device pie chart */}
        <div className="rounded-xl border border-border/40 bg-card p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Dispositivos</h3>
          <div className="h-40 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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
      <div className="rounded-xl border border-border/40 bg-card p-3">
        <h3 className="text-xs font-semibold text-foreground mb-2">Páginas Mais Visitadas</h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPages} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="page" type="category" tick={{ fontSize: 10 }} width={120} stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/40 bg-card p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Últimos Eventos</h3>
          {recentEvents.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-4 text-center">Nenhum evento ainda</p>
          ) : (
            <ul className="space-y-1.5">
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
        <div className="rounded-xl border border-border/40 bg-card p-3">
          <h3 className="text-xs font-semibold text-foreground mb-2">Últimos Parceiros</h3>
          {recentPartners.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-4 text-center">Nenhum parceiro ainda</p>
          ) : (
            <ul className="space-y-1.5">
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
