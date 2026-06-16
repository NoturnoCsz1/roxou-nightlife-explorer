# Fase 10A — Login & Onboarding do Partner Pro

## Objetivo
Transformar `parceiro.roxou.com.br` em fluxo real de entrada para parceiros,
sem criar cadastro paralelo de estabelecimento. Fonte única continua sendo
`public.partners`.

## Fluxo
1. `/login` (Partner app): título + "Entrar com Google" + "Solicitar acesso".
2. Após login → `PartnerStandaloneLayout` decide:
   - admin Roxou ou `partner_beta_access` ativo → `/dashboard`
   - sem acesso → `/onboarding`
3. `/onboarding`: busca em `partners` (name/instagram/city/type) → seleciona
   card → formulário (nome/email/phone/mensagem) → `request_partner_access`.
4. `/pending`: lista solicitações próprias do usuário. Aprovada redireciona
   para `/dashboard`. Recusada exibe aviso. Pendente permite cancelar.

## Backend
Migration `20260616_fase_10a_*.sql`:

- Tabela `partner_access_requests`
  - `id, user_id, partner_id, requested_name, requested_email,
     requested_phone, message, status, reviewed_by, reviewed_at,
     created_at, updated_at`
  - Status: `pending | approved | rejected | cancelled`
  - Unique parcial: `(user_id, partner_id) WHERE status='pending'` impede
    duplicar pedido pendente.
- GRANTs: `SELECT/INSERT/UPDATE` para `authenticated`; `ALL` para
  `service_role`; nada para `anon`.
- RLS:
  - INSERT: `auth.uid() = user_id`.
  - SELECT: dono OU admin Roxou.
  - UPDATE: dono pode cancelar pendente; admin pode tudo.
- RPCs (SECURITY DEFINER, checam `auth.uid()`/`is_admin()`):
  - `request_partner_access(_partner_id, _payload jsonb)` — valida que
    estabelecimento existe, que usuário ainda não é `partner_users` ativo
    e que não há pendente; cria registro.
  - `approve_partner_access_request(_request_id)` — admin: cria
    `partner_users` (owner, ativo) + `partner_beta_access` (enabled) e marca
    como `approved`.
  - `reject_partner_access_request(_request_id)` — admin: marca como `rejected`.

## Frontend
Partner app standalone (`parceiro.roxou.com.br`):

- `src/apps/partner/services/partnerAccessRequests.ts` (search/list/create/cancel + admin list/approve/reject)
- `src/apps/partner/pages/PartnerLoginPage.tsx` (reescrita)
- `src/apps/partner/pages/PartnerOnboardingPage.tsx`
- `src/apps/partner/pages/PartnerPendingApprovalPage.tsx`
- `src/apps/partner/pages/PartnerRequestSuccessPage.tsx`
- `src/apps/partner/App.tsx` — rotas: `/`, `/login`, `/onboarding`, `/pending`, `/dashboard`, ...
- `src/apps/partner/layouts/PartnerStandaloneLayout.tsx` — gate atualizado: sem
  acesso → `Navigate to="/onboarding"`.

Admin Roxou:
- `src/apps/admin/pages/PartnerAccessRequests.tsx`
- Rota `/admin/partner-requests` registrada em `src/App.tsx`.
- Item "Solicitações Partner" adicionado a `ADMIN_NAVIGATION`.

## Segurança
- Visitantes anônimos não enxergam nada (`anon` sem grant + RLS authenticated).
- Parceiro só pode solicitar para `partner_id` existente.
- Não há criação de novo estabelecimento; apenas vínculo a um já existente.
- Duplicação de pedido pendente bloqueada por unique parcial + check no RPC.
- RPCs verificam `is_admin()` antes de aprovar/recusar.

## Não alterado
- Roxou pública, eventos, reservas, lista VIP, Edge Functions, OpenAI, nginx,
  vite multi-entry, PWA principal, RLS fora do escopo.

## Validação manual
- Login Google em `/login` → redireciona usuário sem beta para `/onboarding`.
- Solicitação cria linha em `partner_access_requests` e bloqueia novo pedido
  para o mesmo `partner_id`.
- Admin aprova em `/admin/partner-requests` → próximo login do parceiro entra
  direto em `/dashboard`.
- Admin recusa → parceiro vê aviso em `/pending`.
