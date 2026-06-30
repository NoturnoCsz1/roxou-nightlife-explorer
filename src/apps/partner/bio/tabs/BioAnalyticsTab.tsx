import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { type BioProfile } from "@/services/bio";
import { BarList, Conv, Kpi, classifySource } from "./shared";

type Period = "today" | "7d" | "30d";

export function BioAnalyticsTab({ bio }: { bio: BioProfile }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    views: number;
    clicks: number;
    ctr: number;
    devices: Array<{ name: string; count: number }>;
    sources: Array<{ name: string; count: number }>;
    hours: Array<{ hour: number; count: number }>;
    topLinks: Array<{ link_id: string; count: number }>;
    conversions: { reservation: number; vip: number; transport: number; whatsapp: number };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const days = period === "today" ? 1 : period === "7d" ? 7 : 30;
        const since =
          period === "today"
            ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
            : new Date(Date.now() - days * 86400000).toISOString();

        const { data: rows } = await supabase
          .from("bio_analytics_events" as never)
          .select("event_type, created_at, referrer, source, device, link_id")
          .eq("bio_id", bio.id)
          .gte("created_at", since);

        if (cancelled) return;

        const list =
          (rows as Array<{
            event_type: string;
            created_at: string;
            referrer: string | null;
            source: string | null;
            device: string | null;
            link_id: string | null;
          }>) ?? [];

        let views = 0,
          clicks = 0,
          rsv = 0,
          vip = 0,
          tr = 0,
          wa = 0;
        const dev = new Map<string, number>();
        const src = new Map<string, number>();
        const hr = new Map<number, number>();
        const lk = new Map<string, number>();

        for (const r of list) {
          if (r.event_type === "bio_view") {
            views++;
            const d = r.device ?? "desconhecido";
            dev.set(d, (dev.get(d) ?? 0) + 1);
            const s = classifySource(r.referrer, r.source);
            src.set(s, (src.get(s) ?? 0) + 1);
            const h = new Date(r.created_at).getHours();
            hr.set(h, (hr.get(h) ?? 0) + 1);
          } else {
            clicks++;
            if (r.event_type === "whatsapp_click") wa++;
            if (r.event_type === "reservation_click") rsv++;
            if (r.event_type === "vip_click") vip++;
            if (r.event_type === "transport_click") tr++;
            if (r.event_type === "link_click" && r.link_id) {
              lk.set(r.link_id, (lk.get(r.link_id) ?? 0) + 1);
            }
          }
        }

        setData({
          views,
          clicks,
          ctr: views > 0 ? Math.round((clicks / views) * 100) : 0,
          devices: Array.from(dev.entries()).map(([name, count]) => ({ name, count })),
          sources: Array.from(src.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
          hours: Array.from({ length: 24 }).map((_, h) => ({ hour: h, count: hr.get(h) ?? 0 })),
          topLinks: Array.from(lk.entries()).map(([link_id, count]) => ({ link_id, count })).sort((a, b) => b.count - a.count).slice(0, 5),
          conversions: { reservation: rsv, vip, transport: tr, whatsapp: wa },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bio.id, period]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-2">
        {(["today", "7d", "30d"] as Period[]).map((p) => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
            {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
          </Button>
        ))}
      </div>

      {loading || !data ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Visitas" value={data.views} accent="from-purple-500/20 to-fuchsia-500/10" />
            <Kpi label="Cliques" value={data.clicks} accent="from-pink-500/20 to-orange-500/10" />
            <Kpi label="CTR" value={`${data.ctr}%`} accent="from-amber-500/20 to-orange-500/10" />
          </div>

          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Conversões</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Conv label="WhatsApp" value={data.conversions.whatsapp} />
              <Conv label="Reservas" value={data.conversions.reservation} />
              <Conv label="VIP" value={data.conversions.vip} />
              <Conv label="Transporte" value={data.conversions.transport} />
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Dispositivos</div>
              {data.devices.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem dados.</p>
              ) : (
                <BarList items={data.devices} />
              )}
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Origens</div>
              {data.sources.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem dados.</p>
              ) : (
                <BarList items={data.sources} />
              )}
            </Card>
          </div>

          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Horário de pico</div>
            <div className="flex items-end gap-1 h-24">
              {data.hours.map((h) => {
                const max = Math.max(1, ...data.hours.map((x) => x.count));
                const pct = (h.count / max) * 100;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-purple-500 to-pink-500"
                      style={{ height: `${pct}%`, minHeight: 2 }}
                    />
                    {h.hour % 4 === 0 && <span className="text-[9px] text-muted-foreground">{h.hour}h</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {data.topLinks.length > 0 && (
            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Links mais clicados</div>
              <div className="space-y-1 text-xs">
                {data.topLinks.map((l) => (
                  <div key={l.link_id} className="flex justify-between border-b last:border-0 py-1">
                    <span className="truncate text-muted-foreground">{l.link_id.slice(0, 8)}…</span>
                    <span className="font-semibold">{l.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
