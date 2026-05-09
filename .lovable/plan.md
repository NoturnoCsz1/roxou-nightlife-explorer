## Sincronização Automática de Parceiros via Instagram/Meta + Aura

Vou implementar a atualização automática dos perfis de parceiros usando a Meta Graph API (Business Discovery) já conectada, com enriquecimento por IA (Aura) gerando resumos, tags e score.

### 1. Schema (migration)

Adicionar à tabela `partners` (apenas se ainda não existirem):
- `instagram_username`, `instagram_profile_url`, `instagram_id`, `instagram_name`
- `instagram_bio`, `instagram_profile_picture_url`, `instagram_website`
- `instagram_followers_count` (int), `instagram_media_count` (int)
- `instagram_last_sync_at` (timestamptz), `instagram_sync_status` (text — `synced` | `not_found` | `private` | `no_permission` | `error` | `pending`)
- `instagram_sync_error` (text), `instagram_raw_json` (jsonb)
- `instagram_recent_posts` (jsonb) — top N posts públicos via Business Discovery
- `aura_partner_score` (int), `aura_partner_tags` (text[]), `aura_partner_summary` (text)
- `aura_suggestions` (jsonb) — sugestões NÃO aplicadas, para revisão admin
- `aura_last_run_at` (timestamptz)
- `manual_locked_fields` (text[]) — campos com edição manual protegida (ex: `short_description`, `full_description`, `logo_url`)

Índice único parcial em `lower(instagram_username)` (apenas onde não nulo) para detectar duplicidade.

### 2. Edge Function: `partner-instagram-sync`

`supabase/functions/partner-instagram-sync/index.ts` (verify_jwt = false, validação interna).

Modos:
- `{ partner_id }` — sincroniza um.
- `{ all: true, stale_hours: 24 }` — sincroniza todos os parceiros com Instagram cuja última sync seja maior que N horas.
- `{ cron: true }` — disparado pelo pg_cron diário.

Fluxo por parceiro:
1. Normaliza `instagram` → `instagram_username` (sem @, sem URL, lowercase).
2. Pega token de `instagram_accounts` (conta Roxou conectada à Meta).
3. Chama Business Discovery:
   `GET /v21.0/{ig_account_id}?fields=business_discovery.username({user}){username,name,biography,profile_picture_url,followers_count,media_count,website,media.limit(6){id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count}}`
4. Trata erros:
   - 24/sub-código 2207013 → `not_found`
   - código 100 c/ "private" → `private`
   - 10/200 → `no_permission`
   - outros → `error` + mensagem
5. Salva campos `instagram_*` + `instagram_raw_json` + `instagram_recent_posts`.
6. Chama Lovable AI (`google/gemini-2.5-flash`) com bio + 6 captions + tipo do parceiro → JSON estruturado:
   ```
   { summary, audience, vibe, tags[], category_guess, event_frequency, activity_score (0-100), best_day }
   ```
7. Grava em `aura_partner_summary`, `aura_partner_tags`, `aura_partner_score`, e o objeto completo em `aura_suggestions` (para revisão).
8. Não sobrescreve campos listados em `manual_locked_fields`.

### 3. Cron diário

Via `supabase--insert` (pg_cron + pg_net):
`0 4 * * *` chamando `partner-instagram-sync` com `{ cron: true, stale_hours: 24 }`.

### 4. Frontend Admin (`ParceirosList.tsx` + `ParceiroForm.tsx`)

**Lista**:
- Botão global "Sincronizar Instagram (todos)" — chama edge function `{ all: true }`, mostra toast com contagem.
- Auto-disparo silencioso ao abrir o admin (debounced) para parceiros com `instagram_last_sync_at` > 24h ou nulo.
- Badge por parceiro: "✨ Atualizado pela Aura" / "📷 IG sincronizado" / "⚠️ Precisa revisar" / "🔒 Sem permissão".

**ParceiroForm — nova seção "Instagram / Aura"**:
- Status da sincronização + última atualização (relativa).
- Preview: avatar IG, name, bio, seguidores, media_count, link IG.
- Grid de 6 últimos posts (thumb + permalink).
- Card "Sugestões da Aura": resumo, tags, score, categoria sugerida, melhor dia.
- Botões: "Sincronizar agora", "Aplicar sugestões" (move sugestões para campos finais respeitando `manual_locked_fields`), "Bloquear edição manual" (toggle por campo).
- Alerta de duplicidade: ao salvar Instagram, valida se outro parceiro já usa.

### 5. Frontend Público (`LocalDetail.tsx` / `V3LocalDetail.tsx`)

- Quando `instagram_profile_picture_url` existir, usa como logo (fallback para `logo_url`).
- Mostra `aura_partner_summary` em destaque com badge "✨ Atualizado pela Aura".
- `@instagram` clicável + contagem de seguidores formatada (`12.3K`).
- Seção "No Instagram" com últimos posts (`instagram_recent_posts`).

### 6. Visual

Mantém dark/neon Roxou: cards `bg-card border-border/40`, badges com `bg-primary/10 text-primary` e variantes (verde sync, amarelo revisar, vermelho sem permissão). Sem alterar UI pública existente além das novas seções opt-in.

### 7. Não toca em

OAuth Meta, Radar IA, `instagram-publish`, `automatic-event-hunter`, login, eventos.

### Arquivos

- **Migration** — adicionar colunas `partners` + índice único parcial.
- **Cron insert** (via `supabase--insert`).
- **Nova edge function** `supabase/functions/partner-instagram-sync/index.ts`.
- **`supabase/config.toml`** — registrar `verify_jwt = false`.
- **Novo componente** `src/components/admin/PartnerInstagramAura.tsx`.
- **Edita** `src/pages/admin/ParceirosList.tsx` (botão global + badges + auto-sync).
- **Edita** `src/pages/admin/ParceiroForm.tsx` (insere seção).
- **Edita** `src/pages/LocalDetail.tsx` e `src/pages/v3/V3LocalDetail.tsx` (visual público).

Ao aprovar, executo migration + insert do cron e implemento todo o resto na sequência.
