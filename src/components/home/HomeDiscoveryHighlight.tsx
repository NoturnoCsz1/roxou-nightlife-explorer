/**
 * DESCUBRA NA ROXOU — bloco único de descoberta na Home.
 *
 * Fonte de verdade: `listEnabledDiscoveryCategories()` do Discovery Engine.
 * Exibe até 6 categorias estratégicas + botão "Ver todas" (/descobrir)
 * + atalhos complementares (Agenda, Ingressos, Notícias, Transportes)
 * na mesma seção — evita duplicação com o antigo bloco "Descobrir mais".
 */
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Compass,
  CalendarDays,
  Ticket,
  Newspaper,
  Bus,
} from "lucide-react";
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

const SHORTCUTS = [
  { to: "/agenda", label: "Agenda", Icon: CalendarDays },
  { to: "/agenda", label: "Ingressos", Icon: Ticket },
  { to: "/noticias", label: "Notícias", Icon: Newspaper },
  { to: "/transportes", label: "Transportes", Icon: Bus },
];

export default function HomeDiscoveryHighlight() {
  const all = listEnabledDiscoveryCategories();
  if (all.length === 0) return null;
  const featured = all.slice(0, 6);
  const hasMore = all.length > featured.length;

  return (
    <section aria-label="Descubra na Roxou" className="px-4 pt-5 pb-2">
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
              Encontre lugares, experiências e o que fazer na cidade.
            </p>
          </div>
        </div>
      </div>

      {/* Categorias Discovery — até 6 */}
      <div className="grid grid-cols-2 gap-2">
        {featured.map((c) => (
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

      {/* Ver todas as categorias — hub /descobrir */}
      {hasMore && (
        <div className="mt-2">
          <Link
            to="/descobrir"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 py-2 text-[12px] font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            Ver todas as categorias
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Atalhos complementares — compactos, visualmente discretos */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {SHORTCUTS.map(({ to, label, Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-1 rounded-xl border border-border/30 bg-card/40 py-2 px-1 hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-foreground/80 truncate max-w-full">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
