# FASE 10G.1 — Estabilidade de build na VPS

## Problema

Build na VPS falhava com:

```
Source phase import "vite/modulepreload-polyfill" in "index.html" must be external.
```

Causa: `vite-plugin-pwa` injeta service-worker globs que entram em conflito com o
**multi-entry** (`index.html` + `partner/index.html`) usado desde a Fase 9M.

## Solução

PWA passa a ser **opcional** via env. O build padrão da Lovable continua com PWA;
a VPS roda sem PWA:

```bash
# Build local / Lovable (PWA on)
bun run build

# Build VPS (PWA off — destrava o multi-entry)
VITE_DISABLE_PWA=true bun run build
```

`vite.config.ts` agora lê `process.env.VITE_DISABLE_PWA` / `DISABLE_PWA` e
remove o `VitePWA(...)` do array de plugins antes do `.filter(Boolean)`.

Também passamos `__ROXOU_BUILD_TIME__` e `__ROXOU_PWA_ENABLED__` via
`define`, consumidos por `/admin/system`.

## Deploy unificado

`./deploy.sh` (já comitado na raiz):

```bash
git pull origin main
bun install --frozen-lockfile
VITE_DISABLE_PWA=true bun run build
pm2 restart all --update-env
sudo nginx -t
sudo systemctl reload nginx
pm2 save
pm2 status
```

Use `PWA=true ./deploy.sh` para forçar build com PWA (raro).

## Healthchecks

`scripts/generate-health.ts` (rodado no `prebuild`) gera:

- `public/health`          → `{ status, service: "roxou-web",     version, build, pwa_enabled }`
- `public/partner/health`  → `{ status, service: "roxou-partner", version, build }`

Nginx sugerido:

```nginx
location = /health {
  alias /var/www/roxou/dist/health;
  default_type application/json;
  add_header Cache-Control "no-store";
}
location = /partner/health {
  alias /var/www/roxou/dist/partner/health;
  default_type application/json;
  add_header Cache-Control "no-store";
}
```

`server/health.js` (Express) continua disponível para endpoints dinâmicos
(`/api/health`, `/api/storage/health`, `/api/ffmpeg/health`, `/api/env-check`).

## Painéis novos

- `/admin/system` — consome `/health`, `/partner/health`,
  `/api/system/pm2`, `/api/system/host`. Faz auto-refresh a cada 30s.
  Mostra também `__ROXOU_BUILD_TIME__` e estatísticas do cache de flyers
  da sessão atual.
- `/admin/logs` — consome `/api/logs?cat=<build|partner|ocr|analytics|supabase|eventos>&limit=200`.
  Quando o endpoint não existe, exibe instrução para implementar no roxou-api
  (tail dos arquivos em `/var/www/roxou/logs/*.log`).

Itens novos no `ADMIN_NAVIGATION`: **Sistema** (Activity) e **Logs** (FileText).

## Próximas pendências VPS

| Endpoint | O que falta | Onde implementar |
|---|---|---|
| `/api/system/pm2`  | `pm2 jlist` + parse | roxou-api (Express) |
| `/api/system/host` | `os.loadavg/freemem/totalmem` + `df` | roxou-api |
| `/api/logs?cat=`   | `tail -n 200 /var/www/roxou/logs/<cat>.log` | roxou-api |

Sem esses endpoints, o painel já é útil (health + cache + build time) e
mostra um aviso claro de "indisponível" nos demais cards.

## Não alterado

Lista VIP, Reservas, Mesas, Check-in, CRM, Leads, Analytics existentes,
Supabase RLS, estrutura do Partner Pro, admin atual.
