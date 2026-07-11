# Ownership dos Módulos

Fonte de verdade de "quem é dono do quê" após a modularização.
Estabelecido na **Onda 1**. Ajustar em PR quando novas áreas surgirem.

## Legenda

- **Produto proprietário** — quem autoriza alterações de schema, RLS,
  contrato, comportamento.
- **Dados proprietários** — tabelas/views que o produto governa.
- **Contratos públicos** — barrel em `src/contracts/<produto>/`.
- **Consumidores** — quem lê via contrato.
- **Domínio final** — subdomínio após Onda 14.

## Áreas

### Eventos públicos
- Proprietário: **Admin Roxou** (canonical) + **Partner Pro** (self via `partner_id`).
- Dados: `events`, `event_validation_logs`, `event_live_presence`, `event_presence`.
- Contrato público: `@contracts/discovery` → `PublicEvent`.
- Consumidores: Descobertas (renderização), Transporte (CTA de excursão), Admin (curadoria).
- Testes mínimos: publicar evento no Admin/Partner → aparecer na Agenda; deep-link `/evento/:slug` OK.
- Domínio final: `roxou.com.br/evento/*`.

### Eventos administrativos (curadoria/ingestão)
- Proprietário: **Admin Roxou**.
- Dados: `eventou_imports`, `ai_event_feedback_memory`, `content_generations`.
- Contrato: privado (Admin-only).
- Consumidores: Admin.
- Testes: Eventos em Lote (`/admin/eventos/novo/lote`).
- Domínio final: `roxou.com.br/admin/*` ou `admin.roxou.com.br`.

### Parceiros públicos
- Proprietário: **Admin Roxou** (create/verify) + **Partner Pro** (self-edit).
- Dados: `partners`, `partner_awards`, `partner_promoters`, `partner_metrics_daily`.
- Contrato público: `@contracts/discovery` → `PublicVenue`.
- Consumidores: Descobertas, Transporte.
- Testes: `/local/:slug` renderiza dados corretos.
- Domínio final: `roxou.com.br/local/*`.

### Reservas
- Proprietário: **Partner Pro**.
- Dados: `partner_reservations`, `partner_reservation_types`, `partner_reservation_settings`, `partner_reservation_waitlist`.
- Contrato público: `@contracts/partner` → `PublicReservationLink`.
- Consumidores: Descobertas (CTA em local/evento), cliente final (`/reserva/:token`).
- Testes: criar reserva → link público abre.
- Domínio final: `parceiro.roxou.com.br` + `/reserva/*` público em `roxou.com.br`.

### VIP
- Proprietário: **Partner Pro**.
- Dados: `partner_vip_lists`, `partner_vip_list_entries`, `vip_subscriptions`.
- Contrato público: `@contracts/partner` → `PublicVipLink`.
- Consumidores: Descobertas, cliente final.
- Testes: criar lista → link público abre; inscrever-se; check-in do promoter.
- Domínio final: `parceiro.roxou.com.br` + `/vip/*`, `/:partnerSlug/vip` em `roxou.com.br`.

### Validator / Check-in
- Proprietário: **Partner Pro**.
- Dados: leitura em `partner_vip_list_entries`, `partner_reservations`, `partner_staff_accounts`.
- Contrato: privado (staff-only).
- Consumidores: staff do parceiro.
- Testes: scan QR de convite → validação; scan de reserva → check-in.
- Domínio final: `parceiro.roxou.com.br/validator`.

### Bio + Menu
- Proprietário: **Partner Pro**.
- Dados: `bio_profiles`, `bio_links`, `bio_qr_codes`, `bio_analytics_events`, `menu_categories`, `menu_items`.
- Contrato público: `@contracts/partner` → `PublicBio`.
- Consumidores: Descobertas.
- Testes: `/bio/:slug`, `/bio/:slug/menu` renderizam.
- Domínio final: `roxou.com.br/bio/*`.

