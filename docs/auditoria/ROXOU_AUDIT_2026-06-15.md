# Auditoria 100% — Plataforma Roxou

**Data:** 15/06/2026  
**Escopo:** Mapeamento completo, sem alteração de código, arquivos, migrations ou refatorações.  
**Objetivo:** Base para refatoração, modularização, parceiro.roxou.com.br, Roxou Partner Pro, reservas, lista VIP e performance.

---

## 1. Stack & Build

- **Front:** React 18.3, Vite 5, TypeScript 5, Tailwind 3, shadcn/ui (49 componentes).
- **Estado/dados:** @tanstack/react-query 5, react-hook-form 7 + zod (`@hookform/resolvers`).
- **Roteamento:** react-router-dom 6.30 (BrowserRouter).
- **Backend:** Lovable Cloud (Supabase) — `@supabase/supabase-js` 2.98.
- **Auth gateway:** `@lovable.dev/cloud-auth-js` 1.1.
- **Mapas:** leaflet + react-leaflet 4.2 + heat + markercluster.
- **PWA:** vite-plugin-pwa.
- **Mídia/Exportação:** jszip, dompurify, react-markdown + remark-gfm.
- **Charts:** recharts 2.15.
- **Datas:** date-fns 3.6 (com camada própria em `src/lib/dateUtils.ts` para SP).
- **Testes:** vitest + @playwright/test.
- **Scripts:** `prebuild` gera sitemap (`scripts/generate-sitemap.ts`).
- **Total código auditável (sem `ui/` e `test/`):** 229 arquivos TS/TSX.
- **Total `components/ui/`:** 49 arquivos shadcn.

---

## 2. Inventário de Rotas (`src/App.tsx`)

### 2.1 Admin (`/admin/*`, AdminLayout + AdminMaintenanceGate)

| Rota | Página |
|------|--------|
| `/admin/central` (`/admin/login` redir) | `AdminLogin` |
| `/admin/dashboard` | `Dashboard` |
| `/admin/parceiros` `/novo` `/:id/editar` | `ParceirosList`, `ParceiroForm` |
| `/admin/estabelecimentos` | `EstabelecimentosAudit` |
| `/admin/eventos` `/novo` `/novo/lote` `/:id/editar` | `EventosList`, `EventoForm`, `EventoBulkForm` |
| `/admin/sugestoes` | `Sugestoes` |
| `/admin/eventou` | `EventouAdmin` |
| `/admin/instagram` | `InstagramAdmin` |
| `/admin/radar-ia` | `RadarIA` |
| `/admin/autoreels` | `AutoReels` |
| `/admin/security` | `AdminSecurity` |
| `/admin/aura` | `AuraCommand` |
| `/admin/jogos` | `JogosAdmin` |
| `/admin/editores` | `Editores` |
| `/admin/noticias` `/novo` `/:id/editar` | `NoticiasList`, `NoticiaForm` |
| `/admin/premiacoes` | `Premiacoes` |
| `/admin/artes` | `Artes` |
| `/admin/story-agenda` | `StoryAgendaDoDia` |

### 2.2 Público V3 (`/`, V3Layout)

`V3Home` (index), `descobrir`, `agenda`, `perfil`, `perfil/editar`, `evento/:slug`, `local/:slug`,
`transporte`, `motorista`, `chat/:requestId`, `meus-pedidos`, `terms`, `privacy`, `terms-acceptance`,
`economize`, `ia`, `sobre`, `contato`, `perto-de-mim`, `rankings`, `comunidade`,
`jogos`, `copa-do-mundo-2026`, `jogo/:slug`, `auth`.

### 2.3 Públicas fora do V3Layout

`/auth`, `/seguranca/revisao`, `/contato`, `/noticias`, `/noticia/:slug`, `/manutencao`,
`/remover-dados`, `/cadastro-motorista`, `/pedir-carona` (gate), `/parceiros`,
`/resultados`, `/tabela/:slug`.

