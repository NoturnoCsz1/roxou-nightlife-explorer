import { memo } from "react";
import { Link } from "react-router-dom";
import { Trophy, Clock } from "lucide-react";

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

  return (
    <Link
      to={`/jogo/${match.slug}`}
      className="block rounded-xl border border-border/40 bg-card/40 p-3 hover:bg-card/70 hover:border-primary/30 transition group"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1">
          <Trophy className="h-3 w-3 text-yellow-400/70" />
          {match.league_label}
          {match.round_label && <span> • {match.round_label}</span>}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-muted-foreground">
          Finalizado
        </span>
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
