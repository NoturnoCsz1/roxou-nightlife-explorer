# Fase 3B — Refatoração de `src/pages/admin/EventosList.tsx`

> Status: ✅ Concluída • Data: 2026-06-15
> Próxima fase: **3C** — só pode iniciar após aprovação manual.

## 1. Escopo

Refatorar exclusivamente `src/pages/admin/EventosList.tsx`
(1256 LOC monolíticas) em módulos menores **sem alterar comportamento**.

## 2. Regras respeitadas

- ❌ Sem alteração de UI (mesmo JSX, mesmas classes Tailwind).
- ❌ Sem alteração de rotas (a rota `/admin/eventos` continua resolvendo
  para o mesmo arquivo via `App.tsx`; `getEventEditPath` foi re-exportado
  para manter compatibilidade).
- ❌ Sem alteração de queries Supabase (`.select`, `.update`, `.delete`,
  `.in`, `.eq`, `.invoke` copiados literalmente).
- ❌ Sem alteração de fluxos de exclusão (mesmo `AlertDialog`, mesma
  mensagem, mesma ordem `setDeleteTarget(null) → toast`).
- ❌ Sem alteração de duplicação (`handleDuplicate` mantém o mesmo state
  `{ duplicate: { … } }` passado para `/admin/eventos/novo`).
- ❌ Sem alteração de filtros, ordenação ou paginação
  (`computeEventosListDerived` reproduz `events.filter().filter()...`
  na mesma ordem e a paginação local `visibleCount` foi preservada).
- ❌ Sem alteração de RLS, Edge Functions ou políticas.
- ❌ Sem migração para `src/services/` (regra explícita da fase).
- ❌ Sem alteração de payloads de notícias, agenda ou home.

## 3. Estrutura final

```
src/pages/admin/EventosList.tsx                 13 LOC  (shell + re-export)
src/apps/admin/eventos/list/
├── types.ts                                    76 LOC
├── helpers.ts                                  73 LOC
├── selectors.ts                               192 LOC  (derivados puros)
├── useEventosListActions.ts                   464 LOC  (todas as escritas)
├── useTriageShortcuts.ts                      144 LOC  (atalhos teclado)
├── useEventosList.ts                          205 LOC  (estado + composição)
├── EventosListShell.tsx                        20 LOC
├── EventosListFilters.tsx                     384 LOC
├── EventosListBulkActions.tsx                  69 LOC
├── EventosListTable.tsx                        89 LOC
├── EventosListRow.tsx                         355 LOC
├── EventosListPagination.tsx                   16 LOC
└── EventosListDialogs.tsx                      92 LOC
```

Todos os módulos abaixo de **500 LOC**. Shell final
(`EventosList.tsx`) com apenas **13 LOC**, bem abaixo do limite
de 200 LOC pedido pela fase.

## 4. Ordem da extração

1. `types.ts` — tipos e constantes públicas (`EventRow`, filtros,
   `CATEGORIES`, `categoryBadge`, `getEventEditPath`).
2. `helpers.ts` — funções puras (`getQualityScore`, `getChecklist`,
   `normalizeAiTitle`, `isAiOrigin`, `needsReview`, `spDateStr`,
   `eventDayStr`).
3. Componentes visuais (`EventosListRow`, `EventosListFilters`,
   `EventosListBulkActions`, `EventosListDialogs`,
   `EventosListPagination`, `EventosListTable`).
4. Hooks (`selectors.ts`, `useEventosListActions.ts`,
   `useTriageShortcuts.ts`, `useEventosList.ts`).
5. `EventosListShell.tsx` e shell em `pages/admin/EventosList.tsx`.

## 5. Funções de escrita preservadas literalmente

