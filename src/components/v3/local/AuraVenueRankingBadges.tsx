import { buildAuraVenueRankings, type RankingInput } from "@/lib/auraVenueRankings";

interface Props {
  partner: RankingInput["partner"];
  events: RankingInput["events"];
  viewCount: number;
  followerCount: number;
  className?: string;
}

/**
 * AuraVenueRankingBadges — badges automáticas de ranking ("award-like").
 * Heurístico (sem IA externa). Layout discreto, glass/neon suave.
 */
export default function AuraVenueRankingBadges({ partner, events, viewCount, followerCount, className }: Props) {
  const badges = buildAuraVenueRankings({ partner, events, viewCount, followerCount });
  if (badges.length === 0) return null;

  return (
    <div
      aria-label="Selos automáticos de ranking deste local"
      className={`flex flex-wrap gap-1.5 ${className || ""}`}
    >
      {badges.map((b) => (
        <span
          key={b.type}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary backdrop-blur-sm shadow-[0_0_12px_-4px_hsl(var(--v3-neon)/0.5)]"
          title={b.sponsored ? "Selo patrocinado" : "Selo automático Roxou"}
        >
          <span aria-hidden className="text-[11px]">{b.emoji}</span>
          <span>{b.label}</span>
        </span>
      ))}
    </div>
  );
}
