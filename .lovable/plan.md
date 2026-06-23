# FASE 7 — Roxou Excursões (Hub de Mobilidade)

1. Começar pela Sub-fase 7.1 agora: SIM.

Hub /transportes + caronas preservadas primeiro, sem banco e sem migration.

&nbsp;

2. Pagamento das excursões: SIM.

Nesta fase deixar como pending/manual. PIX/gateway fica para fase futura.

&nbsp;

3. Caronas: SIM.

Roteie V3Transport sob /transportes/caronas sem mover arquivos e sem alterar a lógica atual.

&nbsp;

Escopo enorme (excursões + transporte privativo + GPS + validador + equipe + analytics + monetização). Para reduzir risco de regressão e consumo de créditos, proponho dividir em 4 sub-fases entregáveis. Cada sub-fase passa por `bun run typecheck` antes da próxima.

Caronas atuais ficam em `/transportes/caronas` (rota nova) com 0 alteração funcional — apenas re-roteamento das telas existentes (`V3Transport`, `V3RideRequest`, `V3MyRides`, `V3DriverBoard`).

---

## Sub-fase 7.1 — Hub `/transportes` + Caronas preservadas (sem banco)

Frontend puro.

- Nova página `src/pages/transportes/TransportesHubPage.tsx` com 4 cards:
  - 🚗 Caronas → `/transportes/caronas`
  - 🚍 Excursões Oficiais → `/transportes/excursoes` (placeholder "Em breve")
  - 🚖 Transporte Privativo → `/transportes/privativo` (placeholder)
  - 📍 Minhas Viagens → `/transportes/minhas`
- Rotas em `src/App.tsx`: `/transportes`, `/transportes/caronas`, `/transportes/excursoes`, `/transportes/privativo`, `/transportes/minhas`.
- Caronas: reaproveita `V3Transport`/`V3MyRides` montados sob `/transportes/caronas/*` — sem mudar lógica, só wrappers de rota.
- Sem migration nesta sub-fase.

Entregável: hub navegável, caronas funcionando exatamente como hoje.

---

## Sub-fase 7.2 — Excursões Oficiais: schema + admin/partner CRUD

Backend + Partner. Migration única, com GRANTs e RLS via `public.has_role`.

Tabelas novas:

- `excursion_vehicles` (partner_id, nome, placa, capacidade, tipo, empresa, responsável, whatsapp, layout_json)
- `excursion_trips` (partner_id, event_id, vehicle_id, slug, origem, destino, ida_at, volta_at, preço, status sessão: open/closed/archived, session_date, archived_at)
- `excursion_seats` (trip_id, número, status: free/reserved/paid/boarded/cancelled, passenger_id nullable)
- `excursion_passengers` (trip_id, seat_id, nome, telefone, cpf, cidade, contato_emergencia, qr_token, status, boarded_at, boarded_by, checked_in_by_staff_id, payment_status, created_at, updated_at)
- `excursion_gps_pings` (trip_id, driver_id, lat, lng, heading, speed, accuracy, recorded_at)

RLS:

- Partner pode CRUD seus próprios registros (via `partner_users`).
- Passageiro lê o próprio via `qr_token` (rota pública por token).
- Staff (partner_staff_accounts) usa PIN/QR para validar.
- Permissão `manage_excursions` adicionada ao perfil de staff (reaproveita `partner_staff_accounts`).

Partner UI:

- `/partner/excursoes` hub (reaproveita `PartnerActionTile`, `PartnerFab`, `PartnerBottomNav`).
- `/partner/excursoes/veiculos` — CRUD veículo + layout de assentos (grid simples 2+2 / 4-coluna gerado por capacidade).
- `/partner/excursoes/viagens` — lista viagens com sessões diárias (reaproveita `partnerListasSessions` padrão namespace `::excursoes`).
- `/partner/excursoes/configuracoes` e `/partner/excursoes/equipe` (link para staff existente).

Entregável: organizador cria veículo, abre viagem, vê mapa de assentos.

---

## Sub-fase 7.3 — Compra pública + QR + validador de embarque

Público:

- `/transportes/excursoes/:slug` — detalhe + escolha de assento + form passageiro (sem gateway de pagamento real; status `pending` → admin/organizador marca `paid`, ou integração futura).
- Após reserva: QR token gerado, rota `/transportes/minhas` lista, comprovante reutiliza componentes de `PublicReservationSuccess`.
- Página `/transportes/acompanhar/:token` (sem GPS ainda; mostra dados da viagem).

Validador:

- Novo modo "🚍 Embarque" em `/validator` reaproveitando scanner existente. Marca `boarded_at`/`boarded_by`.
- Edge function `excursion-validate` (server-side, audita).

Entregável: passageiro compra, recebe QR, validador confirma embarque.

---

## Sub-fase 7.4 — GPS tempo real + Transporte Privativo + Analytics

- Página motorista `/partner/excursoes/operacao/:tripId` — usa `navigator.geolocation.watchPosition`, envia ping a cada 15s para `excursion_gps_pings` via Realtime channel + insert.
- Página passageiro `/transportes/acompanhar/:token` consome Realtime + Google Maps (browser key existente) com rota e ETA via Routes API.
- Transporte Privativo: card em `/transportes/privativo` que reaproveita fluxo de `V3RideRequest` filtrado por evento.
- Eventos analytics: `excursion_view`, `excursion_purchase`, `excursion_seat_select`, `excursion_boarding`, `excursion_gps_start`, `excursion_gps_share`, `excursion_complete` em `analytics_events`.
- Arquivamento: cron-free, baseado em `archived_at` calculado por `session_date` + idade.

Entregável: rastreamento ao vivo funcional + privativo conectado a Reserva Roxou.

---

## Decisões a confirmar

1. **Sub-fase agora?** Recomendo começar por **7.1 (hub + caronas)** nesta entrega — baixo risco, valida UX e roteamento. As outras sub-fases viram entregas seguintes.
2. **Pagamento das excursões**: marco como `pending` manual nesta fase, integração Stripe/Pix em fase futura — ok?
3. **Caronas**: rotear `V3Transport` sob `/transportes/caronas` sem mover arquivos, ok?

Confirma essas três e eu executo 7.1 já nesta resposta seguinte.