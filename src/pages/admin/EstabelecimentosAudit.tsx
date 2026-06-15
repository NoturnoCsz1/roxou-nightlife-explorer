/**
 * Auditoria de Estabelecimentos — shell orquestrador.
 * Refatorado na Fase 3A: toda lógica e UI foram movidas para
 * `src/apps/admin/estabelecimentos/*` sem alteração de comportamento.
 *
 * Garantias preservadas:
 *  - Mesmas queries Supabase (sem migração para services/)
 *  - Mesmos payloads de update (patch / saveManualCoords / generateCoordinates / applySuggestions)
 *  - Mesma rota: /admin/estabelecimentos
 *  - Mesma UI (marcação, classes Tailwind, ordem de elementos)
 */
import { useEstabelecimentosAudit } from "@/apps/admin/estabelecimentos/useEstabelecimentosAudit";
import { EstabelecimentosBulkActions } from "@/apps/admin/estabelecimentos/EstabelecimentosBulkActions";
import { EstabelecimentosAuraSyncPanel } from "@/apps/admin/estabelecimentos/EstabelecimentosAuraSyncPanel";
import { EstabelecimentosStatsGrid } from "@/apps/admin/estabelecimentos/EstabelecimentosStatsGrid";
import { EstabelecimentosFixFirstPanel } from "@/apps/admin/estabelecimentos/EstabelecimentosFixFirstPanel";
import { EstabelecimentosAuditFilters } from "@/apps/admin/estabelecimentos/EstabelecimentosAuditFilters";
import { EstabelecimentosAuditRow } from "@/apps/admin/estabelecimentos/EstabelecimentosAuditRow";
import { EstabelecimentosMapModal } from "@/apps/admin/estabelecimentos/EstabelecimentosMapModal";

const EstabelecimentosAudit = () => {
  const h = useEstabelecimentosAudit();

  return (
    <div className="space-y-4 md:ml-44">
      <EstabelecimentosBulkActions
        onAnalyzeBase={h.analyzeBase}
        globalBusy={h.globalBusy}
      />

      {h.globalAI && (
        <EstabelecimentosAuraSyncPanel
          data={h.globalAI}
          onClose={() => h.setGlobalAI(null)}
        />
      )}

      <EstabelecimentosStatsGrid
        stats={h.stats}
        qualityFilter={h.qualityFilter}
        setQualityFilter={h.setQualityFilter}
      />

      <EstabelecimentosFixFirstPanel
        fixFirst={h.fixFirst}
        setQualityFilter={h.setQualityFilter}
        setOrderBy={h.setOrderBy}
      />

      <EstabelecimentosAuditFilters
        search={h.search} setSearch={h.setSearch}
        statusFilter={h.statusFilter} setStatusFilter={h.setStatusFilter}
        cityF={h.cityF} setCityF={h.setCityF}
        categoryF={h.categoryF} setCategoryF={h.setCategoryF}
        orderBy={h.orderBy} setOrderBy={h.setOrderBy}
        errorsOnly={h.errorsOnly} setErrorsOnly={h.setErrorsOnly}
        noCoordsOnly={h.noCoordsOnly} setNoCoordsOnly={h.setNoCoordsOnly}
        qualityFilter={h.qualityFilter} setQualityFilter={h.setQualityFilter}
        cities={h.cities}
        categories={h.categories}
      />

      {h.loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : h.filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum estabelecimento.</p>
      ) : (
        <div className="space-y-2">
          {h.filtered.map(e => (
            <EstabelecimentosAuditRow
              key={e.id}
              e={e}
              metrics={h.metrics[e.id]}
              busy={h.busy}
              aiBusy={h.aiBusy}
              suggestBusy={h.suggestBusy}
              applyBusy={h.applyBusy}
              aiResult={h.aiResult[e.id]}
              suggestResult={h.suggestResult[e.id]}
              applySel={h.applySel[e.id]}
              defaultApplySel={h.defaultApplySel}
              manualOpen={h.manualOpen[e.id]}
              setManualOpen={(m) => h.setManualOpen(prev => {
                if (m === null) { const n = { ...prev }; delete n[e.id]; return n; }
                return { ...prev, [e.id]: m };
              })}
              onSetStatus={(s) => h.setStatus(e, s)}
              onValidateInstagram={() => h.validateInstagram(e)}
              onGenerateCoordinates={() => h.generateCoordinates(e)}
              onAnalyzeOne={() => h.analyzeOne(e)}
              onSuggestOne={() => h.suggestOne(e)}
              onReloadOne={() => h.reloadOne(e.id)}
              onSaveManualCoords={(lat, lng) => h.saveManualCoords(e, lat, lng)}
              onCloseAiResult={() => h.setAiResult(prev => { const n = { ...prev }; delete n[e.id]; return n; })}
              onCloseSuggest={() => h.setSuggestResult(prev => { const n = { ...prev }; delete n[e.id]; return n; })}
              onToggleApplySel={(k) => h.setApplySel(prev => {
                const base = prev[e.id] ?? h.defaultApplySel(e, h.suggestResult[e.id]!);
                return { ...prev, [e.id]: { ...base, [k]: !base[k] } };
              })}
              onApply={() => h.applySuggestions(e)}
              onOpenMap={() => h.setMapModal(e)}
            />
          ))}
        </div>
      )}

      {h.mapModal && (
        <EstabelecimentosMapModal e={h.mapModal} onClose={() => h.setMapModal(null)} />
      )}
    </div>
  );
};

export default EstabelecimentosAudit;
