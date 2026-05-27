# Edge Functions → Mapeamento de Migração para VPS

Coluna **Destino**:
- `keep` — mantém no Supabase Edge (sem migração)
- `api` — vira rota `roxou-api` (Express)
- `worker` — vira job assíncrono (`roxou-worker`)
- `cron` — disparado por `roxou-cron`
- `deprecate` — remover após validar substituto

| Função | O que faz | IA/API paga? | Auth? | Admin? | Destino | Risco |
|--------|-----------|--------------|-------|--------|---------|-------|
| `ai-audit-establishments` | Auditoria de partners via IA | sim (Gemini) | sim | admin | `api` + `worker` | médio |
| `aura-autoreels-generate` | Gera prompts de reels (Kling/Veo) | sim | sim | admin | `worker` | baixo |
| `aura-home-curation` | Curadoria home (15min) | sim | cron | — | `cron` + `api` | médio |
| `aura-organize-event` | Organiza dados de evento via IA | sim | sim | admin | `api` | baixo |
| `aura-pulse` | Alertas Aura (10min) | leve | cron | — | `cron` + `api` | baixo |
| `automatic-event-hunter` | Radar IA 13h/18h, business_discovery + Gemini | sim (Gemini + Meta) | cron | — | `cron` + `worker` | **alto** (custo + cron crítico) |
| `backfill-event-duplicates` | Job de manutenção | não | admin/cron | admin | `worker` | baixo |
| `eventou-scraper` | Firecrawl scraping | sim (Firecrawl) | admin | admin | `worker` | médio |
| `extract-flyer-metadata` | OCR + IA do flyer | sim (Gemini) | admin | admin | `worker` | médio |
| `generate-art` | Geração de imagem (Gemini Flash Image) | sim | admin | admin | `worker` | médio |
| `generate-description` | Legenda IA com variações | sim (Gemini) | admin | admin | `api` | baixo |
| `geocode-address` | Google Maps geocode | sim (Maps) | user | — | `api` | baixo |
| `import-instagram` | Importa post via URL | sim (Firecrawl) | admin | admin | `api` | baixo |
| `instagram-oauth` | OAuth Meta | sim | admin | admin | `api` | médio (callback URL fixo) |
| `instagram-publish` | Publica post oficial | sim (Meta Graph) | admin | admin | `api` | médio |
| `instagram-scraper` | Coleta posts Firecrawl | sim | cron/admin | admin | `cron` + `worker` | médio |
| `instagram-webhook` | Recebe webhook Meta + HMAC | — | público (HMAC) | — | `api` | **alto** (URL pública estável; só migrar com cuidado) |
| `maps-key` | Devolve Maps API key (autenticado) | — | user | — | `api` | baixo |
| `notify-drivers-new-ride` | Notifica motoristas | — | user | — | `api` | baixo |
| `partner-instagram-sync` | Sync diário 4h | sim (Meta) | cron | — | `cron` + `worker` | médio |
| `prudente-ai` | Chat IA da home/studio | sim (Gemini/GPT) | user | — | `api` | médio (alto volume) |
| `scrape-instagram` | Scrape on-demand | sim (Firecrawl) | admin | admin | `api` | baixo |
| `send-expo-contact` | Email contato Expo (Resend) | sim (Resend) | público (rate-limit) | — | `api` | baixo |
| `sitemap` | Sitemap dinâmico | — | público | — | `api` | baixo (SEO crítico — preservar URLs) |
| `sync-football-matches` | Sync TheSportsDB | sim | cron | — | `cron` + `api` | baixo |
| `sync-football-standings` | Sync TheSportsDB | sim | cron | — | `cron` + `api` | baixo |

## Ordem sugerida de migração

1. **Baixo risco primeiro**: `maps-key`, `geocode-address`, `send-expo-contact`, `sync-football-*`, `sitemap`.
2. **Worker pesado**: `generate-art`, `extract-flyer-metadata`, `aura-autoreels-generate`, `eventou-scraper`.
3. **Crons**: `aura-pulse`, `aura-home-curation`, `partner-instagram-sync`, `automatic-event-hunter`.
4. **Alta visibilidade**: `prudente-ai`, `generate-description`, `instagram-publish`, `instagram-oauth`.
5. **Último**: `instagram-webhook` (Meta exige URL estável — manter em paralelo durante swap).

## Regras gerais

- Toda função migrada **mantém** `requireUser` / `requireAdmin` / `requireCronOrAdmin` no equivalente Express.
- `CRON_SECRET` continua o mesmo (header `x-cron-secret`).
- Logs **nunca** vazam tokens.
- Após validar 7 dias verde, remover Edge Function: `supabase functions delete <nome>` e desagendar `pg_cron`.
