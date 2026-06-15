# apps/partner — Roxou Partner Pro

Scaffold da Fase 9A do `parceiro.roxou.com.br`.

## Princípio

NÃO existe nova tabela de cadastro de estabelecimento. Toda a informação
institucional do parceiro continua vindo da tabela `partners` existente.
Tabelas novas (`partner_users`, `partner_subscriptions`,
`partner_metrics_daily`, `partner_reservations`, `vip_list_entries`) são
apenas relacionais (FK em `partner_id`).

## Estado atual (Fase 9A)

- Apenas scaffold de pastas e placeholders.
- Nenhuma rota registrada em `App.tsx`.
- Nenhuma migration aplicada.
- Nenhum subdomínio configurado.
- Nenhum impacto em Roxou pública, Admin ou bundle.

## Estrutura

```
src/apps/partner/
├── pages/         # PartnerLoginPage, PartnerDashboardPage, ...
├── components/    # UI específica do painel parceiro
├── hooks/         # useCurrentPartner, usePartnerRole, ...
├── services/      # camada de acesso a partners/* e tabelas auxiliares
├── layouts/       # PartnerLayout (futuro)
├── routes/        # definição de rotas (futuro)
├── contexts/      # PartnerContext, AuthContext (futuro)
├── types/         # tipos compartilhados do painel parceiro
└── README.md
```

## Páginas (placeholders)

- `PartnerLoginPage`
- `PartnerDashboardPage`
- `PartnerProfilePage`
- `PartnerEventsPage`
- `PartnerReservationsPage`
- `PartnerVipListPage`
- `PartnerAnalyticsPage`
- `PartnerSettingsPage`

## Roles previstos

`owner`, `admin`, `editor`, `attendant`.

## Próximas fases

- 9B — migrations (`partner_users`, `partner_subscriptions`, etc.) + RLS.
- 9C — auth gate parceiro + layout + rotas.
- 9D — dashboard com métricas reais.
- 9E — eventos, reservas, lista VIP.
- 9F — subdomínio `parceiro.roxou.com.br` + nginx + multi-entry.
