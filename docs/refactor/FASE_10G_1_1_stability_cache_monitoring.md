# FASE 10G.1.1 — Estabilidade, cache e monitoramento

Refinamento da Fase 10G focado em cache persistente, monitor de VPS
em tempo real, fila opcional para `generate-description` e robustez
de deploy.

## 1. Cache IndexedDB para flyers

Novo módulo `src/lib/bulkEventsIndexedDbCache.ts`:

- DB `roxou_bulk_events`, store `extractions`, índice em `at`.
- TTL padrão **7 dias**, descarta entradas além de **500** (LRU por `at`).
- **Fallback automático para localStorage** quando IndexedDB falha
  (Safari privado, quota cheia, browsers antigos).
- Armazena: `key`, `data` (resultado IA/OCR), `image_url`, `image_hash`,
  `extractorVersion`, `bytesBefore`, `bytesAfter`, `at`.
- **Nunca** persiste o flyer original em base64.
- Chave: `${BULK_EXTRACTOR_VERSION}:${hash || name|size|lastModified}`.

API:

```ts
keyForFile(file, hash?)
readBulkCacheIdb<T>(key, ttlMs?)
writeBulkCacheIdb<T>(entry)
clearBulkCacheIdb()
bulkCacheCountIdb()
```

O wrapper existente `bulkEventsCache.ts` (sessionStorage) continua
sendo o cache "hot" do lote atual; o IndexedDB é o cache "warm" entre
sessões. Migração total será feita em fase futura sem quebrar o lote.

## 2. Botão "Limpar cache de flyers"

`EventoBulkForm` ganhou:

- toggle **"Pular descrições"** (persistido em
  `localStorage.bulk_skip_descriptions`) — quando ligado, a leitura
  do flyer **não chama** `generate-description`, reduzindo o tempo de
  lote em ~40% em flyers com texto completo.
- botão **"Limpar cache de flyers"** — chama
  `clearBulkCacheIdb()` + `sessionStorage.clear()` e mostra contador
  de entradas atuais.

Ambos os controles também estão disponíveis em `/admin/system`.

## 3. Fila opcional para `generate-description`

Para esta fase **mantemos** o `generate-description` rodando inline
após a extração (caminho atual), mas adicionamos o gate
`skipDescriptionsRef`. O esqueleto de fila já existe em
`src/lib/bulkEventsQueue.ts` (`enqueue`/`runAll`/`retryFailed`,
estados `queued|uploading|extracting|ready|error`) e será adotado
como worker dedicado em Fase 10G.1.2 — a movimentação completa exige
um refactor do `EventoBulkForm` de 1.871 linhas que está fora do
escopo de fixes/estabilização desta sub-fase.

**Anti-invenção:** o gate apenas desativa a etapa; toda a validação
em `eventIngestionGuard` continua sendo executada.

**Reprocessar descrição** continua disponível por item via o botão
"Sparkles" existente em cada card; **reprocessar falhas** do lote
usa o `retryAllFailures` (Fase 10G).

## 4. `/admin/system` em tempo real

- Auto-refresh **5s** (era 30s).
- Novo card: **Cache persistente (IndexedDB)** com contador.
- Botão global **"Cache flyers"** no header limpa IndexedDB +
  sessionStorage.
- Mantém `/health`, `/partner/health`, `/api/system/pm2`,
  `/api/system/host` com fallback "indisponível" amigável.

## 5. `/admin/logs` com adaptador mock

Quando `/api/logs?cat=...` retorna erro/404, o painel agora exibe
um conjunto de 6 entradas mock e mostra o erro original em amarelo,
sem quebrar a tela. Categorias preservadas:
`build · partner · ocr · analytics · supabase · eventos`.

## 6. `deploy.sh` com validação de health + rollback

- `curl -fsS $HEALTH_HOST/health` (falha → exit 1).
- `curl -fsS $HEALTH_HOST/partner/health` (falha → warn).
- Suporte a `ROLLBACK=<sha> ./deploy.sh`.
- Bloco de comandos úteis no cabeçalho:
  rollback manual, limpar cache local, ver pm2, smoke test público.

## 7. Validação

- `tsc` verde
- `bun run build` verde com `VITE_DISABLE_PWA=true`
- `eslint` 0/0 nos arquivos tocados
- preview `/admin/system` carrega
- preview `/admin/logs` carrega (com mock)
- `EventoBulkForm`: toggle "Pular descrições" e "Limpar cache"
  visíveis na toolbar.

## 8. Não alterado

Roxou pública, Partner Pro funcional, Lista VIP, Reservas, Mesas,
Check-in, CRM, Analytics, RLS, Nginx, Google OAuth, Supabase
schemas, banco de produção.

## 9. Arquivos

Criados:
- `src/lib/bulkEventsIndexedDbCache.ts`
- `docs/refactor/FASE_10G_1_1_stability_cache_monitoring.md`

Editados:
- `src/apps/admin/pages/EventoBulkForm.tsx`
- `src/apps/admin/pages/AdminSystem.tsx`
- `src/apps/admin/pages/AdminLogs.tsx`
- `deploy.sh`

## 10. Pendências para Fase 10G.1.2

- Mover `generate-description` para worker dedicado em
  `bulkEventsQueue` com status próprio (`generating-description`).
- Endpoint real `/api/system/host` e `/api/system/pm2` no
  `roxou-api` (Express na VPS executando `pm2 jlist` + `os`).
- Endpoint real `/api/logs?cat=...` lendo
  `/var/www/roxou/logs/<cat>.log` via `tail -n 200`.
- Migrar leitura do cache hot (sessionStorage) para o IndexedDB
  com promoção automática no warm-up do lote.
