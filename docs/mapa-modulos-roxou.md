# Mapa de Módulos — Roxou

Classificação do código real do repositório por produto proprietário.
**Nenhum arquivo foi movido nesta fase.**

## Legenda

- **Produto atual**: onde o arquivo mora hoje.
- **Produto correto**: onde deveria morar após a modularização.
- **Risco de mover**: baixo | médio | alto | crítico.

## 1. Roxou Descobertas (público)

### Páginas (`src/pages/**`)

| Arquivo | Produto atual | Produto correto | Risco |
|---|---|---|---|
| `pages/Index.tsx`, `Hoje.tsx`, `Semana.tsx`, `Categorias.tsx`, `Indica.tsx` | pages | `modules/discovery/pages/` | médio (SEO) |
| `pages/EventDetail.tsx`, `LocalDetail.tsx`, `LocalEventos.tsx` | pages | `modules/discovery/pages/` | alto (SEO + JSON-LD) |
| `pages/BarDoMes.tsx`, `SEOLanding.tsx` | pages | `modules/discovery/seo/` | alto (rotas indexadas) |
| `pages/Jogos.tsx`, `JogoDetail.tsx`, `TabelaCampeonato.tsx`, `Resultados.tsx`, `CopaDoMundo2026.tsx` | pages | `modules/discovery/sports/` | baixo |
| `pages/Salvos.tsx`, `PertoDeMim.tsx`, `Contato.tsx`, `RemoverDados.tsx` | pages | `modules/discovery/` | baixo |
| `pages/Expo2026.tsx`, `pages/expo2026/*` | pages | `modules/discovery/expo/` | médio |
| `pages/v3/V3{Home,Discover,Agenda,EventDetail,LocalDetail,Profile,Community,Economize,AIChat,Sobre,Contato,Rankings,Parceiros,Terms,Privacy,Auth}.tsx` | pages/v3 | `modules/discovery/` | crítico (é o app público real) |

### Componentes públicos com regra de negócio

`components/EventCard.tsx`, `FeaturedCarousel.tsx`, `PopularVenues.tsx`, `VenueList.tsx`, `CategoryPills.tsx`, `DateFilterPills.tsx`, `EventCountdown.tsx`, `AdBanner.tsx`, `TransmissionBlock.tsx`, `SEO.tsx`, `BottomNav.tsx`, `DesktopNav.tsx`, `Footer.tsx`, `NavLink.tsx`, `search/*`, `expo/*`, `jogos/*`, `season/*`, `v3/*`.

**Destino sugerido:** `modules/discovery/components/`. Componentes verdadeiramente atômicos (spinners, cards genéricos) descem para `shared/components/`.

### Services

`services/events.ts`, `services/partners.ts`, `services/analytics.ts`, `services/bio.ts` (público), `services/publicExcursoes.ts`, `services/publicReservations.ts`, `services/publicVipList.ts`.

## 2. Partner Pro

### Núcleo (`src/apps/partner/**`)

Já isolado fisicamente. Sub-pastas:
`pages/`, `components/`, `hooks/`, `services/`, `contexts/`, `layouts/`, `routes/`, `analytics/`, `bio/`, `lib/`, `styles/`, `types/`, `config/`, `main.tsx`, `App.tsx`.

**Problema:** importa `@/components/ui/*`, `@/hooks/*`, `@/integrations/supabase/*`, `@/lib/*` — todos compartilhados com o público.

### Admin de Partner que ainda vive no Roxou

- `src/apps/admin/partnerPilot/`, `src/apps/admin/partnerProCrm/` → `modules/partner/admin/`.
- `src/pages/admin/AdminBiosPage.tsx` → `modules/partner/admin/bios/`.
- Rotas `/admin/partner-preview/*` → devem ser removidas do bundle público e servidas pelo bundle Partner com role admin.

### Páginas públicas de contrato Partner

`pages/PublicVipList.tsx`, `PublicVipListSuccess.tsx`, `PublicReservation.tsx`, `PublicReservationSuccess.tsx`, `pages/bio/*`, `pages/customer/*`.

**Destino:** `modules/partner/public/` — buildadas no bundle público via contrato somente-leitura (services) para preservar SEO/URLs.

## 3. Transporte Roxou

### Páginas

`src/pages/transportes/*` (Acompanhar, ExcursaoAssentos, ExcursaoConfirmacao, ExcursaoDetail, ExcursaoPassageiro, ExcursoesList, MinhasViagens, MotoristaHub, PrivativoPlaceholder, TransportesComingSoon).
`src/pages/v3/V3{Transport,RideRequest,DriverBoard,MyRides,Chat}.tsx`.
`src/pages/CadastroMotorista.tsx`.

### Services

`services/transport.ts`, `services/excursionGps.ts`, `services/publicExcursoes.ts` (contrato público).
`lib/rideTimeRules.ts`, `lib/driverValidation.ts`, `lib/analyticsExcursoes.ts`.

### Componentes

`components/transportes/*`, `components/maps/*` (integração Google), `PedirCaronaGate.tsx`.

**Destino sugerido:** `modules/transporte/{passenger,driver,excursions,privativo,fleet,maps,admin}/`.

## 4. Admin Roxou (interno)

`src/apps/admin/{pages,eventos,estabelecimentos,partnerPilot,partnerProCrm}/`,
`src/pages/admin/AdminBiosPage.tsx`,
`src/config/adminNavigation.ts`,
`src/hooks/useAdminProfile.ts`,
`src/services/adminAuth.ts`, `crm.ts`, `crm360.ts`, `crmSync.ts`, `aura.ts`, `instagram.ts`.

**Destino sugerido:** `modules/admin/` (novo módulo raiz, separado dos 3 produtos-fim).

## 5. Shared (verdadeiro)

Após auditoria, apenas estes qualificam como shared genuíno:

- `src/components/ui/*` (shadcn).
- `src/lib/utils.ts`, `dateUtils.ts`, `analytics.ts` (ga), `authHelpers.ts`.
- `src/shared/**` (já criado corretamente).
- `src/integrations/supabase/{client,types}.ts` (auto-gerado).
- `src/hooks/use-toast.ts`.

**Não são shared:** `EventCard`, `PopularVenues`, `SEO`, `Footer`, `BottomNav` — carregam regra de negócio Descobertas.

## 6. Integrações

- `src/integrations/supabase/` — client (público, auto-gen).
- `src/integrations/lovable/` — Lovable Auth.
- `src/integrations/google-maps/` — vazio (README).
- `src/integrations/payments/` — vazio (README).
- Google Places/Routes hoje em `supabase/functions/{maps-key,geocode-address}` + `components/maps/*`.

## 7. Legado identificado

Não excluir agora. Candidatos:

- `src/pages/{Hoje,Semana,Categorias,Indica,Salvos,LocalDetail,LocalEventos,EventDetail}.tsx` — substituídos pelas versões V3, ainda referenciados por `/archive/legacy-v2/*`.
- `src/pages/JogoDetail.tsx` vs `src/apps/games/` (vazio, só README).
- `vite.config.ts.backup`.
- `src/apps/public/`, `src/apps/transport/`, `src/apps/games/` — só READMEs (fase 06/09).
- `src/modules/{portal,partner,transporte,motorista}/` — só READMEs (etapa 0 do plano de refatoração).
- `src/data/events.ts` — provável dado mock legado.
