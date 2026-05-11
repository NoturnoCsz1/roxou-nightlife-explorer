import { Link } from "react-router-dom";
import { Trophy, Radio, Beer, Clock } from "lucide-react";
import { formatMatchTime, type NormalizedMatch } from "@/lib/theSportsDb";

interface Props {
  match: NormalizedMatch;
  venuesCount?: number;
  compact?: boolean;
}

export default function MatchCard({ match, venuesCount = 0, compact = false }: Props) {
  const isCopa = match.is_world_cup;
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const themeClass = isCopa
    ? "border-yellow-500/40 bg-gradient-to-br from-emerald-950/60 via-background to-yellow-900/20 shadow-[0_0_30px_-12px_rgba(234,179,8,0.5)]"
    : "border-primary/30 bg-card/60 hover:border-primary/60";

  return (
    <Link
      to={`/jogo/${match.slug}`}
      className={`block rounded-2xl border ${themeClass} backdrop-blur-sm p-4 transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
          {isCopa ? <Trophy className="h-3.5 w-3.5 text-yellow-400" /> : null}
          <span className={isCopa ? "text-yellow-300" : "text-primary"}>
            {match.league_label}
          </span>
        </div>
        {isLive && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-400 animate-pulse">
            <Radio className="h-3 w-3" /> Ao vivo
          </span>
        )}
        {isFinished && (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Encerrado</span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex flex-col items-center text-center">
          {match.home_badge ? (
            <img src={match.home_badge} alt={match.home_team} className="h-12 w-12 object-contain mb-1" loading="lazy" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted/30 mb-1" />
          )}
          <span className="text-xs font-semibold line-clamp-2">{match.home_team}</span>
        </div>

        <div className="flex flex-col items-center text-center px-2">
          <span className={`text-2xl font-black ${isCopa ? "text-yellow-400" : "text-primary"}`}>×</span>
          <span className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatMatchTime(match.match_time)}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center text-center">
          {match.away_badge ? (
            <img src={match.away_badge} alt={match.away_team} className="h-12 w-12 object-contain mb-1" loading="lazy" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted/30 mb-1" />
          )}
          <span className="text-xs font-semibold line-clamp-2">{match.away_team}</span>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Beer className="h-3 w-3" />
            {venuesCount > 0
              ? `${venuesCount} ${venuesCount === 1 ? "bar transmite" : "bares transmitem"}`
              : "Em breve onde assistir"}
          </span>
          <span className={`text-[11px] font-bold ${isCopa ? "text-yellow-300" : "text-primary"}`}>
            Ver onde assistir →
          </span>
        </div>
      )}
    </Link>
  );
}