### 2.4 Redirects / Legacy

`/expo2026*`, `/expoprudente*`, `/v3*` → `/`. Subárvore `/archive/legacy-v2/*` (LegacyArchiveLayout).

---

## 3. Páginas (`src/pages/`)

### 3.1 Público (`src/pages/`)
BarDoMes · CadastroMotorista · Categorias · Contato · CopaDoMundo2026 · EventDetail · Hoje · Index · Indica ·
JogoDetail · Jogos · LocalDetail · LocalEventos · Maintenance · NotFound · PertoDeMim · RemoverDados ·
Resultados · RoxouNoticia · RoxouNoticias · SEOLanding · Salvos · SegurancaRevisao · Semana · TabelaCampeonato.

### 3.2 Admin (`src/pages/admin/`) — 23 páginas

AdminLogin · AdminSecurity · Artes · AuraCommand · AutoReels · Dashboard · Editores ·
EstabelecimentosAudit · EventoBulkForm · EventoForm · EventosList · EventouAdmin · InstagramAdmin ·
InstagramDetected · JogosAdmin · NoticiaForm · NoticiasList · ParceiroForm · ParceirosList ·
Premiacoes · RadarIA · StoryAgendaDoDia · Sugestoes.

### 3.3 V3 (`src/pages/v3/`) — 23 páginas

V3AIChat · V3Agenda · V3Auth · V3Chat · V3Community · V3Contato · V3Discover · V3DriverBoard ·
V3Economize · V3EventDetail · V3Home · V3LocalDetail · V3MyRides · V3Parceiros · V3Privacy ·
V3Profile · V3ProfileEdit · V3Rankings · V3RideRequest · V3Sobre · V3Terms · V3TermsAcceptance ·
V3Transport.

### 3.4 Top 10 arquivos por LOC (candidatos a quebra)

| LOC | Arquivo |
|----:|---------|
| 2445 | `pages/v3/V3Home.tsx` |
| 1767 | `pages/admin/EventoBulkForm.tsx` |
| 1610 | `pages/admin/RadarIA.tsx` |
| 1557 | `pages/admin/EstabelecimentosAudit.tsx` |
| 1441 | `lib/coverRenderer.ts` |
| 1256 | `pages/admin/EventosList.tsx` |
| 1093 | `components/admin/InstagramStudio.tsx` |
| 1051 | `pages/admin/EventoForm.tsx` |
|  990 | `pages/Jogos.tsx` |
|  986 | `pages/admin/JogosAdmin.tsx` |

---

## 4. Componentes (`src/components/`)

- **Raiz (21):** AdBanner, AdminMaintenanceGate, AuraBadge, BottomNav, CategoryPills, ContactForm,
  DateFilterPills, DesktopNav, EventCard, EventCountdown, FeaturedCarousel, Footer,
  LegacyArchiveLayout, NavLink, PedirCaronaGate, PopularVenues, SEO, SafeHtml,
  SectionHeader, TransmissionBlock, VenueList.
- **admin/ (25):** AIConfidenceBadges, AdminAIStrategy, AdminLayout, AnalyticsHero, AuraCreateEventModal,
  DashboardAlerts, DateTimePickerSP, EventFormBlock, EventImageGenerator, EventSearchFilter,
  FormatToggle, ImageUpload, ImportDebugPanel, InstagramAgenda, InstagramContentGenerator,
  InstagramCovers, InstagramImportModal, InstagramStudio, MetricCard, PartnerInstagramAura,
  PeriodFilter, ReelGenerator, TopEvents, TopPartners, TransmissionSection.
- **v3/ (22):** AIHomeWidget, AuraAvatar, CategoryChips, CommunityConsentModal, ContentRail,
  EventCardV3, EventLivePresence, EventPresence, HeroCard, ImageCropModal, LegalDisclaimer,
  PlacesAutocomplete, PullToRefresh, ReportDialog, ReservationDrawer, SmartImage,
  TransportCTA, V3Layout, V3SearchBar, V3Skeletons, V3VibeChips, VIPPaywallModal +
  subpastas `home/`, `local/`.
