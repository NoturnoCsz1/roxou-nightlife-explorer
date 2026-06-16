# Fase 9H — Sistema de Reservas do Partner Pro

## Objetivo

Permitir que parceiros gerenciem reservas (mesa / evento / experiência) usando a
infraestrutura atual da Roxou. Reservas **sempre** pertencem a um `partner_id`
existente — **não** há cadastro paralelo de estabelecimento.

## Fonte única

- Estabelecimentos: `public.partners` (inalterada).
- Acesso/papéis: `public.partner_users` (Fase 9B).
- Reservas: `public.partner_reservations` (nova).
- Configurações de reservas: `public.partner_reservation_settings` (nova).

## Tabelas criadas

### `partner_reservations`
| Campo              | Tipo          | Notas |
| ------------------ | ------------- | ----- |
| `id`               | uuid PK       |       |
| `partner_id`       | uuid FK       | partners(id) ON DELETE CASCADE |
| `event_id`         | uuid FK NULL  | events(id) ON DELETE SET NULL  |
| `user_id`          | uuid FK NULL  | auth.users(id) ON DELETE SET NULL |
| `name`             | text NOT NULL |       |
| `phone` / `email`  | text NULL     |       |
| `people_count`     | int default 1 | CHECK 1..50 |
| `reservation_date` | timestamptz   |       |
| `notes`            | text NULL     |       |
| `status`           | text          | CHECK in (`pending`, `confirmed`, `cancelled`, `completed`, `no_show`) |
| `created_at` / `updated_at` | timestamptz | trigger `update_updated_at_column` |

Índices: `(partner_id, reservation_date DESC)`, `(event_id)`, `(partner_id, status)`.

### `partner_reservation_settings`
1 linha por parceiro (`partner_id` UNIQUE).
- `reservations_enabled` (bool, default `false`)
- `max_people_per_reservation` (int, default 10)
- `max_reservations_per_day` (int, default 50)
- `advance_booking_hours` (int, default 2)
- `auto_confirm` (bool, default `false`)

## Segurança (RLS)

### `partner_reservations`
- `Admins manage all reservations` — ALL via `public.is_admin()`.
- `Partner staff read own reservations` — SELECT via
  `public.is_partner_reservation_manager(auth.uid(), partner_id)`.
- **INSERT/UPDATE/DELETE direto bloqueado**. Todas as mutações passam pelos RPCs
  `SECURITY DEFINER` abaixo, que validam papel server-side.

### `partner_reservation_settings`
- `Admins manage all reservation settings` — ALL.
- `Partner staff read own reservation settings` — SELECT.
- Mutações via `upsert_partner_reservation_settings` (owner/admin).

## Funções (RPCs)

| Função | Quem pode | O que faz |
| ------ | --------- | --------- |
| `is_partner_reservation_manager(user, partner)` | helper | `true` para staff ativo (owner/admin/editor/attendant) |
| `create_partner_reservation(_partner_id, _payload)` | owner/admin + admin Roxou | cria reserva (status default `pending`) |
| `update_partner_reservation(_reservation_id, _payload)` | owner/admin + admin Roxou | edita campos seguros |
| `set_partner_reservation_status(_reservation_id, _status)` | owner/admin: tudo • editor: `confirmed` • attendant: `confirmed`/`completed`/`no_show` | troca de status |
| `upsert_partner_reservation_settings(_partner_id, _payload)` | owner/admin + admin Roxou | salva configurações |

Whitelist do `update_partner_reservation`:
`name`, `phone`, `email`, `people_count`, `reservation_date`, `notes`, `event_id`.
Qualquer outra chave é silenciosamente ignorada.

## Matriz de permissões (UI)

| Ação            | owner/admin | editor | attendant |
| --------------- | :---------: | :----: | :-------: |
| Visualizar      | ✅          | ✅     | ✅        |
| Criar reserva   | ✅          | —      | —         |
| Editar campos   | ✅          | —      | —         |
| Confirmar       | ✅          | ✅     | ✅        |
| Concluir        | ✅          | —      | ✅        |
| No-show         | ✅          | —      | ✅        |
| Cancelar        | ✅          | —      | —         |
| Editar settings | ✅          | —      | —         |

## Frontend

### Service
`src/apps/partner/services/partnerReservations.ts`
- `listReservations(partnerId, opts)`
- `getReservation(id, partnerId)`
- `createReservation(partnerId, payload)`
- `updateReservation(id, payload)`
- `confirmReservation(id)` / `cancelReservation(id)` / `completeReservation(id)` / `noShowReservation(id)`
- `getReservationSettings(partnerId)` / `updateReservationSettings(partnerId, payload)`
- `computeReservationStats(rows, capacity)`

### Páginas (órfãs, sem rota em `App.tsx`)
- `PartnerReservationsPage` — lista, filtros, métricas, settings, criação rápida.
- `PartnerReservationDetailPage` — detalhe + ações por role.

### Componentes
`ReservationTable`, `ReservationCard`, `ReservationStatusBadge`,
`ReservationFilters`, `ReservationStats`, `ReservationSettingsForm`,
`ReservationEmptyState`.

### Métricas computadas client-side
- Reservas hoje
- Reservas últimos 7 dias
- Taxa de confirmação (% confirmadas + concluídas)
- Taxa de no-show
- Capacidade utilizada hoje (`Σ people_count / max_reservations_per_day`)

## Preparação para integrações futuras

- **Lista VIP**: `event_id` na tabela permite vincular reservas a um evento e
  cruzar com a futura lista VIP (Fase 9I).
- **QR Code**: o `id` (uuid) das reservas pode ser convertido em QR para check-in
  (gerado client-side, sem nova tabela).
- **WhatsApp**: campo `phone` normalizado; basta `wa.me/<phone>`.
- **Story Agenda**: reservas confirmadas podem alimentar o renderer de stories.
- **CRM**: `user_id` e `email` permitem cruzamento futuro com `profiles`.
- **Analytics**: `partner_metrics_daily` poderá agregar `reservations_count` por
  dia (gravado por edge function ou trigger futura).

## O que **não** mudou

- `partners`, `events`, `partner_users` (esquema intacto).
- Admin, site público, `App.tsx`, multi-entry Vite, nginx, subdomínio.
- Edge Functions, RadarIA, EventoBulkForm, OpenAI.
- Nenhuma rota nova exposta. As páginas são órfãs no app principal.

## Validação

- `npx tsc --noEmit` ✅ verde.
- Migration aplicada com sucesso (avisos genéricos pré-existentes de
  `SECURITY DEFINER` mantidos — comportamento intencional).
- ESLint dos arquivos novos: 0/0.
- RLS: anon → 0 linhas; staff de outro parceiro → 0 linhas; admin Roxou → tudo.

## Próximo passo (aguardando aprovação)

Fase 9I — Lista VIP / Check-in (reaproveitando `partner_reservations.event_id`
e o futuro QR Code).
