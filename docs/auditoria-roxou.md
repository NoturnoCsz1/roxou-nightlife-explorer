# Auditoria Roxou — Mapeamento pré-reorganização

> Documento gerado em 05/07/2026. **Somente leitura**: nenhum arquivo foi
> movido, renomeado ou refatorado. O objetivo é fornecer base para a
> reorganização estrutural do projeto (Portal / Partner Pro / Motorista /
> Transporte / Shared) em ondas posteriores.

Escopo real do repositório hoje: **React + Vite + Tailwind + Supabase**,
com quatro grandes domínios convivendo no mesmo `src/`:

- **Portal público (Prudente RM / Roxou V3)** — home, agenda, eventos,
  bares, jogos, notícias, SEO.
- **Partner Pro** — dashboard do parceiro, reservas, listas VIP,
  promoters, validador, analytics, bio pública.
- **Transporte** — excursões, caronas, motorista, ride-request.
- **Motorista** — hoje é um sub-recorte de Transporte
  (`V3DriverBoard`, `MotoristaHubPage`, `V3RideRequest`); não possui
  ainda módulo financeiro/ganhos próprio (planejado).

---

## 1. Mapa de arquivos (estado atual)

Convenção: **caminho relativo** a `src/`. Arquivos apenas indicativos —
lista longa completa disponível via `git ls-files src/`.

### 1.1 Portal / Prudente RM (público)
- `pages/Index.tsx`, `pages/Hoje.tsx`, `pages/Semana.tsx`,
  `pages/Indica.tsx`, `pages/Salvos.tsx`, `pages/Categorias.tsx`
- `pages/EventDetail.tsx`, `pages/LocalDetail.tsx`,
  `pages/LocalEventos.tsx`
- `pages/BarDoMes.tsx`, `pages/PertoDeMim.tsx`,
  `pages/RoxouNoticias.tsx`, `pages/RoxouNoticia.tsx`,
  `pages/SEOLanding.tsx`, `pages/Contato.tsx`, `pages/Expo2026.tsx`,
  `pages/expo2026/*`
- `pages/Jogos.tsx`, `pages/JogoDetail.tsx`,
  `pages/TabelaCampeonato.tsx`, `pages/Resultados.tsx`,
  `pages/CopaDoMundo2026.tsx`
- `pages/v3/*` (V3Home, V3Agenda, V3Discover, V3Parceiros,
  V3EventDetail, V3LocalDetail, V3Rankings, V3Community, V3Economize,
  V3AIChat, V3Sobre, V3Contato, V3Profile[Edit], V3Auth, V3Terms,
  V3Privacy, V3TermsAcceptance)
- `apps/public/home/*` — hub do novo Home (Hero, Sections, Sidebar,
  Skeletons, hooks)
- `components/` — EventCard, FeaturedCarousel, PopularVenues,
  DateFilterPills, CategoryPills, BottomNav, DesktopNav, Footer,
  SEO, AdBanner, EventCountdown, VenueList, TransmissionBlock,
  SectionHeader, subpastas `partners/`, `search/`, `season/`, `jogos/`,
  `expo/`, `maps/`, `v3/`.

### 1.2 Partner Pro
- `apps/partner/App.tsx`, `apps/partner/main.tsx`
- `apps/partner/pages/*` (49 páginas — Home, Dashboard, Bio,
  Configurações, Reservas + subpáginas, Listas VIP + subpáginas,
  Promoter Central, Validador, Check-in, Excursões, Relatórios,
  CRM, Analytics, Login, Onboarding, Pending, RequestAccess…).
- `apps/partner/components/*` (65+ componentes — Reservation*, Vip*,
  Executive*, Occupancy*, Waitlist*, PartnerScreen, PartnerSidebar,
  PartnerBottomNav, PartnerFab, PartnerNotificationsCenter, etc).
- `apps/partner/bio/` (BioTabs + tabs Home/Profile/Menu/Links/QR/
  Analytics/Settings/LivePreview/SharePanel).
- `apps/partner/analytics/` (AnalyticsAccordions, AnalyticsOpsTiles,
  AnalyticsTopPromoters).
- `apps/partner/services/*` — partnerAuth, partnerDashboard,
  partnerEvents, partnerReservations, partnerVipLists,
  partnerPromoters, partnerValidator, partnerAnalytics,
  partnerMetrics, partnerProfile, partnerAccessRequests,
  partnerBeta, partnerStaff, partnerMaintenance, partnerExcursoes,
  promoterCentral.
- `apps/partner/hooks/`, `apps/partner/contexts/`,
  `apps/partner/layouts/PartnerPreviewLayout.tsx`,
  `apps/partner/routes/*`, `apps/partner/config/partnerNavigation.ts`.
- **Páginas públicas ligadas ao Partner** (moram em `src/pages/`):
  - `pages/PublicVipList.tsx`, `pages/PublicVipListSuccess.tsx`
  - `pages/PublicReservation.tsx`, `pages/PublicReservationSuccess.tsx`
  - `pages/bio/PublicBioPage.tsx`, `pages/bio/PublicBioMenuPage.tsx`
  - `pages/PartnerScopedComingSoon.tsx`
- **Área do cliente final do Partner**: `pages/customer/*`
  (CustomerLogin, CustomerCallback, CustomerDashboard,
  CustomerAccount, CustomerReservations, CustomerInvites).

### 1.3 Transporte
- `pages/transportes/TransportesHubPage.tsx`,
  `pages/transportes/TransportesComingSoon.tsx`,
  `pages/transportes/PrivativoPlaceholder.tsx`
- Excursões: `ExcursoesListPage`, `ExcursaoDetailPage`,
  `ExcursaoAssentosPage`, `ExcursaoPassageiroPage`,
  `ExcursaoConfirmacaoPage`, `AcompanharExcursaoPage`,
  `MinhasViagensPage`, `pages/transportes/excursao/*`.
- Motorista de excursão: `MotoristaHubPage`,
  `pages/transportes/motorista/*` (viagens, gps, checkins).
- Caronas / ride-request: `pages/v3/V3Transport.tsx`,
  `pages/v3/V3RideRequest.tsx`, `pages/v3/V3DriverBoard.tsx`,
  `pages/v3/V3Chat.tsx`, `pages/v3/V3MyRides.tsx`.
- `pages/CadastroMotorista.tsx`, `components/transportes/*`.
- Services: `services/transport.ts`, `services/excursionGps.ts`,
  `services/publicExcursoes.ts`.
- Libs: `lib/rideTimeRules.ts`, `lib/driverValidation.ts`,
  `lib/geoUtils.ts` (parcialmente compartilhado).

