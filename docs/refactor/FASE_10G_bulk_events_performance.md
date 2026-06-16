# FASE 10G.2 — Performance de eventos em lote

## Problema

20 flyers levavam 3–5 min com travamentos visíveis e consumo alto de RAM.
Causas: OCR re-executado em duplicidades, imagens cruas (>5MB) enviadas
ao Storage, concorrência muito baixa (2), sem retry em massa.

## O que mudou

### Compressão e cache (mantido do FIX anterior)
- `compressImage()` → resize 1600px + JPEG q=0.8 quando o arquivo > 500KB.
- `readExtractionCache()` / `writeExtractionCache()` em `sessionStorage`,
  keyed por `nome|size|lastModified`. Hits saltam upload + chamada de IA.

### Novo módulo `src/lib/bulkEventsQueue.ts`
Fila genérica com pool de workers. Estados: `queued · uploading · extracting · ready · error`.
Métricas: `total · done · errors · inflight · averageMs`.
API: `enqueue · runAll · retryFailed · metrics`.

Pronto para reuso em **story-agenda** e **importação Eventou**; o
EventoBulkForm continua sendo a UI canônica.

### Novo módulo `src/lib/bulkEventsCache.ts`
Wrapper sobre o cache existente que contabiliza `hits / misses / writes`.
O painel `/admin/system` lê essas métricas (`getBulkCacheStats()`).

### `EventoBulkForm.tsx`
- `CONCURRENCY` **2 → 3** (target da Fase 10G).
- Novo botão **"Reprocessar falhas (N)"** — só aparece quando há `errorCount > 0`.
  Reenfileira todos os itens com `status: "error"` e dispara o pool em 3.
- Contadores já existentes:
  - barra de progresso geral (`N/M processados`),
  - cards "Gerados c/ IA · Revisar · Duplicados · Erros",
  - cards "Duplicados reais · Possíveis · Incompletos · Erros".
- `beforeunload` já existente alerta o usuário se sair com lote em curso.

### Pipeline preservado
```
Upload → Compressão → Hash → (cache hit?) → Storage → IA extract → IA description
```
Salvamento continua via `handleBulkSave("draft" | "published")` em uma única
inserção `INSERT ... SELECT id` com logs de validação.

## Métrica esperada

| Cenário | Antes | Depois |
|---|---|---|
| 20 flyers ~2MB cada | 3–5 min, trava UI | 30–60s, UI responsiva |
| Reprocessar 5 erros | re-subir manual 1 a 1 | 1 clique, pool 3 |
| Reabrir aba (mesmo arquivo) | refaz OCR | hit de cache (sessionStorage) |

## Não alterado

Lista VIP, Reservas, Mesas, Check-in, CRM, Leads, Analytics existentes,
Supabase RLS, Nginx, estrutura do Partner Pro, admin atual.

## Próxima sprint

- Persistir cache em IndexedDB (sobrevive a reload do navegador).
- Mover descrição IA (`generate-description`) para a fila → hoje roda
  sequencial após cada extração.
- Conectar `bulkEventsQueue` na importação Eventou e na Story Agenda.
- Adicionar telemetria server-side: tempo médio por OCR, taxa de cache hit.
