// Hook composto da listagem de eventos do admin (Fase 3B).
// Apenas estado + composição. Ações ficam em ./useEventosListActions,
// derivações em ./selectors e o efeito de teclado em ./useTriageShortcuts.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import type {
  DateQuickFilter,
  EventRow,
  ExtraFilter,
  OriginFilter,
  TabKey,
} from "./types";
import { computeEventosListDerived } from "./selectors";
import { useEventosListActions } from "./useEventosListActions";
import { useTriageShortcuts } from "./useTriageShortcuts";

export function useEventosList() {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();

  // ===== Estado =====
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<string>("todos");
  const [activeDateFilter, setActiveDateFilter] = useState<DateQuickFilter>("todos");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [onlyNeedsReview, setOnlyNeedsReview] = useState(false);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("todos");
  const [extraFilter, setExtraFilter] = useState<ExtraFilter>("todos");
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [aiBusy, setAiBusy] = useState<Record<string, "title" | "desc" | null>>({});
  const [publishing, setPublishing] = useState(false);
  const [quickEdits, setQuickEdits] = useState<
    Record<string, { title: string; date_time: string; venue_name?: string }>
  >({});
  const [visibleCount, setVisibleCount] = useState(80);
  const [auraModalOpen, setAuraModalOpen] = useState(false);
  const [triageMode, setTriageMode] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [bulkSafeOpen, setBulkSafeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("todos");
  const [searchInput, setSearchInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce de busca (250ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ===== Derivados =====
  const derived = computeEventosListDerived({
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
  });

  // ===== Ações =====
  const actions = useEventosListActions({
    navigate,
    cityFilter,
    events,
    setEvents,
    setLoading,
    setClickCounts,
    selectedIds,
    setSelectedIds,
    filtered: derived.filtered,
    setZipping,
    setZipProgress,
    setAiBusy,
    setPublishing,
    quickEdits,
    deleteTarget,
    setDeleteTarget,
    setBulkSafeOpen,
  });

  // Carregamento inicial
  useEffect(() => {
    actions.loadEvents();
    actions.loadClickCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset de paginação ao mudar filtros (mesmas deps do original).
  useEffect(() => {
    setVisibleCount(80);
  }, [
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
  ]);

  // Atalhos do Modo Revisão.
  useTriageShortcuts({
    triageMode,
    focusedId,
    setFocusedId,
    filtered: derived.filtered,
    events,
    setEvents,
    navigate,
    actions,
    search,
    activeCategory,
    activeStatus,
    activePartner,
    activeDateFilter,
    onlyIncomplete,
    onlyNeedsReview,
    originFilter,
    extraFilter,
  });

  return {
    // navegação
    navigate,
    // estado
    events,
    setEvents,
    search,
    setSearch,
    loading,
    deleteTarget,
    setDeleteTarget,
    pastOpen,
    setPastOpen,
    activeCategory,
    setActiveCategory,
    activeStatus,
    setActiveStatus,
    activePartner,
    setActivePartner,
    activeDateFilter,
    setActiveDateFilter,
    onlyIncomplete,
    setOnlyIncomplete,
    onlyNeedsReview,
    setOnlyNeedsReview,
    originFilter,
    setOriginFilter,
    extraFilter,
    setExtraFilter,
    clickCounts,
    selectedIds,
    setSelectedIds,
    zipping,
    zipProgress,
    aiBusy,
    publishing,
    quickEdits,
    setQuickEdits,
    visibleCount,
    setVisibleCount,
    auraModalOpen,
    setAuraModalOpen,
    triageMode,
    setTriageMode,
    focusedId,
    setFocusedId,
    bulkSafeOpen,
    setBulkSafeOpen,
    activeTab,
    setActiveTab,
    searchInput,
    setSearchInput,
    filtersOpen,
    setFiltersOpen,
    // ações
    ...actions,
    // derivados
    ...derived,
  };
}

export type EventosListCtx = ReturnType<typeof useEventosList>;
