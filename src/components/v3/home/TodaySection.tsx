import type { ComponentType } from "react";

/**
 * TodaySection — wrapper isolado da seção "Eventos de Hoje" da Home.
 *
 * Extraído de V3Home.tsx para reduzir o tamanho do arquivo principal,
 * sem alterar visual, dados ou lógica.
 *
 * IMPORTANTE:
 * - TodayTimeline e TodayEmptyState continuam definidos em V3Home.tsx
 *   porque são reutilizados em outras partes da Home (desktop center,
 *   spotlight). Para evitar acoplamento, eles são injetados via props.
 * - Nenhuma query, helper de data ou timezone foi movido.
 */

interface MinimalEv {
  id: string;
}

interface TodaySectionProps<TEv extends MinimalEv> {
  loading?: boolean;
  error?: unknown;
  events?: TEv[] | null;
  partnerRankMap: Map<string, number>;
  trendingIdSet: Set<string>;
  Timeline: ComponentType<{
    events: TEv[];
    partnerRankMap: Map<string, number>;
    trendingIdSet: Set<string>;
  }>;
  EmptyState: ComponentType<{ error?: boolean; loading?: boolean }>;
}

export default function TodaySection<TEv extends MinimalEv>({
  loading,
  error,
  events,
  partnerRankMap,
  trendingIdSet,
  Timeline,
  EmptyState,
}: TodaySectionProps<TEv>) {
  const list = Array.isArray(events) ? events : [];
  if (loading || error || list.length === 0) {
    return <EmptyState error={!!error} loading={loading} />;
  }
  return (
    <Timeline events={list} partnerRankMap={partnerRankMap} trendingIdSet={trendingIdSet} />
  );
}
