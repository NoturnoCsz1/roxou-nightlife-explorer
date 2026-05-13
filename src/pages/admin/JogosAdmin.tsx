import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, RefreshCw, Plus, Trash2, Tv, Beer, Search, Loader2, Power } from "lucide-react";

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
  partners?: { name: string; slug: string } | null;
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

export default function JogosAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
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
    if (!q) return matches;
    return matches.filter(
      (m) =>
        m.home_team.toLowerCase().includes(q) ||
        m.away_team.toLowerCase().includes(q) ||
        (m.league_label ?? "").toLowerCase().includes(q),
    );
  }, [matches, search]);

  const selected = useMemo(() => matches.find((m) => m.id === selectedId) ?? null, [matches, selectedId]);

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
        .select("id, match_id, venue_id, is_featured, transmission_type, partners(name, slug)")
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

  const addStream = useMutation({
    mutationFn: async () => {
      if (!selectedId || !streamUrl.trim()) return;
      await supabase.from("sports_match_streams").insert({
        match_id: selectedId,
        stream_url: streamUrl.trim(),
        stream_type: streamType,
        is_official: true,
        is_active: true,
      });
    },
    onSuccess: () => { setStreamUrl(""); refetchStreams(); toast.success("Stream adicionado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar stream"),
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
      const { error } = await supabase.functions.invoke("sync-football-matches", { body: {} });
      if (error) throw error;
      toast.success("Sincronização disparada");
      qc.invalidateQueries({ queryKey: ["admin-jogos"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" /> Jogos
          </h1>
          <p className="text-sm text-muted-foreground">Curadoria de partidas, bares parceiros e transmissões oficiais.</p>
        </div>
        <Button onClick={sync} disabled={syncing} variant="outline">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sincronizar agora
        </Button>
      </div>

      <div className="grid md:grid-cols-[360px_1fr] gap-4">
        {/* Lista */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por time ou liga…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 max-h-[70vh] overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhum jogo nos próximos 14 dias. Clique em "Sincronizar agora".
              </p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-3 hover:bg-card/70 transition ${selectedId === m.id ? "bg-primary/10" : ""}`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.league_label}</p>
                  <p className="font-bold text-sm leading-tight">{m.home_team} × {m.away_team}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{fmt(m.match_time)} · 👁 {m.views_count}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detalhe */}
        <div className="space-y-4">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-border/50 p-10 text-center text-muted-foreground">
              Selecione um jogo na lista para curar bares e transmissões.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border/50 bg-card/40 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{selected.league_label}</p>
                <h2 className="font-display font-black text-xl">{selected.home_team} × {selected.away_team}</h2>
                <p className="text-sm text-muted-foreground mt-1">{fmt(selected.match_time)}</p>
                <Badge variant="outline" className="mt-2">{selected.status}</Badge>
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
                  <p className="text-xs text-muted-foreground">Nenhuma transmissão cadastrada.</p>
                ) : (
                  <ul className="space-y-2">
                    {streams.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border/40 p-2">
                        <Badge variant={s.is_active ? "default" : "secondary"} className="uppercase text-[10px]">
                          {s.stream_type}
                        </Badge>
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
                  <ul className="space-y-2">
                    {venueLinks.map((v) => (
                      <li key={v.id} className="flex items-center gap-2 rounded-lg border border-border/40 p-2">
                        <span className="font-semibold text-sm flex-1">{v.partners?.name ?? v.venue_id}</span>
                        <select
                          value={v.transmission_type}
                          onChange={(e) => updateLink.mutate({ id: v.id, transmission_type: e.target.value })}
                          className="rounded-md border border-border/50 bg-background px-2 py-1 text-xs"
                        >
                          <option value="tv_aberta">TV aberta</option>
                          <option value="tv_fechada">TV fechada</option>
                          <option value="streaming">Streaming</option>
                          <option value="telao">Telão</option>
                        </select>
                        <Button size="sm" variant="ghost" onClick={() => unlinkVenue.mutate(v.id)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <details className="rounded-lg border border-border/40 p-2">
                  <summary className="cursor-pointer text-sm font-semibold">+ Vincular bar parceiro</summary>
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                    {partners
                      .filter((p: any) => !linkedVenueIds.has(p.id))
                      .map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => linkVenue.mutate(p.id)}
                          className="w-full text-left rounded px-2 py-1 text-xs hover:bg-primary/10 transition"
                        >
                          <span className="font-semibold">{p.name}</span>
                          {p.neighborhood && <span className="text-muted-foreground"> · {p.neighborhood}</span>}
                        </button>
                      ))}
                  </div>
                </details>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
