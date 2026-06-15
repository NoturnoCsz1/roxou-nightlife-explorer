# Fase 6A — Arquivos alterados

## Movidos (git mv)

- `src/pages/admin/EstabelecimentosAudit.tsx` → `src/apps/admin/pages/EstabelecimentosAudit.tsx`
- `src/pages/admin/EventosList.tsx` → `src/apps/admin/pages/EventosList.tsx`
- `src/pages/admin/EventoForm.tsx` → `src/apps/admin/pages/EventoForm.tsx`

## Criados (shims de compatibilidade)

- `src/pages/admin/EstabelecimentosAudit.tsx` (re-export)
- `src/pages/admin/EventosList.tsx` (re-export)
- `src/pages/admin/EventoForm.tsx` (re-export)

## Editados

- `src/App.tsx` — 3 imports lazy reapontados para `./apps/admin/pages/...`

## Docs

- `docs/refactor/FASE_06A_move_admin_pages.md`
- `docs/refactor/FASE_06A_move_admin_pages_CHANGED_FILES.md`
