# Reservas Pro — Plano de Implementação

Escopo grande. Vou entregar em **3 fases** dentro deste mesmo ciclo, mas quero confirmar 2 pontos antes de migrar banco.

## Fase 1 — Banco (migration única)

**Nova tabela `partner_reservation_types`**
- `id, partner_id, kind ('table'|'bistro'|'box'), name, seats, quantity, price, minimum_consumption, extra_people_limit, extra_people_price, description, active, timestamps`
- RLS: leitura pública quando `active=true` + reservations_enabled do parceiro; gestão via `is_partner_editor_or_above` / `is_admin`.
- GRANTs: `anon SELECT`, `authenticated ALL`, `service_role ALL`.

**`partner_reservation_settings` (adicionar colunas)**
- `reservations_start_at timestamptz`
- `reservations_end_at timestamptz`
- `confirmation_timeout_minutes int default 30`
- `max_guests_per_reservation int`
- `max_reservations_per_day int`
- `minimum_notice_hours int default 2`
- (mantém `reservations_enabled`, `auto_confirm` existentes — confirmar nomes via read_query antes da migration)

**`partner_reservations` (adicionar colunas)**
- `reservation_type_id uuid references partner_reservation_types`
- `guests_count int` (fallback = `people_count`)
- `total_price numeric`
- `expires_at timestamptz`
- `payment_confirmed_at timestamptz`
- `checked_in_at timestamptz`, `checked_in_by uuid`
- `public_token uuid default gen_random_uuid() unique`
- `code text` (curto, tipo `RX-XXXXX`)
- Status: ampliar para incluir `pending_payment`, `expired`. Mantém `pending/confirmed/cancelled/completed/no_show` para retro-compat. Reservas antigas `pending` continuam válidas; novas usam `pending_payment` quando `auto_confirm=false`.

**Funções/RPC novas**
- `expire_due_partner_reservations()` → seta `expired` onde `status='pending_payment' AND payment_confirmed_at IS NULL AND expires_at < now()`. Retorna count.
- `submit_public_reservation(partner_slug, type_id, name, phone, guests, date, notes)` → cria reserva, calcula `expires_at`, retorna `{id, public_token, code, status, expires_at, qr_payload}`.
- `confirm_partner_reservation_payment(_id)` → owner/admin marca `payment_confirmed_at=now()`, `status='confirmed'`.
- `check_in_partner_reservation(_id)` → valida `status='confirmed'`, marca `completed` + `checked_in_at`. Rejeita `pending_payment`/`expired`.
- `get_reservation_by_token(_token)` → leitura pública mínima para tela de comprovante.

**Cron**: Job pg_cron a cada 5min chamando `expire_due_partner_reservations()`. Também chamada no fetch da lista do partner como fallback.

## Fase 2 — Partner Pro UI

- `PartnerReservationSettingsForm`: novos campos de janela/timeout/limites.
- Nova aba **"Tipos de reserva"** com CRUD em `partner_reservation_types` (3 sub-tabs: Mesas / Bistrôs / Camarotes).
- `PartnerReservationsPage`: filtros por status, badges coloridos, contador regressivo em `pending_payment`, ações (Confirmar pagamento, Cancelar, No-show, Ver comprovante). Métricas do dia/7d.
- Validador QR (`partnerValidator.ts`): parser reconhece `roxou://checkin?type=reservation&id=...` e `/checkin/reservation/<uuid>`. Chama `check_in_partner_reservation`.

## Fase 3 — Público

- Página `/reservar/:partnerSlug` (lista tipos → form).
- Página `/reserva/sucesso/:token` com logo, dados, QR (`roxou://checkin?type=reservation&id=<uuid>`), contador regressivo, disclaimer.
- Ações: **Salvar comprovante (PNG)** + **Compartilhar comprovante** (mesma lógica do VIP, html2canvas do card completo). Sem download de QR isolado.

## Não-alterado
Lista VIP, comprovante VIP, Analytics, Bulk Eventos, Nginx, VPS, RLS de outras tabelas.

---

## ⚠️ Confirmações antes de migrar

1. **Página pública de reserva**: criar a rota `/reservar/:partnerSlug` agora (V1 funcional simples), ou apenas o backend + UI do Partner nesta entrega, deixando a página pública pra próxima iteração?
2. **Pagamento**: "Confirmar pagamento" será **manual pelo partner** (sem gateway) nesta versão? Stripe/Paddle fica pra depois?

Responda e eu sigo com a migration e o código.