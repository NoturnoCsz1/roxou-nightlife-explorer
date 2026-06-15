# Fase 3C2 — Arquivos alterados

**Data:** 2026-06-15
**Escopo:** consolidação interna de `src/apps/admin/eventos/form/`.

---

## Renomeados (git mv equivalente)

| De | Para |
| --- | --- |
| `src/apps/admin/eventos/form/EventoFormActions.tsx` | `src/apps/admin/eventos/form/EventoFormHeader.tsx` |
| `src/apps/admin/eventos/form/helpers.ts` | `src/apps/admin/eventos/form/utils.ts` |

Função interna renomeada: `EventoFormActions` → `EventoFormHeader` em `EventoFormHeader.tsx`.

## Criados

| Arquivo | LOC | Conteúdo |
| --- | ---: | --- |
| `src/apps/admin/eventos/form/constants.ts` | 8 | `INPUT_CLASS` |
| `src/apps/admin/eventos/form/README.md` | — | Contrato interno do formulário |
| `docs/refactor/FASE_03C2_evento_form_consolidation.md` | — | Relatório |
| `docs/refactor/FASE_03C2_evento_form_consolidation_CHANGED_FILES.md` | — | Este arquivo |

## Editados (somente imports)

| Arquivo | Mudança |
| --- | --- |
| `src/apps/admin/eventos/form/types.ts` | Removido `INPUT_CLASS` (movido para `constants.ts`). 53 → 50 LOC. |
| `src/apps/admin/eventos/form/eventoFormActions.ts` | `./helpers` → `./utils` |
| `src/apps/admin/eventos/form/eventoFormSubmit.ts` | `./helpers` → `./utils` |
| `src/apps/admin/eventos/form/useEventoForm.ts` | `./helpers` → `./utils` |
| `src/apps/admin/eventos/form/EventoFormAiSection.tsx` | `INPUT_CLASS` from `./types` → `./constants` |
| `src/apps/admin/eventos/form/EventoFormBasicSection.tsx` | idem |
| `src/apps/admin/eventos/form/EventoFormPartnerSection.tsx` | idem |
| `src/apps/admin/eventos/form/EventoFormScheduleSection.tsx` | idem |
| `src/apps/admin/eventos/form/EventoFormSeoSection.tsx` | idem |
| `src/apps/admin/eventos/form/EventoFormShell.tsx` | import + JSX: `EventoFormActions` → `EventoFormHeader` |

## Não tocados

- `src/pages/admin/EventoForm.tsx` (shell de 11 LOC, intacto)
- `src/App.tsx` (rotas)
- Todos os componentes shadcn/UI
- Edge functions, RLS, migrations, dateUtils, PWA
- Todos os outros pages

## Imports removidos

**Nenhum.** A Fase 3C1 já entregou imports enxutos. A Fase 3C2 só
renomeou paths/símbolos. Auditoria detalhada por arquivo em
`FASE_03C2_evento_form_consolidation.md` §4.

## Confirmação de zero alteração funcional

- Nenhuma query Supabase, payload, chamada de Edge Function ou OpenAI
  foi tocada (sed atuou apenas em paths de import e no símbolo do
  componente visual `EventoFormHeader`).
- Nenhum JSX dentro de sections foi alterado.
- Único JSX alterado: `<EventoFormActions>` → `<EventoFormHeader>` em
  `EventoFormShell.tsx`. O componente renderizado é literalmente o mesmo
  arquivo .tsx renomeado.

## Status

| Verificação | Resultado |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ 0 erros |
| `npx eslint <touched> --max-warnings=0` | ✅ 0 / 0 |
| Build harness | ✅ Verde |
| LOC máximo | 355 (`eventoFormActions.ts`) — limite 500 ✅ |
| Shell page | 11 LOC — limite 200 ✅ |
