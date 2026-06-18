import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Map as MapIcon,
  Search as SearchIcon,
  Ticket,
  MapPin,
  Smartphone,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/admin/MetricCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface ExpoEventRow {
  id: string;
  event: string;
  metadata: Record<string, any> | null;
  session_id: string | null;
  created_at: string;
}

const PIE_COLORS = ["#FF8A00", "#FFC300", "#FF5C8A", "#7E57C2", "#26C6DA", "#66BB6A", "#EF5350"];

export default function Expo2026Admin() {
  const [rows, setRows] = useState<ExpoEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("expo2026_analytics" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5000);
        if (!active) return;
        if (err) throw err;
        setRows((data as any[]) ?? []);
      } catch (e: any) {
        if (active) setError(e?.message ?? "Erro ao carregar analytics");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const views = rows.filter((r) => r.event === "expo_view").length;
    const mapOpens = rows.filter((r) => r.event === "expo_map_open").length;
    const zooms = rows.filter((r) => r.event === "expo_map_zoom").length;
    const eventouClicks = rows.filter((r) => r.event === "expo_eventou_click").length;
    const programacao = rows.filter((r) => r.event === "expo_programacao_view").length;

    // setor mais clicado
    const sectorCounts = new Map<string, number>();
    rows
      .filter((r) => r.event === "expo_sector_click")
      .forEach((r) => {
        const s = (r.metadata?.sector as string) || "desconhecido";
        sectorCounts.set(s, (sectorCounts.get(s) ?? 0) + 1);
      });
    const sectorsArr = Array.from(sectorCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const topSector = sectorsArr[0]?.name ?? "—";

    // origem
    const sourceCounts = new Map<string, number>();
    rows
      .filter((r) => r.event === "expo_view")
      .forEach((r) => {
        const s = (r.metadata?.source as string) || "Direct";
        sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
      });
    const sourcesArr = Array.from(sourceCounts.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    const topSource = sourcesArr.sort((a, b) => b.value - a.value)[0]?.name ?? "—";

    // eventos por hora (24h)
    const hourMap = new Map<string, number>();
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const key = `${String(d.getHours()).padStart(2, "0")}h`;
      hourMap.set(key, (hourMap.get(key) ?? 0) + 1);
    });
    const hourArr = Array.from({ length: 24 }, (_, i) => {
      const k = `${String(i).padStart(2, "0")}h`;
      return { name: k, value: hourMap.get(k) ?? 0 };
    });

    // conversão eventou por artista
    const eventouByArtist = new Map<string, number>();
    rows
      .filter((r) => r.event === "expo_eventou_click")
      .forEach((r) => {
        const a = (r.metadata?.artist as string) || "—";
        eventouByArtist.set(a, (eventouByArtist.get(a) ?? 0) + 1);
      });
    const conversionArr = Array.from(eventouByArtist.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      views,
      mapOpens,
      zooms,
      eventouClicks,
      programacao,
      topSector,
      topSource,
      sectorsArr,
      sourcesArr,
      hourArr,
      conversionArr,
    };
  }, [rows]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.25em] text-[#FFC300]">
          ANALYTICS · EXPO PRUDENTE 2026
        </p>
        <h1 className="text-2xl md:text-3xl font-black mt-1">
          Dashboard /expo2026
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Telemetria de comportamento de usuários na landing oficial.
        </p>
      </header>

      {loading && (
        <div className="text-white/60 text-sm">Carregando dados…</div>
      )}
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={Eye} label="Visualizações" value={stats.views} />
            <MetricCard icon={MapIcon} label="Aberturas do mapa" value={stats.mapOpens} />
            <MetricCard icon={SearchIcon} label="Zooms" value={stats.zooms} />
            <MetricCard icon={Ticket} label="Cliques ingressos" value={stats.eventouClicks} />
            <MetricCard icon={MapPin} label="Setor + acessado" value={stats.topSector} />
            <MetricCard icon={Smartphone} label="Origem + comum" value={stats.topSource} />
            <MetricCard
              icon={BarChart3}
              label="Scroll → Programação"
              value={stats.programacao}
            />
            <MetricCard
              icon={BarChart3}
              label="Total de eventos"
              value={rows.length}
            />
          </div>

          <ChartCard title="Eventos por hora (últimas 24h)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.hourArr}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} />
                <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #333",
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#FFC300" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid md:grid-cols-2 gap-4">
            <ChartCard title="Setores mais visualizados">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.sectorsArr}>
                  <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="#FF8A00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Origem dos usuários">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.sourcesArr}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={(d) => `${d.name}`}
                  >
                    {stats.sourcesArr.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Conversão para Eventou (cliques por artista)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.conversionArr} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" stroke="#888" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" stroke="#888" tick={{ fontSize: 10 }} width={140} />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #333",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" fill="#FFC300" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
      <p className="text-sm font-bold text-white/80 mb-3">{title}</p>
      {children}
    </div>
  );
}
