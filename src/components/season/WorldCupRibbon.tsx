import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { worldCupTheme as t } from "@/themes/worldCupTheme";

interface Props {
  className?: string;
  compact?: boolean;
}

/**
 * Faixa discreta de Copa do Mundo.
 * - Fundo dark com fina borda verde, detalhe amarelo no CTA.
 * - Não cobre tela inteira, não substitui o hero, não rouba foco do roxo.
 */
export default function WorldCupRibbon({ className = "", compact = false }: Props) {
  return (
    <div className={`px-3 md:px-4 ${compact ? "pt-2" : "pt-3"} ${className}`}>
      <Link
        to="/jogos"
        aria-label={`${t.copy.title} — ${t.copy.cta}`}
        className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[#009B3A]/35 bg-background/60 px-3 py-2 backdrop-blur-md transition-all hover:border-[#009B3A]/70"
        style={{ boxShadow: "0 0 18px rgba(0,155,58,0.18)" }}
      >
        {/* Stripe sutil verde/amarelo na lateral esquerda */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: "linear-gradient(180deg,#009B3A 0%,#FFDF00 100%)" }}
        />
        <div className="min-w-0 flex-1 pl-2">
          <p className="truncate text-[12px] font-black uppercase tracking-wide text-foreground">
            {t.copy.title}
          </p>
          {!compact && (
            <p className="truncate text-[11px] text-muted-foreground">{t.copy.subtitle}</p>
          )}
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-background"
          style={{ background: "#FFDF00", boxShadow: t.glow }}
        >
          {t.copy.cta}
          <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
    </div>
  );
}
