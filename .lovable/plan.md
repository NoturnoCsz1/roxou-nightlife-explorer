# Aura Operational Engine — Fase 1 (segura)

## Princípio

A maior parte do "cérebro" já existe na Roxou e está funcionando:

- **Aura Ranking** (cron 15min) → `aura_score`, `trending_score`, `hype_score`, `aura_badge` em `events`
- **Radar IA** (cron 13h/18h) → `instagram_scans` + drafts auto-discovery
- **Partner Aura Sync** (cron 4h) → `aura_partner_score`, `aura_partner_summary`, `aura_partner_tags`
- **AutoReels Queue** → `auto_reels_queue` com prompts CapCut/Kling/Runway/Veo
- **Security/Moderation** → `security_reports`, `user_risk_scores`, `community_user_states`, `flag_message_on_report`
- **Analytics** → `analytics_events`, `analytics_daily_summary`, `event_live_presence`, `aura_home_logs`

Construir tudo de novo seria duplicação e quebraria o que está em produção. **Fase 1 = unificar, ler, mostrar.** Fase 2 = automação ativa, só depois que a Fase 1 estiver no ar.

## O que esta fase entrega

### 1. Painel `/admin/aura` (Aura Command Center)

Página única, mobile-first, Visual Rich. Lê dados que já existem — zero processamento pesado no client. Seções:

- **KPIs ao vivo** (top): eventos publicados, em alta agora, presença ao vivo total, parceiros ativos, alertas abertos, drafts seguros prontos pra publicar.
- **🔥 Em alta agora** — top 8 eventos por `aura_score` futuro com badge (`em_alta` / `viralizando` / `bombando`).
- **🚀 Crescendo rápido** — top 5 por `trending_score` nas últimas 24h (lê `analytics_daily_summary` dos últimos 2 dias).
- **👀 Mais procurado / 💜 Mais salvo** — leitura direta de `analytics_daily_summary` (views, saves) últimos 7 dias.
- **🤖 Decisões da Aura** — últimas N entradas de `aura_home_logs` + últimos `automation_logs` (cron Aura/Radar/Partner Sync).
- **⚠ Riscos abertos** — top 5 `user_risk_scores` com badge `high`/`critical` + `security_reports` com `status=pending`.
- **🏪 Parceiros em alta** — top 5 por `aura_partner_score`.
- **🎬 Fila AutoReels** — `auto_reels_queue` status `pending` (count + 3 últimos).
- **🛰 Radar hoje** — `instagram_scans` detectados hoje (count) + `repost_count` total.

Tudo é leitura agregada. Nenhum write, nenhum risco para SEO/feed/realtime.

### 2. Tabela `aura_alerts`

Persistência leve de alertas operacionais que a Aura "observa". Não substitui nada — é uma view consolidada.

```text
aura_alerts
- id, created_at
- kind: 'trending_spike' | 'viral' | 'risk_user' | 'spam_burst'
       | 'partner_growth' | 'radar_repost' | 'security_critical'
- severity: 'info' | 'warn' | 'critical'
- entity_type: 'event' | 'partner' | 'user' | 'system'
- entity_id (uuid, nullable)
- title (text), body (text)
- payload (jsonb)
- resolved_at (timestamptz, nullable)
- resolved_by (uuid, nullable)
```

RLS: somente `admin` lê/escreve (via `has_role`).

### 3. Edge function `aura-pulse` (cron 10 min)

Função leve, idempotente, sem OCR nem IA generativa — só agregações SQL:

1. **Trending spike** — eventos com `trending_score` que pulou ≥ 1.5× em 1h → cria `aura_alerts` com kind `trending_spike` (idempotente: dedupe por `entity_id` nas últimas 2h).
2. **Risk escalation** — `user_risk_scores.badge` virou `critical` → cria alert (1 por user/dia).
3. **Spam burst** — `community_messages` com `is_flagged=true` > 10 nos últimos 30min → 1 alert.
4. **Partner growth** — `aura_partner_score` subiu ≥ 15 pts vs snapshot anterior → alert.
5. **Radar repost forte** — `instagram_scans.repost_count >= 3` recém-incrementado → alert.

Cron via `pg_cron` + `pg_net` chamando a função a cada 10 minutos.

### 4. Sino "Aura" no `AdminLayout`

Pequeno indicador no header do admin: `🔔 Aura (n)` linkando para `/admin/aura`, contador de alertas não resolvidos. Realtime via `postgres_changes` em `aura_alerts`.

## O que NÃO faz nesta fase

(Para não quebrar nada e manter escopo executável)

- **Não** cria recommendation engine personalizado por usuário (precisa de modelo de embeddings + tabela de eventos e horários por user — projeto à parte).
- **Não** muda como Radar IA, Aura Ranking, AutoReels, Partner Sync funcionam hoje. Apenas lê os resultados.
- **Não** mexe em SEO, slugs, feed home, OAuth, timezone, RLS de eventos públicos, realtime existente.
- **Não** ativa autoban/captcha/shadowban automático — moderação ativa fica como Fase 2 com regras explícitas e auditoria.
- **Não** gera descrições/hashtags/CTAs por IA aqui — isso já existe nos fluxos de admin atuais.

## Tecnicamente

- Migration: cria `aura_alerts`, índice em `(resolved_at, created_at desc)` e `(entity_type, entity_id)`, RLS admin-only via `has_role`.
- Edge function `aura-pulse`: Deno + supabase service role, agregações em SQL, insere em `aura_alerts` com `ON CONFLICT DO NOTHING` por chave de dedupe (`kind|entity_id|date_bucket`).
- Cron: `pg_cron` 10min via `supabase--insert` (não migration, contém URL/anon).
- Página `src/pages/admin/AuraCommand.tsx` + rota em `App.tsx` + item "Aura" no `AdminLayout` (ícone Sparkles).
- Hook `useAuraAlertsCount` para o sino.

## Critérios de aceite

- `/admin/aura` carrega em < 1s (queries paralelas, no SSR).
- Nenhuma quebra em rotas públicas, Radar, feed home, eventos publicados ou realtime.
- Cron `aura-pulse` rodando sem erros e gerando alertas com dedupe.
- Sino do admin atualizando em realtime quando alert novo é criado.

## Próximas fases (não nesta)

- F2: Aura recommendation feed (precisa de schema de comportamento por user).
- F3: Aura moderation actions (mute/shadowban automático com auditoria).
- F4: Aura content automation (gerar descrições/CTA/notifs em background).

Confirma seguir com essa Fase 1? Se sim, aplico migration + edge function + página + cron na próxima rodada.