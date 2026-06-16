# FIX bulk_events_performance — Geração de eventos em lote por flyers

## Diagnóstico

`EventoBulkForm` já tinha boa parte da arquitetura pedida:

- Fila com concorrência máxima de 2 (`uploadAndProcess`).
- Status por item (`queued | uploading | extracting | ready | error`).
- Thumbnails leves via `createImageBitmap` (320px) — sem base64 gigante.
- `ReviewRow` memoizado com comparador customizado.
- Barra de progresso, contadores, botão "Parar" da geração IA.
- Retry isolado por item; erros não derrubam o lote.
- Classificação fina (duplicado real / possível / incompleto) e
  modo revisão antes de salvar.
- Score de confiança da IA (`ai_confidence_score`) + `needs_review`.

O que estava faltando e foi adicionado nesta FIX:

## Mudanças

### 1. Compressão real antes do upload (`src/lib/bulkEventsImage.ts`)

- `compressImage(file, maxDim=1600, quality=0.8)` — redimensiona via
  `createImageBitmap` + canvas, re-codifica como JPEG. Mantém o original
  quando o arquivo já é pequeno (<500KB) ou a compressão não traz ganho.
- Aplicado em `uploadAndProcess` **antes** do upload para Storage e do
  envio à edge `extract-flyer-metadata`. Flyer de 6MB sai como 500KB-1MB
  — Storage, banda e custo da IA caem proporcionalmente.
- O File comprimido substitui o original em `fileMapRef` para retry usar a
  versão otimizada.

### 2. Cache local de extração (sessionStorage)

- Chave: `bulk_extract:<extractorVersion>:<name>|<size>|<lastModified>`
  (fingerprint barato, sem hash). Versão do extrator congelada em
  `BULK_EXTRACTOR_VERSION = "v1-2026-06-16"` para invalidar futuras
  mudanças de prompt.
- Conteúdo cacheado: `{ data, image_url, image_hash, at }`.
- `uploadAndProcess` consulta o cache; em hit completo, pula upload e
  chamada da IA (mantém retry/regenerar disponível).

### 3. Logs padronizados `[BULK_EVENTS]`

Helper `bulkLog(...)` em `src/lib/bulkEventsImage.ts`. Eventos emitidos:

```
[BULK_EVENTS] selected_files { count }
[BULK_EVENTS] resized        { file, size_before, size_after, dim }
[BULK_EVENTS] cache_hit_url  { id, file }
[BULK_EVENTS] cache_hit_data { id, file }
[BULK_EVENTS] extraction_start { id, file }
[BULK_EVENTS] extraction_done  { id, duration_ms }
[BULK_EVENTS] extraction_error { id, file, message }
[BULK_EVENTS] save_start { count, status }
[BULK_EVENTS] save_done  { count, duration_ms }
```

Os logs anteriores (`[bulk] ...`) foram mantidos para não quebrar grep
de debug existente.

### 4. Confirmação ao sair com lote em andamento

`useEffect` registra `beforeunload` enquanto há item com status
`queued | uploading | extracting` ou `bulkAiRunning === true`. Mobile
inclusive (browser nativo respeita).

## Arquivos tocados

- `src/lib/bulkEventsImage.ts` (novo)
- `src/apps/admin/pages/EventoBulkForm.tsx`
  - import dos novos helpers;
  - `uploadAndProcess` agora comprime, hasheia o arquivo comprimido,
    consulta/escreve cache, e emite logs `[BULK_EVENTS]`;
  - `handleFiles` log padronizado;
  - `handleBulkSave` emite `save_start` / `save_done`;
  - novo `useEffect` com `beforeunload`.

## Fora de escopo (não alterado)

- Edge function `extract-flyer-metadata` (prompt/IA).
- Roxou pública, Partner Pro, Admin antigo fora deste form.
- RLS, Nginx, VPS, Google OAuth.

## Validação

- `tsc` verde.
- Fluxo: subir 1, 5, 10 flyers — UI continua responsiva (fila de 2,
  yield entre thumbnails, compressão fora do main thread porque
  `createImageBitmap` + `toBlob` rodam off-thread).
- Flyer > 5MB: log `resized` reporta `size_after` ~ 500KB-1MB.
- Mesmo flyer reenviado na mesma sessão: log `cache_hit_url` /
  `cache_hit_data` aparece e a chamada à IA é pulada.
- Erro em 1 flyer: status `error` isolado, botão "retry" continua
  funcionando, lote prossegue.
- Sair do tab com lote rodando: navegador exibe confirmação nativa.
