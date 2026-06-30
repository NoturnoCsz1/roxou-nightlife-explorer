import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  listLinksByBio,
  listMenu,
  listQrCodes,
  type BioProfile,
} from "@/services/bio";
import { Kpi, classifySource } from "./shared";

export function BioHomeTab({ bio, partnerId }: { bio: BioProfile; partnerId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    views_today: number;
    views_7d: number;
    clicks_7d: number;
    whatsapp_clicks: number;
    ctr: number;
    series: Array<{ date: string; views: number; clicks: number }>;
    sources: Array<{ name: string; count: number }>;
    events_count: number;
    reservations_count: number;
    vip_count: number;
    excursions_count: number;
    menu_count: number;
    links_count: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [events, vipList, links, qrs, menu, evCount, reservs, exc] = await Promise.all([
          supabase
            .from("bio_analytics_events" as never)
            .select("event_type, created_at, referrer, source")
            .eq("bio_id", bio.id)
            .gte("created_at", since30),
          supabase.from("partner_vip_lists").select("id", { count: "exact", head: true }).eq("partner_id", partnerId),
          listLinksByBio(bio.id),
          listQrCodes(bio.id),
          listMenu(bio.id),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("partner_id", partnerId)
            .eq("status", "published")
            .gte("date_time", new Date().toISOString()),
          supabase
            .from("partner_reservations" as never)
            .select("id", { count: "exact", head: true })
            .eq("partner_id", partnerId),
          supabase
            .from("excursion_trips" as never)
            .select("id", { count: "exact", head: true })
            .eq("partner_id", partnerId)
            .gte("departure_at", new Date().toISOString()),
        ]);

        if (cancelled) return;

        const rows =
          (events.data as Array<{ event_type: string; created_at: string; referrer: string | null; source: string | null }>) ?? [];

        const dailyMap = new Map<string, { views: number; clicks: number }>();
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          dailyMap.set(key, { views: 0, clicks: 0 });
        }
        const since7 = Date.now() - 7 * 86400000;
        let views7 = 0;
        let clicks7 = 0;
        let viewsToday = 0;
        let whats = 0;
        const sourceMap = new Map<string, number>();

        for (const r of rows) {
          const t = new Date(r.created_at).getTime();
          const k = new Date(r.created_at).toISOString().slice(0, 10);
          const slot = dailyMap.get(k);
          if (r.event_type === "bio_view") {
            if (slot) slot.views += 1;
            if (t >= since7) views7 += 1;
            if (new Date(r.created_at) >= todayStart) viewsToday += 1;
            const src = classifySource(r.referrer, r.source);
            sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
          } else {
            if (slot) slot.clicks += 1;
            if (t >= since7) clicks7 += 1;
            if (r.event_type === "whatsapp_click") whats += 1;
          }
        }

        const series = Array.from(dailyMap.entries()).map(([date, v]) => ({
          date: date.slice(5),
          views: v.views,
          clicks: v.clicks,
        }));

        setData({
          views_today: viewsToday,
          views_7d: views7,
          clicks_7d: clicks7,
          whatsapp_clicks: whats,
          ctr: views7 > 0 ? Math.round((clicks7 / views7) * 100) : 0,
          series,
          sources: Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          events_count: evCount.count ?? 0,
          reservations_count: reservs.count ?? 0,
          vip_count: vipList.count ?? 0,
          excursions_count: exc.count ?? 0,
          menu_count: menu.items.length,
          links_count: links.length,
        });
      } catch (e) {
        console.warn("[Bio Home]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bio.id, partnerId]);

  if (loading || !data) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Visitas hoje" value={data.views_today} accent="from-purple-500/20 to-fuchsia-500/10" />
        <Kpi label="Visitas 7d" value={data.views_7d} accent="from-blue-500/20 to-purple-500/10" />
        <Kpi label="Cliques 7d" value={data.clicks_7d} accent="from-pink-500/20 to-orange-500/10" />
        <Kpi label="WhatsApp" value={data.whatsapp_clicks} accent="from-emerald-500/20 to-teal-500/10" />
        <Kpi label="CTR" value={`${data.ctr}%`} accent="from-amber-500/20 to-orange-500/10" />
        <Kpi label="Eventos" value={data.events_count} />
        <Kpi label="Reservas" value={data.reservations_count} />
        <Kpi label="Excursões" value={data.excursions_count} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-purple-500" /> Últimos 30 dias
          </div>
          <span className="text-xs text-muted-foreground">visitas vs cliques</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(280 90% 60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(280 90% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(330 90% 60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(330 90% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} width={24} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="views" stroke="hsl(280 90% 60%)" fill="url(#gv)" strokeWidth={2} />
              <Area type="monotone" dataKey="clicks" stroke="hsl(330 90% 60%)" fill="url(#gc)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Origem dos acessos (30d)</div>
        {data.sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <div className="space-y-2">
            {data.sources.map((s) => {
              const total = data.sources.reduce((acc, x) => acc + x.count, 0) || 1;
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
