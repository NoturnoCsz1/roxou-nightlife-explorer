# 📊 Roxou — Plano de Analytics Reais

> Documento de planejamento. **Nada será implementado nesta etapa.** Sem migrations, sem mudanças de código.

---

## 1. Estado atual (o que já existe)

### Tabelas no Supabase
| Tabela | Uso atual | Cobre o quê |
|---|---|---|
| `page_views` | Insert em todo `usePageTracking` | path, device, session, event_id, partner_id, geo |
| `visitor_sessions` | Upsert por sessão | session_id, last_seen, device, geo |
| `ticket_clicks` | Insert ao clicar em ingresso | event_id, created_at |
| `saved_events` | RLS user-scoped | salvamentos (proxy de engajamento) |
| `ai_chat_messages` | Mensagens da Aura | proxy de "perguntar para Aura" |
| `ai_partner_recommendations` | Quando Aura recomenda parceiro | reco logs |

### Helpers / hooks
- `src/hooks/usePageTracking.ts` — grava `page_views` + `visitor_sessions` + GA4
- `src/lib/ga.ts` — `gaEvent`, `trackEventClick`, `trackPartnerClick`, `trackPageView`
- Consumidores admin: `Dashboard`, `AnalyticsHero`, `TopEvents`, `TopPartners`, `MostViewedNews`, `PopularVenues`

### Lacunas identificadas
- ❌ Não há tabela genérica de **eventos de ação** (clique em "Como vou", "Salvar", "Ingresso", "Aura", "WhatsApp", "Instagram")
- ❌ `ticket_clicks` é específica e não escala para outros CTAs
- ❌ Não há `referrer` nem `source_page` separado de `page_path`
- ❌ Sem `category` / `city` denormalizados → consultas top-N exigem JOIN custoso
- ❌ Sem agregação diária → dashboards recalculam tudo a cada load
- ❌ Sem `user_id` opcional em `page_views` (só session)

---

## 2. Estrutura proposta (ainda não aplicada)

### 2.1 `analytics_events` — tabela única de eventos de produto

```sql
-- PROPOSTA — não executar agora
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,           -- ver enum abaixo
  event_id uuid null,                  -- FK lógica events.id
  venue_id uuid null,                  -- FK lógica partners.id
  user_id uuid null,                   -- auth.uid() quando logado
  session_id text null,                -- mesmo sessionStorage atual
  source_page text null,               -- pathname onde ocorreu
  referrer text null,                  -- document.referrer
  device_type text null,               -- mobile|tablet|desktop
  city text null,                      -- denormalizado do evento/local
  category text null,                  -- denormalizado do evento
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_ae_type_created on public.analytics_events (event_type, created_at desc);
create index idx_ae_event_id on public.analytics_events (event_id) where event_id is not null;
create index idx_ae_venue_id on public.analytics_events (venue_id) where venue_id is not null;
create index idx_ae_session on public.analytics_events (session_id, event_type);
create index idx_ae_metadata_gin on public.analytics_events using gin (metadata);

alter table public.analytics_events enable row level security;

-- INSERT público (anon + authenticated): coleta sem login
create policy "Anyone can insert analytics" on public.analytics_events
  for insert to anon, authenticated with check (true);

-- SELECT só admin (via has_role) para evitar exposição de dados
create policy "Admins read analytics" on public.analytics_events
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
```

#### Enum lógico de `event_type`
| event_type | Onde dispara | Contexto |
|---|---|---|
| `event_view` | abrir `/evento/:slug` | event_id |
| `venue_view` | abrir `/local/:slug` | venue_id |
| `event_click` | card → detalhe | event_id, source_page |
| `venue_click` | card → detalhe | venue_id |
| `como_vou_click` | botão "Como vou?" | event_id |
| `save_event` | salvar agenda | event_id, user_id |
| `unsave_event` | dessalvar | event_id, user_id |
| `ticket_click` | botão "Ingresso" | event_id, metadata.url |
| `aura_open` | abrir chat IA | source_page |
| `aura_ask` | enviar pergunta | metadata.prompt_len |
| `whatsapp_click` | WA do parceiro/evento | event_id ou venue_id |
| `instagram_click` | IG do parceiro/evento | event_id ou venue_id |
| `share_click` | botão compartilhar | event_id, metadata.channel |
| `calendar_click` | baixar .ics | event_id |
| `maps_click` | abrir Google Maps | event_id ou venue_id |

### 2.2 `analytics_daily_summary` — pré-agregado

```sql
-- PROPOSTA
create table public.analytics_daily_summary (
  id uuid primary key default gen_random_uuid(),
  summary_date date not null,           -- em America/Sao_Paulo
  event_id uuid null,
  venue_id uuid null,
  views integer not null default 0,
  clicks integer not null default 0,
  saves integer not null default 0,
  ticket_clicks integer not null default 0,
  como_vou_clicks integer not null default 0,
  aura_clicks integer not null default 0,
  whatsapp_clicks integer not null default 0,
  instagram_clicks integer not null default 0,
  unique_sessions integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (summary_date, event_id, venue_id)
);

create index idx_ads_date on public.analytics_daily_summary (summary_date desc);
alter table public.analytics_daily_summary enable row level security;
create policy "Admins read summary" on public.analytics_daily_summary
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
```

