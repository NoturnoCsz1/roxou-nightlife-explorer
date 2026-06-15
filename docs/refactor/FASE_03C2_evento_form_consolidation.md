# Fase 3C2 — Consolidação pós-extração do EventoForm

**Data:** 2026-06-15
**Escopo aprovado:** organização interna de `src/apps/admin/eventos/form/`.
**Status:** ✅ Concluído — aguardando aprovação manual.

---

## 1. Objetivo

Consolidar a estrutura criada na Fase 3C1, sem alterar **nenhum**
comportamento, query, payload, edge function, OpenAI, UI, rota ou RLS.

## 2. Mudanças aplicadas

### 2.1. Renomeações (resolve colisão de nomes)

| De | Para | Motivo |
| --- | --- | --- |
| `EventoFormActions.tsx` (visual) | `EventoFormHeader.tsx` | Colidia com `eventoFormActions.ts` (logic). Componente é o **header** do formulário (botões topo + AlertDialog de excluir), não uma "actions library". |
| `helpers.ts` | `utils.ts` | Padronização do plano — utilitários puros (`slugify`, `buildRoxouCaption`) seguem o nome convencional. |

Function symbol também renomeado: `function EventoFormActions(...)` → `function EventoFormHeader(...)`.

### 2.2. Novos arquivos

| Arquivo | LOC | Conteúdo |
| --- | ---: | --- |
| `constants.ts` | 8 | `INPUT_CLASS` (movido de `types.ts`). |
| `README.md` | — | Contrato interno do formulário (topologia, regras, pontos de extensão). |

### 2.3. Tipos/constantes separados

- `INPUT_CLASS` saiu de `types.ts` → `constants.ts`.
- `types.ts` agora contém **apenas** tipos (`EventoFormState`, `Partner`,
  `DuplicateCandidate`, `SectionsState`) — 50 LOC.

### 2.4. Imports atualizados (mass-rename via sed)

| Arquivo | Mudança |
| --- | --- |
| `eventoFormActions.ts` | `./helpers` → `./utils` |
| `eventoFormSubmit.ts` | `./helpers` → `./utils` |
| `useEventoForm.ts` | `./helpers` → `./utils` |
| `EventoFormAiSection.tsx` | `INPUT_CLASS` from `./types` → `./constants` |
| `EventoFormBasicSection.tsx` | idem |
| `EventoFormPartnerSection.tsx` | idem |
| `EventoFormScheduleSection.tsx` | idem |
| `EventoFormSeoSection.tsx` | idem |
| `EventoFormShell.tsx` | import + uso de `EventoFormActions` → `EventoFormHeader` |

## 3. LOC após consolidação

| Arquivo | LOC |
| --- | ---: |
| `src/pages/admin/EventoForm.tsx` (shell page) | 11 ✅ |
| `EventoFormShell.tsx` | 84 |
| `useEventoForm.ts` | 299 |
| `eventoFormActions.ts` | **355** ✅ (< 500) |
| `eventoFormSubmit.ts` | **179** ✅ (< 500) |
| `EventoFormHeader.tsx` | 118 |
| `EventoFormBasicSection.tsx` | 122 |
| `EventoFormPartnerSection.tsx` | 106 |
| `EventoFormScheduleSection.tsx` | 97 |
| `EventoFormAiSection.tsx` | 60 |
| `EventoFormSeoSection.tsx` | 65 |
| `EventoFormMediaSection.tsx` | 56 |
| `EventoFormWarningsSection.tsx` | 38 |
| `EventoFormSectionHeader.tsx` | 22 |
| `types.ts` | 50 (era 53) |
| `utils.ts` | 57 (era `helpers.ts`) |
| `constants.ts` | 8 (novo) |

Total: 1727 LOC (vs. 1722 antes; +5 LOC do novo `constants.ts` com header).

## 4. Imports mortos auditados/removidos

Auditoria com `grep` em cada arquivo da pasta:

