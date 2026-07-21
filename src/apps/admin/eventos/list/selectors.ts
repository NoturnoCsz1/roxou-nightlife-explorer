// Cálculos derivados puros da listagem de eventos (Fase 3B).
// Extraído de useEventosList.ts para manter cada módulo abaixo de 500 LOC.
// Recebe o estado bruto e devolve todos os agregados/contadores usados
// pela toolbar, seções, dialogs e bulk actions.

import { isOperationalEvent, isPastEvent } from "@/lib/eventLifecycle";
import { CATEGORIES, type EventRow } from "./types";
import {
  detectDuplicates,
  eventDayStr,
  getChecklist,
  getOrigin,
  getQualityScore,
  isAiOrigin,
  needsReview,
  spDateStr,
} from "./helpers";

interface SelectorInput {
  events: EventRow[];
  search: string;
  activeCategory: string | null;
  activeStatus: string | null;
  activePartner: string;
  activeDateFilter: string;
  onlyIncomplete: boolean;
  onlyNeedsReview: boolean;
  originFilter: string;
  extraFilter: string;
  activeTab: string;
  visibleCount: number;
  selectedIds: Set<string>;
  zipProgress: { current: number; total: number };
}

export function computeEventosListDerived(input: SelectorInput) {
  const {
    events,
    search,
    activeCategory,
    activeStatus,
    activePartner,
    activeDateFilter,
    onlyIncomplete,
    onlyNeedsReview,
    originFilter,
    extraFilter,
    activeTab,
    visibleCount,
    selectedIds,
    zipProgress,
  } = input;

  const todayStr = spDateStr(new Date());
  const weekEndStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return spDateStr(d);
  })();
  const monthEndStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return spDateStr(d);
  })();

  // Suspeitos de duplicação (cálculo local, sem IA)
  const duplicateIds = detectDuplicates(events);

  const filtered = events
    .filter((e) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [
        e.title,
        e.slug,
        e.id,
        e.venue_name || "",
        e.category || "",
        e.sub_category || "",
      ].some((value) => value.toLowerCase().includes(q));
    })
    .filter((e) => !activeCategory || e.category === activeCategory)
    .filter((e) => !activeStatus || e.status === activeStatus)
    .filter(
      (e) =>
        activePartner === "todos" ||
        (activePartner === "sem-parceiro" ? !e.partner_id : e.partner_id === activePartner)
    )
    .filter((e) => {
      if (activeDateFilter === "todos") return true;
      const eventDay = eventDayStr(e);
      if (activeDateFilter === "sem-data") return !e.date_time;
      if (!eventDay) return false;
      if (activeDateFilter === "hoje") return eventDay === todayStr;
      if (activeDateFilter === "futuros") return eventDay > todayStr;
      if (activeDateFilter === "passados") return eventDay < todayStr;
      if (activeDateFilter === "mes") return eventDay >= todayStr && eventDay <= monthEndStr;
      return eventDay >= todayStr && eventDay <= weekEndStr;
    })
    .filter((e) => !onlyIncomplete || !getChecklist(e).complete)
    .filter((e) => !onlyNeedsReview || needsReview(e))
    .filter((e) => {
      if (originFilter === "todos") return true;
      // Compat: "ai" engloba qualquer origem automática; "manual" exclui qualquer automática.
      if (originFilter === "ai") return isAiOrigin(e);
      if (originFilter === "manual") return !isAiOrigin(e);
      return getOrigin(e) === originFilter;
    })
    .filter((e) => {
      if (extraFilter === "todos") return true;
      if (extraFilter === "aura") return e.aura_pick;
      if (extraFilter === "destaques") return e.featured;
      if (extraFilter === "sem-imagem") return !e.image_url;
      if (extraFilter === "sem-descricao") return !getChecklist(e).description;
      if (extraFilter === "sem-local") return !e.venue_name || !e.venue_name.trim();
      if (extraFilter === "sem-data") return !e.date_time;
      if (extraFilter === "incompletos") return getQualityScore(e) < 100;
      if (extraFilter === "em-alta")
        return (
          e.aura_badge === "em_alta" || e.aura_badge === "viralizando" || e.aura_badge === "bombando"
        );
      if (extraFilter === "detectados-hoje") return spDateStr(new Date(e.created_at)) === todayStr;
      if (extraFilter === "arquivados") return e.status === "archived";
      if (extraFilter === "prontos")
        return e.status !== "published" && e.status !== "archived" && getChecklist(e).complete;
      if (extraFilter === "revisar")
        return e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete);
      if (extraFilter === "duplicados") return duplicateIds.has(e.id);
      return true;
    })
    .filter((e) => {
      if (activeTab === "todos") return true;
      if (activeTab === "hoje") return eventDayStr(e) === todayStr;
      if (activeTab === "rascunhos") return e.status === "draft";
      if (activeTab === "problemas")
        return e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete);
      if (activeTab === "destaques") return e.featured || e.aura_pick;
      if (activeTab === "revisao") {
        if (e.status === "archived") return false;
        const cl = getChecklist(e);
        return (
          !cl.flyer ||
          !cl.description ||
          !e.venue_name ||
          !e.date_time ||
          (e.title || "").trim().length < 5 ||
          duplicateIds.has(e.id) ||
          (isAiOrigin(e) && e.needs_review === true)
        );
      }
      return true;
    });

  const visibleFiltered = filtered.slice(0, visibleCount);
  const auraEvents = visibleFiltered.filter((e) => e.aura_pick && eventDayStr(e) >= todayStr);
  const auraIds = new Set(auraEvents.map((e) => e.id));
  const featuredTodayEvents = visibleFiltered.filter(
    (e) => e.featured && !auraIds.has(e.id) && eventDayStr(e) === todayStr
  );
  const featuredIds = new Set(featuredTodayEvents.map((e) => e.id));
  const todayEvents = visibleFiltered.filter(
    (e) => eventDayStr(e) === todayStr && !auraIds.has(e.id) && !featuredIds.has(e.id)
  );
  const upcomingEvents = visibleFiltered.filter(
    (e) => eventDayStr(e) > todayStr && !auraIds.has(e.id)
  );
  const pastEvents = visibleFiltered.filter((e) => eventDayStr(e) < todayStr);

  const totalTodayCount = events.filter((e) => eventDayStr(e) === todayStr).length;

  const categoryCounts = CATEGORIES.map((c) => ({
    key: c,
    label: c === "eletronica" ? "Eletrônica" : c.charAt(0).toUpperCase() + c.slice(1),
    count: events.filter((e) => e.category === c).length,
  }));

  const withImages = filtered.filter((e) => e.image_url).length;
  const selectedCount = selectedIds.size;
  const zipPercent =
    zipProgress.total > 0 ? Math.round((zipProgress.current / zipProgress.total) * 100) : 0;
  const partnerOptions = Array.from(
    new Map(
      events.filter((e) => e.partner_id && e.venue_name).map((e) => [e.partner_id!, e.venue_name!])
    ).entries()
  );

  // Conjunto operacional: usado pelos contadores e seções do dashboard que
  // NÃO devem mostrar eventos passados/arquivados por padrão. Filtros
  // explícitos do usuário (dateFilter=passados, extraFilter=arquivados)
  // continuam funcionando porque consultam `filtered` direto.
  const operationalEvents = events.filter((e) => isOperationalEvent(e));

  const draftEvents = operationalEvents.filter((e) => e.status === "draft");
  const draftsReady = draftEvents.filter((e) => getChecklist(e).complete).length;
  const draftsAttention = draftEvents.length - draftsReady;
  const selectedReadyToPublish = events.filter(
    (e) => selectedIds.has(e.id) && getChecklist(e).complete && e.status === "draft"
  ).length;
  const readyInFiltered = filtered.filter(
    (e) => e.status !== "published" && e.status !== "archived" && getChecklist(e).complete
  ).length;
  const reviewInFiltered = filtered.filter(
    (e) =>
      e.status !== "archived" &&
      isOperationalEvent(e) &&
      (needsReview(e) || !getChecklist(e).complete)
  ).length;

  const hasActiveAdvanced =
    !!activeCategory ||
    activeDateFilter !== "todos" ||
    onlyIncomplete ||
    onlyNeedsReview ||
    originFilter !== "todos" ||
    extraFilter !== "todos";

  // === Stats globais (barra de chips no topo) ===
  // Counters operacionais ignoram eventos passados/arquivados — eles ainda
  // ficam acessíveis via filtro explícito "passados" / "arquivados".
  const statsBar = {
    hoje: operationalEvents.filter((e) => eventDayStr(e) === todayStr).length,
    semana: operationalEvents.filter((e) => {
      const d = eventDayStr(e);
      return d && d >= todayStr && d <= weekEndStr;
    }).length,
    semCapa: operationalEvents.filter((e) => !getChecklist(e).flyer).length,
    semDescricao: operationalEvents.filter((e) => !getChecklist(e).description).length,
    semLocal: operationalEvents.filter((e) => !e.venue_name || !e.venue_name.trim()).length,
    semData: operationalEvents.filter((e) => !e.date_time).length,
    precisamRevisao: operationalEvents.filter(
      (e) => e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete)
    ).length,
    publicados: events.filter((e) => e.status === "published").length,
    duplicados: duplicateIds.size,
    total: events.length,
  };

  return {
    todayStr,
    weekEndStr,
    monthEndStr,
    filtered,
    visibleFiltered,
    auraEvents,
    featuredTodayEvents,
    todayEvents,
    upcomingEvents,
    pastEvents,
    totalTodayCount,
    categoryCounts,
    withImages,
    selectedCount,
    zipPercent,
    partnerOptions,
    draftEvents,
    draftsReady,
    draftsAttention,
    selectedReadyToPublish,
    readyInFiltered,
    reviewInFiltered,
    hasActiveAdvanced,
    duplicateIds,
    statsBar,
  };
}

export type EventosListDerived = ReturnType<typeof computeEventosListDerived>;
