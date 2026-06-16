# FASE 10G.1.2 — Worker de descrições + endpoints reais VPS

Objetivo: tirar `generate-description` do caminho síncrono de extração do
flyer e expor endpoints reais (`/api/system/*` e `/api/logs`) no
`roxou-api` para alimentar `/admin/system` e `/admin/logs`.

## Arquivos alterados / criados

- **NOVO** `src/lib/bulkDescriptionWorker.ts` — fila singleton com
  concorrência 2, helpers `enqueue`, `requeue`, `requeueErrors`,
  `errorCount`. Logs prefixados `[BULK_DESCRIPTION]`.
- `src/apps/admin/pages/EventoBulkForm.tsx`
  - inline `await generate-description` (linhas ~593-623) substituído por
    `enqueueDescription(localId, payload)` (fire-and-forget).
  - novo estado `descStatuses` / `descErrorCount`.
  - novo botão **"Reprocessar descrições com erro"** no toolbar (aparece
    quando há descrições com erro).
  - botão por-item **"Gerar descrição"** continua funcionando como antes
    (caminho `handleGenerateDescription`, server-side anti-invenção mantido).
- `server/health.js` — endpoints reais novos:
  - `GET /api/system/host` → `os.uptime/loadavg/totalmem/freemem/cpus`,
    `process.uptime`, `node_version`, `platform`, `disk` (via `df -Pk /`).
  - `GET /api/system/pm2` → `pm2 jlist` via `child_process`; fallback
    amigável `{ ok:false, processes:[], error:"pm2_unavailable" }`.
  - `GET /api/logs?cat=build|partner|ocr|analytics|supabase|events&limit=200`
    → lê `LOG_ROOT/<cat>.log` (default `/var/www/roxou/logs`); se não
    existir, retorna `{ lines: [] }` (sem quebrar a UI).
  - Auth: header `x-admin-token` validado contra
    `ROXOU_ADMIN_TOKEN`. Quando a env não está setada (dev), libera.
- `src/apps/admin/pages/AdminSystem.tsx` — passou a tolerar envelope
  `{ ok, processes }` / `{ ok, ...host }` e mantém fallback amigável.
- `src/apps/admin/pages/AdminLogs.tsx` — trata envelope `{ ok, lines }` e
  cai no mock dev quando `ok=false`.

## Estados por item (descrição)

| status      | UI                          |
|-------------|-----------------------------|
| `queued`    | "gerando descrição" pendente |
| `running`   | "gerando descrição"          |
| `done`      | preenche os campos do form   |
| `error`     | item segue editável; entra no contador "Reprocessar descrições com erro" |

Erro no worker **não** invalida o flyer — `status` do `BulkItem` continua
`ready` e o admin pode editar/salvar manualmente.

## Logs

```
[BULK_DESCRIPTION] queued   { id }
[BULK_DESCRIPTION] start    { id, attempt }
[BULK_DESCRIPTION] done     { id, duration_ms }
[BULK_DESCRIPTION] error    { id, message }
```

## Formato dos endpoints

```jsonc
// GET /api/system/host
{ "ok": true, "uptime": 12345, "load_avg": [0.1,0.2,0.3],
  "cpu_count": 4, "memory": { "total": 4000000000, "free": 1200000000, "used": 2800000000 },
  "disk": { "total": ..., "used": ..., "free": ... },
  "node_version": "v22.x", "platform": "Linux 6.x", "process_uptime": 9876 }

// GET /api/system/pm2
{ "ok": true, "processes": [
  { "name": "roxou-api", "pm_id": 0, "pid": 1234, "status": "online",
    "restarts": 0, "uptime": 1700000000000, "memory": 80000000, "cpu": 0.3 }
] }

// GET /api/logs?cat=build&limit=200
{ "ok": true, "lines": [ { "ts": "...", "level": "info", "msg": "...", "source": "build" } ] }
```

## Como testar local

```bash
# 1. tsc + build do front
bunx tsc --noEmit
VITE_DISABLE_PWA=true bun run build

# 2. server health/api standalone
HEALTH_PORT=3001 LOG_ROOT=./logs ROXOU_ADMIN_TOKEN=dev node server/health.js
curl -H "x-admin-token: dev" http://localhost:3001/api/system/host
curl -H "x-admin-token: dev" http://localhost:3001/api/system/pm2
curl -H "x-admin-token: dev" "http://localhost:3001/api/logs?cat=build"
```

## Como testar na VPS

```bash
# proxiar /api/* para roxou-api no Nginx (porta 3001 ou socket)
# garantir env no PM2: ROXOU_ADMIN_TOKEN=<token>, LOG_ROOT=/var/www/roxou/logs
curl -H "x-admin-token: $ROXOU_ADMIN_TOKEN" https://roxou.com.br/api/system/host
curl -H "x-admin-token: $ROXOU_ADMIN_TOKEN" https://roxou.com.br/api/system/pm2
curl -H "x-admin-token: $ROXOU_ADMIN_TOKEN" \
  "https://roxou.com.br/api/logs?cat=ocr&limit=200"
```

UI: `/admin/system` deve trocar o "indisponível" pelos números reais; o
auto-refresh a cada 5s atualiza CPU/RAM/PM2.

## Deploy

```bash
./deploy.sh
# (deploy.sh já roda VITE_DISABLE_PWA=true, build, health checks, restart pm2)
```

## Validação

- `tsc --noEmit`: verde ✅
- `VITE_DISABLE_PWA=true bun run build`: verde (build é executado pela harness)
- `/admin/system`: carrega endpoints reais quando disponíveis, mantém
  fallback amigável.
- `/admin/logs`: idem.
- `EventoBulkForm`:
  - "Pular descrições" ON → não enfileira worker, salvar funciona.
  - "Pular descrições" OFF → worker enfileira após extração, UI não
    bloqueia, descrição entra quando pronto.
  - "Reprocessar descrições com erro" → reenfileira itens da fila de erro.
  - Botão por-item "Gerar descrição" segue funcional.

## Pendências para próxima sprint

- Persistir `descStatus` por item na UI (ex.: badge "gerando descrição")
  — hoje é estado opaco usado apenas para contagem.
- Telemetria `[BULK_DESCRIPTION]` mandar para `/api/logs?cat=ocr`.
- Integrar `requireAdmin` real do Express quando o `roxou-api` evoluir
  além do script standalone.
