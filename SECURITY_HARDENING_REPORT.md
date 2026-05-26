# Security Hardening Report — Roxou

## Edge Functions protegidas (helper `_shared/requireAdmin.ts`)

| Função | Antes | Agora |
|---|---|---|
| `instagram-oauth` (`status`, `test`, `sync`, `auth_url`) | sem auth, vazava `access_token` | **requireAdmin** + `safeAccount()` remove `access_token` da resposta |
| `instagram-oauth` (`callback`) | público | continua público (redirect Meta) — não retorna token, só redireciona |
| `instagram-publish` | sem auth | **requireAdmin** |
| `maps-key` | sem auth | **requireUser** (qualquer logado) |
| `generate-art` | sem auth | **requireAdmin** |
| `generate-description` | sem auth | **requireAdmin** |
| `extract-flyer-metadata` | sem auth | **requireAdmin** |
| `aura-organize-event` | sem auth | **requireAdmin** |
| `aura-autoreels-generate` | sem auth | **requireAdmin** |
| `scrape-instagram` | sem auth | **requireAdmin** |
| `instagram-webhook` (POST) | sem HMAC | **HMAC-SHA256 do `X-Hub-Signature-256` validado contra `META_APP_SECRET`** (constant-time compare) |

## Migration aplicada

`20260526_*` — security hardening:

- `page_views`, `ticket_clicks`, `visitor_sessions`: SELECT agora restrito a admin.
- `visitor_sessions`: removida policy `UPDATE USING (true)`; só admin atualiza.
- Storage `uploads` / `event-flyers`: usuários comuns só podem gravar em `v3-profiles/<seu_uid>/`; pastas públicas (`events`, `partners`, `event-flyers`, `content`, `reels`, `stories`) só admin.
- **REVOKE EXECUTE** em SECURITY DEFINER internos (triggers/cron): `archive_old_radar_scans`, `cleanup_event_live_presence`, `compute_user_risk_score`, `expire_stale_ride_requests`, `flag_message_on_report`, `handle_new_user`, `lock_ride_request_immutable_fields`, `on_security_report_insert`, `record_radar_repost`, `upsert_partner_radar_memory`, `validate_*`, `ensure_profile_affiliate_code`, `update_*_updated_at*`.
- **GRANT EXECUTE TO authenticated** apenas para RPCs admin chamados via `supabase.rpc` (`archive_old_radar_scans`, `compute_user_risk_score`, `upsert_partner_radar_memory`) — controle real fica no admin check do código.
- RPCs intencionalmente públicas mantidas: `has_role`, `is_admin`, `increment_match_view`, `count_event_presence`, `count_event_live_presence`, `community_user_can_speak`.

## Sem alteração

- Layout, rotas públicas, SEO, timezone `America/Sao_Paulo`.
- Lógica de Radar IA, Aura, Expo2026, Jogos, Transporte e Agenda.
- Buckets continuam públicos para leitura (imagens precisam aparecer em URLs públicas).
- Inserts públicos de analytics (`analytics_events`, `page_views`, `ticket_clicks`, `visitor_sessions`) seguem aceitos anonimamente — tracking depende disso. Leitura é admin-only.

## Configuração manual pendente (fora do código)

1. **Google Cloud Console** — restringir a chave `GOOGLE_MAPS_API_KEY` por HTTP referrer:
   - `https://roxou.com.br/*`
   - `https://www.roxou.com.br/*`
   - `https://roxou.lovable.app/*`
   - `https://*.lovable.app/*` (preview)
   - Limitar APIs habilitadas a: Maps JavaScript, Places, Geocoding.
2. **Leaked password protection (HIBP)** — ativar em Cloud → Users → Auth Settings → Password HIBP Check.
3. **Realtime channel authorization** — adicionar policies em `realtime.messages` via Dashboard (schema reservado, não alteramos por migration). Restringir tópicos sensíveis (`aura_alerts`, `ride_requests`, `transport_messages`) por `auth.uid()` / role admin.
4. **Rotacionar imediatamente** os tokens Instagram que já foram retornados pelo endpoint antigo: desconectar a conta em `/admin/instagram` e refazer OAuth.
5. **Re-rodar o Security Scanner** após o deploy para confirmar a redução dos alertas críticos.

## Não vazam mais ao frontend

- `access_token` / `refresh_token` Instagram
- `SUPABASE_SERVICE_ROLE_KEY` (continua server-only nas Edge Functions)
- `META_APP_SECRET`, `FIRECRAWL_API_KEY`, `LOVABLE_API_KEY` (server-only)
- Logs de erro do publish/webhook não imprimem mais payload completo do token.