- **jogos/ (9):** FootballMatchChat, HomeJogosCard, LeagueTable, MatchCard, MatchVenuesInline,
  MatchVenuesQuickList, NextMatchesByLeague, OtherLeaguesAccordion, ResultMatchCard.
- **maps/ (5):** LazyVenueMap, RoxouEventsHeatmap, RoxouNearbyEventsMap, RoxouRideMap, RoxouVenueMap.
- **partners/ (2):** PartnerLogo, SpotlightBadge.
- **season/ (2):** WorldCupBadge, WorldCupRibbon.
- **ui/ (49):** shadcn — não modificar.

---

## 5. Hooks (`src/hooks/`)

useAuth · useAdminProfile · useV3Profile · usePageTracking · use-mobile · use-toast ·
useEventLivePresence · useEventPresence · useFootballResults · useMatchMeta ·
usePartnerAwards · useSavedEvents · useSavedPartners · useScrollFadeIn.

---

## 6. Libs (`src/lib/`) — 36 módulos

**Dados/Supabase:** `supabaseFetchAll` (bypass 1k linhas), `analytics`, `ga`, `utm`.  
**Datas/Timezone:** `dateUtils` (helpers SP — obrigatório), `calendarUtils`.  
**Eventos:** `adminEventPayload`, `eventDuplicateDetector`, `eventDuplicateValidator`,
`eventIngestionGuard`, `titleCleaner`, `categoryConfig`, `marketingCopy`.  
**Parceiros:** `partnerDescription`.  
**Aura:** `auraVenueInsights`, `auraVenuePricing`, `auraVenueRankings`.  
**Radar/IA:** `radarPostClassifier`.  
**Instagram:** `instagramHandle`, `instagramPostFilters`.  
**Esportes:** `theSportsDb`, `sportsTransmission`, `matchTracking`.  
**Mapas/Geo:** `geoUtils`, `imageHash`, `imageOptimizer`.  
**Transporte:** `rideTimeRules`, `driverValidation`.  
**Mídia:** `coverRenderer` (1441 LOC), `downloadEventsZip`, `dashboardExport`, `dashboardPeriod`.  
**V3:** `v3Validation`, `economizeScore`.  
**Utilitários:** `utils`, `sanitize`.

**Sem pasta `src/services/` nem `src/types/`.**  
**Config:** apenas `src/config/adminNavigation.ts`.

---

## 7. Banco de Dados — Tabelas `public` (61) + RLS ativo em 100%

Todas as tabelas listadas têm `rowsecurity=true`.

### 7.1 Auth & Usuários
admin_profiles · profiles · user_roles · user_risk_scores · launch_signups · vip_subscriptions ·
saved_events · saved_partners · affiliate_referrals.

### 7.2 Conteúdo Roxou
events · partners · public_partners · partner_awards · partner_radar_memory ·
roxou_news · expo_news · roxou_contacts · expo2026_contacts.

### 7.3 Aura / IA
ai_chat_messages · ai_event_feedback_memory · ai_message_usage · ai_partner_boosts ·
ai_partner_recommendations · aura_alerts · aura_home_logs · auto_reels_queue ·
automation_logs · content_generations · promotion_opportunities · system_alerts ·
event_validation_logs.

### 7.4 Instagram / Imports
instagram_accounts · instagram_config · instagram_imports · instagram_posts ·
instagram_scans · eventou_imports.

### 7.5 Esportes
sports_matches · sports_match_events · sports_match_streams · sports_match_venues ·
sports_league_standings · football_chat_messages.

### 7.6 Comunidade
community_messages · community_presence · community_reports · community_rooms ·
community_user_states · driver_reports · security_reports.

### 7.7 Transporte
driver_applications · ride_offers · ride_requests · transport_messages.

