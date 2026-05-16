import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, RefreshCw, Plus, Trash2, Tv, Beer, Search, Loader2, Power, Radio, MessageCircle, CheckCircle2, Volume2, MonitorPlay, Sparkles } from "lucide-react";
import { useMatchMeta } from "@/hooks/useMatchMeta";
import { isSameTeam, normalizeTeamName, LEAGUE_GROUPS, getLeagueGroupKey, type LeagueGroupKey } from "@/lib/theSportsDb";
import { analyzeAndLinkEventTransmission } from "@/lib/sportsTransmission";
import { Wand2 } from "lucide-react";

interface MatchRow {
  id: string;
  slug: string;
  external_id: string | null;
  home_team: string;
  away_team: string;
  match_time: string;
  league_label: string | null;
  status: string;
  views_count: number;
}

interface VenueLink {
  id: string;
  match_id: string;
  venue_id: string;
  is_featured: boolean;
  transmission_type: string;
  confirmed_by_admin?: boolean | null;
  partners?: { name: string; slug: string; neighborhood?: string | null } | null;
}

interface StreamRow {
  id: string;
  match_id: string;
  stream_url: string;
  stream_type: string;
  is_official: boolean;
  is_active: boolean;
}

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const STREAM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  cazetv: "CazéTV",
  other: "Outro",
};

const TRANSMISSION_LABELS: Record<string, string> = {
  tv_aberta: "TV aberta",
  tv_fechada: "TV fechada",
  streaming: "Streaming",
  telao: "Telão",
};

function detectStreamType(url: string): string | null {
  const u = url.trim().toLowerCase();
  if (!u) return null;
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("twitch.tv")) return "twitch";
  if (u.includes("cazetv") || u.includes("globoplay") || u.includes("sportv")) return "cazetv";
  try {
    new URL(url.trim());
    return "other";
  } catch {
    return null;
  }
}

function normalizeStreamUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    // Remove rastreios comuns
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "feature", "si", "fbclid", "gclid"].forEach((p) =>
      u.searchParams.delete(p),
    );
    // youtu.be/ID -> youtube.com/watch?v=ID
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/watch?v=${id}${u.search}`;
    }
    return u.toString();
  } catch {
    return url.trim();
  }
}

export default function JogosAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<LeagueGroupKey | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamType, setStreamType] = useState("youtube");
  const [syncing, setSyncing] = useState(false);

  // 14 dias de jogos a partir de agora
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["admin-jogos"],
    queryFn: async () => {
      const limit = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("sports_matches")
        .select("id, slug, external_id, home_team, away_team, match_time, league_label, status, views_count")
        .lte("match_time", limit)
        .gte("match_time", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
        .order("match_time", { ascending: true })
        .limit(200);
      return (data ?? []) as MatchRow[];
    },
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qn = q ? normalizeTeamName(q) : "";
    let list = matches;
    if (leagueFilter !== "all") {
      list = list.filter((m) => {
        const key = getLeagueGroupKey(m.league_label);
        if (leagueFilter === "outros") return key === "outros";
        return key === leagueFilter;
      });
    }
    if (q) {
      list = list.filter((m) => {
        if (
          m.home_team.toLowerCase().includes(q) ||
          m.away_team.toLowerCase().includes(q) ||
          (m.league_label ?? "").toLowerCase().includes(q)
        ) return true;
        if (qn && (isSameTeam(m.home_team, q) || isSameTeam(m.away_team, q))) return true;
        return false;
      });
    }
    return list;
  }, [matches, search, leagueFilter]);

  // Contagem por liga (para mostrar no dropdown)
  const leagueCounts = useMemo(() => {
    const counts: Record<string, number> = { all: matches.length, outros: 0 };
    LEAGUE_GROUPS.forEach((g) => (counts[g.key] = 0));
    matches.forEach((m) => {
      const k = getLeagueGroupKey(m.league_label);
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return counts;
  }, [matches]);

  // Metadata reaproveitada (venuesCount, hasStream, hasActiveChat)
  const slugs = useMemo(() => filtered.map((m) => m.slug), [filtered]);
  const { data: metaMap = {} } = useMatchMeta(slugs);

  const selected = useMemo(() => matches.find((m) => m.id === selectedId) ?? null, [matches, selectedId]);
  const selectedMeta = selected ? metaMap[selected.slug] : undefined;

  // Bares parceiros (Prudente)
  const { data: partners = [] } = useQuery({
    queryKey: ["admin-jogos-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, neighborhood, type")
        .eq("city", "Presidente Prudente")
        .order("name", { ascending: true })
        .limit(200);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Vínculos do jogo selecionado
  const { data: venueLinks = [], refetch: refetchLinks } = useQuery({
    queryKey: ["admin-jogos-venues", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sports_match_venues")
        .select("id, match_id, venue_id, is_featured, transmission_type, confirmed_by_admin, partners(name, slug, neighborhood)")
        .eq("match_id", selectedId);
      return (data ?? []) as VenueLink[];
    },
  });

  const { data: streams = [], refetch: refetchStreams } = useQuery({
    queryKey: ["admin-jogos-streams", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sports_match_streams")
        .select("*")
        .eq("match_id", selectedId);
      return (data ?? []) as StreamRow[];
    },
  });

  const linkedVenueIds = new Set(venueLinks.map((v) => v.venue_id));

  const linkVenue = useMutation({
    mutationFn: async (venueId: string) => {
      if (!selectedId) return;
      await supabase.from("sports_match_venues").insert({
        match_id: selectedId,
        venue_id: venueId,
        transmission_type: "tv_aberta",
      });
    },
    onSuccess: () => { refetchLinks(); toast.success("Bar vinculado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao vincular"),
  });

  const unlinkVenue = useMutation({
    mutationFn: async (linkId: string) => {
      await supabase.from("sports_match_venues").delete().eq("id", linkId);
    },
    onSuccess: () => { refetchLinks(); toast.success("Bar removido"); },
  });

  const updateLink = useMutation({
    mutationFn: async ({ id, transmission_type }: { id: string; transmission_type: string }) => {
      await supabase.from("sports_match_venues").update({ transmission_type }).eq("id", id);
    },
    onSuccess: () => refetchLinks(),
  });

  const toggleConfirm = useMutation({
    mutationFn: async (v: VenueLink) => {
      await supabase.from("sports_match_venues").update({ confirmed_by_admin: !v.confirmed_by_admin }).eq("id", v.id);
    },
    onSuccess: () => refetchLinks(),
  });

  const addStream = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const detected = detectStreamType(streamUrl);
      if (!detected) {
        throw new Error("Informe um link válido de transmissão.");
      }
      const finalType = detected !== "other" ? detected : streamType;
      const normalized = normalizeStreamUrl(streamUrl);
      await supabase.from("sports_match_streams").insert({
        match_id: selectedId,
        stream_url: normalized,
        stream_type: finalType,
        is_official: true,
        is_active: true,
      });
    },
    onSuccess: () => { setStreamUrl(""); refetchStreams(); toast.success("Transmissão adicionada"); },
    onError: (e: any) => toast.error(e.message ?? "Informe um link válido de transmissão."),
  });

  const toggleStream = useMutation({
    mutationFn: async (s: StreamRow) => {
      await supabase.from("sports_match_streams").update({ is_active: !s.is_active }).eq("id", s.id);
    },
    onSuccess: () => refetchStreams(),
  });

  const removeStream = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("sports_match_streams").delete().eq("id", id);
    },
    onSuccess: () => { refetchStreams(); toast.success("Stream removido"); },
  });

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-football-matches", { body: {} });
      if (error) throw error;
      const s = (data as any)?.stats ?? {};
      const mode = (data as any)?.api_mode ?? "free";
      toast.success(
        `Sync ${mode}: ${s.upserted ?? 0} jogos · BR ${s.br_force_included ?? 0} · live ${s.livescore_found ?? 0}`,
      );
      qc.invalidateQueries({ queryKey: ["admin-jogos"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const [syncingStandings, setSyncingStandings] = useState(false);
  const syncStandings = async () => {
    setSyncingStandings(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-football-standings", { body: {} });
      if (error) throw error;
      const s = (data as any)?.stats ?? {};
      const mode = (data as any)?.api_mode ?? "free";
      toast.success(`Tabelas ${mode}: ${s.leagues ?? 0} ligas · ${s.upserted ?? 0} times`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao sincronizar tabelas");
    } finally {
      setSyncingStandings(false);
    }
  };

  // Reprocessamento em massa: eventos hoje..+7d sem sports_match_id que mencionem futebol
  const [reprocessingBulk, setReprocessingBulk] = useState(false);
  const SPORTS_KW_RE = /transmiss[aã]o|tel[aã]o|futebol|jogo|ao vivo|copa do brasil|libertadores|brasileir|sul[- ]americana|champions/i;
  const reprocessBulk = async () => {
    setReprocessingBulk(true);
    try {
      const fromIso = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      const toIso = new Date(Date.now() + 7.5 * 24 * 60 * 60 * 1000).toISOString();
      const { data: candidates } = await (supabase as any)
        .from("events")
        .select("id, title, description, venue_name, category, partner_id, date_time, sub_category")
        .is("sports_match_id", null)
        .eq("status", "published")
        .gte("date_time", fromIso)
        .lte("date_time", toIso)
        .limit(300);
      const list = (candidates || []) as any[];
      const filtered = list.filter((ev) => {
        const text = `${ev.title ?? ""} ${ev.description ?? ""} ${ev.venue_name ?? ""} ${ev.sub_category ?? ""} ${ev.category ?? ""}`;
        return SPORTS_KW_RE.test(text);
      });
      let processed = 0, linked = 0, detected = 0;
      for (const ev of filtered) {
        try {
          const text = [ev.title, ev.description, ev.venue_name, ev.sub_category, ev.category].filter(Boolean).join(" \n ");
          const refDate = ev.date_time ? new Date(ev.date_time) : null;
          const r = await analyzeAndLinkEventTransmission({
            eventId: ev.id, text, partnerId: ev.partner_id || null,
            referenceDate: refDate, source: "manual_reprocess",
          });
          processed++;
          if (r.linked) linked++;
          else if (r.detected) detected++;
        } catch (e) { console.warn("bulk reprocess item failed", e); }
      }
      toast.success(`Reprocessados ${processed} eventos · ${linked} vinculados · ${detected} para revisão`);
      qc.invalidateQueries({ queryKey: ["admin-jogos-transmission-review"] });
    } catch (e: any) {
      toast.error(e?.message || "Falha no reprocessamento em massa");
    } finally {
      setReprocessingBulk(false);
    }
  };

  const isLive = (m: MatchRow) => m.status?.toLowerCase() === "live" || m.status?.toLowerCase() === "in_play";

  // Resumo operacional da Copa — apenas próximas 48h
  const opSummary = useMemo(() => {
    const now = Date.now();
    const horizon = now + 48 * 60 * 60 * 1000;
    const todayKey = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const upcoming = matches.filter((m) => {
      const t = new Date(m.match_time).getTime();
      return t >= now - 3 * 60 * 60 * 1000 && t <= horizon;
    });
    const live = upcoming.filter(isLive).length;
    const brToday = upcoming.filter((m) => {
      const k = getLeagueGroupKey(m.league_label);
      const day = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(m.match_time));
      return day === todayKey && (k === "brasileirao" || k === "copa_brasil" || k === "libertadores" || k === "sulamericana" || k === "serie_b");
    }).length;
    const withBars = upcoming.filter((m) => (metaMap[m.slug]?.venuesCount ?? 0) > 0).length;
    const withStream = upcoming.filter((m) => metaMap[m.slug]?.hasStream).length;
    const withoutAny = upcoming.filter((m) => !metaMap[m.slug]?.hasStream && (metaMap[m.slug]?.venuesCount ?? 0) === 0).length;
    const topViewed = [...matches].sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0))[0];
    return { live, brToday, withBars, withStream, withoutAny, topViewed, upcomingCount: upcoming.length };
  }, [matches, metaMap]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" /> Jogos
          </h1>
          <p className="text-sm text-muted-foreground">Curadoria de partidas, bares parceiros e transmissões oficiais.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={sync} disabled={syncing} variant="outline" size="sm">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar jogos
          </Button>
          <Button onClick={syncStandings} disabled={syncingStandings} variant="outline" size="sm">
            {syncingStandings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar tabelas
          </Button>
          <Button onClick={reprocessBulk} disabled={reprocessingBulk} variant="outline" size="sm" title="Reanalisa eventos publicados (hoje..+7d) que mencionem futebol e ainda não estão vinculados a um jogo.">
            {reprocessingBulk ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Reprocessar eventos existentes
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[360px_1fr] gap-4">
        {/* Lista */}
        <div className="space-y-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar time, campeonato ou partida..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 focus-visible:ring-primary/40 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] transition-shadow"
            />
          </div>
          <select
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value as LeagueGroupKey | "all")}
            className="w-full rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm font-bold text-foreground hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            aria-label="Filtrar por liga"
          >
            <option value="all">🏆 Todas as ligas ({leagueCounts.all ?? 0})</option>
            {LEAGUE_GROUPS.map((g) => (
              <option key={g.key} value={g.key} disabled={!leagueCounts[g.key]}>
                {g.label} ({leagueCounts[g.key] ?? 0})
              </option>
            ))}
            <option value="outros" disabled={!leagueCounts.outros}>
              Outros ({leagueCounts.outros ?? 0})
            </option>
          </select>
          <div className="rounded-xl border border-border/50 bg-card/40 max-h-[70vh] overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhum jogo nos próximos 14 dias. Clique em "Sincronizar agora".
              </p>
            ) : (
              filtered.map((m) => {
                const meta = metaMap[m.slug];
                const live = isLive(m);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left p-3 hover:bg-card/70 transition ${selectedId === m.id ? "bg-primary/10" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{m.league_label}</p>
                      {live && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/40 px-1.5 py-0.5 text-[9px] font-black text-red-300 shadow-[0_0_10px_-2px_rgba(239,68,68,0.6)]">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                          </span>
                          AO VIVO
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm leading-tight">{m.home_team} × {m.away_team}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{fmt(m.match_time)} · 👁 {m.views_count}</p>
                    {meta && (meta.venuesCount > 0 || meta.hasStream || meta.hasActiveChat) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-bold">
                        {meta.venuesCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-300">🍻 {meta.venuesCount}</span>
                        )}
                        {meta.hasStream && (
                          <span className="inline-flex items-center gap-0.5 text-yellow-300">📺 1</span>
                        )}
                        {meta.hasActiveChat && (
                          <span className="inline-flex items-center gap-0.5 text-fuchsia-300">💬</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detalhe */}
        <div className="space-y-4">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-card/20 p-12 text-center flex flex-col items-center justify-center gap-3 min-h-[300px]">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
                <Trophy className="relative h-12 w-12 text-yellow-400/60" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground/80 max-w-xs leading-relaxed">
                Selecione uma partida para configurar bares parceiros, transmissões oficiais e experiência da torcida.
              </p>
            </div>
          ) : (
            <>
              {/* Card jogo selecionado */}
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card/60 via-card/40 to-card/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{selected.league_label}</p>
                  {isLive(selected) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/40 px-2 py-0.5 text-[10px] font-black text-red-300 shadow-[0_0_14px_-2px_rgba(239,68,68,0.6)]">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                      AO VIVO
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 flex items-center justify-center text-sm font-black text-emerald-200 ring-1 ring-emerald-500/30 shrink-0">
                      {selected.home_team.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-display font-black text-base md:text-lg truncate">{selected.home_team}</span>
                  </div>
                  <span className="text-muted-foreground font-black">×</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="font-display font-black text-base md:text-lg truncate text-right">{selected.away_team}</span>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-600/30 flex items-center justify-center text-sm font-black text-yellow-200 ring-1 ring-yellow-500/30 shrink-0">
                      {selected.away_team.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{fmt(selected.match_time)}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] uppercase">{selected.status}</Badge>
                  {selectedMeta?.hasStream && (
                    <Badge className="text-[10px] bg-yellow-500/15 text-yellow-200 border border-yellow-500/40 hover:bg-yellow-500/25">
                      📺 Stream oficial
                    </Badge>
                  )}
                  {selectedMeta?.hasActiveChat && (
                    <Badge className="text-[10px] bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/40 hover:bg-fuchsia-500/25">
                      💬 Chat ativo
                    </Badge>
                  )}
                  {(selectedMeta?.venuesCount ?? 0) > 0 && (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/25">
                      🍻 {selectedMeta?.venuesCount} {selectedMeta?.venuesCount === 1 ? "bar" : "bares"}
                    </Badge>
                  )}
                </div>

              </div>

              {/* Streams */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
                <h3 className="font-bold flex items-center gap-2"><Tv className="h-4 w-4 text-emerald-400" /> Transmissões oficiais</h3>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={streamType}
                    onChange={(e) => setStreamType(e.target.value)}
                    className="rounded-md border border-border/50 bg-background px-2 py-1 text-sm"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="twitch">Twitch</option>
                    <option value="cazetv">CazéTV</option>
                    <option value="other">Outro</option>
                  </select>
                  <Input
                    placeholder="https://youtube.com/watch?v=…"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    className="flex-1 min-w-[200px]"
                  />
                  <Button onClick={() => addStream.mutate()} disabled={!streamUrl.trim() || addStream.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                {streams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma transmissão oficial cadastrada para esta partida.</p>
                ) : (
                  <ul className="space-y-2">
                    {streams.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border/40 p-2">
                        <Badge variant={s.is_active ? "default" : "secondary"} className="uppercase text-[10px]">
                          {STREAM_LABELS[s.stream_type] ?? s.stream_type}
                        </Badge>
                        {s.is_active && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Oficial
                          </span>
                        )}
                        <a href={s.stream_url} target="_blank" rel="noreferrer" className="flex-1 text-xs truncate hover:underline">
                          {s.stream_url}
                        </a>
                        <Button size="sm" variant="ghost" onClick={() => toggleStream.mutate(s)} title={s.is_active ? "Desativar" : "Ativar"}>
                          <Power className={`h-4 w-4 ${s.is_active ? "text-emerald-400" : "text-muted-foreground"}`} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeStream.mutate(s.id)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Venues */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
                <h3 className="font-bold flex items-center gap-2"><Beer className="h-4 w-4 text-primary" /> Bares parceiros</h3>

                {venueLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum bar vinculado ainda.</p>
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {venueLinks.map((v) => (
                      <li key={v.id} className="rounded-lg border border-border/40 bg-background/40 p-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate flex items-center gap-1">
                              <Beer className="h-3 w-3 text-primary shrink-0" />
                              {v.partners?.name ?? v.venue_id}
                            </p>
                            {v.partners?.neighborhood && (
                              <p className="text-[10px] text-muted-foreground truncate">{v.partners.neighborhood}</p>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => unlinkVenue.mutate(v.id)} className="h-7 w-7 p-0">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MonitorPlay className="h-3 w-3" />
                            {TRANSMISSION_LABELS[v.transmission_type] ?? v.transmission_type}
                          </span>
                          {v.confirmed_by_admin && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Confirmado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={v.transmission_type}
                            onChange={(e) => updateLink.mutate({ id: v.id, transmission_type: e.target.value })}
                            className="flex-1 rounded-md border border-border/50 bg-background px-2 py-1 text-[11px]"
                          >
                            <option value="tv_aberta">TV aberta</option>
                            <option value="tv_fechada">TV fechada</option>
                            <option value="streaming">Streaming</option>
                            <option value="telao">Telão</option>
                          </select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleConfirm.mutate(v)}
                            className="h-7 px-2 text-[10px]"
                            title={v.confirmed_by_admin ? "Remover confirmação" : "Confirmar"}
                          >
                            <CheckCircle2 className={`h-3.5 w-3.5 ${v.confirmed_by_admin ? "text-emerald-400" : "text-muted-foreground"}`} />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <details className="rounded-lg border border-primary/30 bg-primary/5 p-2 hover:bg-primary/10 transition-colors group">
                  <summary className="cursor-pointer text-sm font-bold flex items-center gap-2 text-primary">
                    <Beer className="h-4 w-4" />
                    Vincular bar parceiro
                    <Plus className="h-3.5 w-3.5 ml-auto group-open:rotate-45 transition-transform" />
                  </summary>
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                    {partners.filter((p: any) => !linkedVenueIds.has(p.id)).length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">Todos os bares já foram vinculados.</p>
                    ) : (
                      partners
                        .filter((p: any) => !linkedVenueIds.has(p.id))
                        .map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => linkVenue.mutate(p.id)}
                            className="w-full text-left rounded px-2 py-1.5 text-xs hover:bg-primary/15 transition flex items-center gap-2"
                          >
                            <Beer className="h-3 w-3 text-primary/70 shrink-0" />
                            <span className="font-semibold">{p.name}</span>
                            {p.neighborhood && <span className="text-muted-foreground"> · {p.neighborhood}</span>}
                          </button>
                        ))
                    )}
                  </div>
                </details>
              </div>
            </>
          )}
        </div>
      </div>

      <SportsTransmissionReview />
    </div>
  );
}

// === Seção: possíveis transmissões detectadas ===
function SportsTransmissionReview() {
  const qc = useQueryClient();
  const { data: pending = [], refetch } = useQuery({
    queryKey: ["admin-jogos-transmission-review"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("events")
        .select("id, title, date_time, partner_id, sports_match_id, sports_transmission_confidence, sports_transmission_source, venue_name, partners:partners(id,name,slug)")
        .eq("is_sports_transmission", true)
        .order("date_time", { ascending: true })
        .limit(50);
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });

  const matchIds = useMemo(
    () => Array.from(new Set(pending.map((p) => p.sports_match_id).filter(Boolean))) as string[],
    [pending],
  );
  const { data: matchMap = {} } = useQuery({
    queryKey: ["admin-jogos-transmission-matches", matchIds.join(",")],
    enabled: matchIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("sports_matches")
        .select("id, home_team, away_team, match_time, league_label")
        .in("id", matchIds);
      const map: Record<string, any> = {};
      (data || []).forEach((m: any) => { map[m.id] = m; });
      return map;
    },
  });

  const confirm = useMutation({
    mutationFn: async (ev: any) => {
      if (!ev.partner_id || !ev.sports_match_id) throw new Error("Faltam parceiro ou jogo");
      const { data: existing } = await supabase
        .from("sports_match_venues").select("id")
        .eq("match_id", ev.sports_match_id).eq("venue_id", ev.partner_id).maybeSingle();
      if (existing) {
        await supabase.from("sports_match_venues").update({ confirmed_by_admin: true, transmission_type: "telao" }).eq("id", existing.id);
      } else {
        await supabase.from("sports_match_venues").insert({
          match_id: ev.sports_match_id, venue_id: ev.partner_id,
          transmission_type: "telao", confirmed_by_admin: true,
        });
      }
      await supabase.from("partners").update({ supports_sports: true }).eq("id", ev.partner_id);
      await supabase.from("events").update({ sports_transmission_confidence: 0.95 } as any).eq("id", ev.id);
    },
    onSuccess: () => { toast.success("Vínculo confirmado"); refetch(); qc.invalidateQueries({ queryKey: ["admin-jogos-venues"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const ignore = useMutation({
    mutationFn: async (ev: any) => {
      await supabase.from("events").update({
        is_sports_transmission: false,
        sports_match_id: null,
        sports_transmission_confidence: null,
      } as any).eq("id", ev.id);
    },
    onSuccess: () => { toast.success("Ignorado"); refetch(); },
  });

  if (!pending.length) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tv className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Possíveis transmissões detectadas ({pending.length})</h2>
      </div>
      <div className="space-y-2">
        {pending.map((ev) => {
          const m = ev.sports_match_id ? matchMap[ev.sports_match_id] : null;
          const conf = ev.sports_transmission_confidence ?? 0;
          const confLabel = conf >= 0.85 ? "alta" : conf >= 0.5 ? "média" : "baixa";
          const partnerName = ev.partners?.name ?? ev.venue_name ?? "—";
          return (
            <div key={ev.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  📍 {partnerName} · {fmt(ev.date_time)} · confiança {confLabel} · fonte: {ev.sports_transmission_source ?? "—"}
                </p>
                {m ? (
                  <p className="text-xs text-primary/80 truncate">⚽ {m.home_team} × {m.away_team} · {m.league_label ?? ""} · {fmt(m.match_time)}</p>
                ) : (
                  <p className="text-xs text-amber-400/80">Sem jogo correspondente — busque manualmente.</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="default" disabled={!m || !ev.partner_id || confirm.isPending} onClick={() => confirm.mutate(ev)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmar
                </Button>
                <Button size="sm" variant="outline" onClick={() => ignore.mutate(ev)}>Ignorar</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
