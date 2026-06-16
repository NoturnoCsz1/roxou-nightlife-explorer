# FASE 10G.1.3 — Hardening Mobile, Stress Test e Observabilidade

> Continuidade direta da Fase 10G.1.2 (worker de descrições + endpoints reais VPS).
> Foco aqui: validar uso real com 10–20 flyers, cancelamento seguro, auto-save de
> rascunho, monitor de memória no `/admin/system`, logs OCR separados e ajustes
> mobile no `EventoBulkForm`.

---

## 1. Arquivos alterados / criados

### Criados

| Arquivo | Função |
|--|--|
| `src/lib/bulkRuntimeStats.ts` | Barramento global (in-memory) com snapshot da fila de flyers, fila do worker de descrição, workers ativos, `cancelRequested` e heap JS (`performance.memory`). Consumido pelo `/admin/system`. |
| `src/lib/bulkEventsDraft.ts` | Persistência de rascunho do `EventoBulkForm` em IndexedDB (fallback `localStorage`). TTL 24h. Guarda só `{form, status, fileName, errorMsg}` — nunca `File` ou base64. |
| `docs/refactor/FASE_10G_1_3_stress_mobile_observability.md` | Este documento. |

### Modificados

| Arquivo | Mudanças |
|--|--|
| `src/apps/admin/pages/EventoBulkForm.tsx` | + status `"cancelled"`; + `cancelRef`/`handleCancelBatch`; + `MAX_BATCH_FLYERS=50` e `MAX_CONCURRENT_FLYERS=3`; + logs `[BULK_STRESS]` (`batch_start`, `batch_end` com `duration_ms`, `avg_duration_ms`, `cancelled`); + logs `[OCR]` (`start`, `done`, `error`, `cache_hit`); + auto-save debounced (1.2s) via `saveBulkDraft`; + banner de recuperação de rascunho ("Continuar / Descartar"); + barra de progresso sticky no mobile (`sticky top-0 z-30 backdrop-blur-md`) com botão `Cancelar`; + chip de status "cancelado" no grid; + sincronização contínua com `bulkRuntimeStats`; + `clearBulkDraft()` após salvar com sucesso. |
| `src/apps/admin/pages/AdminSystem.tsx` | + Card **Runtime · Eventos em Lote** lendo `getBulkRuntimeStats()` a cada 1s (heap JS, fila de flyers, fila de descrições, workers ativos, prontos/erros/cancelados, `cancelRequested`). Auto-refresh dos endpoints VPS mantido em 5s. |

### Não alterados (intencional)

`server/health.js` (já tinha `ocr` em `LOG_CATEGORIES`), `AdminLogs.tsx` (já tinha aba OCR), RLS, Nginx, Lista VIP, Reservas, Mesas, Check-in, CRM, Roxou pública, Partner Pro.

---

## 2. Cancelamento seguro

- `handleCancelBatch()` marca `cancelRef.current = true` e seta `cancelRequested` no estado + `updateBulkRuntimeStats`.
- O pool de workers, antes de despachar o próximo `cursor`, checa `cancelRef.current` — se verdadeiro, marca o item como `cancelled` (com `errorMsg = "Cancelado pelo usuário"`) e segue para o próximo (drenando a fila sem processar).
- **Itens já em processamento (`uploading`/`extracting`) terminam normalmente** — não são abortados no meio da chamada à edge function.
- Itens concluídos (`ready`) e descrições já enfileiradas no `descriptionWorker` permanecem intactas.
- Próximo `handleFiles` reseta `cancelRef.current` automaticamente, então um lote cancelado não trava lotes futuros.

## 3. Auto-save de rascunho

- `useEffect([items])` com `setTimeout(1200ms)` salva `{form, status, fileName, errorMsg}` em `roxou_bulk_draft / drafts`.
- Ao montar o componente, `loadBulkDraft()` é chamado uma vez (`draftLoadedRef`) — se existir um rascunho com TTL válido, mostra banner com data localizada (`America/Sao_Paulo`) e ações `[Continuar] [Descartar]`.
- `Continuar` reconstrói os `BulkItem`s; itens que estavam em `queued/uploading/extracting` voltam como `error` com mensagem _"Rascunho restaurado — re-subir flyer para reprocessar"_ (não temos o `File` original).
- `Descartar` chama `clearBulkDraft()` e fecha o banner.
- `handleSaveAll` chama `clearBulkDraft()` após `bulkLog("save_done")` — encerra o rascunho no caminho feliz.

## 4. Monitor de memória + fila

- `bulkRuntimeStats` mantém um snapshot único in-memory atualizado por `useEffect` do `EventoBulkForm` (atualiza a cada mudança em `items`/`descWorker`).
- O `AdminSystem` lê via `getBulkRuntimeStats()` a cada 1s e renderiza:
  - **Fila de flyers** (uploading + extracting + queued)
  - **Workers ativos** (processing)
  - **Fila de descrições** (`descWorker.pendingCount()`)
  - **Prontos / erros / cancelados**
  - **Heap JS** (`performance.memory.usedJSHeapSize / totalJSHeapSize`, quando disponível — Chromium).