### 7.8 Engajamento / Telemetria
event_presence · event_live_presence · page_views · ticket_clicks ·
analytics_events · analytics_daily_summary · visitor_sessions.

### 7.9 Funções `public.*` (26)

`has_role`, `is_admin`, `handle_new_user`, `ensure_profile_affiliate_code`,
`archive_old_radar_scans`, `record_radar_repost`, `upsert_partner_radar_memory`,
`compute_user_risk_score`, `on_security_report_insert`,
`cleanup_event_live_presence`, `count_event_live_presence`, `count_event_presence`,
`increment_match_view`, `flag_message_on_report`,
`community_user_can_speak`, `validate_community_message`, `validate_community_report`,
`expire_stale_ride_requests`, `lock_ride_request_immutable_fields`,
`validate_ride_request_capacity`, `validate_ride_request_event_binding`,
`validate_ride_request_time_window`, `lock_visitor_session_immutable_fields`,
`update_eventou_imports_updated_at`, `update_updated_at_column`.

---

## 8. Edge Functions (`supabase/functions/`) — 27

ai-audit-establishments · aura-autoreels-generate · aura-home-curation · aura-organize-event · aura-pulse ·
automatic-event-hunter · backfill-event-duplicates · eventou-scraper · extract-flyer-metadata ·
generate-art · generate-description · geocode-address · import-instagram ·
instagram-oauth · instagram-publish · instagram-scraper · instagram-webhook ·
maps-key · notify-drivers-new-ride · partner-instagram-sync · prudente-ai ·
scrape-instagram · send-expo-contact · sitemap · sync-football-matches · sync-football-standings ·
`_shared/radarPostClassifier.ts` + `_shared/requireAdmin.ts`.

---

## 9. Riscos & Sinais para a refatoração

1. **Megafiles (>1000 LOC):** V3Home, EventoBulkForm, RadarIA, EstabelecimentosAudit, coverRenderer,
   EventosList, InstagramStudio, EventoForm. Quebrar antes de qualquer mudança transversal.
2. **Sem camada `services/` nem `types/` próprias:** lógica de dados misturada em páginas/lib.
   Necessário para parceiro.roxou.com.br e Partner Pro.
3. **Admin acoplado ao mesmo build do público:** `parceiro.roxou.com.br` exigirá ou subapp
   separado ou route-based code splitting (já há `L(...)` lazy nas rotas — verificar bundle).
4. **Reservas & Lista VIP:** já existem `vip_subscriptions` e `ReservationDrawer.tsx` +
   `VIPPaywallModal.tsx`, mas sem tabela `reservations`/`vip_lists`.
5. **Partner Pro:** existem `partners`, `public_partners`, `partner_awards`,
   `partner_radar_memory`, `ai_partner_boosts`, `ai_partner_recommendations`,
   `promotion_opportunities`, `saved_partners`. Falta: `partner_users` (login do parceiro),
   `partner_subscriptions`, `partner_metrics_daily`.
6. **Coverage de telemetria dupla:** `analytics_events` + `page_views` + `visitor_sessions` +
   GA4 — confirmar fonte de verdade antes de mexer.
7. **RLS 100% ativo:** seguro para abrir subapp Partner sem mover tabelas.
8. **Timezone:** já normalizado por `lib/dateUtils.ts`. Não introduzir `Date` puro.

---

## 10. Próximos passos sugeridos (não executar agora)

1. Quebrar V3Home, EventoBulkForm, RadarIA, coverRenderer em módulos < 400 LOC.
2. Introduzir `src/services/` (events, partners, instagram, transport, analytics).
3. Introduzir `src/types/db.ts` espelhando `integrations/supabase/types.ts`.
4. Desenhar schema de `partner_users` + RLS de `partners` por owner.
5. Definir contratos para subdomínio `parceiro.roxou.com.br` (mesmo monorepo, build separado, mesmo Supabase).
6. Especificar tabela `reservations` e `vip_list_entries` antes de qualquer UI.

— Fim da auditoria.
