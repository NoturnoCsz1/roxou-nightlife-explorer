# Fase 6B — Arquivos alterados

## Movidos

- `src/pages/admin/StoryAgendaDoDia.tsx` → `src/apps/admin/pages/StoryAgendaDoDia.tsx`
- `src/pages/admin/Artes.tsx` → `src/apps/admin/pages/Artes.tsx`
- `src/pages/admin/Premiacoes.tsx` → `src/apps/admin/pages/Premiacoes.tsx`

## Criados (shims de re-export)

- `src/pages/admin/StoryAgendaDoDia.tsx`
- `src/pages/admin/Artes.tsx`
- `src/pages/admin/Premiacoes.tsx`

## Editados

- `src/App.tsx` — 3 imports lazy reapontados para `./apps/admin/pages/...`
- `src/apps/admin/pages/StoryAgendaDoDia.tsx` — cabeçalho `eslint-disable` adicionado; diretiva inline órfã removida (linha 732). Sem alteração funcional.

## Docs

- `docs/refactor/FASE_06B_move_admin_pages.md`
- `docs/refactor/FASE_06B_move_admin_pages_CHANGED_FILES.md`
