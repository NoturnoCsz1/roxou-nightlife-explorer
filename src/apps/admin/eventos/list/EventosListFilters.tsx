// Toolbar de filtros: header, busca, selects, Sheet de filtros avançados
// e abas operacionais. Adiciona toggle de modo (Cards/Compacto).

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Check,
  LayoutGrid,
  Layers,
  List,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { trackAdminEvent } from "@/lib/adminAnalytics";
import type { DateQuickFilter, ExtraFilter, OriginFilter, TabKey } from "./types";
import type { EventosListCtx } from "./useEventosList";


const TABS: { key: TabKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "hoje", label: "Hoje" },
  { key: "rascunhos", label: "Rascunhos" },
  { key: "revisao", label: "Revisão" },
  { key: "problemas", label: "Problemas" },
  { key: "destaques", label: "Destaques" },
  { key: "passados", label: "Passados" },
];

export function EventosListFilters({ ctx }: { ctx: EventosListCtx }) {
  const {
    setAuraModalOpen,
    reviewInFiltered,
    setActiveTab,
    searchInput,
    setSearchInput,
    activeStatus,
    setActiveStatus,
    activePartner,
    setActivePartner,
    partnerOptions,
    filtersOpen,
    setFiltersOpen,
    hasActiveAdvanced,
    activeDateFilter,
    setActiveDateFilter,
    activeCategory,
    setActiveCategory,
    categoryCounts,
    originFilter,
    setOriginFilter,
    extraFilter,
    setExtraFilter,
    onlyNeedsReview,
    setOnlyNeedsReview,
    onlyIncomplete,
    setOnlyIncomplete,
    activeTab,
    triageMode,
    setTriageMode,
    publishing,
    readyInFiltered,
    setBulkSafeOpen,
    viewMode,
    setViewMode,
  } = ctx;

  function changeViewMode(mode: "cards" | "compact") {
    if (mode === viewMode) return;
    setViewMode(mode);
    trackAdminEvent("admin_events_view_mode_changed", { mode });
  }

  return (
    <>
      {/* HEADER limpo (Linear/Vercel/Notion) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Eventos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie, revise e publique eventos.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAuraModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
            title="Cole texto e a Aura organiza o evento"
          >
            <Bot className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Aura</span>
          </button>
          <Link
            to="/admin/eventos/novo/lote"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-secondary/70"
            title="Criar eventos em lote"
          >
            <Layers className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Lote</span>
          </Link>
          <Link
            to="/admin/eventos/novo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.35)] transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo
          </Link>
        </div>
      </div>

      {/* Alerta operacional — só aparece se houver problema real */}
      {reviewInFiltered > 0 && (
        <button
          type="button"
          onClick={() => setActiveTab("problemas")}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/[0.06] px-3 py-2 text-left transition hover:bg-yellow-400/10"
        >
          <span className="inline-flex items-center gap-2 text-xs text-yellow-300/90">
            <AlertTriangle className="h-3.5 w-3.5" />
            <strong className="font-semibold">{reviewInFiltered}</strong> evento(s) precisam de revisão
          </span>
          <span className="text-[10px] uppercase font-bold text-yellow-300/70">Abrir →</span>
        </button>
      )}

      {/* TOOLBAR sticky minimalista */}
      <div className="sticky top-0 z-30 -mx-2 px-2 py-2 bg-background/85 backdrop-blur-xl border-b border-border/40 space-y-2">
        <div className="flex items-center gap-2">
          {/* Search com prioridade visual */}
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border/40 bg-background/80 px-3 py-2 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] transition">
            <Search className="h-4 w-4 text-muted-foreground/70" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por título, local ou parceiro..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status */}
          <select
            value={activeStatus ?? ""}
            onChange={(e) => setActiveStatus(e.target.value || null)}
            className="hidden sm:block rounded-lg border border-border/40 bg-background/80 px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            <option value="">Status</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="archived">Arquivados</option>
          </select>

          {/* Parceiro (desktop) */}
          <select
            value={activePartner}
            onChange={(e) => setActivePartner(e.target.value)}
            className="hidden md:block max-w-[180px] rounded-lg border border-border/40 bg-background/80 px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary/50 truncate"
            title="Filtrar por empresa/parceiro"
          >
            <option value="todos">Todas as empresas</option>
            <option value="sem-parceiro">Sem parceiro</option>
            {partnerOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>


          {/* Botão Filtros (drawer) */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={`relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  hasActiveAdvanced
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/40 bg-secondary/40 text-foreground/80 hover:bg-secondary/70"
                }`}
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveAdvanced && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-md bg-card/95 backdrop-blur-xl border-l border-border/40 overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle>Filtros avançados</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Data
                  </label>
                  <select
                    value={activeDateFilter}
                    onChange={(e) => {
                      setActiveDateFilter(e.target.value as DateQuickFilter);
                      trackAdminEvent("admin_events_filter_used", {
                        source: "sheet",
                        filter: "date",
                        value: e.target.value,
                      });
                    }}
                    className="w-full rounded-lg border border-border/40 bg-background/80 px-3 py-2 text-sm"
                  >
                    <option value="todos">Todas as datas</option>
                    <option value="hoje">Hoje</option>
                    <option value="semana">Próximos 7 dias</option>
                    <option value="mes">Este mês (30d)</option>
                    <option value="futuros">Futuros</option>
                    <option value="passados">Passados</option>
                    <option value="sem-data">Sem data</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Categoria
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg transition ${
                        !activeCategory
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      Todas
                    </button>
                    {categoryCounts.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setActiveCategory(activeCategory === c.key ? null : c.key)}
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg transition ${
                          activeCategory === c.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {c.label} <span className="ml-0.5 opacity-60">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Origem
                  </label>
                  <select
                    value={originFilter}
                    onChange={(e) => {
                      setOriginFilter(e.target.value as OriginFilter);
                      trackAdminEvent("admin_events_filter_used", {
                        source: "sheet",
                        filter: "origin",
                        value: e.target.value,
                      });
                    }}
                    className="w-full rounded-lg border border-border/40 bg-background/80 px-3 py-2 text-sm"
                  >
                    <option value="todos">Todas as origens</option>
                    <option value="aura">Aura</option>
                    <option value="instagram">Instagram</option>
                    <option value="eventou">Eventou</option>
                    <option value="ai">IA (qualquer)</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Atributos
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { key: "todos", label: "Todos" },
                        { key: "prontos", label: "Prontos para publicar" },
                        { key: "revisar", label: "Revisar" },
                        { key: "duplicados", label: "Possíveis duplicados" },
                        { key: "aura", label: "Aura Pick" },
                        { key: "destaques", label: "Destaques" },
                        { key: "em-alta", label: "Em alta" },
                        { key: "detectados-hoje", label: "Detectados hoje" },
                        { key: "sem-imagem", label: "Sem capa" },
                        { key: "sem-descricao", label: "Sem descrição" },
                        { key: "sem-local", label: "Sem local" },
                        { key: "sem-data", label: "Sem data" },
                        { key: "incompletos", label: "Incompletos" },
                        { key: "arquivados", label: "Arquivados" },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setExtraFilter(key as ExtraFilter)}
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg transition ${
                          extraFilter === key
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sinalizações
                  </label>
                  <button
                    onClick={() => setOnlyNeedsReview(!onlyNeedsReview)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition ${
                      onlyNeedsReview
                        ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                        : "border-border/40 bg-secondary/40 text-foreground/80 hover:bg-secondary/70"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" /> Apenas eventos com erro de IA
                    </span>
                  </button>
                  <button
                    onClick={() => setOnlyIncomplete(!onlyIncomplete)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition ${
                      onlyIncomplete
                        ? "border-red-400/40 bg-red-400/10 text-red-300"
                        : "border-border/40 bg-secondary/40 text-foreground/80 hover:bg-secondary/70"
                    }`}
                  >
                    Apenas rascunhos incompletos
                  </button>
                </div>

                <div className="pt-4 border-t border-border/40 flex gap-2">
                  <button
                    onClick={() => {
                      setActiveCategory(null);
                      setActiveDateFilter("todos");
                      setOnlyIncomplete(false);
                      setOnlyNeedsReview(false);
                      setOriginFilter("todos");
                      setExtraFilter("todos");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-secondary/40 px-3 py-2 text-xs font-semibold text-foreground/80 hover:bg-secondary/70"
                  >
                    <X className="h-3.5 w-3.5" /> Limpar
                  </button>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>


        {/* Empresa (mobile) */}
        <div className="md:hidden">
          <select
            value={activePartner}
            onChange={(e) => setActivePartner(e.target.value)}
            className="w-full rounded-lg border border-border/40 bg-background/80 px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary/50 truncate"
            aria-label="Filtrar por empresa"
          >
            <option value="todos">Todas as empresas</option>
            <option value="sem-parceiro">Sem parceiro</option>
            {partnerOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>



        {/* Tabs operacionais minimalistas */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  trackAdminEvent("admin_events_filter_used", {
                    source: "tabs",
                    filter: "tab",
                    value: t.key,
                  });
                  if (t.key === "revisao") {
                    trackAdminEvent("admin_events_review_opened", { source: "tab" });
                  }
                }}
                className={`shrink-0 relative px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute left-2 right-2 -bottom-[1px] h-[2px] rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
                )}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {/* View mode toggle */}
            <div className="inline-flex items-center rounded-lg border border-border/40 bg-background/60 overflow-hidden">
              <button
                type="button"
                onClick={() => changeViewMode("cards")}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase transition ${
                  viewMode === "cards"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60"
                }`}
                title="Visualização em cards"
                aria-label="Cards"
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => changeViewMode("compact")}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase transition border-l border-border/40 ${
                  viewMode === "compact"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60"
                }`}
                title="Lista compacta"
                aria-label="Lista compacta"
              >
                <List className="h-3 w-3" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTriageMode(!triageMode)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition border ${
                triageMode
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/70"
              }`}
              title="Modo Revisão: cards compactos + atalhos A/D/U/X/R/←→"
            >
              <Bot className="h-3 w-3" /> Modo Revisão
            </button>
            <button
              type="button"
              onClick={() => setBulkSafeOpen(true)}
              disabled={publishing || readyInFiltered === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/20 disabled:opacity-40 transition"
              title="Publicar todos os rascunhos seguros"
            >
              <Check className="h-3 w-3" /> Publicar seguros
              {readyInFiltered > 0 && <span className="opacity-70">{readyInFiltered}</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
