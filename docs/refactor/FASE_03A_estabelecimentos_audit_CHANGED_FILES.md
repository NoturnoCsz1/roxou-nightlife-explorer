# Fase 3A — Relatório de arquivos alterados

Data: 15/06/2026.

## Arquivos criados (15)

| # | Arquivo | LOC |
|---|---|---:|
| 1 | `src/apps/admin/estabelecimentos/types.ts` | 136 |
| 2 | `src/apps/admin/estabelecimentos/scoring.ts` | 36 |
| 3 | `src/apps/admin/estabelecimentos/geocoding.ts` | 115 |
| 4 | `src/apps/admin/estabelecimentos/useEstabelecimentosAudit.ts` | 450 |
| 5 | `src/apps/admin/estabelecimentos/Stat.tsx` | 40 |
| 6 | `src/apps/admin/estabelecimentos/EstabelecimentosBulkActions.tsx` | 40 |
| 7 | `src/apps/admin/estabelecimentos/EstabelecimentosAuraSyncPanel.tsx` | 69 |
| 8 | `src/apps/admin/estabelecimentos/EstabelecimentosStatsGrid.tsx` | 43 |
| 9 | `src/apps/admin/estabelecimentos/EstabelecimentosFixFirstPanel.tsx` | 65 |
| 10 | `src/apps/admin/estabelecimentos/EstabelecimentosAuditFilters.tsx` | 98 |
| 11 | `src/apps/admin/estabelecimentos/EstabelecimentosManualCoords.tsx` | 70 |
| 12 | `src/apps/admin/estabelecimentos/EstabelecimentosAiAnalysisPanel.tsx` | 88 |
| 13 | `src/apps/admin/estabelecimentos/EstabelecimentosAiSuggestPanel.tsx` | 250 |
| 14 | `src/apps/admin/estabelecimentos/EstabelecimentosAuditRow.tsx` | 221 |
| 15 | `src/apps/admin/estabelecimentos/EstabelecimentosMapModal.tsx` | 47 |
| 16 | `docs/refactor/FASE_03A_estabelecimentos_audit.md` | — |
| 17 | `docs/refactor/FASE_03A_estabelecimentos_audit_CHANGED_FILES.md` | — |
| 18 | `docs/refactor/screenshots/FASE_03A_before.png` | (img) |
| 19 | `docs/refactor/screenshots/FASE_03A_after.png` | (img) |

## Arquivos modificados (1)

| Arquivo | Antes | Depois | Mudança |
|---|---:|---:|---|
| `src/pages/admin/EstabelecimentosAudit.tsx` | 1557 | **114** | reescrito como shell que delega tudo para módulos de `@/apps/admin/estabelecimentos`. Mesmo `export default`. |

## Arquivos NÃO tocados (confirmado)

- `src/integrations/supabase/client.ts` / `types.ts`
- `src/components/ui/*`
- `src/lib/dateUtils.ts`
- `src/components/maps/RoxouVenueMap.tsx` (apenas consumido)
- `src/hooks/useAdminProfile.ts` (apenas consumido)
- `src/App.tsx` (rota `/admin/estabelecimentos` inalterada)
- `supabase/functions/ai-audit-establishments/index.ts`
- `supabase/functions/geocode-address/index.ts`
- `supabase/functions/maps-key/index.ts`
- Qualquer RLS / policy
- Tabela `partners`, `events`, `automation_logs`
- PWA, SEO, sitemap

## Lint
```bash
npx eslint src/pages/admin/EstabelecimentosAudit.tsx src/apps/admin/estabelecimentos/
# (sem saída — 0 erros, 0 warnings)
```

## Build
Harness Lovable executa `vite build` automaticamente. Sem imports quebrados.

## Confirmação de mass-updates
A tela `EstabelecimentosAudit` **não possui** operações de mass-update. As únicas operações de escrita são por-registro:
- `patch(id, payload)` — único registro
- `setStatus(e, status)` — único registro
- `validateInstagram(e)` — único registro
- `saveManualCoords(e, lat, lng)` — único registro
- `generateCoordinates(e)` → `update(payload).eq("id", e.id)` — único registro
- `applySuggestions(e)` → `update({...}).eq("id", e.id)` + `automation_logs` insert opcional — único registro

Bulk geocoding está **desativado** no original (comentário "Bulk geocoding desativado — usar fluxo manual por card.") e foi mantido desativado. "Análise IA da base" (`analyzeBase`) é leitura — chama edge `ai-audit-establishments` em modo `global` e exibe o resultado, **sem alterar nenhum registro**.

Todas essas operações foram movidas literalmente para `useEstabelecimentosAudit.ts` sem mudança de payload, condição ou ordem.
