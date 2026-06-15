# Fase 3A — Refatoração de `EstabelecimentosAudit.tsx`

Data: 15/06/2026.

## Objetivo
Quebrar `src/pages/admin/EstabelecimentosAudit.tsx` (1557 LOC) em componentes < 500 LOC, sem alterar:
- UI
- queries Supabase
- ações de update
- RLS
- rotas
- comportamento em geral

## Resultado
Shell final: **114 LOC** (era 1557). Todos os módulos extraídos < 500 LOC.

| Arquivo | LOC | Tipo |
|---|---:|---|
| `src/pages/admin/EstabelecimentosAudit.tsx` (shell) | **114** | orquestrador |
| `src/apps/admin/estabelecimentos/useEstabelecimentosAudit.ts` | 450 | hook único — estado + queries + AI + ações |
| `src/apps/admin/estabelecimentos/EstabelecimentosAiSuggestPanel.tsx` | 250 | painel sugestões IA |
| `src/apps/admin/estabelecimentos/EstabelecimentosAuditRow.tsx` | 221 | cartão por parceiro |
| `src/apps/admin/estabelecimentos/types.ts` | 136 | tipos + constantes |
| `src/apps/admin/estabelecimentos/geocoding.ts` | 115 | Google Maps SDK + Nominatim + parseMapsUrl |
| `src/apps/admin/estabelecimentos/EstabelecimentosAuditFilters.tsx` | 98 | barra de filtros completa |
| `src/apps/admin/estabelecimentos/EstabelecimentosAiAnalysisPanel.tsx` | 88 | painel diagnóstico IA |
| `src/apps/admin/estabelecimentos/EstabelecimentosManualCoords.tsx` | 70 | form de coords manuais |
| `src/apps/admin/estabelecimentos/EstabelecimentosAuraSyncPanel.tsx` | 69 | painel "Diagnóstico IA da base" |
| `src/apps/admin/estabelecimentos/EstabelecimentosFixFirstPanel.tsx` | 65 | top 5 piores scores |
| `src/apps/admin/estabelecimentos/EstabelecimentosMapModal.tsx` | 47 | modal RoxouVenueMap |
| `src/apps/admin/estabelecimentos/EstabelecimentosStatsGrid.tsx` | 43 | grid 3 linhas de KPIs |
| `src/apps/admin/estabelecimentos/EstabelecimentosBulkActions.tsx` | 40 | cabeçalho + ações em massa |
| `src/apps/admin/estabelecimentos/Stat.tsx` | 40 | card de KPI reutilizável |
| `src/apps/admin/estabelecimentos/scoring.ts` | 36 | computeScore, scoreTone, computeFlags |

**Total novo:** 1768 LOC (vs 1557 original). Aumento esperado por boilerplate de props e arquivos separados; ganho real é a manutenibilidade.

## Garantias

### Comportamento idêntico
- **Queries Supabase preservadas** literalmente (mesmo `.select("*")`, mesmo `.eq("city", cityFilter)`, mesmo `.update({...})`). Nenhuma migração para `src/services/` (respeitando regra da Fase 3A).
- **Payloads de update preservados**:
  - `patch(id, payload)` em `partners`
  - `saveManualCoords` → `{ latitude, longitude }`
  - `generateCoordinates` → `{ latitude, longitude, maps_place_id, formatted_address }`
  - `applySuggestions` → mesmo objeto `update` com mesmos campos elegíveis + mesmo `updated_at: new Date().toISOString()`
  - `setStatus` → `{ status, active: status !== "bloqueado" }`
  - `validateInstagram` → `{ instagram_validated: true }`
  - `automation_logs` insert opcional em try/catch silencioso
- **Mass-update**: a tela **não possui** ações de mass-update (bulk geocoding está desativado; "Análise IA da base" é somente leitura, chama edge `ai-audit-establishments` em modo global e exibe resultado). Nada alterado.
- **Edge function invokes** preservados: `ai-audit-establishments` (modes: suggest/single/global), `geocode-address`, `maps-key`.

### UI preservada
- Mesma marcação JSX, mesmas classes Tailwind, mesma ordem de elementos, mesmos ícones lucide, mesmas toasts.
- Screenshots `docs/refactor/screenshots/FASE_03A_before.png` e `FASE_03A_after.png` mostram tela idêntica (página com 0 estabelecimentos no preview de dev, exibindo apenas dashboard de KPIs zerados + filtros).

### RLS / rotas / SEO / PWA
- **Não tocados**. Apenas movimentação de código TS/TSX.

## Validação
- `npx eslint src/pages/admin/EstabelecimentosAudit.tsx src/apps/admin/estabelecimentos/` → **0 erros, 0 warnings**.
- Build automático da harness Lovable (vite + plugin-pwa) executa após cada edição; sem imports quebrados.
- Preview `/admin/estabelecimentos` carrega corretamente com layout idêntico.

## Decisões técnicas

1. **Hook único `useEstabelecimentosAudit.ts` (450 LOC)** — abaixo do teto de 500 LOC. Optei por não fragmentar `useEstabelecimentosActions` para evitar prop-drilling e múltiplos hooks reentrantes. Se a Fase 3B+ pedir, pode ser cortado em `useEstabelecimentosState`, `useEstabelecimentosAI`, `useEstabelecimentosGeocode`.
2. **Nome `EstabelecimentosAuraSyncPanel.tsx`** — o nome veio da sugestão do usuário. Não existe sync com o motor Aura nesta tela; o componente renderiza o painel "Diagnóstico IA da base" produzido por `ai-audit-establishments`. Documentado no header do arquivo.
3. **Nome `EstabelecimentosBulkActions.tsx`** — também da sugestão. Atualmente contém apenas cabeçalho + botão "Análise IA da base" (leitura) + botão "Novo" (link). Pronto para futuras ações em massa.
4. **`eslint-disable` justificados** em 2 pontos do hook (useEffect/useMemo deps) — comportamento intencionalmente idêntico ao original.

## Rollback
Snapshot via History tab antes da Fase 3A. Para reverter manualmente:
1. Restaurar `src/pages/admin/EstabelecimentosAudit.tsx` da History.
2. Apagar `src/apps/admin/estabelecimentos/`.

## Riscos para Fase 3B
1. **Hook 450 LOC** está perto do teto; cortar antes da próxima refatoração nesta tela.
2. **`partners` é a tabela compartilhada com Parceiros/Public**; mantida intocada.
3. **Edge `ai-audit-establishments`** continua sendo a única fonte de IA aqui — qualquer breaking change ali impactará a Fase 3B (lista de eventos), pois é o mesmo padrão.