Atualizado por **edge function cron** (1×/hora) ou job noturno em horário SP. **Não usar trigger** em `analytics_events` (custo de write).

---

## 3. Helper de coleta — assinatura proposta

> Implementação adiada. Esta é a contract API.

```ts
// src/lib/analytics.ts (FUTURO)
type AnalyticsEventType =
  | "event_view" | "venue_view" | "event_click" | "venue_click"
  | "como_vou_click" | "save_event" | "unsave_event" | "ticket_click"
  | "aura_open" | "aura_ask" | "whatsapp_click" | "instagram_click"
  | "share_click" | "calendar_click" | "maps_click";

interface TrackArgs {
  event_type: AnalyticsEventType;
  event_id?: string | null;
  venue_id?: string | null;
  source_page?: string;
  metadata?: Record<string, any>;
}

export async function trackEvent(args: TrackArgs): Promise<void>;
```

### Garantias obrigatórias
- ✅ **Nunca bloqueia render** — fire-and-forget (`void`)
- ✅ **try/catch absoluto** — falha do Supabase nunca propaga
- ✅ **Debounce** views por `(event_type, event_id, session_id)` em 5min via `sessionStorage`
- ✅ **Auto-fill**: `session_id` (existente em `usePageTracking`), `device_type`, `referrer`, `source_page = location.pathname`, `user_id = auth.uid()` se logado
- ✅ **GA4 espelhado**: chamar `gaEvent` em paralelo (já existe)
- ✅ **Timezone**: server usa `now()`, agregação converte para `America/Sao_Paulo` na query

---

## 4. Dashboard admin — métricas planejadas

| Painel | Query base |
|---|---|
| Top 10 eventos da semana | `analytics_daily_summary` GROUP BY event_id ORDER BY views DESC |
| Top 10 locais do mês | idem para venue_id |
| CTR de "Como vou" por evento | `como_vou_clicks / views` |
| Cliques por CTA | COUNT por event_type, série temporal |
| Categorias mais fortes | GROUP BY category sobre `analytics_events` |
| Heatmap dia × hora | `date_trunc('hour', created_at AT TIME ZONE 'America/Sao_Paulo')` |
| Origem de tráfego | GROUP BY referrer host (top domains) |
| Comparação MoM | `summary_date` mês atual vs anterior |
| Funil evento | `event_view → como_vou_click → save_event → ticket_click` |
| Aura engagement | `aura_open / page_views` por dia |

Reuso de componentes existentes: `AnalyticsHero`, `TopEvents`, `TopPartners`, `MetricCard`. **Sem alteração de layout público.**

---

## 5. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Volume de inserts saturando Supabase | Debounce client + tabela com índices enxutos + agregação diária |
| Privacidade (LGPD) | `user_id` opcional, IP não armazenado, declarar em política de privacidade |
| RLS vazando dados | INSERT público, SELECT só admin via `has_role` |
| Quebrar UI existente | Helper isolado em `src/lib/analytics.ts`, integração CTA-a-CTA em PRs separados |
| Dupla contagem GA4 vs interno | Manter ambos: GA4 = dashboards públicos, interno = ranking de eventos/locais |
| Custos de query | Tabela summary pré-agregada, índices parciais, retenção 90d em `analytics_events` |
| Timezone errado | Helpers `@/lib/dateUtils`, summary calculado em `at time zone 'America/Sao_Paulo'` |

---

## 6. Próxima etapa recomendada (em ordem)

1. **PR-1 — Migration isolada**: criar `analytics_events` + `analytics_daily_summary` + RLS. Sem código de app.
2. **PR-2 — Helper**: `src/lib/analytics.ts` com `trackEvent`, debounce, error swallow. Sem callers ainda.
3. **PR-3 — Integração progressiva**: instrumentar 1 CTA por PR (`event_view` → `ticket_click` → `como_vou_click` → ...). Cada PR validado com checklist de regressão.
4. **PR-4 — Edge function de agregação**: cron horário recalcula `analytics_daily_summary` últimas 48h.
5. **PR-5 — Dashboard**: novos cards no admin consumindo `analytics_daily_summary`.
6. **Migrar `ticket_clicks`**: backfill para `analytics_events` (event_type='ticket_click') depois deprecar.

---

## 7. Confirmações

- ✅ Nenhum código funcional foi alterado nesta etapa
- ✅ Nenhuma migration foi aplicada
- ✅ Home, IA, Transporte, Auth, layout público intactos
- ✅ Timezone `America/Sao_Paulo` preservada (todas agregações usarão `at time zone`)
- ✅ Apenas documento de planejamento criado: `docs/ROXOU_ANALYTICS_PLAN.md`
