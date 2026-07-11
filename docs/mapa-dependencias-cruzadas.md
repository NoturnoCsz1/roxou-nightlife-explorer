# Mapa de Dependências Cruzadas

Somente-leitura. Estas dependências existem hoje e violam o princípio de isolamento por produto.

## 1. Público → Admin

Nenhuma direta detectada (bom). Mas `App.tsx` importa `AdminLayout` estaticamente, ampliando o grafo do bundle público.

## 2. Público → Partner

- `App.tsx` importa `PartnerPreviewLayout` e páginas `apps/partner/pages/*` para a rota `/admin/partner-preview` (importadas como lazy, mas o layout wrapper é estático).
- `App.tsx` importa `PartnerShortcutRedirect` do bundle público.
- Rotas de contrato Partner (`/bio/:slug`, `/vip/:listSlug`, `/reserva/*`, `/cliente/*`) usam componentes de `apps/partner/components/*` (ex.: `GuestNameDialog`, `PublicLinkQrDialog`).

## 3. Público → Transporte

- Rotas `/transportes/*`, `/motorista`, `/chat/:requestId`, `/meus-pedidos`, `/cadastro-motorista`, `/pedir-carona` estão no mesmo `BrowserRouter`.
- `services/transport.ts` importado por páginas públicas via `pages/v3/V3Transport*.tsx`.

## 4. Admin → Partner

- Rotas `/admin/partner-preview/*` renderizam `PartnerBetaLandingPage`, `PartnerDashboardPage`, `PartnerProfilePage`, `PartnerEventsPage`, `PartnerReservationsPage`, `PartnerVipListPage`, `PartnerAnalyticsPage`, `PartnerSettingsPage` (todas do `apps/partner`).
- `apps/admin/partnerPilot/*` e `apps/admin/partnerProCrm/*` importam serviços e tipos de `apps/partner/services/*`.

## 5. Partner → Público

- `apps/partner/App.tsx` importa `@/index.css` global (compartilhado com o público).
- `apps/partner/components/*` importam `@/components/ui/*`.
- `apps/partner/hooks/*` reutilizam `@/hooks/useAuth`, `useAdminProfile`, `useCustomerSession`.
- `apps/partner/services/*` importam `@/integrations/supabase/client` (aceitável — integração).

## 6. Partner → Admin

- Menor. Alguns arquivos importam `services/adminAuth` para validação de admin master.

## 7. Transporte → Público

- `pages/transportes/*` e `pages/v3/V3Transport*.tsx` usam `V3Layout` (público) — arrastam `BottomNav`, `DesktopNav`, `Footer`.
- `services/publicExcursoes.ts` é consumido tanto pelo produto Transporte quanto pelo público (evento → excursão).

## 8. Componentes shared com regra de negócio

| Componente | Consumidores | Deve pertencer a |
|---|---|---|
| `components/EventCard.tsx` | público, admin, partner | `modules/discovery/components/` + adapter |
| `components/FeaturedCarousel.tsx` | público (Home) | `modules/discovery/` |
| `components/PopularVenues.tsx` | público (Home), admin (dashboard) | `modules/discovery/` |
| `components/VenueList.tsx` | público | `modules/discovery/` |
| `components/SEO.tsx` | todos | `shared/` (é genuinamente shared) |
| `components/Footer.tsx` | público | `modules/discovery/layouts/` |
| `components/BottomNav.tsx`, `DesktopNav.tsx` | público (V3Layout) | `modules/discovery/layouts/` |
| `components/CategoryPills.tsx`, `DateFilterPills.tsx` | público (agenda) | `modules/discovery/` |
| `components/AdBanner.tsx` | público | `modules/discovery/` |
| `components/EventCountdown.tsx` | público (evento) | `modules/discovery/` |
| `components/TransmissionBlock.tsx` | público (jogos), admin (evento form) | `modules/discovery/sports/` + service |

## 9. Hooks shared com dependência de produto

| Hook | Produto real | Consumido também por |
|---|---|---|
| `useAuth` | shared/auth | admin, partner, público, transporte |
| `useAdminProfile` | admin | admin (correto) mas está em `src/hooks` |
| `useCustomerSession` | partner cliente-final | partner |
| `useV3Profile` | público | público |
| `useSavedEvents`, `useSavedPartners` | público | público |
| `useEventPresence`, `useEventLivePresence` | público (evento) | público, admin (dashboard alerts) |
| `usePartnerAwards` | partner + público | ambos |
| `usePageTracking` | shared | todos |
| `useIsDesktop`, `useMatchMeta`, `useFootballResults`, `useExpoCamarotes` | descobertas | público |

## 10. Chamadas Supabase diretas em componentes

Componentes com `supabase.from(` inline (violação do princípio "components não falam com DB"):

- `components/v3/CommunityConsentModal.tsx`
- `components/v3/ReportDialog.tsx`
- `components/admin/InstagramContentGenerator.tsx`
- `components/admin/AdminAIStrategy.tsx`
- `components/admin/DashboardAlerts.tsx`
- `components/admin/TopPartners.tsx`
- `components/admin/InstagramAgenda.tsx`
- `components/admin/TopEvents.tsx`
- `components/admin/InstagramCovers.tsx`
- `components/admin/PartnerInstagramAura.tsx`
- `components/admin/InstagramStudio.tsx`
- `components/jogos/FootballMatchChat.tsx`
- `components/search/GlobalSearchOverlay.tsx`

## 11. Edge Functions com múltiplas responsabilidades

- `supabase/functions/mcp/` — usa `list-events`, `list-partners`, `search-events` (misto Descobertas + Partner).
- `supabase/functions/eventou-scraper/` — Descobertas (ingestão de eventos) mas consumida pelo Admin.
- `supabase/functions/prudente-ai/` — IA pública compartilhada.
- `supabase/functions/aura-*` — Admin + Descobertas.
- `supabase/functions/instagram-*` — Admin + Partner.
- `supabase/functions/notify-drivers-new-ride/` — Transporte puro (isolamento OK).
- `supabase/functions/sitemap/` — Descobertas.

## 12. Ciclos potenciais

- `apps/partner/*` ↔ `components/ui/*` ↔ `hooks/*` (linear, sem ciclo, mas alto acoplamento).
- `apps/admin/eventos/form/` ↔ `lib/adminEventPayload.ts` ↔ `services/events.ts` ↔ `pages/v3/V3EventDetail.tsx` (público lê mesma tabela pela mesma service — mudança de payload afeta os dois).

## 13. Contratos que precisam ser formalizados

1. **Evento**: Descobertas lê; Partner/Admin escrevem. Contrato = `services/events.ts` + tipos.
2. **Reserva pública**: Partner escreve; Descobertas lê via link. Contrato = `services/publicReservations.ts`.
3. **VIP público**: Partner escreve; Descobertas lê via link. Contrato = `services/publicVipList.ts`.
4. **Bio pública**: Partner escreve; Descobertas renderiza. Contrato = `services/bio.ts`.
5. **Excursão pública**: Transporte escreve; Descobertas renderiza. Contrato = `services/publicExcursoes.ts`.
6. **Analytics**: todos escrevem; Admin lê. Contrato = `services/analytics.ts`.
