import { useQuery } from "@tanstack/react-query";
import { Tv, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  eventId?: string;
  isSportsTransmission?: boolean | null;
  sportsMatchId?: string | null;
  channel?: string | null;
  url?: string | null;
  notes?: string | null;
  compact?: boolean;
}

/**
 * Bloco discreto de "Transmissão de jogo" para páginas/cards de evento.
 * Busca o jogo vinculado (sports_matches) só quando is_sports_transmission = true.
 */
export default function TransmissionBlock({
  isSportsTransmission,
  sportsMatchId,
  channel,
  url,
  notes,
  compact = false,
}: Props) {
  const enabled = Boolean(isSportsTransmission);

  const { data: match } = useQuery({
    queryKey: ["transmission-match", sportsMatchId],
    enabled: enabled && !!sportsMatchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sports_matches")
        .select("home_team, away_team, league_label, league_name, match_time, slug")
        .eq("id", sportsMatchId!)
        .maybeSingle();
      return data;
    },
  });

  if (!enabled) return null;

  const matchLabel = match
    ? `${match.home_team} × ${match.away_team}`
    : null;
  const league = match?.league_label || match?.league_name || null;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
        <Tv className="h-3 w-3" />
        Transmite jogo
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
      <div className="flex items-center gap-2 text-emerald-300">
        <Tv className="h-4 w-4" />
        <span className="text-[11px] font-black uppercase tracking-wider">
          📺 Transmissão de jogo
        </span>
      </div>
      {matchLabel && (
        <p className="mt-1.5 text-sm font-semibold text-foreground leading-tight">
          {matchLabel}
          {league && (
            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
              · {league}
            </span>
          )}
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {channel && (
          <span>
            Canal: <span className="text-foreground font-medium">{channel}</span>
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
          >
            Assistir <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {notes && (
        <p className="mt-1.5 text-xs text-muted-foreground italic">{notes}</p>
      )}
    </div>
  );
}
