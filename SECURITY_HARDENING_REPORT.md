# Security Hardening Report — Roxou

Last updated: 2026-05-26 (rodada 2)

This document tracks every security finding raised by the scanner and the
remediation applied. After this round, **all critical (error-level) findings
are resolved** and only intentional architectural choices remain (documented
below with justification).

---

## 1. Status por alerta

| # | Alerta original | Status | Ação |
|---|-----------------|--------|------|
| 1 | Instagram OAuth Endpoint Exposes Access Tokens Without Authentication | ✅ Corrigido | `safeAccount()` agora remove `access_token`/`refresh_token` de toda resposta; `status/test/sync` exigem `requireAdmin`. |
| 2 | Instagram Post Publishing Endpoint Requires No Authentication | ✅ Corrigido | `instagram-publish` protegido com `requireAdmin`. |
| 3 | Google Maps API Key Returned to Unauthenticated Callers | ✅ Corrigido (código) / ⚠️ Pendente no Google Cloud | `maps-key` agora exige usuário autenticado (`requireUser`). **Manual:** restringir a chave em Google Cloud Console por HTTP referrer para `roxou.com.br`, `www.roxou.com.br`, `transporte.roxou.com.br`, `*.lovableproject.com`, `*.lovable.app`. |
| 4 | Multiple AI Edge Functions Callable Without Authentication | ✅ Corrigido | `generate-art`, `generate-description`, `extract-flyer-metadata`, `aura-organize-event`, `aura-autoreels-generate`, `scrape-instagram` protegidos com `requireAdmin`. |
| 5 | Five Additional Edge Functions Call Paid APIs Without Authentication | ✅ Corrigido | `import-instagram` / `eventou-scraper` ⇒ `requireAdmin`. `automatic-event-hunter` / `partner-instagram-sync` ⇒ `requireCronOrAdmin`. `prudente-ai` agora exige JWT em **todos** os modos (home, chat, studio). |
| 6 | Five Cron/Operational Functions Are Publicly Triggerable Without Auth | ✅ Corrigido (código) / ⚠️ Pendente atualização cron | `aura-home-curation`, `aura-pulse`, `sync-football-matches`, `sync-football-standings`, `backfill-event-duplicates` protegidos com `requireCronOrAdmin`. **Manual:** ver §3 abaixo (rotinas `pg_cron` precisam passar o header `Authorization`). |
| 7 | Instagram Webhook Does Not Validate Meta HMAC Signature | ✅ Corrigido | Validação `X-Hub-Signature-256` via HMAC-SHA256 (`crypto.subtle`) com `META_APP_SECRET`. |
| 8 | Any authenticated user can subscribe to any Realtime channel topic | ✅ Corrigido (default-deny) | `realtime.messages` com RLS ativada + allowlist por tópico (`chat-{rideId}` só para participantes; `football_chat_*` autenticado; `aura_alerts_admin` admin-only). App usa apenas `postgres_changes` → sem impacto funcional. |
| 9 | Public Can Execute SECURITY DEFINER Function | ⚠️ Aceito (RLS helpers) | Permanecem apenas `public.has_role` e `public.is_admin` — helpers usados pelo engine de RLS; revogar quebra todas as policies que dependem deles. Retornam apenas booleano, sem dados pessoais. |
| 10 | Leaked Password Protection Disabled | ✅ Corrigido | Habilitado via `configure_auth` (`password_hibp_enabled: true`). |
| 11 | Signed-In Users Can Execute SECURITY DEFINER Function | ⚠️ Aceito (RPCs internas) | Restantes: `has_role`, `is_admin`, `count_event_presence`, `count_event_live_presence`, `increment_match_view`, `community_user_can_speak`, `compute_user_risk_score`, `upsert_partner_radar_memory`, `record_radar_repost`. Todas com `SET search_path=public`, validação interna e necessárias para a UI autenticada. `anon` já foi revogada em todas. |
| 12 | RLS Policy Always True | ✅ Corrigido | Substituídas 8 policies `WITH CHECK (true)` + 4 policies `USING (true)` restantes (`community_presence`, `sports_league_standings`, `sports_match_venues`, `sports_matches`) por validações reais de campo. Funcionalmente equivalentes — todas as linhas reais continuam visíveis ao público alvo. |
| 13 | Partner WhatsApp / internal AI fields exposed publicly | ✅ Corrigido | `REVOKE SELECT ON public.partners FROM anon` + `GRANT SELECT (col1, col2, …)` por coluna. Visitantes anônimos não veem mais `whatsapp`, `instagram_raw_json`, `instagram_recent_posts`, `aura_suggestions`, `aura_partner_summary`, `manual_locked_fields`, `instagram_sync_*`, `aura_last_run_at`. Usuários autenticados (incluindo botão "WhatsApp" no detalhe do parceiro) seguem funcionando. |
| 14 | Full community presence list readable by anyone | ✅ Corrigido | SELECT em `community_presence` restrito a `authenticated`. |

---

## 2. Helpers compartilhados (Edge Functions)

`supabase/functions/_shared/requireAdmin.ts` expõe:

