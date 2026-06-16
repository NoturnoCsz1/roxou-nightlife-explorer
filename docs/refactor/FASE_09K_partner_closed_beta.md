# Fase 9K — Beta Fechado do Partner Pro

## Objetivo
Preparar o lançamento beta do Partner Pro para parceiros **convidados**, sem
expor o sistema publicamente, sem subdomínio e sem cobrança.

## Schema

### `partner_beta_access`
Lista quem está aprovado no beta fechado.
| coluna | tipo | nota |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK auth.users ON DELETE CASCADE | |
| partner_id | uuid FK partners ON DELETE CASCADE | |
| invited_by | uuid FK auth.users ON DELETE SET NULL | quem convidou |
| access_enabled | boolean default true | |
| beta_role | text default 'partner' | |
| notes | text | |
| created_at / updated_at | timestamptz | trigger `update_updated_at_column` |
| UNIQUE (user_id, partner_id) | | |

**RLS:**
- SELECT: o próprio usuário lê o próprio registro; admin lê tudo.
- ALL: somente admin Roxou (`is_admin()`).

### `partner_beta_feedback`
Feedback enviado pelo widget flutuante.
| coluna | tipo |
| --- | --- |
| id | uuid PK |
| user_id | uuid FK auth.users |
| partner_id | uuid FK partners |
| page | text (rota de origem) |
| message | text NOT NULL |
| created_at | timestamptz |

**RLS:**
- SELECT: próprio usuário ou admin.
- INSERT: somente quem tem `can_access_partner_beta(auth.uid())`.

### `partner_beta_metrics`
Eventos de uso medidos automaticamente.
| coluna | tipo |
| --- | --- |
| id | uuid PK |
| user_id | uuid |
| partner_id | uuid (nullable) |
| page | text |
| action | text NOT NULL |
| metadata | jsonb default '{}' |
| created_at | timestamptz |

**Ações capturadas:** `login`, `open_dashboard`, `edit_profile`,
`create_event`, `open_reservations`, `open_vip_list`, `open_analytics`,
`open_settings`, `feedback_sent`.

**RLS:**
- SELECT: próprio usuário ou admin.
- INSERT: somente quem tem `can_access_partner_beta(auth.uid())`.

## Helper

```sql
public.can_access_partner_beta(_user uuid) → boolean
-- true se _user é admin OU tem registro ativo em partner_beta_access.
```

`SECURITY DEFINER`, `STABLE`, `SET search_path = public`. Executável apenas
por `authenticated` e `service_role`.

## Hook

`src/apps/partner/hooks/usePartnerBetaAccess.ts` retorna:

```ts
{
  hasAccess: boolean;   // admin OU parceiro beta ativo
  isAdmin: boolean;
  partnerIds: string[]; // estabelecimentos liberados ao usuário
  loading: boolean;
  userId: string | null;
}
```

Recalcula em `onAuthStateChange`.

## Gate do Preview

`PartnerPreviewLayout` (Fase 9J) foi atualizado:

1. Não está mais dentro de `AdminLayout` — é uma rota top-level
   `/admin/partner-preview/*` no `App.tsx`.
2. Usa `usePartnerBetaAccess` para gatear:
   - sem sessão → `Navigate to="/auth"`
   - sem beta + não admin → tela amigável "acesso restrito"
   - admin OU beta ativo → renderiza `<PartnerProvider/>` + sub-nav.
3. Banner permanente: **"BETA FECHADO · Sujeito a alterações"** (badge
   "Admin" extra quando aplicável).
4. Registra métricas automaticamente: `login` na entrada e a ação
   correspondente em cada troca de rota monitorada.

## Tela de boas-vindas

`PartnerBetaLandingPage` (`/admin/partner-preview`) lista os recursos
disponíveis: Eventos, Reservas, Lista VIP, Analytics, Perfil, Configurações,
com chamadas para cada seção e regras do programa beta.

## Widget de feedback

`PartnerFeedbackWidget` — botão flutuante no canto inferior direito do
layout. Abre popover com `<Textarea/>` e envia para `partner_beta_feedback`
incluindo `page` (pathname atual) e `partner_id` selecionado. Mostra `toast`
de sucesso/erro. Também registra `feedback_sent` em `partner_beta_metrics`.

## Rotas

```
/admin/partner-preview                  → PartnerBetaLandingPage
/admin/partner-preview/dashboard        → PartnerDashboardPage
/admin/partner-preview/perfil           → PartnerProfilePage
/admin/partner-preview/eventos          → PartnerEventsPage
/admin/partner-preview/reservas         → PartnerReservationsPage
/admin/partner-preview/lista-vip        → PartnerVipListPage
/admin/partner-preview/lista-vip/:id    → PartnerVipListDetailRoute
/admin/partner-preview/analytics        → PartnerAnalyticsPage
/admin/partner-preview/configuracoes    → PartnerSettingsPage
```

Todas lazy-loaded. Item "Partner Pro Preview" continua no menu admin
(`src/config/adminNavigation.ts`).

## Como conceder acesso beta

Executar via Admin/SQL:

```sql
INSERT INTO public.partner_beta_access (user_id, partner_id, invited_by, notes)
VALUES ('<uid>', '<partner_id>', '<admin_uid>', 'Beta wave 1');
```

Revogar:

```sql
UPDATE public.partner_beta_access
SET access_enabled = false
WHERE user_id = '<uid>' AND partner_id = '<partner_id>';
```

## Não realizado nesta fase
- ❌ `parceiro.roxou.com.br` (subdomínio)
- ❌ multi-entry Vite
- ❌ nginx / DNS
- ❌ login público para parceiros
- ❌ auto-cadastro
- ❌ cobrança / Stripe / Mercado Pago

## Validação
- Migration aplicada.
- `npx tsc --noEmit` ✅ verde.
- Avisos do linter Supabase: apenas o padrão "Public Can Execute SECURITY
  DEFINER Function" para `can_access_partner_beta` — intencional, função
  precisa ser invocável por `authenticated` para o gate funcionar e ela mesma
  valida o `_user`.
- Usuários sem registro em `partner_beta_access` e sem role admin não
  conseguem acessar `/admin/partner-preview/*`.
- Admin continua com acesso total (banner "Admin" visível).
- Roxou pública e Admin atual permanecem intocados.
