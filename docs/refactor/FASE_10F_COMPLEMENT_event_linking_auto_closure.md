# Complemento Fase 10F — Vinculação a Eventos + Fechamento Automático

## Objetivo

Profissionalizar Lista VIP / Reservas vinculando-as a eventos reais do
parceiro, com estados operacionais (Aberto / Lotado / Fechado /
Encerrado) e fechamento automático configurável.

## Banco

### Novos campos

`partner_vip_lists`:
- `closes_at timestamptz`
- `auto_close_enabled boolean default true`
- `close_reason text`

`partner_reservations`:
- mesmos três campos acima
- (`event_id` já existia)

### Validação de vínculo

Trigger `_validate_partner_event_link` em `partner_vip_lists` e
`partner_reservations`:

- `event_id` precisa pertencer ao mesmo `partner_id`;
- na criação, evento não pode ter ocorrido há mais de 6 h (`date_time`
  do evento);
- atualizações para listas já vinculadas a evento encerrado continuam
  permitidas (consulta histórica).

### Estado operacional

`compute_partner_vip_list_state(status, closes_at, event_id, max_entries, used)`:

| Resultado | Quando |
|---|---|
| `ended` | `now() > event.date_time` |
| `closed` | `status='closed'`, `status='archived'`, ou `now() > closes_at` |
| `sold_out` | `used >= max_entries` |
| `open` | caso contrário |

`submit_public_vip_entry` agora chama essa função e rejeita inscrições
com mensagens distintas para cada estado.

`get_public_vip_list` expõe `operational_state`, `closes_at`,
`auto_close_enabled`, `event_id` e `event_date`.

### Fechamento automático

`close_due_partner_vip_lists()` — pode ser invocada manualmente ou por
`pg_cron` futuramente. Marca como `closed` qualquer lista com
`auto_close_enabled=true` cujo `closes_at` já passou.

## Frontend

- `PartnerVipList` ganha `closes_at`, `auto_close_enabled`, `close_reason`.
- Helper `deriveVipListState` espelha a função SQL para uso client-side.
- Novo `<VipListStateBadge>` com rótulos Aberto / Lotado / Fechado / Encerrado.
- `VipListTable`: badge de estado, coluna Fechamento, opacidade reduzida
  para grupo encerrado, CTA "Histórico" em vez de "Abrir" para encerrados.
- `PartnerVipListPage`: divide em duas seções — **Listas ativas** e
  **Eventos encerrados** (com dim).

## Sugestões de fechamento (referência de UI futura)

- Lista VIP: 1 h antes do evento.
- Reserva de mesa: 2 h antes.
- Check-in: até 4 h após o início ou fechamento manual.

Apenas defaults sugeridos — `closes_at` é livre no banco.

## Segurança

- Vínculo cross-partner bloqueado por trigger (`23514`).
- Vinculação a evento histórico bloqueada na criação.
- Funções públicas (`submit_public_vip_entry`, `get_public_vip_list`)
  continuam SECURITY DEFINER com EXECUTE liberado apenas para
  `anon, authenticated`.
- `close_due_partner_vip_lists` revogado de PUBLIC; apenas authenticated.

## Não alterado

Admin antigo, Google OAuth, Nginx, VPS, RLS fora do escopo, Fase 10F
existente (URLs `/:partnerSlug/vip`, leads, LGPD, comprovante profissional).

## Validação

- tsc verde.
- Migração aplicada com sucesso (warnings prévios de SECURITY DEFINER
  são intencionais para as RPCs públicas).
- UI mostra grupos Ativas/Encerrados, badge de estado e horário de
  fechamento.
