# Fase 10B — Piloto Partner Pro (admin)

Tela admin `/admin/partner-pilot` para gerenciar o piloto fechado do Partner Pro
com 2 estabelecimentos reais, sem abrir cadastro público.

## Escopo entregue

- Página `src/apps/admin/pages/PartnerPilot.tsx`
- Service `src/apps/admin/partnerPilot/partnerPilotService.ts`
- Componentes em `src/apps/admin/partnerPilot/components/`:
  - `PartnerPilotSearch`
  - `PartnerPilotPartnerCard`
  - `PartnerPilotAccessStatus`
  - `PartnerPilotInviteForm`
  - `PartnerPilotMetrics`
  - `PartnerPilotDangerZone`
- Item de menu admin "Piloto Partner Pro" em `src/config/adminNavigation.ts`
- Rota `/admin/partner-pilot` em `src/App.tsx` (gateada por `AdminLayout`)

## Funções

1. Listar/buscar parceiros em `partners` (nome, Instagram, cidade, categoria).
2. Selecionar parceiro para piloto.
3. Buscar usuário existente por e-mail.
4. Vincular usuário ao parceiro (cria/reativa `partner_users` + `partner_beta_access`).
5. Definir plano/status em `partner_subscriptions` (trial/pro por padrão).
6. Ver status do piloto: time ativo, beta ativo, plano, último login,
   eventos criados, reservas, listas VIP e feedbacks enviados.
7. Revogar acesso (desativa `partner_users` e `partner_beta_access`).

## RPCs criadas (SECURITY DEFINER, gate `is_admin()`)

- `admin_find_user_by_email(_email text)`
- `admin_list_partner_team(_partner_id uuid)`
- `admin_link_partner_pilot(_partner_id, _user_id, _role, _notes)`
- `admin_revoke_partner_pilot(_partner_id, _user_id)`
- `admin_upsert_partner_subscription(_partner_id, _plan, _status, _expires_at)`
- `admin_partner_pilot_status(_partner_id)`

Todas as funções abortam com `42501` se `is_admin()` for falso.

## Restrições respeitadas

- Não cria parceiro novo.
- Não cria cadastro paralelo.
- Não altera Roxou pública.
- Não altera subdomínio/Nginx.
- Não altera RLS existente fora do escopo.
- Não libera cadastro público.
- Não inicia cobrança (Stripe/Mercado Pago).

## Validação manual

- [x] `tsc` verde
- [x] Admin acessa `/admin/partner-pilot`
- [x] Vincular usuário → parceiro entra em `parceiro.roxou.com.br/dashboard`
- [x] Revogar → usuário perde acesso (gate via `usePartnerBetaAccess`)
- [x] Sem vínculo → continua bloqueado
