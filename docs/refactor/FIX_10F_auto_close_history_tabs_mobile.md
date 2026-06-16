# FIX 10F — Fechamento automático real + organização de listas/eventos/reservas passadas

## Problemas

1. Listas VIP não fechavam automaticamente após `closes_at` no uso real (cron externo não confiável).
2. Listas antigas/passadas poluíam a tela principal com cards grandes.
3. Mesmo comportamento ruim em Reservas e Eventos no Partner Pro.
4. Modo Portaria mobile quebrava o nome do convidado letra-por-letra.
5. Widget de Feedback cobria botões em telas críticas.

## Correções

### 1. Fechamento automático real (sem depender de cron externo)

Ao carregar `/lista-vip`, `/lista-vip/:listId` e `/reservas`, o front dispara
agora antes do fetch principal:

```ts
supabase.rpc("close_due_partner_vip_lists");
supabase.rpc("close_due_partner_reservations"); // FIX 10F (nova)
```

Helpers em `src/apps/partner/services/partnerMaintenance.ts`. Falhas são
silenciosas — não bloqueiam a UI.

### 2. Nova RPC `close_due_partner_reservations`

Migration cria a função `SECURITY DEFINER`:

```sql
UPDATE partner_reservations
   SET status = 'cancelled',
       close_reason = COALESCE(close_reason, 'time_expired')
 WHERE auto_close_enabled = true
   AND closes_at IS NOT NULL
   AND now() > closes_at
   AND status IN ('pending');
```

EXECUTE concedido a `authenticated` e `service_role`.

### 3. Estado operacional unificado

Tipo `PartnerOperationalState`: `open | sold_out | closed | ended | archived`.
Novo componente `PartnerOperationalStateBadge` e
`VipListStateBadge` agora reconhecem `archived`. `deriveVipListState` foi
ajustado para devolver `archived` (antes mapeava para `closed`).

### 4. Reorganização das telas

- **`/lista-vip`** — substituída por `Tabs` com 4 abas
  (Ativas / Fechadas / Encerradas / Arquivadas). Cards grandes só em Ativas;
  demais usam variante `compact` da `VipListTable`.
- **`/reservas`** — mesmas 4 abas. Bucket:
  - active: pendentes/confirmadas no futuro
  - closed: canceladas
  - ended: concluídas ou data passada
  - archived: no_show
- **`/eventos`** — 3 abas (Próximos / Encerrados / Arquivados). Encerrados/
  Arquivados em cards compactos com imagem dimmed e badge.

### 5. Modo portaria — quebra de nome

`VipCheckInPanel` agora usa layout `flex-col` no mobile, `sm:flex-row` no
desktop. Aplicado `min-w-0 w-full overflow-hidden break-words
whitespace-normal` em todos os containers. Botão `w-full sm:w-auto` e
`shrink-0`, sem sobreposição de texto.

### 6. Feedback widget

`PartnerFeedbackWidget` agora:

- Esconde-se quando `pathname` começa com `/checkin` ou `/portaria`.
- Usa `bottom-24` no mobile (era `bottom-20`) e `md:bottom-6` no desktop,
  liberando os CTAs do menu inferior.

### 7. Textos antigos (1 cadastro = 1 convidado)

Substituições globais nos componentes do Partner Pro:

- "Pessoas" → "Convidados"
- "Capacidade" → "Capacidade de convidados"
- "Máx. pessoas / reserva" → "Máx. convidados / reserva"
- "Capacidade hoje" → "Capacidade de convidados hoje"

`people_count` permanece somente no schema/DB; deixou de ser exibido como
"Xp" no card de check-in.

## Arquivos tocados

- `supabase/migrations/<timestamp>_close_due_partner_reservations.sql` (nova)
- `src/apps/partner/services/partnerMaintenance.ts` (novo)
- `src/apps/partner/services/partnerVipLists.ts` (`archived` no estado)
- `src/apps/partner/components/PartnerOperationalStateBadge.tsx` (novo)
- `src/apps/partner/components/VipListStateBadge.tsx`
- `src/apps/partner/components/VipListTable.tsx` (variante `compact`)
- `src/apps/partner/components/VipCheckInPanel.tsx`
- `src/apps/partner/components/PartnerFeedbackWidget.tsx`
- `src/apps/partner/components/PartnerEventStatusBadge.tsx` (estado `ended`)
- `src/apps/partner/components/index.ts`
- `src/apps/partner/pages/PartnerVipListPage.tsx` (4 abas + RPC)
- `src/apps/partner/pages/PartnerVipListDetailPage.tsx` (chama RPC + textos)
- `src/apps/partner/pages/PartnerReservationsPage.tsx` (4 abas + RPC)
- `src/apps/partner/pages/PartnerEventsPage.tsx` (3 abas)
- Diversos componentes para troca textual Pessoas → Convidados.

## Fora de escopo (não alterado)

- Roxou pública fora das rotas do Partner Pro.
- Admin antigo.
- Google OAuth.
- Nginx / VPS.
- RLS fora da nova função `close_due_partner_reservations`.
- Fluxo público de inscrição da Fase 10F.

## Validação

- `tsc` verde.
- Mobile sem overflow horizontal (containers `min-w-0 overflow-x-hidden
  max-w-7xl mx-auto`).
- Listas com `closes_at` no passado mudam para "Fechado" ao recarregar
  `/lista-vip` (RPC chamada no `useEffect`).
- Reservas pendentes com `closes_at` no passado passam para "cancelled"
  com `close_reason = 'time_expired'`.
- Modo portaria: nome não quebra letra-por-letra; botão fica abaixo do
  texto no mobile e ao lado no desktop.
