import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isValid as isValidDate } from "date-fns";

const toSafeDate = (d?: string | null) => {
  const parsed = new Date(d || "");
  return isValidDate(parsed) ? parsed : null;
};

/**
 * TodayTimeline + TodayEmptyState — extraídos de V3Home.tsx para reduzir
 * o tamanho do arquivo principal, sem alterar visual, dados ou lógica.
 *
 * IMPORTANTE:
 * - PremiumEventCard continua em V3Home.tsx (usado em vários lugares)
 *   e é injetado via prop `Card` para evitar acoplamento.
 * - Nenhuma query, helper de timezone ou lógica de filtro foi movido.
 */

const fmtTime = (d?: string | null) => {
  const parsed = toSafeDate(d);
  return parsed ? format(parsed, "HH'h'mm", { locale: ptBR }) : "Horário a confirmar";
};

interface MinimalEv {
  id: string;
  date_time: string;
  partner_id?: string | null;
}

export function TodayEmptyState({ error, loading }: { error?: boolean; loading?: boolean }) {
  return (
    <section className="px-4 pt-6 pb-3">
      <div className="mb-3">
        <h2 className="font-display font-black text-lg text-foreground uppercase tracking-wide">⚡ Hoje</h2>
        <p className="text-[10px] text-muted-foreground">Timeline da noite em sequência</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando rolês de hoje…</p>
        ) : error ? (
          <>
            <p className="text-sm font-semibold text-foreground">Não foi possível carregar os eventos agora.</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Verifique sua conexão e tente novamente em instantes.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Hoje ainda não temos eventos publicados.</p>
            <Link to="/agenda" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 text-[11px] font-black uppercase text-primary hover:bg-primary/25">
              Ver agenda completa
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

interface TodayTimelineProps<TEv extends MinimalEv> {
  events: TEv[];
  partnerRankMap: Map<string, number>;
  trendingIdSet: Set<string>;
  compact?: boolean;
  Card: ComponentType<{
    ev: TEv;
    size?: "md" | "lg";
    isTrending?: boolean;
    partnerRank?: number;
    timeline?: boolean;
  }>;
}

export function TodayTimeline<TEv extends MinimalEv>({
  events,
  partnerRankMap,
  trendingIdSet,
  compact = false,
  Card,
}: TodayTimelineProps<TEv>) {
  const list = Array.isArray(events) ? events : [];
  return (
    <section className={compact ? "h-full" : "px-4 pt-5 pb-3"}>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display font-black text-lg text-foreground uppercase tracking-wide">⚡ Hoje</h2>
          <p className="text-[10px] text-muted-foreground">Timeline da noite em sequência</p>
        </div>
      </div>
      <div className="relative space-y-3 pl-12">
        <div className="absolute left-5 top-3 bottom-3 w-px bg-gradient-to-b from-primary/10 via-primary/75 to-accent/10 shadow-[0_0_15px_hsl(var(--primary)/0.45)]" />
        {list.map((ev) => (
          <div key={ev.id} className="relative">
            <div className="absolute -left-12 top-5 z-10 rounded-full border border-primary/35 bg-background px-2 py-1 text-[10px] font-black text-primary shadow-[0_0_15px_hsl(var(--primary)/0.35)]">
              {fmtTime(ev.date_time)}
            </div>
            <Card ev={ev} size="lg" isTrending={trendingIdSet.has(ev.id)} partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined} timeline />
          </div>
        ))}
      </div>
    </section>
  );
}

export default TodayTimeline;