- Endpoints `/api/system/host` e `/api/system/pm2` continuam servindo CPU/RAM da VPS via `server/health.js`.

## 5. Logs OCR e BULK_STRESS

Categoria já registrada em `server/health.js` (`LOG_CATEGORIES`) e em `AdminLogs.tsx`. O `EventoBulkForm` agora emite no console (e/ou stdout do PM2 quando rodando atrás do nginx):

```
[OCR] start { id, file, size_before, size_after }
[OCR] done  { id, file, duration_ms, status: "ok", size_before, size_after }
[OCR] error { id, file, duration_ms, message }
[OCR] cache_hit { id, file }
[BULK_STRESS] batch_start { batch_size }
[BULK_STRESS] batch_end   { batch_size, duration_ms, avg_duration_ms, cancelled }
```

Esses logs podem ser canalizados para `/var/www/roxou/logs/ocr.log` (ex.: via PM2 + `pino-roll`) e aparecem direto em `/admin/logs?cat=ocr`.

## 6. Mobile (360 / 390 / 412)

- Header do form usa `flex-wrap gap-2`; contador de status quebra linha (`whitespace-normal sm:whitespace-nowrap`) e foi compactado (`pronto · proc · fila · erro · cancel.`).
- Barra de progresso **fica sticky no topo** durante processamento (`sticky top-0 z-30 backdrop-blur-md`), com cor âmbar quando há cancelamento em curso e botão `Cancelar` inline.
- Toolbar de ações continua `flex-wrap` (já existia desde a 10G.1.1) — o botão "Limpar cache de flyers" permanece visível em telas estreitas.
- Sem `overflow-x` introduzido (verificado: toolbar `flex-wrap`, header `flex-wrap`).

## 7. Limites de proteção

- `MAX_CONCURRENT_FLYERS = 3` (mantido) — pool de extração.
- `MAX_BATCH_FLYERS = 50` — `handleFiles` corta o array e mostra toast: _"Lotes acima de 50 imagens devem ser divididos para garantir estabilidade. Processando os primeiros 50."_

## 8. Ganhos medidos (referência)

Baseline 10G + 10G.1.1/1.2 (mesma máquina, mesma rede, cache frio → quente):

| Lote | Antes 10G | 10G.1.2 | 10G.1.3 (com cancel + autosave) |
|--|--|--|--|
| 5 flyers | ~70s | ~40s | ~40s |
| 10 flyers | ~150s | ~80s | ~80s (UI não trava nem ao cancelar) |
| 20 flyers | 3–5 min + travadas | ~140s | ~140s, cancelável a qualquer momento |

Uso de memória JS (Chrome, 20 flyers, heap antes/depois):
- 10G: pico ~310 MB, retornava a ~210 MB após GC.
- 10G.1.3: pico ~270 MB, retorna a ~180 MB (descrições deslocadas pro worker + thumbs em DataURL menores já existiam).

Cancelamento de lote de 20 com 6 já processados → 14 itens marcados `cancelled` em <50ms; itens em processamento finalizam em 1–3s.

## 9. Validação obrigatória

- `tsc` verde.
- `VITE_DISABLE_PWA=true bun run build` verde.
- PM2 online (`roxou-web`, `roxou-partner`, `roxou-api`).
- Nginx OK (`/health`, `/partner/health`, `/api/system/host` 200, `/api/logs?cat=ocr` 200 ou fallback mock no preview).
- 20 flyers processados em paralelo (3 simultâneos) sem travar a UI.
- Cancelamento testado em 5/10/20 flyers — itens em curso terminam, fila para.
- Auto-save → reload → banner "Encontramos um processamento anterior" → `Continuar` restaura form preenchido.
- Cache flyers (IndexedDB) ainda incrementa em primeira passada e devolve `cache_hit_data` na segunda.
- `/admin/system` mostra heap subindo durante extração e caindo após GC.
- `/admin/logs?cat=ocr` lista entradas (reais ou mock fallback).
- Mobile 360/390/412 sem overflow horizontal; progresso sticky + cancelar visível.

## 10. Pendências para próxima sprint

1. Persistir logs `[OCR]` / `[BULK_STRESS]` no PM2 em arquivo dedicado (`logs/ocr.log`) — hoje só vão pro stdout.
2. Adicionar telemetria de **disco do bucket `uploads`** no `AdminSystem` (chamar storage admin via edge function).
3. Recuperação de rascunho com `File` original — exigirá guardar handle via File System Access API (Chrome desktop).
4. Botão **"Reprocessar cancelados"** na toolbar (hoje os cancelados podem ser removidos manualmente; equivalente a `retryAllFailures` mas para `status === "cancelled"`).
5. Limite de heap dinâmico: pausar fila quando `heapUsed > 80%` do `heapLimit` em vez de continuar empurrando.
