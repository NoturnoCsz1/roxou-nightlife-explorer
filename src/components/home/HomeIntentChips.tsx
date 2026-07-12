/**
 * Onda 22 — "O que você procura hoje?"
 *
 * Chips contextuais posicionados abaixo da busca. Reutiliza Discovery
 * Categories e ordena por prioridade do HomeContextService. Não realiza
 * consultas — apenas navega para `/descobrir/{slug}`.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  listEnabledDiscoveryCategories,
  getHomeContext,
  type HomeContext,
} from "@modules/discovery";

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

interface HomeIntentChipsProps {
  context?: HomeContext;
  /** Máx. de chips exibidos (mobile prioriza scroll horizontal). */
  limit?: number;
  className?: string;
}

const HomeIntentChips = ({
  context,
  limit = 8,
  className,
}: HomeIntentChipsProps) => {
  const navigate = useNavigate();
  const active = useMemo(() => context ?? getHomeContext(), [context]);

  const chips = useMemo(() => {
    const categories = listEnabledDiscoveryCategories();
    const rank = new Map(
      active.preferredCategorySlugs.map((s, i) => [s, i]),
    );
    return [...categories]
      .sort((a, b) => {
        const ra = rank.get(a.slug) ?? Number.POSITIVE_INFINITY;
        const rb = rank.get(b.slug) ?? Number.POSITIVE_INFINITY;
        return ra - rb;
      })
      .slice(0, limit)
      .map((c) => ({ slug: c.slug, title: c.title, emoji: EMOJI[c.slug] ?? "✨" }));
  }, [active, limit]);

  if (chips.length === 0) return null;

  return (
    <div className={className} aria-label="O que você procura hoje">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        O que você procura hoje?
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
        {chips.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => navigate(`/descobrir/${c.slug}`)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-secondary/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            <span aria-hidden>{c.emoji}</span>
            <span>{c.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeIntentChips;