### 1.4 Motorista (financeiro/ganhos — planejado)
- Hoje **não existe** módulo próprio. O que existe é:
  - `V3DriverBoard` (aceitar corridas).
  - `MotoristaHubPage` + `pages/transportes/motorista/*` (excursão).
  - `pages/CadastroMotorista.tsx`.
- **Nada de:** ganhos, fechamento de turno, financeiro, custos,
  combustível, energia elétrica, jornada, metas, demanda, relatórios,
  insights, assinaturas do motorista. **Precisa ser criado do zero**
  no futuro módulo `modules/motorista/`.

### 1.5 Admin (Roxou interno)
- `apps/admin/pages/*` (Dashboard, Parceiros, Eventos, EventoBulkForm,
  Sugestoes, EventouAdmin, InstagramAdmin, RadarIA, AutoReels,
  AdminSecurity, AuraCommand, JogosAdmin, Editores, Noticias,
  Premiacoes, Artes, StoryAgendaDoDia, PartnerAccessRequests,
  PartnerPilot, AdminSystem, AdminLogs, Expo2026Admin,
  Expo2026CamarotesAdmin, CrmHub, CrmCustomerDetail, CrmSyncPage).
- `apps/admin/estabelecimentos/*`, `apps/admin/eventos/list/*`,
  `apps/admin/eventos/form/*`, `apps/admin/partnerPilot/*`,
  `apps/admin/partnerProCrm/*`.
- Componentes: `components/admin/*`.
- `pages/admin/AdminBiosPage.tsx` (fora de `apps/admin/pages/`).

### 1.6 Shared / utilitários
- `components/ui/*` (shadcn).
- `hooks/*` (useAuth, use-mobile, use-toast, useSavedEvents,
  useSavedPartners, usePageTracking, useEventPresence,
  useEventLivePresence, useMatchMeta, useFootballResults,
  useV3Profile, useAdminProfile, useScrollFadeIn, useCustomerSession,
  useExpoCamarotes, usePartnerAwards).
