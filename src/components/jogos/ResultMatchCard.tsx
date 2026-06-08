import { memo } from "react";
import { Link } from "react-router-dom";
import { Trophy, Clock } from "lucide-react";
import { isBrazilianTeam } from "@/lib/theSportsDb";

export interface ResultRow {
  slug: string;
  home_team: string;
  away_team: string;
  home_badge?: string | null;
  away_badge?: string | null;
  home_score: number | null;
  away_score: number | null;
  league_label: string | null;
  round_label: string | null;
  match_time: string;
  is_world_cup?: boolean | null;
}

interface ResultMatchCardProps {
  match: ResultRow;
}

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));

function ResultMatchCardInner({ match }: ResultMatchCardProps) {
  const homeWin = (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWin = (match.away_score ?? 0) > (match.home_score ?? 0);
  const isWC = !!match.is_world_cup;
  const isSelecao = isWC && (isBrazilianTeam(match.home_team) || isBrazilianTeam(match.away_team));

  return (
    <Link
      to={`/jogo/${match.slug}`}
      className={`block rounded-xl border p-3 transition group ${
        isWC
          ? "border-yellow-500/40 bg-gradient-to-br from-emerald-950/40 via-card/50 to-yellow-900/20 hover:border-yellow-400/60"
          : "border-border/40 bg-card/40 hover:bg-card/70 hover:border-primary/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1">
          <Trophy className={`h-3 w-3 ${isWC ? "text-yellow-300" : "text-yellow-400/70"}`} />
          {match.league_label}
          {match.round_label && <span> • {match.round_label}</span>}
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {isWC && (
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/50 bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-yellow-200">
              🏆 Copa do Mundo
            </span>
          )}
          {isSelecao && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#009B3A]/50 bg-[#009B3A]/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#7CE2A1]">
              🇧🇷 Seleção
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-muted-foreground">
            Finalizado
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex-1 flex items-center gap-2 min-w-0 ${homeWin ? "" : awayWin ? "opacity-60" : ""}`}>
          {match.home_badge && <img src={match.home_badge} alt="" loading="lazy" className="h-6 w-6 object-contain shrink-0" />}
          <span className="font-bold text-sm truncate">{match.home_team}</span>
        </div>
        <span className="font-display font-black text-lg tabular-nums">
          {match.home_score ?? "-"} <span className="text-muted-foreground">×</span> {match.away_score ?? "-"}
        </span>
        <div className={`flex-1 flex items-center gap-2 min-w-0 justify-end ${awayWin ? "" : homeWin ? "opacity-60" : ""}`}>
          <span className="font-bold text-sm truncate text-right">{match.away_team}</span>
          {match.away_badge && <img src={match.away_badge} alt="" loading="lazy" className="h-6 w-6 object-contain shrink-0" />}
        </div>
      </div>

      <p className="mt-1.5 text-[10px] text-muted-foreground inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {fmtDay(match.match_time)}
      </p>
    </Link>
  );
}

export const ResultMatchCard = memo(ResultMatchCardInner);
export default ResultMatchCard;
