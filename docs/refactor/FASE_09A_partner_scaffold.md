# Fase 9A — Roxou Partner Pro (scaffold)

## Objetivo

Criar a base estrutural de `src/apps/partner/` para o futuro
`parceiro.roxou.com.br`, sem qualquer impacto em produção.

## Princípio arquitetural

Tabela `partners` permanece como **fonte única** dos dados institucionais
do estabelecimento. Nenhuma tabela paralela de cadastro é criada
(`partner_profiles`, `company_profiles`, `establishments`, `businesses` —
proibidos). Tabelas novas planejadas para 9B são apenas relacionais:

- `partner_users` (vínculo user ↔ partner + role)
- `partner_subscriptions`
- `partner_metrics_daily`
- `partner_reservations`
- `vip_list_entries`

Todas com FK em `partner_id` apontando para `partners.id`.

## O que foi feito nesta fase

- Criada a árvore `src/apps/partner/{pages,components,hooks,services,layouts,routes,contexts,types}`.
- Criados 8 placeholders de página:
  - `PartnerLoginPage`
  - `PartnerDashboardPage`
  - `PartnerProfilePage`
  - `PartnerEventsPage`
  - `PartnerReservationsPage`
  - `PartnerVipListPage`
  - `PartnerAnalyticsPage`
  - `PartnerSettingsPage`
- Criado `pages/index.ts` com re-exports.
- Criado `types/index.ts` com `PartnerRole`, `PartnerSubscriptionPlan`,
  `PartnerSubscriptionStatus`, `PartnerUserLink`.
- README atualizado descrevendo escopo e próximas fases.

## O que NÃO foi feito (por design)

- Nenhuma rota adicionada em `src/App.tsx`.
- Nenhuma migration aplicada.
- Nenhuma Edge Function criada/alterada.
- Nenhum subdomínio / nginx / multi-entry alterado.
- Nenhum import dos placeholders em código de produção
  (tree-shaking garante bundle inalterado).

## Validação

- `tsc --noEmit` verde.
- `eslint` 0/0 nos arquivos criados.
- `vite build` verde.
- Bundle de produção inalterado (nenhum import ativo).
- Roxou pública, Admin e rotas existentes intactos.

## Próximas fases

- **9B** — Migrations + RLS das tabelas auxiliares.
- **9C** — Auth gate parceiro + `PartnerLayout` + rotas.
- **9D** — Dashboard real (métricas a partir de `analytics_events`/`page_views`).
- **9E** — Eventos, reservas, lista VIP.
- **9F** — Subdomínio `parceiro.roxou.com.br`.
