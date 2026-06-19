import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Map as MapIcon,
  Search as SearchIcon,
  Ticket,
  MapPin,
  Smartphone,
  BarChart3,
  Users,
  TrendingDown,
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
const CACHE_KEY = "expo2026:admin:cache";
const CACHE_TTL_MS = 60_000;

interface CachePayload {
  ts: number;
  rows: ExpoEventRow[];
  totalEvents: number;
}

function readCache(): CachePayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload: CachePayload) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export default function Expo2026Admin() {
  const [rows, setRows] = useState<ExpoEventRow[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cached = readCache();
        if (cached) {
          setRows(cached.rows);
          setTotalEvents(cached.totalEvents);
          setLoading(false);
          return;
        }

        // KPI total de eventos via head+count (não usa data.length)
        const countQuery = supabase
          .from("expo2026_analytics" as any)
          .select("*", { count: "exact", head: true });

        // Amostra recente para gráficos/rankings (não usada para o KPI total)
        const sampleQuery = supabase
          .from("expo2026_analytics" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5000);

        const [countRes, sampleRes] = await Promise.all([countQuery, sampleQuery]);
        if (!active) return;
        if (countRes.error) throw countRes.error;
        if (sampleRes.error) throw sampleRes.error;

        const total = countRes.count ?? 0;
        const sampleRows = ((sampleRes.data as any[]) ?? []) as ExpoEventRow[];
        setTotalEvents(total);
        setRows(sampleRows);
        writeCache({ ts: Date.now(), rows: sampleRows, totalEvents: total });
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
    const uniqBy = (filter: (r: ExpoEventRow) => boolean) => {
      const s = new Set<string>();
      rows.forEach((r) => {
        if (filter(r) && r.session_id) s.add(r.session_id);
      });
      return s.size;
    };

    const views = rows.filter((r) => r.event === "expo_view").length;
    const mapOpens = rows.filter((r) => r.event === "expo_map_open").length;
    const zooms = rows.filter((r) => r.event === "expo_map_zoom").length;
    const eventouClicks = rows.filter((r) => r.event === "expo_eventou_click").length;
    const programacao = rows.filter((r) => r.event === "expo_programacao_view").length;

    const uniqueViews = uniqBy((r) => r.event === "expo_view");
    const uniqueMapOpens = uniqBy((r) => r.event === "expo_map_open");
    const uniqueProgramacao = uniqBy((r) => r.event === "expo_programacao_view");
    const uniqueEventouClicks = uniqBy((r) => r.event === "expo_eventou_click");

    // Funil
    const funnel = [
      { name: "Visualizou página", value: uniqueViews, fill: PIE_COLORS[0] },
      { name: "Abriu mapa", value: uniqueMapOpens, fill: PIE_COLORS[1] },
      { name: "Viu programação", value: uniqueProgramacao, fill: PIE_COLORS[2] },
      { name: "Clicou ingressos", value: uniqueEventouClicks, fill: PIE_COLORS[3] },
    ];
    const funnelWithDrop = funnel.map((step, i) => {
      const prev = i === 0 ? step.value : funnel[i - 1].value;
      const dropPct = prev > 0 ? Math.round(((prev - step.value) / prev) * 100) : 0;
      const pctFromTop = uniqueViews > 0 ? Math.round((step.value / uniqueViews) * 100) : 0;
      return { ...step, dropPct, pctFromTop };
    });

    // Taxa de conversão única (ingressos/views)
    const taxaConversao =
      uniqueViews > 0 ? (uniqueEventouClicks / uniqueViews) * 100 : 0;

    // Tempo médio na página e profundidade de scroll (a partir de metadata, se disponível)
    const scrollDepths: number[] = [];
    rows.forEach((r) => {
      const pct = Number(r.metadata?.pct);
      if (Number.isFinite(pct)) scrollDepths.push(pct);
    });
    const avgScroll =
      scrollDepths.length > 0
        ? Math.round(scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length)
        : 0;

    // Tempo médio na página = diferença entre primeiro e último evento por sessão
    const sessionTimes = new Map<string, { min: number; max: number }>();
    rows.forEach((r) => {
      if (!r.session_id) return;
      const t = new Date(r.created_at).getTime();
      const cur = sessionTimes.get(r.session_id);
      if (!cur) sessionTimes.set(r.session_id, { min: t, max: t });
      else {
        if (t < cur.min) cur.min = t;
        if (t > cur.max) cur.max = t;
      }
    });
    let totalDur = 0;
    let n = 0;
    sessionTimes.forEach((v) => {
      const dur = (v.max - v.min) / 1000;
      if (dur >= 0 && dur < 60 * 60) {
        totalDur += dur;
        n++;
      }
    });
    const avgTimeOnPage = n > 0 ? Math.round(totalDur / n) : 0;

    // Ranking setores
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

    // Origem (visualizações únicas por sessão)
    const sourceSession = new Map<string, Set<string>>();
    rows
      .filter((r) => r.event === "expo_view")
      .forEach((r) => {
        const s = (r.metadata?.source as string) || "Direct";
        if (!sourceSession.has(s)) sourceSession.set(s, new Set());
        if (r.session_id) sourceSession.get(s)!.add(r.session_id);
      });
    const sourcesArr = Array.from(sourceSession.entries())
      .map(([name, set]) => ({ name, value: set.size }))
      .sort((a, b) => b.value - a.value);
    const topSource = sourcesArr[0]?.name ?? "—";

    // Eventos por hora
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

    // Conversão eventou por artista (cliques únicos)
    const artistSessions = new Map<string, Set<string>>();
    rows
      .filter((r) => r.event === "expo_eventou_click")
      .forEach((r) => {
        const a = (r.metadata?.artist as string) || "—";
        if (!artistSessions.has(a)) artistSessions.set(a, new Set());
        if (r.session_id) artistSessions.get(a)!.add(r.session_id);
      });
    const conversionArr = Array.from(artistSessions.entries())
      .map(([name, set]) => ({ name, value: set.size }))
      .sort((a, b) => b.value - a.value);

    // Heatmap de scroll (usuários únicos que atingiram cada limiar)
    const scrollThresholds: Array<["expo_scroll_25" | "expo_scroll_50" | "expo_scroll_75" | "expo_scroll_90" | "expo_scroll_100", string]> = [
      ["expo_scroll_25", "25%"],
      ["expo_scroll_50", "50%"],
      ["expo_scroll_75", "75%"],
      ["expo_scroll_90", "90%"],
      ["expo_scroll_100", "100%"],
    ];
    const scrollHeatmap = scrollThresholds.map(([ev, label]) => ({
      name: label,
      value: uniqBy((r) => r.event === ev),
    }));

    // Compartilhamentos / cópias de link
    const shareCount = rows.filter((r) => r.event === "expo_share_native").length;
    const copyCount = rows.filter((r) => r.event === "expo_copy_link").length;

    // Performance média (apenas eventos expo_performance com metadata.performance)
    const perfSamples = rows
      .filter((r) => r.event === "expo_performance")
      .map((r) => (r.metadata?.performance ?? {}) as Record<string, number | null>);
    const avgPerf = (key: "fcp" | "lcp" | "domReady" | "totalLoad") => {
      const vals = perfSamples
        .map((p) => Number(p[key]))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (!vals.length) return 0;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    };
    const performance = {
      fcp: avgPerf("fcp"),
      lcp: avgPerf("lcp"),
      domReady: avgPerf("domReady"),
      totalLoad: avgPerf("totalLoad"),
      samples: perfSamples.length,
    };

    return {
      views,
      mapOpens,
      zooms,
      eventouClicks,
      programacao,
      uniqueViews,
      uniqueMapOpens,
      uniqueProgramacao,
      uniqueEventouClicks,
      taxaConversao,
      avgScroll,
      avgTimeOnPage,
      topSector,
      topSource,
      sectorsArr,
      sourcesArr,
      hourArr,
      conversionArr,
      funnelWithDrop,
      scrollHeatmap,
      shareCount,
      copyCount,
      performance,
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
          Telemetria de comportamento de usuários na landing oficial. Cache 60s.
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
          {/* KPIs principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={Users} title="Usuários únicos" value={stats.uniqueViews} />
            <MetricCard icon={Eye} title="Visualizações" value={stats.views} />
            <MetricCard icon={MapIcon} title="Aberturas únicas mapa" value={stats.uniqueMapOpens} />
            <MetricCard icon={Ticket} title="Cliques únicos ingressos" value={stats.uniqueEventouClicks} />
            <MetricCard
              icon={TrendingDown}
              title="Taxa de conversão"
              value={`${stats.taxaConversao.toFixed(1)}%`}
            />
            <MetricCard
              icon={BarChart3}
              title="Scroll médio"
              value={`${stats.avgScroll}%`}
            />
            <MetricCard
              icon={SearchIcon}
              title="Tempo médio"
              value={`${stats.avgTimeOnPage}s`}
            />
            <MetricCard icon={BarChart3} title="Total de eventos" value={totalEvents} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={MapPin} title="Setor + acessado" value={stats.topSector} />
            <MetricCard icon={Smartphone} title="Origem + comum" value={stats.topSource} />
            <MetricCard icon={MapIcon} title="Zooms (debounce 500ms)" value={stats.zooms} />
            <MetricCard
              icon={BarChart3}
              title="Programação (únicos)"
              value={stats.uniqueProgramacao}
            />
          </div>

          {/* Funil */}
          <ChartCard title="Funil de navegação (usuários únicos)">
            <div className="space-y-2">
              {stats.funnelWithDrop.map((step, i) => (
                <div key={step.name} className="flex items-center gap-3">
                  <div className="w-40 text-sm text-white/80 shrink-0">{step.name}</div>
                  <div className="flex-1 bg-white/5 rounded-md overflow-hidden h-8 relative">
                    <div
                      className="h-full"
                      style={{
                        width: `${step.pctFromTop}%`,
                        background: step.fill,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-bold text-white drop-shadow">
                      {step.value} ({step.pctFromTop}%)
                    </span>
                  </div>
                  <div className="w-24 text-right text-xs text-red-300 shrink-0">
                    {i === 0 ? "—" : `↓ ${step.dropPct}% abandono`}
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Eventos por hora (24h)">
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
            <ChartCard title="Setores mais acessados">
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

            <ChartCard title="Origem dos usuários (únicos)">
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

          <ChartCard title="Artistas mais clicados (sessões únicas)">
            <ResponsiveContainer width="100%" height={Math.max(280, stats.conversionArr.length * 24)}>
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