| Função | Tabela | Operação | Verificação |
|---|---|---|---|
| `loadEvents` | `events` | `select(...).order(created_at desc).eq(city?)` | mesma SELECT-list completa |
| `loadClickCounts` | `ticket_clicks` | `select(event_id)` | idêntico |
| `handleDuplicate` | `events` | `select(*).eq(id).single()` | payload `state.duplicate` byte-a-byte |
| `toggleFeatured` | `events` | `update({ featured })` | toast preservado |
| `toggleAuraPick` | `events` | `update({ aura_pick })` | toast preservado |
| `handleBulkAura` | `events` | `update({ aura_pick }).in(ids)` | toast preservado |
| `handleBulkFeatured` | `events` | `update({ featured }).in(ids)` | toast preservado |
| `saveQuickEdit` | `events` | `update({ title, date_time, venue_name? })` | uso de `spLocalToISO` mantido |
| `handleDelete` | `events` | `delete().eq(id)` | mesma ordem `setDeleteTarget(null)` → toast |
| `regenerateTitle` | edge `extract-flyer-metadata` → `events.update({ title })` | idem | mesmo `current_year` |
| `regenerateDescription` | edge `generate-description` → `events.update({ description })` | idem | mesmo body |
| `handleBulkPublish` | `events` | `update({ status: 'published' }).in(ids)` | mensagem `warning` idêntica |
| `handleQuickApprove` | `events` | `update({ status, featured?, aura_pick? })` | label composta `Aprovado + …` |
| `handleArchive` | `events` | `update({ status: 'archived' })` | idêntico |
| `handleBulkApprove` | `events` | `update(patch).in(readyIds)` | mesma checagem `getChecklist` |
| `handleBulkArchive` | `events` | `update({ status: 'archived' }).in(ids)` | idêntico |
| `handleApproveAllSafe` | `events` | `update({ status: 'published' }).in(safeIds)` | mesma ordem com `setPublishing` |
| `handleDownloadZip` | helper `downloadEventsZip` | sem write no banco | preservado |

Nenhuma nova chamada Supabase foi introduzida.

## 6. Filtros, ordenação e paginação

- Cadeia de `.filter()` em `selectors.ts` reproduz a sequência original
  na mesma ordem (busca → categoria → status → parceiro → data →
  incompletos → revisar → origem → atributos → tab).
- Filtro `incompletos` mantém o comportamento original
  (`getQualityScore(e) < 100`).
- `visibleFiltered = filtered.slice(0, visibleCount)` e o reset de
  `visibleCount = 80` no `useEffect` permanecem com as mesmas
  dependências.
- `ChevronDown` do bloco "Eventos Passados" mantém o `Collapsible`
  original.

## 7. Atalhos do Modo Revisão

O `useEffect` de teclado virou `useTriageShortcuts.ts`. As
dependências são idênticas (`triageMode, focusedId, events, search,
activeCategory, activeStatus, activePartner, activeDateFilter,
onlyIncomplete, onlyNeedsReview, originFilter, extraFilter`) e as
ações `A/D/U/X/R/←→` chamam as mesmas funções (`handleQuickApprove`,
`handleArchive`, navegação para `getEventEditPath`, updates inline em
`featured`/`aura_pick`).

## 8. Validação

| Checagem | Resultado |
|---|---|
| Build harness | ✅ Verde (preview renderiza `/admin/eventos`) |
| `npx eslint <tocados>` | ✅ 0 erros (1 warning pré-existente de fast-refresh em `EventosList.tsx` por co-exportar `getEventEditPath`, comportamento idêntico ao original) |
| `npx tsc -p tsconfig.app.json --noEmit` | ✅ Sem erros nos arquivos tocados |
| Screenshot antes (Fase 3A) | `docs/refactor/screenshots/FASE_03B_before_reference.png` |
| Screenshot depois | `docs/refactor/screenshots/FASE_03B_after.png` |
| Lista carrega | ✅ Toolbar, abas, seção "Hoje", "Próximos" e cards aparecem com mesmo layout |
| Filtros | ✅ Status/Parceiro/Sheet renderizam (mesmos `select`, mesmas opções) |
| Pesquisa | ✅ Debounce 250 ms preservado |
| Paginação | ✅ Botão "Carregar mais" idêntico |
| Duplicar | ✅ `handleDuplicate` mantido (mesma navegação + state) |
| Excluir | ✅ `AlertDialog` + `handleDelete` literais |
| Ações em lote | ✅ Aprovar / + Destaque / + Aura / Aura Pick / Arquivar — todos chamando as mesmas funções |

> Observação: o teste interativo dos fluxos de escrita foi feito por
> *code path equivalence* (assinaturas, SQL, payloads, toasts e ordem
> de execução conferidos linha-a-linha). Nenhum write foi disparado
> durante a validação para não poluir o banco.

## 9. Riscos para a Fase 3C

- `EventosList.tsx` continua co-exportando `getEventEditPath`
  (warning `react-refresh/only-export-components` aceito); na Fase 3C
  podemos mover esse export para `types.ts` e atualizar imports caso
  apareçam novos consumidores.
- O hook `useEventosList` devolve um objeto grande (compatível com a
  versão pré-refator). Eventual otimização com `useMemo`/`useCallback`
  fica para fase posterior.
- Ações ainda usam Supabase inline — migração para `src/services/`
  permanece adiada conforme regra das fases 0-3B.

---

**Aguardando aprovação manual para iniciar a Fase 3C.**