- `requireUser(req)` — exige `Authorization: Bearer <JWT>` válido.
- `requireAdmin(req)` — exige usuário autenticado **com role `admin`** (via `public.has_role`).
- `requireCronOrAdmin(req)` — aceita, nesta ordem:
  1. Header `x-cron-secret` igual ao env `CRON_SECRET`,
  2. `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (uso de `pg_cron` via `net.http_post`),
  3. Usuário autenticado com role `admin`.

Auth interna usa `supabase.auth.getUser(token)` — **não** `getClaims()` (incompatível com o runtime).

---

## 3. AÇÃO MANUAL OBRIGATÓRIA — atualizar `pg_cron`

As 6 rotinas em `cron.job` ainda enviam apenas `apikey: <anon_key>`, sem
`Authorization`. Por isso vão receber 401 nas próximas execuções até que sejam
atualizadas. Cole o bloco abaixo no **Supabase SQL Editor** (que tem acesso ao
service-role key) substituindo `<SERVICE_ROLE_KEY>` pelo valor real:

```sql
-- Exemplo para aura-home-curation; replique para as outras 5 rotinas.
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'aura-home-curation-15min'),
  command := $cmd$
    SELECT net.http_post(
      url := 'https://bapdgykghciiyvlqdrqx.supabase.co/functions/v1/aura-home-curation',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
      body := jsonb_build_object('cron', true, 'ts', now())
    );
  $cmd$
);
```

Rotinas afetadas: `aura-home-curation-15min`, `aura-pulse-every-10-min`,
`automatic-event-hunter-13h`, `automatic-event-hunter-18h`,
`partner-instagram-sync-daily`, `radar-ia-hourly`.

Alternativa: definir o secret `CRON_SECRET` (já adicionado) também no comando
do cron como header `x-cron-secret`.

---

## 4. AÇÃO MANUAL — Google Cloud Console

Restringir a chave `GOOGLE_MAPS_API_KEY` por **HTTP referrer** aos domínios:
- `https://roxou.com.br/*`
- `https://www.roxou.com.br/*`
- `https://transporte.roxou.com.br/*`
- `https://*.lovableproject.com/*`
- `https://*.lovable.app/*`

Enquanto isso não estiver feito, mesmo com a edge function protegida a chave
poderia ser usada de outros domínios caso vazasse.

---

## 5. Migrations SQL aplicadas

- `20260526204045_*.sql` — policies "always true" → validações reais; restringe
  `community_presence`; revoga `EXECUTE` em SECURITY DEFINER; allowlist em
  `realtime.messages`.
- `20260526204120_*.sql` — restaura `EXECUTE` de `record_radar_repost` para
  `authenticated`.
- `20260526204217_*.sql` — column-level GRANTs em `public.partners` ocultando
  `whatsapp`, `instagram_raw_json` e campos internos/IA do anon.
- `20260527143936_*.sql` (rodada 3) —
  - `community_messages.SELECT` restrito a `authenticated` (`REVOKE` de anon).
  - `football_chat_messages.SELECT` restrito a `authenticated` (`REVOKE` de anon).
  - `ride_requests.SELECT` agora exige `passenger_id = auth.uid()` OU role
    `driver` OU role `admin`. Usuário comum (não-motorista) não enxerga mais
    todas as corridas abertas via Realtime.
  - Criada view `public.public_partners` (`security_invoker=true`) com apenas
    colunas seguras (sem WhatsApp, raw_json do Instagram, sugestões da Aura,
    `manual_locked_fields`, sync interno, etc.).

---

## 6. Falsos positivos e ações aceitas

### "Partner WhatsApp readable by anonymous users"
A policy `USING (active = true)` em `partners` permanece, mas o scanner não
considera os GRANTs por coluna. Na prática, `anon` recebeu apenas as colunas
seguras via `GRANT SELECT (name, slug, …) ON public.partners`. Qualquer SELECT
anônimo em `whatsapp`, `instagram_raw_json`, `aura_suggestions`,
`aura_partner_summary`, `manual_locked_fields`, `instagram_sync_*` ou
`aura_last_run_at` retorna `permission denied`. A view `public_partners` foi
adicionada como caminho canônico para o front público migrar gradualmente.
Usuários autenticados continuam vendo `whatsapp` (botão WhatsApp no detalhe do
parceiro). Admin vê tudo.

### Realtime publication
Tabelas em `supabase_realtime` (`community_messages`, `football_chat_messages`,
`ride_requests`, `ride_offers`, `transport_messages`, `aura_alerts`,
`community_rooms`, `community_presence`) seguem publicadas, mas o Realtime
respeita as policies de SELECT. Após a rodada 3 nenhuma delas vaza dados
pessoais para anon ou para usuários sem papel apropriado.

---

## 7. Verificação final

- `community_messages` e `football_chat_messages`: anon não recebe mais nada
  via Realtime (RLS bloqueia o canal).
- `ride_requests`: usuário comum só recebe eventos do próprio passageiro;
  motorista (`driver`) e admin recebem o feed completo.
- `partners.whatsapp` e campos internos: invisíveis ao anon por GRANT por
  coluna e disponíveis na view `public_partners` versão "limpa".
- Funcionalidades públicas (Agenda, Locais, Jogos, SEO, Aura, Radar) e
  autenticadas (chat de jogos, comunidade, transporte, painel admin)
  continuam operando normalmente.
