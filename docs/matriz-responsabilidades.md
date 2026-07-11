# Matriz de Responsabilidades

Quem é dono do dado, quem pode ler, quem pode editar, quem apenas consome.

## 1. Recursos principais

| Recurso | Proprietário | Escrita | Leitura pública | Contrato de integração |
|---|---|---|---|---|
| Eventos (`events`) | Admin (canonical) + Partner (self) | Admin, Partner (próprios) | Descobertas | `services/events.ts`, `event_id`, `slug` |
| Parceiros (`partners`) | Admin | Admin, Partner (self via `partner_users`) | Descobertas | `services/partners.ts`, `partner_id`, `slug` |
| Reservas (`partner_reservations`, `_types`, `_settings`, `_waitlist`) | Partner | Partner | Descobertas (link público) | `services/publicReservations.ts`, `publicToken` |
| VIP (`partner_vip_lists`, `_entries`) | Partner | Partner | Descobertas (link público) | `services/publicVipList.ts`, `listSlug`, `publicToken` |
| Bio (`bio_profiles`, `bio_links`, `bio_qr_codes`, `bio_analytics_events`, `menu_categories`, `menu_items`) | Partner | Partner | Descobertas (renderização) | `services/bio.ts`, `slug` |
| Excursões (`excursion_trips`, `_seats`, `_vehicles`, `_gps_pings`, `_board_logs`) | Transporte | Transporte (motorista/admin) | Descobertas (CTA em evento) | `services/publicExcursoes.ts`, `trip_id`, `token` |
| Corridas/caronas (`ride_requests`, `ride_offers`, `transport_messages`) | Transporte | Passageiro, Motorista | — | `services/transport.ts` |
| Motorista (`driver_applications`, `driver_reports`) | Transporte | Motorista, Admin transporte | — | `services/transport.ts` |
| CRM (`crm_customers`, `_consents`, `_customer_links`, `_customer_audit_logs`) | Admin/Partner | Admin, Partner (próprios) | — | `services/crm*.ts` |
| Analytics (`analytics_events`, `analytics_daily_summary`, `visitor_sessions`, `page_views`, `bio_analytics_events`, `partner_metrics_daily`, `expo2026_analytics`) | Shared writer | Admin lê; Partner lê próprio | — | `services/analytics.ts` |
| Auth (`admin_profiles`, `partner_users`, `partner_staff_accounts`, `customer_profiles`, `profiles`, `user_roles`) | Auth core | Admin gerencia; usuário edita próprio | — | `hooks/useAuth`, `has_role()` |
| Jogos (`sports_matches`, `_events`, `_streams`, `_venues`, `_league_standings`, `football_chat_messages`) | Admin/Cron | Admin; Descobertas lê | Descobertas | `hooks/useFootballResults`, `useMatchMeta` |
| Expo2026 (`expo2026_*`, `expo_news`) | Admin | Admin | Descobertas | services (parciais) |
| Notícias (`roxou_news`, `expo_news`) | Admin | Admin | Descobertas | (falta service dedicado) |
| Radar IA / Aura (`partner_radar_memory`, `aura_alerts`, `aura_home_logs`, `auto_reels_queue`, `ai_partner_boosts`, `ai_partner_recommendations`) | Admin/IA | Admin, cron | — | `services/aura.ts` |
| Instagram (`instagram_accounts`, `_config`, `_imports`, `_posts`, `_scans`) | Admin/Partner | Admin, Partner (próprio) | — | `services/instagram.ts` |
| Comunidade (`community_messages`, `_presence`, `_reports`, `_rooms`, `_user_states`) | Descobertas | Usuário público | Descobertas | (inline hoje) |
| Cliente do parceiro (`customer_profiles`, `saved_events`, `saved_partners`, `vip_subscriptions`) | Público/Partner | usuário | Público | `services/customerProfile.ts` |
| Segurança (`security_reports`, `user_risk_scores`, `system_alerts`) | Admin | Admin, sistema | — | `services/adminAuth.ts` |

## 2. Regras de acesso resumidas

- **Descobertas**: SELECT em `events`, `partners`, `sports_*`, `roxou_news`, `expo_news`, `bio_profiles`, `menu_*`, e nas views públicas de VIP/Reserva/Excursão via token/slug.
- **Partner Pro**: SELECT/INSERT/UPDATE/DELETE em recursos próprios (`WHERE partner_id IN (mine)`), via RLS `has_role`/`partner_users`.
- **Transporte**: SELECT/INSERT/UPDATE em excursão/carona conforme role motorista/passageiro/admin.
- **Admin Roxou**: todos os recursos, via `has_role('admin')` + `city_editor` (RLS).

## 3. Contratos (interface pública entre produtos)

### Descobertas ← Partner

- Publicação de eventos: Partner grava em `events` com `partner_id` seu.
- Publicação de reservas: link `/reserva/:token`.
- Publicação de VIP: link `/vip/:listSlug`.
- Bio: `/bio/:slug`.
- Cardápio: `/bio/:slug/menu`.
- Contato/WhatsApp/Instagram: campos em `partners`.
- Horário, endereço, fotos: campos em `partners`.

### Descobertas ← Transporte

- Excursão pública: `/transportes/excursoes/:slug`.
- CTA de transporte por evento: `event_id → publicExcursoes.getByEvent(event_id)`.
- Acompanhar viagem: `/transportes/acompanhar/:token`.

### Partner Pro ← Descobertas

- Publicação de eventos redireciona para a página pública do evento.
- Visualizações e engajamento voltam via `analytics_events`.

### Transporte ← Descobertas

- Link "solicitar transporte" a partir do evento.
- Ranking/curadoria de eventos com maior potencial de excursão.

## 4. Regras de propriedade

- Uma tabela tem **um único proprietário** (produto que autoriza schema/migrations).
- Consumidores acessam via service, nunca via SELECT direto em componentes.
- Nenhum produto pode alterar coluna sem revisar contratos.

## 5. Contratos formais sugeridos (tipos)

- `PublicEvent` (Descobertas) ⊂ `AdminEvent` (Admin).
- `PublicPartner` ⊂ `PartnerFull`.
- `PublicVipList`, `PublicReservationSlot`, `PublicBio`, `PublicExcursionTrip` — projeções somente-leitura.
- `PartnerContext` (id, role, permissions) exposto por `apps/partner` para uso interno; nunca importado pelo público.