- `lib/*` (dateUtils, utils, sanitize, qrcode, imageHash,
  imageOptimizer, formatRelativeTime, geoUtils, analytics, ga,
  supabaseFetchAll, categoryConfig, titleCleaner, marketingCopy,
  eventDescription, eventLifecycle, eventDuplicateDetector,
  eventDuplicateValidator, eventIngestionGuard, calendarUtils,
  locationDisplay, dashboardPeriod, dashboardExport, bioAnalytics,
  bioMenuPremium, pii, utm, mcp/*, coverRenderer/*).
- `themes/worldCupTheme.ts`, `data/events.ts`.

### 1.7 Integrações
- `integrations/supabase/{client,types}.ts` (auto-gerado — não editar).
- `integrations/lovable/index.ts` (Lovable Auth).
- Edge functions: `supabase/functions/*` (aura-*, generate-art,
  generate-description, geocode-address, instagram-*, mcp,
  notify-drivers-new-ride, partner-instagram-sync, prudente-ai,
  scrape-instagram, sitemap, sync-football-*, eventou-scraper,
  ai-audit-establishments, backfill-event-duplicates, maps-key,
  send-expo-contact).
- `lib/mcp/*` (list-events, list-partners, search-events, index).

### 1.8 Infraestrutura
- `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`,
  `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`.
- `ecosystem.config.js`, `deploy.sh`, `NGINX_ROXOU.conf.example`,
  `server/health.js`, `scripts/generate-*.ts`, `public/health`,
  `public/partner/health`, `public/sitemap.xml`, `public/robots.txt`,
  `public/llms.txt`.
- Docs de refactor prévios em `docs/refactor/*` e `docs/`.
- `.lovable/mcp/manifest.json`, `.lovable/plan.md`.

### 1.9 Legado / candidato a remoção
- `vite.config.ts.backup`.
- `pages/DevRoutes.tsx` (interna — manter, mas isolar).
- `pages/Maintenance.tsx` + `AdminMaintenanceGate`.
- `pages/SegurancaRevisao.tsx` — usada raramente; verificar.
- `components/LegacyArchiveLayout.tsx` — envolve `/archive/legacy-v2`,
  candidato a remoção após confirmar que nada aponta pra lá.
- Vários `docs/refactor/FASE_*` — histórico, manter mas mover para
  `docs/refactor/_archive/` quando estabilizar.
- `pages/admin/AdminBiosPage.tsx` — deveria estar em `apps/admin/pages`.
- `apps/games/README.md`, `apps/transport/README.md`,
  `apps/public/README.md` — pastas quase vazias (só README + poucos
  arquivos), reflexo de reorganizações passadas incompletas.

---

## 2. Mapa de rotas

Fonte: `src/App.tsx` + `src/config/appRoutes.ts` (catálogo do
Navigator interno).

### 2.1 Públicas (Portal)
- `/`, `/descobrir`, `/agenda`, `/perto-de-mim`, `/parceiros`,
  `/rankings`, `/comunidade`, `/economize`, `/ia`, `/sobre`,
  `/contato`, `/salvos`.
- `/evento/:slug`, `/local/:slug`.
- `/jogos`, `/jogo/:slug`, `/tabela/:slug`, `/resultados`,
  `/copa-do-mundo-2026`.
- `/noticias`, `/noticia/:slug`.
- `/bar-do-mes`, `/:landingSlug` (SEO — perigo de conflito, ver 2.7).
- `/expo2026`, `/expo2026/{ingressos,front-stage,mapa,menores,informacoes}`,
  `/expoprudente/*` (redirect legado).
- `/terms`, `/privacy`, `/remover-dados`, `/manutencao`,
  `/seguranca/revisao`.
- `/auth`, `/auth/*`, `/auth/update-password`.
- `/perfil`, `/perfil/editar`.

### 2.2 Bio / Partner público (Partner)
- `/bio/:slug`, `/bio/:slug/menu`.
- `/vip/:listSlug`, `/vip/:listSlug/sucesso/:publicToken`.
- `/:partnerSlug/vip`, `/:partnerSlug/vip/sucesso/:publicToken`.
- `/:partnerSlug/eventos`, `/:partnerSlug/eventos/:eventSlug`.
- `/:partnerSlug/mesas`, `/:partnerSlug/reservas`.
- `/reserva/sucesso/:publicToken`.

### 2.3 Área do cliente do parceiro (Autenticada — customer)
- `/cliente`, `/cliente/login`, `/cliente/callback`.
- `/cliente/minhas-reservas`, `/cliente/lista-vip`,
  `/cliente/minha-conta`, `/cliente/meus-convites`.

### 2.4 Partner Pro (Autenticada — partner)
No repositório atual, o Partner Pro **roda dentro do admin** via
`/admin/partner-preview/*` (staging interno) e via atalho
`/partner/*` que faz `PartnerShortcutRedirect` para o subdomínio
`parceiro.roxou.com.br` em produção.
- `/admin/partner-preview` (landing).
- `/admin/partner-preview/dashboard | perfil | eventos | reservas |
  lista-vip | analytics | configuracoes | lista-vip/:listId`.
- `/partner`, `/partner/*` (redirect).
- `/validator` → redirect para `/partner/validator`.

### 2.5 Admin (Autenticada — admin)
- `/admin/central` (login), `/admin/login` (redirect).
- `/admin/dashboard | parceiros[/*] | estabelecimentos | eventos[/*] |
  sugestoes | eventou | instagram | radar-ia | autoreels | security |
  aura | jogos | editores | noticias[/*] | premiacoes | artes |
  story-agenda | partner-requests | partner-pilot | system | logs |
  expo2026[/*] | crm[/*] | bios`.

### 2.6 Transporte (Autenticada / semi-pública)
- `/transportes` (hub), `/transportes/*` sub-rotas:
  - Excursões: `/transportes/excursoes`, `/excursoes/:slug`,
    `/:slug/assentos`, `/:slug/passageiro`, `/:slug/confirmacao`.
    Redirect legado: `/transportes/excursao/:slug` →
    `/transportes/excursoes/:slug`.
  - `/transportes/acompanhar/:token` (pública — via token).
  - `/transportes/minhas`.
  - Caronas: `/transportes/caronas[/oferecer|/procurar|/minhas|
    /motorista]`.
  - Privativo: `/transportes/privativo[/solicitar|/minhas|/motoristas]`.
  - Motorista de excursão: `/transportes/motorista[/viagens|/gps|
    /checkins]`.
- `/motorista` → `V3DriverBoard`. `/pedir-carona` → gate.
- `/chat/:requestId`, `/meus-pedidos`.
- `/cadastro-motorista`.

### 2.7 Duplicidades / rotas conflitantes ou de risco
- **`/:landingSlug`** (SEOLanding) casa com **qualquer** slug de 1
  segmento — colide potencialmente com `/parceiros`, `/agenda`, etc.
  Só funciona pela ordem de declaração no React Router (declarada
  depois). Alto risco em qualquer reorganização — precisa de match
  explícito por lista de slugs.
- **`/:partnerSlug/vip` vs `/vip/:listSlug`** — dois caminhos para
  a mesma feature. Um é legado (partnerSlug), o outro é o novo
  (listSlug curto). Deep links antigos ainda ativos.
- **`/partner` (redirect) vs `/admin/partner-preview` (interno)** —
  o mesmo produto acessado por duas raízes. Fonte constante de
  confusão de navegação.
- **`/validator`** vive fora de `/partner/*` e faz redirect —
  poderia estar dentro do próprio bloco Partner.
- **`/motorista`** (V3DriverBoard) x `/transportes/motorista`
  (motorista de excursão) — nomes iguais, contextos distintos.
- **`/auth` + `/auth/*` + `/auth/update-password`** — 3 handlers,
  todos apontando para V3Auth ou UpdatePasswordPage. OK, mas
  documentar que qualquer nova subrota precisa ser adicionada antes
  do `/auth/*` catch-all.
- **`/v3` e `/v3/*`** — todos redirecionam para `/`. Manter até
  auditar backlinks externos, depois remover.
- **`/expoprudente[/*]`** — redirect legado. Candidato a remoção
  quando SEO confirmar 0 tráfego.

### 2.8 Rotas com dados sensíveis expostas em URL pública
- `/vip/:listSlug/sucesso/:publicToken` — token de convidado.
- `/reserva/sucesso/:publicToken` — idem.
- `/transportes/acompanhar/:token` — rastreio de excursão via token.
- `/privacidade/optout/:token` — opt-out CRM.
- Todos usam RPCs `SECURITY DEFINER` (`get_public_vip_list`,
  `get_public_reservation`, `public_get_excursion_*`,
  `crm_revoke_consent_by_token`) — validação centralizada no banco.
  Manter esse padrão em qualquer refactor.

### 2.9 Rotas potencialmente quebradas / sem cobertura
- `/pedir-carona` — `PedirCaronaGate` é um wrapper genérico; verificar
  fluxo real.
- `/salvos` — página existe (`pages/Salvos.tsx`) mas não aparece no
  `appRoutes.ts` — reavaliar.
- `/dev/rotas` — ferramenta interna, deve ficar atrás de flag.

---

## 3. Componentes

### 3.1 Componentes muito grandes (candidatos a quebra em Onda 4/5)
Ordenados por linhas:

| Arquivo | Linhas | Observação |
|---|---:|---|
| `pages/v3/V3RideRequest.tsx` | 971 | Regra de negócio (pricing, quote) misturada com UI |
| `apps/partner/pages/PartnerPromoterCentralPage.tsx` | 911 | Vários blocos independentes numa página só |
| `pages/v3/V3LocalDetail.tsx` | 896 | Fetching, seções e UI juntos |
| `pages/v3/V3Discover.tsx` | 606 | Filtros + listagem + hero |
| `apps/partner/pages/PartnerValidatorPage.tsx` | 566 | Câmera QR, validação, logs |
| `pages/v3/V3Agenda.tsx` | 520 | Agrupamentos por dia, filtros |
| `apps/partner/components/ReservationTypesManager.tsx` | 520 | CRUD complexo |
| `pages/v3/V3AIChat.tsx` | 495 | Chat, prompts, streaming |
| `apps/partner/pages/PartnerHomePage.tsx` | 495 | KPIs, notificações, tiles |
| `apps/partner/pages/PartnerLimpezaPage.tsx` | 484 | Ferramenta admin embutida no Partner |
| `pages/v3/V3Profile.tsx` | 462 | |
| `apps/partner/components/PartnerNotificationsCenter.tsx` | 452 | Regras de insight embutidas |
| `apps/partner/pages/PartnerExcursoesViagemDetailPage.tsx` | 451 | |
| `apps/partner/pages/PartnerReservasEquipePage.tsx` | 449 | |
| `pages/v3/V3Economize.tsx` | 446 | |
| `apps/partner/pages/PartnerExcursoesViagensPage.tsx` | 445 | |
| `apps/partner/pages/PartnerOperacaoPage.tsx` | 438 | |

### 3.2 Componentes com múltiplas responsabilidades
- `PartnerHomePage` — layout + fetch (dashboard, reservas, eventos)
  + regras de "próxima reserva" / "evento de hoje".
- `PartnerNotificationsCenter` — mistura render + regras de negócio
  para insights (deveria ler de um hook `usePartnerInsights`).
- `V3RideRequest` — pricing + validação + UI.
- `V3AIChat` — prompt building + chamada de edge function + UI.
- `EventForm` (admin) — payload builder + upload + validação.

### 3.3 Duplicações confirmadas
- **Home V3 vs Portal antigo**: `pages/Index.tsx` (legado) vs
  `pages/v3/V3Home.tsx` (ativo). Manter só V3, mover Index para
  arquivo de arquivo legado.
- **`PartnerReservationsPage` (nova, slim) vs `PartnerReservasListaPage`**
  — a antiga foi quebrada em subpáginas mas segue com componentes
  reaproveitáveis pela mesma origem.
- **`PartnerListasEquipePage`** apenas re-exporta `PartnerReservasEquipePage`
  — pattern OK, mas revisar se é o padrão desejado.
- **`PublicVipList`** serve **dois** paths (`/:partnerSlug/vip` e
  `/vip/:listSlug`) — código único, boa reutilização; documentar.
- `Contato.tsx` (público antigo) vs `V3Contato.tsx` (V3). Ambos
  roteados; V3 é canônico.

### 3.4 Componentes candidatos a `shared/`
- `components/EventCard.tsx`, `EventCountdown.tsx`, `SectionHeader.tsx`,
  `SafeHtml.tsx`, `SEO.tsx`, `AuraBadge.tsx` — usados por Portal e
  Partner (bio).
- `components/ui/*` — já shared, mover para `shared/ui/`.
- `lib/qrcode.ts`, `lib/imageOptimizer.ts`, `lib/dateUtils.ts`,
  `lib/geoUtils.ts`, `lib/sanitize.ts`, `lib/pii.ts`, `lib/utm.ts`.
- `hooks/use-mobile.tsx`, `hooks/use-toast.ts`, `hooks/useAuth.ts`.

### 3.5 Componentes acoplados demais ao Supabase
- Boa parte das páginas Partner faz `supabase.from(...)` direto em
  vez de passar por um service. Exemplos suspeitos (para inspecionar
  na Onda 3):
  - `apps/partner/pages/PartnerLimpezaPage.tsx`
  - `apps/partner/pages/PartnerRelatoriosPage.tsx`
  - `apps/partner/pages/PartnerCrmPage.tsx`
  - `apps/partner/pages/PartnerOperacaoPage.tsx`
  - `apps/partner/components/DailyOperationsReport.tsx`
  - `pages/customer/CustomerReservations.tsx`, `CustomerInvites.tsx`
- Total de arquivos com chamadas diretas ao Supabase: **87**
  (`grep 'supabase\.rpc|supabase\.from' src/`).

### 3.6 Mistura de UI e regra de negócio
- Pricing/quote de carona em `V3RideRequest`.
- Cálculo de KPIs de reserva parcialmente em `PartnerHomePage`
  (usa `computeReservationStats` — bom) e parcialmente em
  `PartnerNotificationsCenter` (ruim — replica lógica).
- Regras de "isPromoItem" e "cross-sell" já foram extraídas para
  `lib/bioMenuPremium.ts` (Onda 4) — usar como padrão de referência.

---

## 4. Supabase

### 4.1 Números
- **87** arquivos com `supabase.from(...)` ou `supabase.rpc(...)`.
- **19** services em `src/services/` + `src/apps/partner/services/`.
- **~55 RPCs** distintas invocadas no client (lista abaixo).

### 4.2 Services existentes
- **Genéricos**: `services/analytics.ts`, `services/adminAuth.ts`,
  `services/events.ts`, `services/partners.ts`, `services/aura.ts`,
  `services/instagram.ts`, `services/bio.ts`,
  `services/customerProfile.ts`, `services/crm.ts`,
  `services/crm360.ts`, `services/crmSync.ts`,
  `services/transport.ts`, `services/excursionGps.ts`,
  `services/publicExcursoes.ts`, `services/publicReservations.ts`,
  `services/publicVipList.ts`.
- **Partner**: `apps/partner/services/*` (16 arquivos).

### 4.3 Hooks existentes
- Auth/perfil: `useAuth`, `useAdminProfile`, `useV3Profile`,
  `useCustomerSession`.
- Presença: `useEventPresence`, `useEventLivePresence`.
- Salvos: `useSavedEvents`, `useSavedPartners`.
- Esportes: `useFootballResults`, `useMatchMeta`.
- Página/tracking: `usePageTracking`, `useScrollFadeIn`.
- Awards/expo: `usePartnerAwards`, `useExpoCamarotes`.
- Genérico UI: `use-mobile`, `use-toast`.

### 4.4 RPCs utilizadas (client)
Partner/reservas: `create_partner_reservation`,
`update_partner_reservation`, `check_in_partner_reservation`,
`close_due_partner_reservations`, `expire_due_partner_reservations`,
`archive_partner_event`, `create_partner_event`,
`update_partner_event`, `duplicate_partner_event`.

Partner VIP: `create_partner_vip_list`, `update_partner_vip_list`,
`set_partner_vip_list_public_enabled`, `add_partner_vip_entry`,
`update_partner_vip_entry`, `cancel_partner_vip_entry`,
`check_in_partner_vip_entry`, `no_show_partner_vip_entry`,
`get_vip_entry_by_token`, `close_due_partner_vip_lists`.

Waitlist: `submit_reservation_waitlist`, `notify_waitlist_entry`,
`cancel_waitlist_entry`.

Público / tokens: `get_public_reservation`, `submit_public_reservation`,
`get_public_vip_list`, `get_public_vip_list_by_partner`,
`submit_public_vip_entry`.

Partner admin: `admin_find_user_by_email`, `admin_link_partner_pilot`,
`admin_list_partner_team`, `admin_partner_pilot_status`,
`admin_revoke_partner_pilot`, `admin_upsert_partner_subscription`,
`approve_partner_access_request`, `reject_partner_access_request`,
`request_partner_access`, `partner_pro_request_exists_for_phone`,
`update_partner_safe_profile`.

CRM: `crm_reveal_customer_field`, `crm_revoke_consent_by_token`,
`crm_upsert_customer_and_link`, `link_record_to_customer`,
`delete_my_customer_account`.

Excursão: `board_excursion_seat`, `excursion_push_gps`,
`excursion_set_operation_status`, `public_get_excursion_live`,
`public_get_excursion_ticket`, `public_get_excursion_trip`.

Radar/segurança/matches: `archive_old_radar_scans`,
`upsert_partner_radar_memory`, `compute_user_risk_score`,
`increment_match_view`, `count_event_live_presence`.

### 4.5 Tabelas por módulo (mapeamento indicativo)
- **Portal**: `events`, `partners`, `roxou_news`, `expo_news`,
  `expo2026_camarotes`, `expo2026_contacts`, `expo2026_analytics`,
  `saved_events`, `saved_partners`, `page_views`, `analytics_events`,
  `analytics_daily_summary`, `sports_matches`, `sports_league_standings`,
  `sports_match_events`, `sports_match_streams`, `sports_match_venues`,
  `search_logs`, `visitor_sessions`, `event_live_presence`,
  `event_presence`, `ticket_clicks`, `football_chat_messages`,
  `community_*`.
- **Partner Pro**: `partners`, `partner_users`, `partner_staff_accounts`,
  `partner_access_requests`, `partner_pro_requests`,
  `partner_pro_request_activities`, `partner_beta_*`,
  `partner_reservations`, `partner_reservation_types`,
  `partner_reservation_settings`, `partner_reservation_waitlist`,
  `partner_vip_lists`, `partner_vip_list_entries`,
  `partner_promoters`, `partner_metrics_daily`,
  `partner_subscriptions`, `partner_awards`,
  `partner_leads`, `event_validation_logs`,
  `bio_profiles`, `bio_links`, `bio_qr_codes`,
  `bio_analytics_events`, `menu_categories`, `menu_items`.
- **CRM (Partner + Admin)**: `crm_customers`, `crm_customer_links`,
  `crm_customer_audit_logs`, `crm_consents`, `customer_profiles`.
- **Transporte (excursão)**: `excursion_trips`, `excursion_vehicles`,
  `excursion_seats`, `excursion_gps_pings`, `excursion_board_logs`.
- **Transporte (caronas)**: `ride_offers`, `ride_requests`,
  `transport_messages`, `driver_applications`, `driver_reports`.
- **Auth/roles**: `profiles`, `admin_profiles`, `user_roles`,
  `user_risk_scores`.
- **Aura / IA**: `aura_alerts`, `aura_home_logs`,
  `ai_partner_boosts`, `ai_partner_recommendations`,
  `ai_event_feedback_memory`, `ai_chat_messages`, `ai_message_usage`,
  `content_generations`, `auto_reels_queue`, `automation_logs`,
  `partner_radar_memory`, `promotion_opportunities`.
- **Instagram**: `instagram_accounts`, `instagram_config`,
  `instagram_imports`, `instagram_posts`, `instagram_scans`,
  `eventou_imports`.
- **Outros**: `community_*`, `launch_signups`, `security_reports`,
  `system_alerts`, `roxou_contacts`, `vip_subscriptions`,
  `affiliate_referrals`.

### 4.6 Dependências cruzadas entre módulos (a vigiar)
- `partners` é usada por **Portal**, **Partner Pro**, **Admin** e
  **Bio** — a tabela mais cross-module do sistema. Qualquer split
  precisa preservar contrato.
- `events` — mesma coisa (Portal + Partner Pro + Admin + Radar IA).
- `crm_customers` — Partner e Admin.
- `bio_analytics_events` — usado pela página pública `PublicBioPage`
  (write) e pela Partner Analytics (read).
- `event_validation_logs` — write pelo Validator (Partner), read
  por Admin.

### 4.7 Queries repetidas (não corrigir agora, mapear)
- Fetch de `partners` com filtros básicos aparece em pelo menos:
  Home V3, V3Parceiros, V3Discover, BarDoMes, PartnerProfile,
  Admin Parceiros, PopularVenues. Consolidar em `services/partners.ts`.
- Fetch de `events` upcoming: Home V3, V3Agenda, V3Discover,
  MCP tools, LocalDetail, PartnerRecentEvents. Consolidar.
- `computeReservationStats(rows, capacity)` já existe — bom.

---

## 5. Partner Pro — mapa por área

### 5.1 Reservas Pro
- Páginas: `PartnerReservationsPage` (hub), `PartnerReservasListaPage`
  (tabs Hoje/Pendentes/Check-in/Histórico/Arquivadas),
  `PartnerReservasTiposPage`, `PartnerReservasConfiguracoesPage`,
  `PartnerReservasEquipePage`, `PartnerReservationDetailPage`,
  `PartnerFilaPage` (waitlist), `PartnerOperacaoPage` (abertura /
  fechamento diário).
- Components: `ReservationCard`, `ReservationTable`,
  `ReservationFilters`, `ReservationHeroCard/Mobile`,
  `ReservationKpiGrid`, `ReservationPendingCard`,
  `ReservationStats`, `ReservationStatusBadge`,
  `ReservationSettingsForm`, `ReservationTimeline`,
  `ReservationTypesManager`, `UpcomingReservationCard`,
  `WaitlistManager`, `LiveOperationsPanel`, `GuestNameDialog`.
- Service: `partnerReservations.ts`, `partnerMaintenance.ts`.
- Tabelas: `partner_reservations`, `partner_reservation_types`,
  `partner_reservation_settings`, `partner_reservation_waitlist`.
- Público: `pages/PublicReservation.tsx`,
  `pages/PublicReservationSuccess.tsx`.

### 5.2 Lista VIP + Convites
- Páginas: `PartnerVipListPage` (lista), `PartnerVipListDetailPage`,
  `PartnerListasHubPage`, `PartnerListasAbertasPage`,
  `PartnerListasFechadasPage`, `PartnerListasHistoricoPage`,
  `PartnerListasOperacaoPage`, `PartnerListasParticipantesPage`,
  `PartnerListasPromotersPage`, `PartnerListasConfiguracoesPage`,
  `PartnerListasEquipePage` (re-export).
- Components: `VipListCard`, `VipListForm`, `VipListStats`,
  `VipListStateBadge`, `VipListStatusBadge`, `VipListTable`,
  `VipListEmptyState`, `VipEntryForm`, `VipEntryTable`,
  `VipCheckInPanel`, `PublicLinkQrDialog`.
- Service: `partnerVipLists.ts`, `partnerPromoters.ts`,
  `promoterCentral.ts`.
- Tabelas: `partner_vip_lists`, `partner_vip_list_entries`,
  `partner_promoters`.
- Público: `pages/PublicVipList.tsx`,
  `pages/PublicVipListSuccess.tsx`.

### 5.3 Validador QR + Check-in
- Páginas: `PartnerValidatorPage`, `PartnerVipCheckinPage`.
- Service: `partnerValidator.ts`.
- Tabelas: `event_validation_logs`, `partner_vip_list_entries`.

### 5.4 Promoters
- Página: `PartnerPromoterCentralPage` (911 linhas — quebrar).
- Service: `partnerPromoters.ts`, `promoterCentral.ts`.
- Tabela: `partner_promoters`, `partner_vip_list_entries`
  (join por promoter).

### 5.5 Analytics
- Página: `PartnerAnalyticsPage`.
- Módulo: `apps/partner/analytics/{AnalyticsAccordions,
  AnalyticsOpsTiles, AnalyticsTopPromoters}`.
- Service: `partnerAnalytics.ts`, `partnerMetrics.ts`.
- Tabelas: `partner_metrics_daily`, `analytics_events`,
  `bio_analytics_events`.

### 5.6 Bio
- Página pública: `pages/bio/PublicBioPage.tsx`,
  `pages/bio/PublicBioMenuPage.tsx`.
- Página parceiro: `PartnerBioHubPage.tsx` +
  `apps/partner/bio/BioTabs.tsx` + `bio/tabs/*` (Home, Profile,
  Menu, Links, QR, Analytics, Settings, LivePreview, SharePanel).
- Service: `services/bio.ts`, `lib/bioMenuPremium.ts`,
  `lib/bioAnalytics.ts`.
- Tabelas: `bio_profiles`, `bio_links`, `bio_qr_codes`,
  `bio_analytics_events`, `menu_categories`, `menu_items`.

### 5.7 Configurações
- Páginas: `PartnerConfiguracoesPage` (hub),
  `PartnerSettingsPage`, `PartnerProfilePage`.
- Components: `PartnerProfileEditor`, `PartnerProfileCard`,
  `PartnerOpeningHoursEditor`, `PartnerSocialLinksEditor`,
  `PartnerImageUploader`, `PartnerSubscriptionCard`.
- Service: `partnerProfile.ts`, `partnerAuth.ts`, `partnerStaff.ts`,
  `partnerBeta.ts`, `partnerAccessRequests.ts`.

### 5.8 Páginas públicas do parceiro (dependência crítica)
Todas em `src/pages/`, não em `src/apps/partner/pages/`. Precisam
migrar em bloco para `modules/partner/public/`:
- `PublicVipList`, `PublicVipListSuccess`.
- `PublicReservation`, `PublicReservationSuccess`.
- `bio/PublicBioPage`, `bio/PublicBioMenuPage`.
- `PartnerScopedComingSoon`.

### 5.9 Dependências internas do Partner
- Validador ↔ VIP Lists ↔ Reservations (mesmo QR/entry lookup).
- Promoter Central lê de VIP Lists + promoter table.
- Analytics lê de `bio_analytics_events` (Bio),
  `event_validation_logs` (Validador), `partner_metrics_daily`
  (agregado), `partner_reservations` (KPIs).
- Configurações escreve em `partners` (tabela pública) via RPC
  `update_partner_safe_profile` — cuidado com efeitos no Portal.

---

## 6. Motorista — mapa por área

### 6.1 Situação atual
- **Corridas**: `V3DriverBoard.tsx`, `V3RideRequest.tsx`,
  `V3Transport.tsx`, `V3MyRides.tsx`, `V3Chat.tsx`. Service:
  `services/transport.ts`. Tabelas: `ride_offers`, `ride_requests`,
  `transport_messages`.
- **Cadastro/aplicação**: `pages/CadastroMotorista.tsx`,
  `lib/driverValidation.ts`. Tabelas: `driver_applications`,
  `driver_reports`.
- **Excursão (motorista de van)**: `pages/transportes/motorista/*`
  (viagens, gps, checkins), `MotoristaHubPage`. Services:
  `services/excursionGps.ts`, `services/transport.ts`. Tabelas:
  `excursion_trips`, `excursion_seats`, `excursion_gps_pings`,
  `excursion_board_logs`, `excursion_vehicles`.

### 6.2 A criar (não existe)
- Ganhos, fechamento de turno, financeiro, custos, combustível,
  energia elétrica, jornada, metas, demanda, relatórios,
  insights, assinaturas do motorista.

### 6.3 Risco de duplicidade de cálculo
- **Preço/quote de corrida** vive dentro de `V3RideRequest.tsx`
  (regra de negócio na UI). Precisa virar service (`lib/pricing.ts`
  ou `services/rides/pricing.ts`) antes de ser reutilizado por um
  módulo Motorista de ganhos.
- **Tempo/janela de corrida** — `lib/rideTimeRules.ts` já é
  isolado, bom.
- **GPS excursão vs GPS carona** — dois pipelines distintos
  (`excursionGps.ts` vs realtime ride). Documentar antes de tentar
  unificar.

---

## 7. Transporte — mapa por área

### 7.1 Booking
- Fluxo excursão: `ExcursoesListPage` → `ExcursaoDetailPage` →
  `ExcursaoAssentosPage` → `ExcursaoPassageiroPage` →
  `ExcursaoConfirmacaoPage` → `AcompanharExcursaoPage`.
- Fluxo caronas: `V3Transport` → `V3RideRequest` → `V3Chat` →
  `V3MyRides`.

### 7.2 Quote / Pricing
- Caronas: cálculo interno em `V3RideRequest.tsx` (regra na UI —
  extrair).
- Privativo: `PrivativoPlaceholder` (ainda placeholder).

### 7.3 Google Maps / Places / Routes
- Edge function: `supabase/functions/maps-key/index.ts` (proxy key).
- Client hooks/components: dentro de `components/maps/*` e no
  `V3RideRequest`. Não centralizado — refatorar para
  `integrations/google-maps/*`.

### 7.4 Drivers / Driver Status / Ride Status
- `driver_applications` (cadastro), `ride_offers` (motoristas
  disponíveis), `ride_requests` (status). Todos manipulados via
  `services/transport.ts`.

### 7.5 Chat
- `V3Chat.tsx` + `transport_messages` + `useRealtime` implícito.

### 7.6 Payments
- **Ainda não integrado**. Placeholder no fluxo de excursão.

### 7.7 Admin
- Não há painel admin dedicado ao Transporte no repo.
  `Admin` só toca em drivers via `driver_applications` (indireto).

### 7.8 Regras de negócio dentro de páginas visuais
- Pricing de corrida em `V3RideRequest`.
- Regras de "quando um motorista pode aceitar" espalhadas entre
  `V3DriverBoard`, `services/transport.ts` e
  `notify-drivers-new-ride` edge function.
- Regras de assento de excursão em `ExcursaoAssentosPage` e
  na RPC `board_excursion_seat`. Boa separação — manter.

---

## 8. Segurança (mapeamento, sem correção)

### 8.1 RLS
- Todas as 96 tabelas listadas têm `enable row level security` + ao
  menos 1 policy (ver `<supabase-tables>` no header do projeto).
- Padrão dominante: `public.has_role(auth.uid(), 'admin'|'city_editor')`
  para admin; `partner_users` join para partner; `auth.uid() =
  user_id` para dados pessoais.

### 8.2 RPCs SECURITY DEFINER (a auditar)
- Público via token: `get_public_reservation`,
  `get_public_vip_list`, `get_public_vip_list_by_partner`,
  `submit_public_reservation`, `submit_public_vip_entry`,
  `get_vip_entry_by_token`, `public_get_excursion_live`,
  `public_get_excursion_ticket`, `public_get_excursion_trip`,
  `crm_revoke_consent_by_token`.
- Admin: `admin_find_user_by_email`, `admin_link_partner_pilot`,
  `admin_list_partner_team`, `admin_partner_pilot_status`,
  `admin_revoke_partner_pilot`, `admin_upsert_partner_subscription`.
- Todas devem ter `SET search_path = public` — confirmar.

### 8.3 Tokens públicos / QR
- `public_token` em `partner_reservations` e
  `partner_vip_list_entries`.
- `checkin_token` em `partner_vip_list_entries` (usado pelo
  Validador).
- `access_token` em `excursion_trips` (acompanhamento).
- Nenhum é adivinhável (assumido UUID/rand) — validar geração.

### 8.4 Check-in
- Fluxo: QR scan em `PartnerValidatorPage` → RPC
  `check_in_partner_vip_entry` / `check_in_partner_reservation`.
- Log em `event_validation_logs`.

### 8.5 Promoters
- `partner_promoters` — chave é o promoter link/slug.
- Sem token público de escrita; leitura via `partner_vip_lists`.

### 8.6 Permissões de parceiro
- `partner_users` (dono/admin) + `partner_staff_accounts`
  (validator/reception/manager). Junção via `has_role` e
  `partner_id` no client (`usePartnerAuth`).

### 8.7 Storage
- Bucket único `uploads` com prefixos `events/` e `partners/`.
- Regras: leitura pública; escrita restrita a authenticated
  (validar policies do bucket).

### 8.8 Edge Functions
- Total: 27 funções.
- Chamadas de admin: `ai-audit-establishments`,
  `aura-*`, `backfill-event-duplicates`, `generate-*`,
  `import-instagram`, `instagram-*`, `sync-football-*`,
  `eventou-scraper`, `partner-instagram-sync`, `prudente-ai`,
  `scrape-instagram`, `send-expo-contact`, `sitemap`.
- Chamadas públicas: `mcp`, `maps-key`, `geocode-address`,
  `notify-drivers-new-ride` (via realtime trigger).
- Todas devem exigir `requireAdmin` quando privadas — `_shared/
  requireAdmin.ts` existe, verificar cobertura.

### 8.9 Secrets / variáveis
- `.env` versionado contém somente `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
  **OK** (chave anon).
- Segredos server: administrados via Supabase Secrets (não
  presentes no repo). Auditar lista em Onda de segurança.

---

## 9. Proposta de arquitetura futura

Estrutura sugerida (**apenas proposta, não executar agora**):

```text
src/
  app/                         # bootstrap: main.tsx, App.tsx, providers
    router/                    # rotas por domínio, montadas em App.tsx
      portal.routes.tsx
      partner.routes.tsx
      motorista.routes.tsx
      transporte.routes.tsx
      admin.routes.tsx
      publicPartner.routes.tsx # bio/vip/reserva
  modules/
    portal/                    # Prudente RM / público
      pages/                   # V3Home, V3Agenda, V3Discover, jogos, notícias…
      components/              # EventCard, FeaturedCarousel, PopularVenues, …
      hooks/
      services/                # events, partners, sports, news
    partner/
      pages/
      components/
      bio/                     # BioTabs + tabs
      analytics/               # AnalyticsAccordions, …
      services/                # partnerReservations, partnerVipLists, …
      public/                  # PublicVipList, PublicReservation, PublicBio
      customer/                # /cliente/*
      config/                  # partnerNavigation
      layouts/                 # PartnerPreviewLayout, PartnerScreen…
    motorista/                 # novo módulo (ganhos, jornada, financeiro)
      pages/
      services/
      lib/                     # pricing, jornada, custos, combustível
    transporte/
      excursoes/
      caronas/
      privativo/
      admin/
      services/                # transport, excursionGps, publicExcursoes
    admin/                     # painel Roxou
      pages/
      components/
      services/
  shared/
    ui/                        # shadcn (mover components/ui)
    components/                # EventCard genérico, SEO, SafeHtml, AuraBadge
    hooks/                     # useAuth, use-mobile, use-toast
    lib/                       # dateUtils, utils, sanitize, qrcode, pii, utm
  integrations/
    supabase/                  # client + types (auto-gen, intocado)
    lovable/
    google-maps/               # novo — extrair de components/maps
    mcp/                       # lib/mcp/*
  config/
    appRoutes.ts               # catálogo (manter atual)
    env.ts                     # tipagem de import.meta.env
```

### 9.1 Distribuição arquivo a arquivo (amostra representativa)

Formato: `local atual → módulo → local futuro sugerido → risco → deps`.

**Portal**

- `pages/v3/V3Home.tsx` → portal → `modules/portal/pages/Home.tsx` →
  **médio** → V3Layout, useHomeData, EventCard, SEO.
- `pages/v3/V3Agenda.tsx` → portal → `modules/portal/pages/Agenda.tsx`
  → **médio** → dateUtils, EventCard, DateFilterPills.
- `pages/v3/V3Discover.tsx` → portal → `modules/portal/pages/Discover.tsx`
  → **alto** (606 linhas, muitos filtros) → services/events, services/partners.
- `pages/Jogos.tsx` + `JogoDetail.tsx` + `Resultados.tsx` +
  `TabelaCampeonato.tsx` → portal → `modules/portal/pages/jogos/*` →
  **baixo** → useMatchMeta, useFootballResults.
- `pages/EventDetail.tsx` vs `pages/v3/V3EventDetail.tsx` → portal →
  consolidar em `modules/portal/pages/EventDetail.tsx` → **alto**
  (dois caminhos ativos) → SEO, EventCountdown.
- `apps/public/home/*` → portal → `modules/portal/pages/home/*` →
  **baixo** → todos internos.
- `components/EventCard.tsx` → shared → `shared/components/EventCard.tsx`
  → **médio** (usado em Portal e Partner) → só UI.

**Partner Pro**

- `apps/partner/App.tsx`, `main.tsx` → partner →
  `modules/partner/app/*` → **baixo** → PartnerPreviewLayout.
- `apps/partner/pages/*` → partner → `modules/partner/pages/*` →
  **médio** → hooks/services partner.
- `apps/partner/components/*` → partner → `modules/partner/components/*`
  → **baixo** → design system.
- `apps/partner/bio/*` → partner → `modules/partner/bio/*` → **baixo**.
- `apps/partner/analytics/*` → partner → `modules/partner/analytics/*`
  → **baixo**.
- `apps/partner/services/*` → partner → `modules/partner/services/*` →
  **baixo** → supabase client.
- `pages/PublicVipList.tsx` + Success → partner →
  `modules/partner/public/vip/*` → **alto** (rotas
  `/vip/:listSlug` e `/:partnerSlug/vip` compartilhadas com Portal
  no roteador raiz).
- `pages/PublicReservation.tsx` + Success → partner →
  `modules/partner/public/reservas/*` → **alto**.
- `pages/bio/PublicBioPage.tsx` + `PublicBioMenuPage.tsx` → partner
  → `modules/partner/public/bio/*` → **alto**.
- `pages/customer/*` → partner (área do cliente) →
  `modules/partner/customer/*` → **médio** → useCustomerSession.
- `apps/partner/layouts/PartnerPreviewLayout.tsx` → partner →
  `modules/partner/layouts/*` → **baixo**.
- `apps/partner/config/partnerNavigation.ts` → partner →
  `modules/partner/config/navigation.ts` → **baixo**.

**Motorista** (nada existe hoje — criar do zero)
- Criar em `modules/motorista/{pages,services,lib}` **após** extrair
  pricing/janela de `V3RideRequest`.

**Transporte**

- `pages/transportes/*` → transporte → `modules/transporte/excursoes/*`
  → **médio** → services/publicExcursoes, services/excursionGps.
- `pages/v3/V3Transport.tsx`, `V3RideRequest.tsx`, `V3DriverBoard.tsx`,
  `V3MyRides.tsx`, `V3Chat.tsx` → transporte →
  `modules/transporte/caronas/*` → **alto** (pricing embutido).
- `pages/CadastroMotorista.tsx` → transporte →
  `modules/transporte/caronas/CadastroMotorista.tsx` → **baixo**.
- `services/transport.ts`, `services/excursionGps.ts`,
  `services/publicExcursoes.ts` → transporte →
  `modules/transporte/services/*` → **baixo**.
- `components/transportes/*` → transporte →
  `modules/transporte/components/*` → **baixo**.

**Admin**

- `apps/admin/**` → admin → `modules/admin/**` → **baixo** (isolado).
- `pages/admin/AdminBiosPage.tsx` → admin →
  `modules/admin/pages/AdminBiosPage.tsx` → **baixo**.

**Shared**

- `components/ui/*` → shared → `shared/ui/*` → **médio** (import
  path massivo — usar codemod).
- `hooks/*` (não específicos) → shared → `shared/hooks/*` → **médio**.
- `lib/*` (utils, dateUtils, sanitize, qrcode, geoUtils, pii, utm,
  imageOptimizer, imageHash, calendarUtils, formatRelativeTime,
  supabaseFetchAll, ga, analytics) → shared → `shared/lib/*` →
  **médio** (import path massivo).

**Integrações**

- `integrations/supabase/*` — **não mover** (auto-gerado).
- `integrations/lovable/*` → manter.
- `components/maps/*` → integrations → `integrations/google-maps/*` →
  **alto** (extração real, não só mover).
- `lib/mcp/*` → integrations → `integrations/mcp/*` → **baixo**.

**Config**

- `config/appRoutes.ts`, `config/adminNavigation.ts` → config → mesmo
  local → **baixo**.

---

## 10. Ordem segura de refatoração

Objetivo: cada etapa deve caber num único PR, com typecheck + build
verdes e teste manual das rotas críticas (Home, Agenda, EventDetail,
`/bio/:slug`, `/vip/:listSlug`, `/reserva/sucesso/:token`,
`/admin/partner-preview/dashboard`, `/transportes/excursoes`).

**Etapa 0 — Este documento** (concluído).

**Etapa 1 — Documentação viva**
- Adicionar `docs/architecture/` com o mapa de dependências
  gerado a partir deste doc (Mermaid ou draw.io).
- Adicionar `docs/architecture/DECISIONS.md` para ADRs curtos.

**Etapa 2 — Shared**
- Sem mover arquivos: introduzir aliases (`@shared/*` já existem)
  em novos imports.
- Mover `components/ui/*` para `shared/ui/*` (1 PR, codemod de
  imports).
- Mover hooks e lib genéricos (dateUtils, utils, sanitize, qrcode,
  pii, utm, imageOptimizer, imageHash) em 2 PRs.

**Etapa 3 — Partner Pro**
- Mover `apps/partner/**` → `modules/partner/**` (rename em bloco,
  atualizar `tsconfig.paths` `@partner/*` para novo path).
- Depois, mover páginas públicas (`PublicVipList`,
  `PublicReservation`, `bio/*`, `PartnerScopedComingSoon`) para
  `modules/partner/public/*`.
- Depois, mover `pages/customer/*` para `modules/partner/customer/*`.

**Etapa 4 — Transporte**
- Mover `pages/transportes/**` para `modules/transporte/excursoes/**`.
- Mover caronas (`V3Transport`, `V3RideRequest`, `V3DriverBoard`,
  `V3MyRides`, `V3Chat`) para `modules/transporte/caronas/**`.
- Extrair pricing de `V3RideRequest` para
  `modules/transporte/caronas/lib/pricing.ts` (com testes).
- Consolidar Google Maps em `integrations/google-maps/*`.

**Etapa 5 — Motorista (novo)**
- Criar `modules/motorista/**` como módulo autônomo.
- Definir tabelas necessárias (`motorista_shifts`,
  `motorista_earnings`, `motorista_expenses`, …) — nova onda
  Supabase, fora deste doc.

**Etapa 6 — Portal**
- Mover `pages/v3/*` para `modules/portal/pages/*`.
- Consolidar `pages/Index.tsx` (legado) e `V3Home` num único
  `modules/portal/pages/Home.tsx`.
- Consolidar `EventDetail.tsx` legado com `V3EventDetail.tsx`.

**Etapa 7 — Admin**
- Mover `apps/admin/**` para `modules/admin/**`.
- Mover `pages/admin/AdminBiosPage.tsx` para dentro do módulo.

**Etapa 8 — Segurança**
- Auditar `SECURITY DEFINER` + `search_path` de todas as RPCs.
- Auditar cobertura de `requireAdmin` nas edge functions.
- Auditar RLS de `partners` e `events` (as duas tabelas mais
  compartilhadas).
- Auditar geração de tokens públicos (VIP, reserva, excursão).

**Etapa 9 — Limpeza de legado**
- Remover `vite.config.ts.backup`.
- Remover redirects `/v3/*`, `/expoprudente/*` depois de confirmar
  0 tráfego (via `page_views`).
- Remover `components/LegacyArchiveLayout.tsx` +
  `pages/Maintenance.tsx` se não houver referência ativa.
- Arquivar `docs/refactor/FASE_*` para `docs/refactor/_archive/`.

---

## Regras absolutas desta etapa (respeitadas)

- Nenhum arquivo foi movido, renomeado ou refatorado.
- Nenhuma rota alterada.
- Nenhum import alterado.
- Nenhuma alteração no banco, RLS, RPC, autenticação, edge functions,
  storage ou UI.
- Nenhum bug corrigido, nenhuma feature adicionada.

O projeto continua compilando exatamente como antes deste documento.
