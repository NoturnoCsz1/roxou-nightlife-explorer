import { Wallet, Beer, Ticket, TrendingDown, BadgePercent, Info } from "lucide-react";
import { buildAuraVenuePricing, type AuraPricingInput } from "@/lib/auraVenuePricing";

interface Props {
  partner: AuraPricingInput["partner"];
  events: AuraPricingInput["events"];
}

const confidenceLabel: Record<string, string> = {
  low: "Estimativa preliminar",
  medium: "Estimativa moderada",
  high: "Estimativa consolidada",
};

/**
 * AuraVenuePricing — bloco "💸 Estimativa Roxou".
 * Heurístico (sem IA externa). Nunca apresenta como preço oficial.
 */
export default function AuraVenuePricing({ partner, events }: Props) {
  const pricing = buildAuraVenuePricing({ partner, events });

  const chips = [
    { icon: <Ticket className="w-3.5 h-3.5" />, label: "Entrada", value: pricing.entryPrice },
    { icon: <Beer className="w-3.5 h-3.5" />, label: "Drink médio", value: pricing.drinkAverage },
    { icon: <Wallet className="w-3.5 h-3.5" />, label: "Consumo/pessoa", value: pricing.estimatedSpend },
    { icon: <BadgePercent className="w-3.5 h-3.5" />, label: "Perfil", value: pricing.priceProfile },
  ];

  return (
    <section
      aria-label="Estimativa de consumo da Aura"
      className="relative overflow-hidden rounded-2xl border border-accent/25 v3-glass p-4 shadow-[0_0_30px_-12px_hsl(var(--v3-neon)/0.4)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Wallet className="w-3.5 h-3.5" />
          </span>
          <div>
            <h2 className="font-display font-bold text-sm text-foreground leading-tight">
              💸 Estimativa Roxou
            </h2>
            <p className="text-[10px] text-muted-foreground">{confidenceLabel[pricing.confidence]}</p>
          </div>
        </div>
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-accent border border-accent/40 rounded-full px-2 py-0.5 bg-accent/5">
          Beta
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {chips.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-2.5 py-2"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              {c.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                {c.label}
              </p>
              <p className="text-xs font-bold text-foreground leading-tight line-clamp-2 break-words">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <TrendingDown className="w-3 h-3" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            Melhor custo-benefício
          </p>
          <p className="text-xs font-bold text-foreground">{pricing.bestCostDay}</p>
        </div>
      </div>

      {pricing.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {pricing.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-snug">
              <Info className="w-3 h-3 mt-0.5 text-accent shrink-0" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground leading-snug">
        Estimativa automática gerada pela Aura. Valores aproximados — podem variar conforme evento,
        promoção e consumo. Consulte o local para valores atualizados.
      </p>
    </section>
  );
}