### Transporte — Excursões
- Proprietário: **Transporte Roxou**.
- Dados: `excursion_trips`, `excursion_seats`, `excursion_vehicles`, `excursion_gps_pings`, `excursion_board_logs`.
- Contrato público: `@contracts/transport` → `PublicTransportLink` (`kind: 'excursion'`).
- Consumidores: Descobertas (CTA em evento).
- Testes: fluxo passageiro (listar → assentos → confirmação → acompanhar).
- Domínio final: `transporte.roxou.com.br/excursoes/*`.

### Transporte — Motorista
- Proprietário: **Transporte Roxou**.
- Dados: `driver_applications`, `driver_reports`, `ride_offers`.
- Contrato: privado.
- Consumidores: motorista, admin transporte.
- Testes: board do motorista, GPS.
- Domínio final: `transporte.roxou.com.br/motorista/*`.

### Transporte — Passageiro (caronas)
- Proprietário: **Transporte Roxou**.
- Dados: `ride_requests`, `transport_messages`.
- Contrato: `@contracts/transport` → `PublicTransportLink` (`kind: 'ride' | 'private'`).
- Consumidores: passageiro, motorista.
- Testes: solicitar carona → oferta → chat.
- Domínio final: `transporte.roxou.com.br/*`.

### Mapas
- Proprietário: **Integrations** (`@integrations/google-maps`).
- Dados: chave via edge `maps-key`, geocoding via edge `geocode-address`.
- Contrato: função `getMapsKey()`, `geocode(address)`.
- Consumidores: Transporte, Descobertas (Perto de mim).
- Testes: geocoding com endereço válido; carregamento do mapa.
- Domínio final: usado em todos.

### Autenticação
- Proprietário: **App shell** (`@app`) + **Integrations** (`@integrations/lovable`, `@integrations/supabase`).
- Dados: `auth.*` (Supabase), `user_roles`, `admin_profiles`, `partner_users`, `partner_staff_accounts`, `customer_profiles`, `profiles`.
- Contrato: `useAuth`, `useRole(role)`.
- Consumidores: todos os produtos.
- Testes: login/logout por role em cada produto.
- Domínio final: session compartilhada em `.roxou.com.br`.

### Analytics
- Proprietário: **Integrations** (`@integrations/analytics`) + Admin (dashboards).
- Dados: `analytics_events`, `analytics_daily_summary`, `visitor_sessions`, `page_views`, `bio_analytics_events`, `partner_metrics_daily`, `expo2026_analytics`, `search_logs`, `ticket_clicks`.
- Contrato: `trackEvent(name, payload)`.
- Consumidores: todos escrevem; Admin/Partner leem os próprios agregados.
- Testes: eventos batem no dashboard.

### SEO
- Proprietário: **Roxou Descobertas** (`@modules/discovery/seo`).
- Dados: `roxou_news`, `expo_news`, landings.
- Contrato: componente `<SEO>` + sitemap.
- Consumidores: apenas Descobertas.
- Testes: rich results test em `/evento/:slug`, `/local/:slug`.

### CRM
- Proprietário: **Admin Roxou** + **Partner Pro** (self).
- Dados: `crm_customers`, `crm_consents`, `crm_customer_links`, `crm_customer_audit_logs`.
- Contrato: privado por role.
- Testes: sync CRM, listagem por parceiro.

### Aura / Radar IA
- Proprietário: **Admin Roxou** (IA interna).
- Dados: `aura_alerts`, `aura_home_logs`, `auto_reels_queue`, `ai_partner_boosts`, `ai_partner_recommendations`, `partner_radar_memory`.
- Contrato: privado.
- Testes: cron aura-pulse, radar-ia.

### Comunidade
- Proprietário: **Roxou Descobertas**.
- Dados: `community_messages`, `community_rooms`, `community_presence`, `community_reports`, `community_user_states`.
- Contrato: privado (público autenticado).
- Testes: enviar mensagem, presença.

### Financeiro (parceiro)
- Proprietário: **Partner Pro** (`partner_subscriptions`).
- Contrato: privado.
- Testes: exibir plano/assinatura.

### Financeiro (motorista) — futuro
- Proprietário: **Transporte Roxou**.
- Dados: ainda não modelado.
- Contrato: futuro.
