# Roxou — Plano de Migração para VPS

> Status: **preparação**. Nenhum DNS, Edge Function ou layout deve ser alterado nesta fase.
> Objetivo: deixar o projeto pronto para rodar em VPS Linux (Node + Nginx + PM2 + FFmpeg + Redis opcional)
> mantendo Supabase como **Postgres + Auth + Storage leve**.

---

## 1. Arquitetura atual (resumo)

- **Frontend**: React 18 + Vite + Tailwind (SPA hospedada em Lovable / Vercel-like).
- **Backend**: Supabase (Postgres, Auth, Storage `uploads` e `event-flyers`, ~27 Edge Functions Deno).
- **Crons**: `pg_cron` + `pg_net` chamando Edge Functions (Radar IA, Aura, Football sync, partner-instagram-sync, aura-pulse, aura-home-curation).
- **Mídia pesada**: Roxou Cortes já roda fora do Supabase (renders, thumbnails, vídeos), via fluxo VPS-first.
- **IA**: Lovable AI Gateway (Gemini, GPT-5) via `LOVABLE_API_KEY`, Firecrawl, Google Maps.

## 2. Arquitetura alvo (VPS)

```text
                    ┌─────────────────────────────┐
   Cloudflare / DNS │  roxou.com.br / *.roxou     │
                    └────────────┬────────────────┘
                                 │
                          ┌──────▼──────┐
                          │   Nginx     │  TLS, gzip, cache, upload grande
                          └──┬───────┬──┘
                             │       │
                ┌────────────▼─┐   ┌─▼────────────┐
                │ roxou-web    │   │ roxou-api    │  Node/Express
                │ (Vite build) │   │ /api/*       │
                └──────────────┘   └───┬──────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
        ┌───────▼──────┐       ┌───────▼──────┐      ┌────────▼──────┐
        │ roxou-worker │       │ roxou-cron   │      │ roxou-cortes  │
        │ FFmpeg/OCR/IA│       │ node-cron    │      │ renders/reels │
        └──────┬───────┘       └──────┬───────┘      └────────┬──────┘
               │                      │                       │
               └──────────┬───────────┴───────────────────────┘
                          │
                ┌─────────▼──────────┐         ┌─────────────────────┐
                │  Supabase (cloud)  │         │ /var/www/roxou/     │
                │  Postgres + Auth   │         │ storage/{uploads,   │
                │  Storage leve      │         │ renders,thumbnails} │
                └────────────────────┘         └─────────────────────┘
```

## 3. O que continua no Supabase

- **Postgres** (tabela única fonte da verdade — events, partners, profiles, user_roles, ride_*, community_*, sports_*, instagram_*, aura_*).
- **Auth** (email/senha + Google + admin via `has_role`).
- **RLS** + helpers `has_role`, `is_admin`.
- **Storage leve**: avatares, flyers pequenos (`uploads/`, `event-flyers/`).
- **Realtime**: chat de jogos, comunidade, transporte, aura_alerts.

## 4. O que vai para a VPS

| Categoria | Hoje | Alvo VPS |
|-----------|------|----------|
| Frontend SPA | Lovable | `roxou-web` (Nginx serve `dist/`) |
| API REST custom | — | `roxou-api` (Express) |
| Mídia pesada (vídeos, reels, renders, OCR offline) | Roxou Cortes VPS | `roxou-worker` + `/var/www/roxou/storage` |
| Crons operacionais | `pg_cron` → Edge | `roxou-cron` (node-cron) chamando `roxou-api` |
| Edge Functions IA (Gemini/Firecrawl/Maps/Instagram) | Supabase Edge | Migrar gradualmente para `roxou-api` |
| Webhook Meta/Instagram | Supabase Edge | `roxou-api` (`/api/webhooks/instagram`) |
| Sitemap | Supabase Edge | `roxou-api` (`/sitemap.xml`) |

## 5. Ordem de migração (faseada)

1. **Fase 0 — Preparação (esta fase, sem produção)**
   - Documentação, `ecosystem.config.js`, `NGINX_ROXOU.conf.example`, health checks, auditoria.
2. **Fase 1 — Subir VPS paralelo**
   - Provisionar VPS, instalar Node 20, Nginx, PM2, FFmpeg, ufw, fail2ban, certbot.
   - Deploy frontend em `beta.roxou.com.br` apontando para o **mesmo Supabase**.
   - Validar build, SPA fallback, OG/SEO, sitemap.
