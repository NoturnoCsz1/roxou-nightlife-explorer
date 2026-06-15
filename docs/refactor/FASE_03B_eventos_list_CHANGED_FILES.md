# Fase 3B — Arquivos alterados

> Gerado em 2026-06-15.

## Editados

- `src/pages/admin/EventosList.tsx`
  (1256 → 13 LOC; vira shell que importa `EventosListShell` e
  re-exporta `getEventEditPath` para compatibilidade).

## Criados

- `src/apps/admin/eventos/list/types.ts` — 76 LOC
- `src/apps/admin/eventos/list/helpers.ts` — 73 LOC
- `src/apps/admin/eventos/list/selectors.ts` — 192 LOC
- `src/apps/admin/eventos/list/useEventosListActions.ts` — 464 LOC
- `src/apps/admin/eventos/list/useTriageShortcuts.ts` — 144 LOC
- `src/apps/admin/eventos/list/useEventosList.ts` — 205 LOC
- `src/apps/admin/eventos/list/EventosListShell.tsx` — 20 LOC
- `src/apps/admin/eventos/list/EventosListFilters.tsx` — 384 LOC
- `src/apps/admin/eventos/list/EventosListBulkActions.tsx` — 69 LOC
- `src/apps/admin/eventos/list/EventosListTable.tsx` — 89 LOC
- `src/apps/admin/eventos/list/EventosListRow.tsx` — 355 LOC
- `src/apps/admin/eventos/list/EventosListPagination.tsx` — 16 LOC
- `src/apps/admin/eventos/list/EventosListDialogs.tsx` — 92 LOC

## Documentação

- `docs/refactor/FASE_03B_eventos_list.md`
- `docs/refactor/FASE_03B_eventos_list_CHANGED_FILES.md`
- `docs/refactor/screenshots/FASE_03B_after.png`
- `docs/refactor/screenshots/FASE_03B_before_reference.png`
  (cópia do snapshot da Fase 3A — referência visual para diff manual).

## Não tocados (reforço)

- `src/components/ui/*`
- `src/lib/dateUtils.ts`
- `src/integrations/supabase/*`
- `supabase/functions/*`
- Demais páginas de `src/pages/`
- Roteamento (`src/App.tsx`)
- RLS, migrations, Edge Functions
