# Sprint Final Reservas Pro

Escopo grande — proponho dividir em **4 fases sequenciais**, cada uma validada por type-check/build antes da próxima. Sem tocar em Lista VIP, Conta Roxou, Validador QR, Comprovantes públicos (só hidratar payload), Eventos, Analytics, RLS não relacionadas.

## Fase 1 — Hotfixes críticos (P1, itens 1–8)

**Comprovante (**`PublicReservationSuccess.tsx` **+ serviço público):**

- Hidratar payload retornando `partner_name`, `partner_logo_url`, `customer_name`, `reservation_type_name`, `reservation_date`, `people_count`, `qr_payload`, `status` via join no `submit_public_reservation` / fetch de leitura.
- Fallbacks: "Estabelecimento" / "Cliente não informado" / "Reserva".
- Layout: `truncate`, `line-clamp-2`, `break-words`, logo com `object-contain`.

**Campo "Pessoas" redundante (item 2 + 4):**

- Quando `reservation_type.requires_guest_count = false` (Mesa/Bistrô/Camarote), esconder input em:
  - `PublicReservation.tsx` (já feito) ✓
  - Modal manual no Partner (`PartnerReservationsPage.tsx` create dialog)
  - `WaitlistManager.tsx` (modal de adicionar à fila)
  - `ReservationCard.tsx` (exibir "👥 N pessoas incluídas")
  - `CustomerReservations.tsx` (badge)
  - `PublicReservationSuccess.tsx` (badge)

**Bug "14 pess." (item 3):**

- Investigar `ReservationCard.tsx` / `ReservationTable.tsx`: provável concatenação `phone + people_count` sem separador. Trocar por layout estruturado com ícones em linhas separadas, máscara `(18) 99765-3456`.

**Botões (item 5):**

- `ReservationCard.tsx`: grid `grid-cols-2 md:grid-cols-4 gap-2`, `min-h-[44px]`, `w-full`, sem `whitespace-nowrap` que estoure.

**Link público (item 6):**

- `PublicLinkQrDialog.tsx`: usar `break-all` para URL, botão copiar/compartilhar separado, QR sempre visível.

**Header mobile Partner (item 7):**

- Localizar header tabs do partner layout. Aplicar `overflow-x-auto snap-x scrollbar-hide` + `sticky top-0`.

**Lista de espera → vaga (item 8):**

- `WaitlistManager.tsx`: botão "Abrir vaga" gera URL `/:slug/reservas?type=<id>&date=<yyyy-mm-dd>&slot=HH:mm&waitlist=<token>`.
- `PublicReservation.tsx`: ler query params, pré-selecionar tipo/data/slot, mostrar banner "Você está vindo da lista de espera". Não criar rotas novas.

## Fase 2 — UX & Dashboard (P2, itens 9–12)

- `ReservationStats.tsx`: reorganizar cards (Ocupadas/Livres/Capacidade %).
- `PartnerMetricsCards.tsx`: adicionar reservas hoje, 7d, ticket médio, receita prevista/confirmada, sinais pendentes, check-ins, mesas liberadas (campos derivados de `partner_reservations`).
- `WaitlistManager.tsx`: posição #N, "há X min", obs `📝`.
- `PublicLinkQrDialog.tsx`: título "QR do Link" / "Compartilhar QR".

## Fase 3 — Relatório Diário (P3, itens 13–14)

- Novo componente `DailyOperationsReport.tsx` dentro de `PartnerReservationsPage` (nova aba "Relatório do dia") ou nova rota `/partner/reservas/relatorio`. **Sem páginas públicas.**
- Filtro de data (default hoje SP).
- Resumo: total, confirmadas, pendentes, canceladas, expiradas, no-show, lista espera, check-ins, mesas liberadas (queries a `partner_reservations` + `partner_reservation_waitlist`).
- Agrupamento por slot (HH:mm) com ações Confirmar pagamento / WhatsApp / Liberar mesa / No-show / Cancelar / Ver comprovante.
- Seção lista de espera com Notificar / Copiar WhatsApp / Cancelar.

## Fase 4 — IA de Ocupação (P4, itens 15–16)

**Migration:** RPC `get_reservation_occupancy_insights(p_partner_id uuid, p_days int default 30)`:

- WHERE status IN ('completed','confirmed') AND released_at IS NOT NULL AND status NOT IN ('cancelled','no_show','expired')
- `real_minutes = COALESCE(EXTRACT(EPOCH FROM (released_at - checked_in_at))/60, EXTRACT(EPOCH FROM (released_at - reservation_date))/60)`
- Group by reservation_type_id, retornando avg/median/p75, current_duration, suggested_duration (arredondado a 30min, clamp 60–240, sem teto p/ camarote — heurística pelo nome ILIKE '%camarote%').
- Confiança: sample <5 = low, 5–20 = medium, >20 = high.

**UI:** seção "IA de Ocupação" em PartnerSettings (ou ReservationSettings):

- Cards por tipo: Média / Atual / Sugestão / Confiança / botão "Aplicar sugestão" (UPDATE `partner_reservation_types.duration_minutes`).
- Nota: "Isso afetará apenas novas reservas. Reservas antigas mantêm o snapshot."

## Decisão necessária

Confirma a divisão em 4 fases? Posso começar pela Fase 1 (hotfixes críticos) imediatamente após sua aprovação. Cada fase termina com type-check + build antes da próxima.

**Pergunta operacional:** o Relatório Diário deve ser **uma nova aba** dentro de `PartnerReservationsPage` ou uma **nova rota** `/partner/reservas/relatorio`? (recomendo aba para reduzir navegação)

IMPORTANTE

Confirmado. Pode seguir com a divisão em 4 fases.

Comece pela Fase 1 — Hotfixes críticos.

Regras:

- Cada fase deve terminar com type-check + build.

- Não iniciar a próxima fase se houver erro crítico.

- Não tocar em Lista VIP, Conta Roxou, Validador QR, Eventos, Analytics existentes, Nginx/VPS ou RLS não relacionadas.

- Manter uma única página pública de reservas: /:partnerSlug/reservas.

- Não criar páginas públicas extras.

&nbsp;

Decisão sobre Relatório Diário:

Implementar como nova aba dentro de PartnerReservationsPage, não como nova rota.

&nbsp;

Ordem aprovada:

1. Fase 1 — Hotfixes críticos

2. Fase 2 — UX & Dashboard

3. Fase 3 — Relatório Diário em aba dentro de PartnerReservationsPage

4. Fase 4 — IA de Ocupação

&nbsp;

Pode começar pela Fase 1.