3. **Fase 2 — Migrar API e workers**
   - Subir `roxou-api` + `roxou-worker` em `api.roxou.com.br`.
   - Mover endpoints `/api/health`, `/sitemap.xml`, geocode, maps-key.
4. **Fase 3 — Migrar crons**
   - Ativar `roxou-cron` chamando `roxou-api` com `x-cron-secret`.
   - Manter `pg_cron` em paralelo (idempotente) até validar 7 dias.
   - Depois: `cron.unschedule(...)` nas rotinas migradas.
5. **Fase 4 — Migrar Edge Functions IA**
   - Reescrever `generate-description`, `generate-art`, `extract-flyer-metadata`, `scrape-instagram`, `instagram-scraper`, `eventou-scraper`, `partner-instagram-sync`, `automatic-event-hunter`, `aura-*`, `prudente-ai`, `import-instagram`, `instagram-publish`, `notify-drivers-new-ride`, `send-expo-contact` como rotas Express.
   - Manter `instagram-webhook` em Supabase Edge **ou** mover atrás de Nginx (Meta exige URL pública estável — preferir migração com cuidado).
6. **Fase 5 — Swap DNS**
   - Cloudflare: trocar `roxou.com.br` para a VPS após 100% verde no `beta`.
   - Manter Lovable como fallback por 7 dias (rollback rápido).
7. **Fase 6 — Limpeza**
   - Remover Edge Functions migradas (`supabase functions delete`).
   - Desativar `pg_cron` migrados.

## 6. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Quebrar SEO ao mudar SPA | Manter mesmos meta tags, sitemap dinâmico, `robots.txt`, OG-image idêntica. Pré-renderizar se necessário. |
| Vazamento de `SERVICE_ROLE_KEY` na VPS | Apenas em `roxou-api`/`roxou-worker` (env), nunca no frontend, nunca em logs. |
| Webhook Instagram quebrar (HMAC) | Manter rota Edge ativa durante swap; só remover após 48h verde. |
| Timezone (`America/Sao_Paulo`) | `TZ=America/Sao_Paulo` em `ecosystem.config.js`. Continuar usando helpers `@/lib/dateUtils`. |
| Storage local cheio | `logrotate` + monitoramento `df -h`; thumbnails em `webp`. |
| Crons duplicados (pg_cron + node-cron) | Idempotência por design (upsert + dedupe). Validar antes de desligar pg_cron. |
| Rollback DNS lento | TTL DNS = 300s antes do swap. |

## 7. Rollback

1. Cloudflare → reverter A/CNAME para Lovable.
2. Reativar `pg_cron` (já preservado).
3. Reativar Edge Functions desativadas (`supabase functions deploy <nome>`).
4. Frontend antigo continua publicado em `roxou.lovable.app`.

## 8. Checklist pré-migração

- [ ] Backup completo do Postgres (`pg_dump` via `SUPABASE_DB_URL`).
- [ ] Snapshot do bucket `uploads` e `event-flyers`.
- [ ] Lista de `.env` validada (ver `VPS_ENVIRONMENT.md`).
- [ ] Certificados TLS prontos (Let's Encrypt).
- [ ] Firewall UFW configurado (22, 80, 443).
- [ ] Fail2ban ativo.
- [ ] PM2 startup configurado (`pm2 startup systemd`).
- [ ] Build frontend reproduzível (`bun run build`).
- [ ] Health checks respondendo 200 em `beta.roxou.com.br`.
- [ ] Smoke test Lighthouse (perf/SEO ≥ 90).

## 9. Checklist pós-migração

- [ ] Home, Agenda, Evento individual, Local, Jogos, Expo2026, Transporte renderizando.
- [ ] Login Google + email funcionando.
- [ ] Admin acessível (`contato@roxou.com.br`).
- [ ] Upload de flyer + OCR + geração de legenda OK.
- [ ] Radar IA disparando às 13h e 18h (logs `roxou-cron`).
- [ ] Aura pulse rodando a cada 10min.
- [ ] Sitemap servindo (`/sitemap.xml`) e indexado.
- [ ] Realtime (chat jogos, comunidade, transporte) OK.
- [ ] Webhook Instagram recebendo (`X-Hub-Signature-256` validado).
- [ ] SEO OG/Twitter renderizando previews.
- [ ] Sem 500 nos logs por 24h.
- [ ] Backups automáticos rodando.

---

Ver também: `VPS_ENVIRONMENT.md`, `NGINX_ROXOU.conf.example`, `ecosystem.config.js`,
`docs/ROXOU_EDGE_FUNCTIONS_MAP.md`.
