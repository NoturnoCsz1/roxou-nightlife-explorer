# Fase 2 — Camada `services/` (aditiva)

## Princípio
**Aditivo**: nenhum consumidor existente foi migrado. Páginas continuam
fazendo suas queries inline. A migração de callsites virá nas Fases 3+ junto
com a quebra dos megafiles. Isso garante zero impacto comportamental.

## Módulos criados

| Arquivo | LOC | Domínio | Tabelas Supabase |
|---|---:|---|---|
| `src/services/events.ts`      | 80 | CRUD e feeds de eventos | `events` |
| `src/services/partners.ts`    | 55 | Parceiros públicos e admin | `partners`, `public_partners` |
| `src/services/instagram.ts`   | 45 | Contas e posts IG | `instagram_accounts`, `instagram_posts` |
| `src/services/transport.ts`   | 40 | Carona/motorista | `ride_requests`, `ride_offers` |
| `src/services/analytics.ts`   | 38 | Telemetria | `analytics_events`, `page_views` |
| `src/services/aura.ts`        | 24 | Alertas e fila autoreels | `aura_alerts`, `auto_reels_queue` |
| `src/services/adminAuth.ts`   |  6 | Re-export do helper | — |
| `src/lib/adminFetch.ts`       | 32 | `getAdminAuthHeaders()` centralizado | — |

Todos abaixo do teto de 300 LOC fixado para services.

## Decisões técnicas

- **Tipagem deliberadamente fraca (`Record<string, any>`)** nesta fase. A tipagem forte virá no Fase 3 com a introdução de `src/types/db.ts` re-exportando de `integrations/supabase/types.ts`. Para não poluir o lint, cada arquivo recebeu um `eslint-disable` file-level **justificado por comentário**.
- Schema real conferido em 15/06/2026:
  - `events`: coluna de data é `date_time`, estado é `status` (valores incluem `'published'`).
  - `aura_alerts`: não há `status`; "aberto" = `resolved_at IS NULL`.
  - `instagram_posts`: sem `handle`; vínculo com conta via `instagram_account_id`.
- `fetchAllRows` é usado quando a consulta pode passar de 1000 linhas (regra do projeto).
- Datas: usar **somente** helpers de `@/lib/dateUtils`. `getStartOfTodaySP()` já retorna ISO string, não Date.
- `lib/adminFetch.ts` centraliza o padrão hoje replicado em `InstagramAdmin.tsx`, com erro tipado `AdminSessionExpiredError`. Nenhum callsite foi migrado.

## API pública dos services (resumo)

```ts
// events
getEventBySlug(slug): EventRow | null
listUpcomingPublishedEvents({ city?, limit? }): EventRow[]
listEventsAll({ status?, city? }): EventRow[]
upsertEvent(payload): EventRow
deleteEvent(id): void

// partners
getPublicPartnerBySlug(slug)
listPublicPartners({ city?, type?, limit? })
listAllPartnersAdmin()
getPartnerById(id)

// instagram
listInstagramAccounts()
listRecentInstagramPosts(limit?)
listPostsByAccountId(accountId, limit?)

// transport
getRideRequestById(id)
listMyRideRequests(userId)
listOpenRideOffersForDriver(driverId)

// analytics
listAnalyticsEventsSince(sinceISO)
countAnalyticsEventsSince(sinceISO)
countPageViewsSince(sinceISO)

// aura
listOpenAuraAlerts(limit?)
listAutoReelsQueue(limit?)

// adminAuth
getAdminAuthHeaders(): Promise<HeadersInit>
```

## Lint
`npx eslint src/services src/lib/adminFetch.ts` → **0 erros, 0 warnings**.

## Build
Não há mudança em consumidores, e as importações usam apenas `@/integrations/supabase/client` e `@/lib/*` já existentes. Build é executado automaticamente pela harness Lovable após cada edição.

## Checkpoint
Snapshot via History tab antes da Fase 3. Rollback: apagar `src/services/`, `src/lib/adminFetch.ts` e os 8 arquivos criados.
