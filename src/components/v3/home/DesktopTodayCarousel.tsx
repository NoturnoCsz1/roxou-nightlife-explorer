import type { ComponentType } from "react";

/**
 * DesktopTodayCarousel — carrossel horizontal de eventos do dia (desktop).
 *
 * Extraído de V3Home.tsx para reduzir o tamanho do arquivo principal,
 * sem alterar visual, dados ou lógica.
 *
 * IMPORTANTE:
 * - PremiumEventCard continua em V3Home.tsx (usado em vários lugares)
 *   e é injetado via prop `Card` para evitar acoplamento.
 * - Eventos são esperados já normalizados (safeEvents fica em V3Home).
 */

interface MinimalEv {
  id: string;
  partner_id?: string | null;
}

interface DesktopTodayCarouselProps<TEv extends MinimalEv> {
  events: TEv[];
  partnerRankMap: Map<string, number>;
  trendingIdSet: Set<string>;
  Card: ComponentType<{
    ev: TEv;
    size?: "md" | "lg";
    isTrending?: boolean;
    partnerRank?: number;
    className?: string;
  }>;
}

export default function DesktopTodayCarousel<TEv extends MinimalEv>({
  events,
  partnerRankMap,
  trendingIdSet,
  Card,
}: DesktopTodayCarouselProps<TEv>) {
  const list = Array.isArray(events) ? events : [];
  return (
    <section className="rounded-3xl v3-glass p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Eventos de hoje</p>
          <h2 className="font-display text-2xl font-black uppercase text-foreground">Carrossel da noite</h2>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase text-primary">
          {list.length} rolês
        </span>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 pr-5 scrollbar-hide [scroll-padding-right:1.25rem]">
        {list.map((ev) => (
          <Card
            key={ev.id}
            ev={ev}
            size="lg"
            isTrending={trendingIdSet.has(ev.id)}
            partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined}
            className="!w-[280px] snap-start rounded-3xl overflow-hidden"
          />
        ))}
      </div>
    </section>
  );
}