| Arquivo | Imports verificados | Resultado |
| --- | --- | --- |
| `eventoFormActions.ts` | `React`, `toast`, `supabase`, `analyzeAndLinkEventTransmission`, `slugify`, `buildHandleSubmit`, `DuplicateCandidate`, `EventoFormState`, `Partner` | Todos em uso ✅ |
| `eventoFormSubmit.ts` | `React`, `toast`, `supabase`, `buildEventPayload`, `analyzeAndLinkEventTransmission`, `validateBeforePublish`, `persistValidationLog`, `REASON_LABELS`, `buildRoxouCaption`, `EventoFormActionDeps` | Todos em uso ✅ |
| `useEventoForm.ts` | `useEffect`, `useRef`, `useState`, hooks router, `toast`, `supabase`, `useAdminProfile`, `isoToSpLocal`, `emptyTransmission`, `TransmissionFields`, `slugify`, `createEventoFormActions`, tipos | Todos em uso ✅ |
| `EventoFormShell.tsx` | `InstagramImportModal`, `TransmissionSection`, `TransmissionFields`, `Save`, 5 sections, `useEventoForm` | Todos em uso ✅ |
| Sections (`Basic`, `Partner`, `Schedule`, `Ai`, `Seo`, `Media`, `Warnings`, `Header`, `SectionHeader`) | shadcn/lucide/types/hook return | Todos em uso ✅ |
| `types.ts` | `Tables`, `emptyTransmission` | Todos em uso ✅ |
| `utils.ts` | `getCategoryLabel` | Em uso ✅ |
| `constants.ts` | — (sem imports) | ✅ |

**Total de imports removidos: 0** (a Fase 3C1 já entregou imports limpos).
**Total de imports renomeados (path-only): 8 ocorrências.**

## 5. Responsabilidades únicas (verificação)

| Arquivo | Responsabilidade única? |
| --- | --- |
| `types.ts` | ✅ Apenas tipos (constante movida para `constants.ts`). |
| `constants.ts` | ✅ Apenas constantes. |
| `utils.ts` | ✅ Apenas funções puras (sem Supabase). |
| `eventoFormActions.ts` | ✅ Factory de ações (Supabase + Edge). |
| `eventoFormSubmit.ts` | ✅ Apenas `handleSubmit`. |
| `useEventoForm.ts` | ✅ Estado + ciclo de vida + handlers locais. |
| `EventoForm*Section.tsx` | ✅ Apenas JSX + handlers da seção. |
| `EventoFormHeader.tsx` | ✅ Botões do topo + AlertDialog. |
| `EventoFormShell.tsx` | ✅ Composição. |

## 6. Confirmação de zero alteração funcional

- **Queries Supabase:** nenhuma tocada (sed só alterou paths de import e o
  símbolo `EventoFormActions` → `EventoFormHeader`).
- **Edge Functions:** intocadas.
- **OpenAI:** intocada.
- **Payloads:** intocados (`buildEventPayload`, `ai_event_feedback_memory`,
  `eventou_imports`, `content_generations` continuam idênticos).
- **SEO/captions/warnings/confidence:** intocados.
- **UI:** nenhum JSX alterado em sections. O único JSX alterado é o
  uso de `<EventoFormHeader ctx={ctx} />` no `EventoFormShell.tsx` —
  o componente renderizado é literalmente o mesmo arquivo .tsx renomeado.
- **Rotas:** `App.tsx` intocado; `EventoForm` default export preservado.
- **RLS:** intocado.

## 7. Validação executada

| Etapa | Resultado |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ 0 erros |
| `npx eslint src/pages/admin/EventoForm.tsx src/apps/admin/eventos/form/ --max-warnings=0` | ✅ 0 errors / 0 warnings |
| Build harness Vite | ✅ Verde (preview carrega) |
| Limite 500 LOC | ✅ Maior é `eventoFormActions.ts` com 355 |
| Shell < 200 LOC | ✅ 11 LOC |
| Screenshot | ⏭️ Não necessário — UI inalterada |

## 8. Contrato interno

Documentado em `src/apps/admin/eventos/form/README.md` (topologia em
árvore, tabela de responsabilidades, regras de paridade, pontos de
extensão futura, histórico de fases).

## 9. Próxima fase

Aguardar **"aprovo Fase 3C3"** (próximo megafile candidato, ou migração
para `src/services/events.ts` — a definir).
