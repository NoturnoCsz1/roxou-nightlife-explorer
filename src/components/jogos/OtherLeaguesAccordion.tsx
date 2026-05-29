import { ChevronDown, Globe } from "lucide-react";
import MatchCard from "./MatchCard";
import { groupByLeague, type NormalizedMatch } from "@/lib/theSportsDb";
import type { MatchMetaMap } from "@/hooks/useMatchMeta";

interface Props {
  matches: NormalizedMatch[];
  metaMap?: MatchMetaMap;
}

/**
 * Accordion "Outras ligas internacionais" — agrupa jogos por league_label.
 * Mantém os jogos longe do topo da página, sem perder a informação.
 */
export default function OtherLeaguesAccordion({ matches, metaMap = {} }: Props) {
  const groups = groupByLeague(matches);
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-6 text-center">
        <Globe className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
        <p className="text-sm font-semibold">Nenhum jogo internacional no período.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Jogos internacionais ficam organizados por campeonato para não poluir os destaques do Brasil.
      </p>
      {groups.map((g, idx) => (
        <details
          key={g.league}
          open={idx === 0}
          className="group rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          <summary className="flex items-center justify-between gap-3 cursor-pointer px-4 py-3 hover:bg-card/70 transition list-none">
            <span className="inline-flex items-center gap-2 font-display font-black text-sm">
              <Globe className="h-4 w-4 text-primary" />
              {g.league}
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {g.matches.length} {g.matches.length === 1 ? "jogo" : "jogos"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            {g.matches.map((m) => (
              <MatchCard
                key={m.external_id}
                match={m}
                compact
                venuesCount={metaMap[m.slug]?.venuesCount}
                hasStream={metaMap[m.slug]?.hasStream}
                hasActiveChat={metaMap[m.slug]?.hasActiveChat}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
