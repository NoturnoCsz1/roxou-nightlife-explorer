/**
 * DESCUBRA NA ROXOU — bloco de destaque do Discovery na Home.
 *
 * Substitui o antigo bloco "Jogos ao vivo". Consome exclusivamente o
 * catálogo oficial `listEnabledDiscoveryCategories()` do Discovery Engine.
 * Cada atalho leva para `/descobrir/{slug}`. Nenhuma lista hardcoded.
 */
import { Link } from "react-router-dom";
import { ChevronRight, Compass } from "lucide-react";
import { listEnabledDiscoveryCategories } from "@modules/discovery";

const EMOJI: Record<string, string> = {
  "onde-comer": "🍽️",
  "onde-sair": "🌙",
  "happy-hour": "🍻",
  romantico: "❤️",
  familia: "👨‍👩‍👧",
  "pet-friendly": "🐾",
  churrascarias: "🥩",
  pizzarias: "🍕",
  hamburguerias: "🍔",
  cafeterias: "☕",
};

export default function HomeDiscoveryHighlight() {
  const categories = listEnabledDiscoveryCategories();
  if (categories.length === 0) return null;

  return (
    <section aria-label="Descubra na Roxou" className="px-4 pt-5 pb-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-base text-foreground truncate uppercase tracking-wide">
              Descubra na Roxou
            </h2>
            <p className="text-[10px] text-muted-foreground -mt-0.5 truncate">
              Lugares para comer, beber e aproveitar a cidade.
            </p>
          </div>
        </div>
        <Link
          to="/descobrir"
          className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5 shrink-0"
        >
          Ver tudo <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to={`/descobrir/${c.slug}`}
            className="group flex items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/60 px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0" aria-hidden>
                {EMOJI[c.slug] ?? "✨"}
              </span>
              <span className="truncate text-[13px] font-bold text-foreground">
                {c.title}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </section>
  );
}
