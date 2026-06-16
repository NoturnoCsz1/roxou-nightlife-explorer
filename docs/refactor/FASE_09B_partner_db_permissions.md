# Fase 9B — Roxou Partner Pro: Base de Banco e Permissões

Data: 2026-06-16
Status: ✅ Aplicada

## Princípio

A tabela `public.partners` continua sendo a **fonte única** dos estabelecimentos.
Esta fase **não** cria cadastro paralelo. Não existe `partner_profiles`.
Toda a camada Partner Pro **se conecta à `partners` existente** via FK em `partner_users.partner_id`.

## Objeto criados

### Tabelas
- `public.partner_users` — vínculo `auth.users` ↔ `partners` + papel (`owner|admin|editor|attendant`) + `is_active`.
- `public.partner_subscriptions` — plano (`free|pro|premium|enterprise`) e status (`trial|active|past_due|canceled|expired`) por parceiro.
- `public.partner_metrics_daily` — métricas diárias agregadas (views, clicks, favorites, reservations, vip_signups) por `(partner_id, date)`.

### Funções (SECURITY DEFINER, search_path=public)
- `public.is_partner_member(_user uuid, _partner uuid) returns boolean` — vínculo ativo em `partner_users`.
- `public.is_partner_owner_or_admin(_user uuid, _partner uuid) returns boolean` — vínculo ativo com role `owner` ou `admin`.

Ambas seguem o mesmo padrão de `public.has_role` / `public.is_admin` para evitar recursão em RLS.

### Triggers
- `update_partner_users_updated_at` e `update_partner_subscriptions_updated_at` reutilizam `public.update_updated_at_column()`.

### GRANTs
Todas as três tabelas:
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`
- `GRANT ALL ... TO service_role`
- **Sem grant para `anon`** — nenhum acesso público.

## Modelo de segurança (RLS)

Todas as tabelas têm RLS habilitada.

| Tabela | Quem | O quê |
|---|---|---|
| `partner_users` | Admin Roxou (`is_admin()`) | ALL |
| `partner_users` | Usuário autenticado | SELECT do **próprio** vínculo |
| `partner_users` | Owner/Admin do parceiro | SELECT/INSERT/UPDATE/DELETE de membros do **seu** parceiro |
| `partner_subscriptions` | Admin Roxou | ALL |
| `partner_subscriptions` | Owner/Admin do parceiro | SELECT + UPDATE da própria assinatura |
| `partner_metrics_daily` | Admin Roxou | ALL |
| `partner_metrics_daily` | Qualquer membro ativo do parceiro | SELECT |
| Todas | `anon` | ❌ nenhum acesso |

Inserção/atualização de métricas em produção será feita por edge functions (service_role), portanto não foi exposta a `authenticated` além do bypass de admin.

## Regras de papel

- `owner` — dono do estabelecimento, pode tudo dentro do parceiro.
- `admin` — equivalente a owner para gestão (pode adicionar/remover usuários).
- `editor` — criará/editará eventos e conteúdo (regras específicas serão aplicadas em fases seguintes).
- `attendant` — operação de reservas/lista VIP (regras específicas em fases seguintes).

Hoje, no RLS desta fase, **`editor` e `attendant` têm leitura** dos próprios vínculos e das métricas do parceiro, mas **não podem gerenciar usuários nem alterar a assinatura**.

## Exemplos de uso

### Vincular manualmente um usuário a um parceiro existente
Executar via admin (psql ou edge function com `service_role`):

```sql
INSERT INTO public.partner_users (user_id, partner_id, role, is_active)
VALUES ('<uuid-do-usuario>', '<uuid-do-partner>', 'owner', true);
```

Caso o usuário ainda não exista em `auth.users`, criar primeiro via fluxo de signup (Lovable Auth) e depois rodar o INSERT acima.

### Criar assinatura inicial trial
```sql
INSERT INTO public.partner_subscriptions (partner_id, plan, status, started_at, expires_at)
VALUES ('<uuid-do-partner>', 'pro', 'trial', now(), now() + interval '14 days');
```

### Consultar métricas dos últimos 30 dias (do lado do membro autenticado)
```sql
SELECT date, views, clicks, favorites, reservations, vip_signups
FROM public.partner_metrics_daily
WHERE partner_id = '<uuid-do-partner>'
  AND date >= current_date - 30
ORDER BY date DESC;
```
A RLS garante que apenas membros ativos daquele parceiro veem o resultado.

### Verificar se um usuário é owner/admin (em código)
```ts
const { data } = await supabase.rpc('is_partner_owner_or_admin', {
  _user: user.id,
  _partner: partnerId,
});
```

## O que NÃO mudou

- ✅ Nenhuma rota alterada
- ✅ Nenhuma UI alterada
- ✅ `src/App.tsx` intacto
- ✅ Vite multi-entry intacto
- ✅ Nginx / subdomínio intactos
- ✅ Páginas Partner (placeholders 9A) intactas
- ✅ Tabela `partners` intacta — nenhuma coluna adicionada/removida
- ✅ Lógica de eventos intacta
- ✅ Reservas / lista VIP — não tocadas (fases futuras)

## Validação

- **Migração**: aplicada com sucesso.
- **Linter Supabase**: warnings genéricos sobre `SECURITY DEFINER` callable por authenticated/anon — mesmo padrão já usado em `has_role`, `is_admin`, `is_partner_member`, `is_partner_owner_or_admin`. É o padrão correto e exigido (evita recursão em RLS).
- **TypeScript / Build**: nenhum código de aplicação foi alterado nesta fase. Tipos do Supabase serão regenerados automaticamente.
- **Rotas**: nenhuma rota foi adicionada, removida ou modificada.
- **UI**: nenhuma alteração visual.

## Próximos passos (fora desta fase)

- 9C: vincular Lovable Auth ao fluxo Partner (login + contexto do parceiro selecionado).
- 9D: hooks `usePartnerMembership`, `usePartnerMetrics`, `usePartnerSubscription`.
- 9E: rotas `/partner/*` registradas e layout autenticado.
