import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowRight, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  sportsMatchRowToNormalized,
  isBrazilNationalTeam,
  isCopaDoMundoMatch,
  formatMatchTime,
  type NormalizedMatch,
  type SportsMatchRow,
} from "@/lib/theSportsDb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Card compacto promovendo /copa-do-mundo-2026.
 * Reutiliza a MESMA query usada em src/pages/CopaDoMundo2026.tsx
 * (mesma queryKey → React Query compartilha o cache).
 */
export default function CopaHighlightCard() {
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["copa-2026-matches"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<NormalizedMatch[]> => {
      const fromIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const toIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("sports_matches")
        .select(
          "external_id, league_id, league_name, league_label, category, season, home_team, away_team, home_badge, away_badge, match_time, status, venue_name, youtube_url, slug, is_world_cup, priority",
        )
        .gte("match_time", fromIso)
        .lte("match_time", toIso)
        .order("match_time", { ascending: true })
        .limit(300);
      return (data ?? []).map((r) => sportsMatchRowToNormalized(r as SportsMatchRow));
    },
  });

  const nextBrasil = useMemo(() => {
    const now = Date.now();
    return matches.find((m) => {
      if (!isCopaDoMundoMatch(m)) return false;
      const isSelecao =
        isBrazilNationalTeam(m.home_team) || isBrazilNationalTeam(m.away_team);
      if (!isSelecao) return false;
      if (m.status === "finished") return false;
      return new Date(m.match_time).getTime() > now - 2 * 60 * 60 * 1000;
    });
  }, [matches]);

  if (isLoading) return null;

  const adversario = nextBrasil
    ? isBrazilNationalTeam(nextBrasil.home_team)
      ? nextBrasil.away_team
      : nextBrasil.home_team
    : null;

  return (
    <div className="px-4 pt-4">
      <Link
        to="/copa-do-mundo-2026"
        className="group relative block overflow-hidden rounded-2xl border border-[#FFDF00]/30 bg-card/60 backdrop-blur-sm p-4 transition-all hover:-translate-y-0.5 hover:border-[#FFDF00]/60 hover:shadow-[0_0_30px_-8px_rgba(255,223,0,0.45)]"
      >
        {/* faixa verde→amarelo no topo */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "linear-gradient(90deg,#009B3A 0%,#FFDF00 100%)" }}
        />
        {/* glow roxo Roxou no canto */}
        <span
          aria-hidden
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-40"
          style={{ background: "hsl(var(--primary))" }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FFDF00]/40 bg-[#FFDF00]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FFDF00]">
                <span aria-hidden>🇧🇷</span> Copa do Mundo 2026
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                <Trophy className="h-2.5 w-2.5" /> Roxou
              </span>
            </div>

            {nextBrasil && adversario ? (
              <>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Próximo jogo do Brasil
                </p>
                <p className="mt-0.5 font-display font-black text-lg md:text-xl leading-tight break-words">
                  Brasil <span className="text-muted-foreground">×</span> {adversario}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(nextBrasil.match_time), "EEE, dd 'de' MMM", { locale: ptBR })}
                  <span aria-hidden>·</span>
                  <Clock className="h-3 w-3" />
                  {formatMatchTime(nextBrasil.match_time)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 font-display font-black text-lg leading-tight">
                  Aguardando próximo jogo do Brasil na Copa
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Confira todos os jogos enquanto isso.
                </p>
              </>
            )}
          </div>

          <span className="shrink-0 self-center inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-[11px] font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_20px_-8px_hsl(var(--primary))] group-hover:translate-x-0.5 transition-transform">
            Ver Copa <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </div>
  );
}
