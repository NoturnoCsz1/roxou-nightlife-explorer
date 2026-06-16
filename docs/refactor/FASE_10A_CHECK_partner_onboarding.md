# FASE 10A-CHECK — Validação Partner Onboarding

Data: 2026-06-16
Escopo: Validar fluxo de login / onboarding / aprovação do Partner Pro sem alterar funcionalidades.

## Resultados

### 1. Build & Lint
- `npx tsc --noEmit` ✅ verde (0 erros)
- ESLint: 0/0 (mesma baseline do projeto)
- Sem alterações em código de produção

### 2. Rotas Partner (subdomínio `parceiro.roxou.com.br` / build `partner/`)
| Rota | Componente | Comportamento esperado | Status |
|---|---|---|---|
| `/` | `PartnerStandaloneLayout` | Redireciona p/ `/login` se não autenticado | ✅ |
| `/login` | `PartnerLoginPage` | Google OAuth via `supabase.auth.signInWithOAuth` | ✅ |
| `/onboarding` | `PartnerOnboardingPage` | Busca em `partners` por nome/IG/cidade | ✅ |
| `/pending` | `PartnerPendingApprovalPage` | Mostra solicitação `pending`, permite cancelar | ✅ |
| `/dashboard` | Gated pelo layout | Bloqueado se `usePartnerBetaAccess.hasAccess=false` | ✅ |

### 3. Banco — RLS confirmada

**`partner_access_requests`** (4 policies)
- INSERT: `users can create own access requests` (authenticated)
- SELECT: `users can view own access requests` → `auth.uid()=user_id OR is_admin()`
- UPDATE (user): `users can cancel own pending requests` → `auth.uid()=user_id AND status='pending'`
- UPDATE (admin): `admins can update any request` → `is_admin()`

**`partner_users`** (6 policies)
- SELECT membros: `user_id = auth.uid()`
- SELECT owner/admin: `is_partner_owner_or_admin(auth.uid(), partner_id)`
- INSERT/UPDATE/DELETE: restritos a owner/admin do partner ou `is_admin()`

**`partner_beta_access`** (2 policies)
- SELECT: próprio user ou admin
- ALL: apenas admin

Conclusão RLS: ✅ usuário só vê/solicita o próprio registro; não consegue acessar `partner_id` de outro estabelecimento porque `is_partner_owner_or_admin` exige vínculo ativo em `partner_users`.

### 4. RPCs SECURITY DEFINER (validadas em pg_proc)
- `request_partner_access` — exige `auth.uid()`, valida existência do partner, bloqueia duplicata `pending` e bloqueia se já tem `partner_users` ativo.
- `approve_partner_access_request` — exige `is_admin()`, faz UPSERT em `partner_users` (role=owner, active=true) e `partner_beta_access` (enabled=true).
- `reject_partner_access_request` — exige `is_admin()`, marca `rejected` + `reviewed_by/at`.

Erros retornam `42501` (Forbidden) com mensagem em português → UI exibe via `toast.error`.

### 5. Anti-duplicação
- RPC `request_partner_access` lança exceção se já existe `status='pending'` para `(user_id, partner_id)`.
- Reforço por índice parcial `partner_access_requests_pending_unique` (migração 10A).
- Usuário já vinculado em `partner_users` ativo recebe "Você já tem acesso ativo".

### 6. Fluxos validados (checklist funcional)
- [x] `parceiro.roxou.com.br/` → tela de login (sem sessão)
- [x] Login Google funcional (managed OAuth Lovable Cloud)
- [x] Sem login → não acessa `/dashboard` (redirect `/login`)
- [x] Com login sem vínculo → redirect `/onboarding`
- [x] Busca em `partners` (nome/IG/cidade) retorna resultados
- [x] Solicitação cria linha em `partner_access_requests` com `status='pending'`
- [x] Tela `/pending` lista solicitação corretamente
- [x] Admin enxerga em `/admin/partner-requests`
- [x] Approve cria `partner_users` (owner/active) + `partner_beta_access` (enabled)
- [x] Após aprovação, gate libera `/dashboard`
- [x] Reject marca `rejected`, usuário vê mensagem de recusa em `/pending`
- [x] Duplicata pending bloqueada (RPC + índice)
- [x] Outro `partner_id` inacessível (RLS owner/admin)

### 7. Impacto Zero
- `roxou.com.br` (Roxou pública): nenhum arquivo público alterado.
- Admin antigo: apenas adição de menu "Solicitações Partner" + página nova `/admin/partner-requests`.
- Edge Functions, nginx, multi-entry: intocados.

## Recomendação

✅ **Pronto para piloto fechado com 2 parceiros reais.**

Próximas observações (não-bloqueantes):
- Adicionar e-mail transacional ao aprovar/rejeitar.
- Adicionar contador de solicitações pending no badge do menu admin.
- Considerar rate-limit em `request_partner_access` (hoje protegido apenas por unique index).

Parado após o check, conforme aprovação.
