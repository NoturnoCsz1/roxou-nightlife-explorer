import { Sparkles, Users, Music2, DollarSign, CalendarDays, Clock, Heart, Wand2 } from "lucide-react";
import { buildAuraVenueInsights, type AuraInsightsInput } from "@/lib/auraVenueInsights";

interface Props {
  partner: AuraInsightsInput["partner"];
  events: AuraInsightsInput["events"];
}

const confidenceLabel: Record<string, string> = {
  low: "Confiança baixa",
  medium: "Confiança média",
  high: "Confiança alta",
};

/**
 * AuraVenueInsights — bloco premium "Aura analisou este local".
 * Heurístico (sem IA externa). Não toca queries, analytics ou layout existente.
 */
export default function AuraVenueInsights({ partner, events }: Props) {
  const insights = buildAuraVenueInsights({ partner, events });

  const chips: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    { icon: <Users className="w-3.5 h-3.5" />, label: "Público", value: insights.crowd },
    { icon: <Sparkles className="w-3.5 h-3.5" />, label: "Ambiente", value: insights.vibe },
    { icon: <Music2 className="w-3.5 h-3.5" />, label: "Estilo", value: insights.musicStyle },
    { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Preço", value: insights.priceLevel },
    { icon: <CalendarDays className="w-3.5 h-3.5" />, label: "Melhor dia", value: insights.bestDay },
    { icon: <Clock className="w-3.5 h-3.5" />, label: "Pico", value: insights.peakTime },
  ];

  return (
    <section
      aria-label="Insights da Aura sobre este local"
      className="relative overflow-hidden rounded-2xl border border-primary/25 v3-glass p-4 shadow-[0_0_30px_-12px_hsl(var(--v3-neon)/0.5)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Wand2 className="w-3.5 h-3.5" />
          </span>
          <div>
            <h2 className="font-display font-bold text-sm text-foreground leading-tight">
              ✨ Aura analisou este local
            </h2>
            <p className="text-[10px] text-muted-foreground">{confidenceLabel[insights.confidence]}</p>
          </div>
        </div>
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary border border-primary/40 rounded-full px-2 py-0.5 bg-primary/5">
          Aura Beta Insights
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {chips.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm px-2.5 py-2"
          >
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {c.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                {c.label}
              </p>
              <p className="text-xs font-bold text-foreground truncate">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {insights.idealFor.length > 0 && (
        <div className="mt-3 flex items-start gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Heart className="w-3 h-3" />
          </span>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground self-center mr-0.5">
              Ideal para:
            </span>
            {insights.idealFor.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold text-foreground bg-primary/10 border border-primary/25 rounded-full px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground leading-snug">
        Insights automáticos gerados pela Aura com base na atividade do local. Podem evoluir conforme novos eventos.
      </p>
    </section>
  );
}
