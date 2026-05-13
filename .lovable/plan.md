# Plano — Evolução `/jogos` (SEO + Retenção + Baixo custo)

Sem refatorar layout, sem IA pesada, sem quebrar timezone. Reaproveita `MatchCard`, `FootballMatchChat`, `MatchVenuesQuickList`.

---

## Fase 1 — Schema (1 migration única)

### Tabela `sports_matches` (cache curado dos jogos da TheSportsDB)
- `external_id` (unique), `slug` (unique, indexado), `home_team`, `away_team`, `home_badge`, `away_badge`
- `match_time` (timestamptz), `league_id`, `league_label`, `category`, `is_world_cup`, `priority`, `status`
- `views_count` (int default 0), `chat_count` (int default 0), `last_synced_at`
- RLS: SELECT público; INSERT/UPDATE/DELETE só admin (`has_role`)

### Tabela `sports_match_venues` (vínculo real jogo↔bar)
- `match_id` → sports_matches, `partner_id` → partners
- `transmission_type` (`tv_aberta` | `tv_fechada` | `streaming` | `telao` | `ambiente`)
- `confirmed_by_admin` bool, `created_by` uuid, `created_at`
- UNIQUE(match_id, partner_id); RLS: SELECT público, escrita admin

### Tabela `sports_match_streams` (embeds oficiais)
- `match_id`, `stream_url`, `stream_type` (`youtube`|`twitch`|`cazetv`|`fifa`|`conmebol`), `is_official` bool, `is_active` bool, `created_by`
- RLS: SELECT público com `is_active=true`, escrita admin

### Tabela `sports_match_events` (tracking leve)
- `match_external_id` text (não FK, evita lock), `action` text (`open`|`venue_click`|`stream_click`|`save`|`share`|`chat_open`)
- `partner_id` nullable, `session_id`, `created_at`
- RLS: INSERT público (anon+auth); SELECT só admin

Sem triggers pesados. Counters atualizados em RPC `increment_match_view(slug)` chamada no detalhe.

---

## Fase 2 — Sync da TheSportsDB → `sports_matches`

Edge function `sync-football-matches` (cron 6h):
- Busca ligas configuradas (já existe em `theSportsDb.ts`)
- Upsert por `external_id`, gera `slug` no formato `time-x-time-DD-MM-YYYY` (kebab, NFD)
- Não toca em jogos finalizados >7d

`getFeaturedFootballEvents()` passa a ler do Supabase (rápido, sem CORS, sem dependência externa em runtime). Fallback: API direta se vazio.

---

## Fase 3 — Páginas de jogo SEO-first

`/jogo/:slug` (já existe — só upgrade):
- React Helmet por rota — title `"{Home} x {Away} em Presidente Prudente — Onde assistir | Roxou"`, description com data/hora SP + bares
- canonical `https://roxou.com.br/jogo/{slug}`, OpenGraph + Twitter card
- JSON-LD `SportsEvent` + `BreadcrumbList` + `FAQPage`
- **Bloco "Assista agora"**: se há `sports_match_streams` ativo → embed (YouTube/Twitch); senão "Sem transmissão oficial disponível"
- **Bloco "Onde assistir"**: lista REAL de `sports_match_venues` (não mais bares fixos)
- **SEO content block** (template, sem IA): parágrafo gerado via string template com nome dos times, data, cidade, contagem de bares
- Mantém `FootballMatchChat`

---

## Fase 4 — `/jogos` enriquecida (sem refazer layout)

Adições mínimas ao `Jogos.tsx`:
- **Hero KPIs ao vivo**: pequena strip abaixo do hero — `🔴 X ao vivo · 🍻 Y bares transmitindo hoje · 💬 Z mensagens na última hora` (1 query agregada)
- **Badges no `MatchCard`** (componente existente):
  - `🔴 AO VIVO` se status=live
  - `🍻 N bares` se houver vínculo em `sports_match_venues`
  - `📺 Transmissão` se houver stream oficial
  - `💬 Chat ativo` se houver mensagem nas últimas 30min
- **"Mais buscados" dinâmico**: ranking por `views_count + chat_count + saves` dos últimos 7d em vez de lista fixa

---

## Fase 5 — Admin `/admin/jogos`

Página simples (linka no `adminNavigation.ts`):
- Lista jogos próximos 14d com filtro por liga/dia
- Por jogo: multiselect de partners (cidade=Prudente, type=bar/restaurante/boteco/pub) + tipo de transmissão
- Inputs para adicionar streams oficiais (URL + tipo)
- Botão "Sincronizar agora" → invoca `sync-football-matches`

Sem editor de jogo (dados vêm da API). Apenas curadoria de bares e streams.

---

## Fase 6 — Tracking

Hook `useTrackMatchEvent(matchSlug)`:
- Insere em `sports_match_events` (debounced)
- Disparado em: abertura do detalhe, clique em bar, clique em stream, save, share, abrir chat
- 1 RPC `increment_match_view(slug)` no mount do detalhe (counter direto, sem rodar agregação)

---

## Fase 7 — Performance

- `React.memo` no `MatchCard` e `PriorityMatchBlock`
- `loading="lazy"` já presente nos badges; manter
- `useQuery` com `staleTime` 10min (já existe) + `refetchOnWindowFocus: false` para bares vinculados
- Lazy-load do bloco de chat com `Suspense`
- Filtro `semana` migra para helpers `dateUtils` SP (Core rule)

---

## Fora de escopo (mantém para depois)
- Câmera ao vivo no bar (só schema preparado em `transmission_type='ambiente'`)
- Dashboard analytics dedicado de jogos (dados já existem em `sports_match_events` para futura página)

---

## Detalhes técnicos

**Stack tocada:** Supabase (3 tabelas + 1 RPC), 1 edge function (`sync-football-matches`), `src/lib/theSportsDb.ts` (passa a ler do DB), `src/pages/Jogos.tsx` (badges + KPI strip), `src/pages/JogoDetail.tsx` (Helmet + JSON-LD + streams + venues reais), `src/components/jogos/MatchCard.tsx` (badges), `src/pages/admin/JogosAdmin.tsx` (novo), `src/config/adminNavigation.ts` (entry).

**Custo:** zero IA. 1 cron 6h. Tracking é INSERT plano. Counters via RPC simples.

**Impacto SEO:** N páginas indexáveis novas (uma por jogo), JSON-LD SportsEvent, keywords locais ("onde assistir X em Prudente"), canonical correto, OG por jogo.

**Impacto retenção:** chat visível, transmissão oficial, vínculo real com bares, "mais buscados" verdadeiro.

---

Aprova esse plano para eu começar pela migration + edge function de sync?
