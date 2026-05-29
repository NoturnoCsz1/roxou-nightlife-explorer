import { Link } from "react-router-dom";
import { MapPin, Tv, ChevronRight } from "lucide-react";

export interface QuickBar {
  id: string;
  name: string;
  slug: string;
  neighborhood?: string | null;
  type?: string | null;
}

interface Props {
  bars: QuickBar[];
  limit?: number;
  title?: string;
}

/**
 * Lista enxuta de bares que transmitem futebol — exibida abaixo de
 * jogos prioritários para acelerar a decisão de "onde assistir".
 *
 * Usa a curadoria geral de bares esportivos da cidade enquanto não houver
 * vínculo específico (sports_match_venues) salvo para o jogo.
 */
export default function MatchVenuesQuickList({ bars, limit = 3, title = "Bares que transmitem" }: Props) {
  const list = bars.slice(0, limit);
  if (list.length === 0) return null;

  return (
    <div className="mt-2 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
          <Tv className="h-3 w-3" /> {title}
        </p>
        <a
          href="#bares-esportivos"
          className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider"
        >
          ver todos
        </a>
      </div>
      <ul className="space-y-1.5">
        {list.map((b) => (
          <li key={b.id}>
            <Link
              to={`/local/${b.slug}`}
              className="group flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 hover:border-primary/50 hover:bg-card/60 px-2.5 py-2 transition"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                  {b.name}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  {b.neighborhood && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {b.neighborhood}
                    </span>
                  )}
                  {b.type && (
                    <span className="uppercase tracking-wider opacity-70">· {b.type}</span>
                  )}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-black">
                Ver local <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
