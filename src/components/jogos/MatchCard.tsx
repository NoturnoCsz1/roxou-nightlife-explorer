import { Link } from "react-router-dom";
import { Radio, Beer, Clock } from "lucide-react";
import {
  formatMatchTime,
  getMatchBadges,
  isHighlightedMatch,
  isPriorityTeam,
  type NormalizedMatch,
} from "@/lib/theSportsDb";

interface Props {
  match: NormalizedMatch;
  venuesCount?: number;
  compact?: boolean;
}

const BADGE_STYLES: Record<string, string> = {
  live: "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse",
  copa: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  classico: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/50",
  imperdivel: "bg-orange-500/20 text-orange-200 border-orange-500/50",
  destaque: "bg-primary/20 text-primary border-primary/50",
};

export default function MatchCard({ match, venuesCount = 0, compact = false }: Props) {
  const isCopa = match.is_world_cup;
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const highlighted = isHighlightedMatch(match);
  const badges = getMatchBadges(match);
  const hasPriorityTeam = isPriorityTeam(match.home_team) || isPriorityTeam(match.away_team);

  const themeClass = isCopa
    ? "border-yellow-500/50 bg-gradient-to-br from-emerald-950/60 via-background to-yellow-900/30 shadow-[0_0_40px_-12px_rgba(234,179,8,0.55)] hover:shadow-[0_0_50px_-8px_rgba(234,179,8,0.7)]"
    : highlighted
      ? "border-primary/60 bg-gradient-to-br from-primary/10 via-card/60 to-background shadow-[0_0_30px_-12px_hsl(var(--primary)/0.55)] hover:shadow-[0_0_45px_-8px_hsl(var(--primary)/0.8)]"
      : "border-border/50 bg-card/60 hover:border-primary/50 hover:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.45)]";

  return (
    <Link
      to={`/jogo/${match.slug}`}
      className={`group relative block rounded-2xl border ${themeClass} backdrop-blur-sm p-4 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]`}
    >
      {/* Top row: league + badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-wide ${isCopa ? "text-yellow-300" : hasPriorityTeam ? "text-primary" : "text-muted-foreground"}`}>
          {match.league_label}
        </span>
        <div className="flex flex-wrap gap-1 justify-end">
          {badges.map((b) => (
            <span
              key={b.key}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${BADGE_STYLES[b.key]}`}
            >
              <span>{b.icon}</span>
              {b.label}
            </span>
          ))}
          {isFinished && !isLive && (
            <span className="rounded-full border border-muted/40 bg-muted/20 px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
              Encerrado
            </span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex flex-col items-center text-center">
          {match.home_badge ? (
            <img src={match.home_badge} alt={match.home_team} className="h-12 w-12 object-contain mb-1 transition-transform group-hover:scale-110" loading="lazy" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted/30 mb-1" />
          )}
          <span className={`text-xs font-semibold line-clamp-2 ${isPriorityTeam(match.home_team) ? "text-foreground" : ""}`}>
            {match.home_team}
          </span>
        </div>

        <div className="flex flex-col items-center text-center px-2">
          <span className={`text-2xl font-black ${isCopa ? "text-yellow-400" : highlighted ? "text-primary" : "text-foreground/70"}`}>×</span>
          <span className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            {isLive ? <Radio className="h-3 w-3 text-red-400" /> : <Clock className="h-3 w-3" />}
            {formatMatchTime(match.match_time)}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center text-center">
          {match.away_badge ? (
            <img src={match.away_badge} alt={match.away_team} className="h-12 w-12 object-contain mb-1 transition-transform group-hover:scale-110" loading="lazy" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted/30 mb-1" />
          )}
          <span className={`text-xs font-semibold line-clamp-2 ${isPriorityTeam(match.away_team) ? "text-foreground" : ""}`}>
            {match.away_team}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Beer className="h-3 w-3" />
            {venuesCount > 0
              ? `🍺 ${venuesCount} ${venuesCount === 1 ? "bar transmite" : "bares transmitem"}`
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
