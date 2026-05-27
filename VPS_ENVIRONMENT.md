# Roxou VPS — Variáveis de Ambiente

> Nunca commitar valores reais. Este arquivo lista **apenas nomes** e onde cada variável é usada.
> Frontend (Vite) só enxerga variáveis prefixadas com `VITE_`. Backend lê do `.env` carregado pelo PM2.

---

## 1. Frontend (público — embarcado no bundle)

Local: `/var/www/roxou/apps/web/.env.production`

| Nome | Descrição | Obrigatório |
|------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | sim |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key (segura para front) | sim |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase | sim |
| `VITE_API_BASE_URL` | URL pública da API VPS (ex: `https://api.roxou.com.br`) | sim |
| `VITE_PUBLIC_SITE_URL` | URL canônica (`https://roxou.com.br`) | sim |
| `VITE_ADSENSE_CLIENT` | `ca-pub-4237790251786919` | não |

⚠️ **Nunca** colocar `SERVICE_ROLE_KEY`, secrets de IA ou chaves privadas com prefixo `VITE_`.

## 2. Backend API (`roxou-api`) — privado

Local: `/var/www/roxou/apps/api/.env`

### Supabase / Auth
| Nome | Uso |
|------|-----|
| `SUPABASE_URL` | Cliente service-role no backend |
| `SUPABASE_ANON_KEY` | Cliente "user-context" (com `Authorization: Bearer <jwt>`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Apenas backend**. Bypass RLS para crons/admin. |
| `SUPABASE_JWKS` | Validar JWTs offline (opcional) |
| `SUPABASE_DB_URL` | Conexão direta Postgres (migrações, backups) |

### IA / Lovable Gateway
| Nome | Uso |
|------|-----|
| `LOVABLE_API_KEY` | Gemini/GPT via gateway (`generate-description`, `generate-art`, `extract-flyer-metadata`, `aura-*`, `prudente-ai`) |

### Integrações externas
| Nome | Uso |
|------|-----|
| `GOOGLE_MAPS_API_KEY` | Geocode + venue map (proxy via `/api/maps/key`) |
| `FIRECRAWL_API_KEY` | Scraping Instagram/Eventou |
| `META_APP_ID` | OAuth Instagram |
| `META_APP_SECRET` | OAuth + HMAC do webhook Instagram |
| `RESEND_API_KEY` | Envio de email (Expo contact, alertas) |
| `THESPORTSDB_API_KEY` | Sync futebol |

### Operacional
| Nome | Uso |
|------|-----|
| `CRON_SECRET` | Header `x-cron-secret` para crons internos |
| `PUBLIC_SITE_URL` | `https://roxou.com.br` (para gerar links em emails, OG) |
| `STORAGE_ROOT` | `/var/www/roxou/storage` |
| `LOG_LEVEL` | `info` / `debug` |
| `TZ` | `America/Sao_Paulo` (também forçado no PM2) |
| `NODE_ENV` | `production` |
| `PORT` | porta interna (ex: `3001`) |

## 3. Worker (`roxou-worker`) — privado

Mesmas variáveis da API **+**:

| Nome | Uso |
|------|-----|
| `FFMPEG_PATH` | `/usr/bin/ffmpeg` |
| `FFPROBE_PATH` | `/usr/bin/ffprobe` |
| `WORKER_CONCURRENCY` | máx de jobs simultâneos (default `2`) |
| `RENDER_TMP_DIR` | `/var/www/roxou/storage/temp` |
| `RENDER_OUTPUT_DIR` | `/var/www/roxou/storage/renders` |
| `THUMBS_DIR` | `/var/www/roxou/storage/thumbnails` |
| `REDIS_URL` | opcional — fila BullMQ |

## 4. Cron (`roxou-cron`) — privado

| Nome | Uso |
|------|-----|
| `CRON_SECRET` | enviado em `x-cron-secret` para chamar `roxou-api` |
| `API_INTERNAL_URL` | `http://127.0.0.1:3001` (loopback, sem TLS) |
| `TZ` | `America/Sao_Paulo` |

## 5. Roxou Cortes

Já possui `.env` próprio em seu repositório VPS. Manter isolado.
Compartilha apenas: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_ROOT`.

---

## 6. Verificação rápida

`GET /api/env-check` (autenticado, admin-only) retorna:

```json
{
  "supabase": { "url": true, "anon": true, "service_role": true },
  "ai":       { "lovable": true },
  "external": { "maps": true, "firecrawl": true, "meta": true, "resend": true, "sports": true },
  "ops":      { "cron_secret": true, "tz": "America/Sao_Paulo", "node_env": "production" },
  "storage":  { "root_exists": true, "writable": true, "ffmpeg": true }
}
```

Nunca retornar valores, apenas `true`/`false`.
