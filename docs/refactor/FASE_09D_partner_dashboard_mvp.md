# Fase 9D — Roxou Partner Pro · Dashboard MVP

Status: concluída · sem expor `parceiro.roxou.com.br` · sem alterações em `src/App.tsx`.

## Princípio

Fonte única dos estabelecimentos continua sendo a tabela `partners`. Nenhum
`partner_profiles`, `company_profiles` ou `establishments` foi criado.

## Estrutura criada

### Páginas funcionais (`src/apps/partner/pages/`)
- `PartnerDashboardPage.tsx` — perfil, métricas 7d, eventos recentes, assinatura, award, contadores.
- `PartnerProfilePage.tsx` — leitura completa de `partners` (edição ainda desativada).
- `PartnerAnalyticsPage.tsx` — totais 7d/30d + tabela diária a partir de `partner_metrics_daily`.

### Componentes (`src/apps/partner/components/`)
- `PartnerMetricsCards` — KPIs (views, favoritos, cliques, reservas, VIP).
- `PartnerQuickActions` — atalhos visuais desativados (próximas fases).
- `PartnerSubscriptionCard` — plano + status a partir de `partner_subscriptions`.
- `PartnerProfileCard` — logo, nome, tipo, endereço, instagram, verificado.
- `PartnerRecentEvents` — últimos 5 eventos do partner.
- `PartnerAwardBadge` — selo "destaque do mês" de `partner_awards`.
- `PartnerEmptyState` — estado vazio quando não há vínculo.

### Services (`src/apps/partner/services/`)
- `partnerDashboard.ts` — `getPartnerDetails`, `getPartnerCurrentAward`, `getPartnerRecentEvents`, `getPartnerEventCounts`.
- `partnerMetrics.ts` — `getPartnerMetrics` (7d/30d + série diária), `getPartnerPageViewsTotal` (fallback).

## Dados utilizados (somente leitura)

| Origem                  | Uso                                      |
|-------------------------|------------------------------------------|
| `partners`              | Perfil, logo, endereço, instagram, tipo  |
| `partner_users`         | Vínculo do usuário (via Fase 9C)         |
| `partner_subscriptions` | Plano e status                           |
| `partner_metrics_daily` | Views, clicks, favoritos, reservas, VIP  |
| `partner_awards`        | Selo de destaque do mês                  |
| `events`                | Lista recente e contadores               |
| `page_views`            | Fallback opcional para total de views    |

## Plano de assinatura
`free`, `pro`, `premium`, `enterprise` — derivado de `partner_subscriptions.plan`,
com fallback para `free` quando não houver linha ativa.

## Limitações atuais

- Sem rota registrada — páginas só existem para uso interno/futuro subdomínio.
- Reservas e Lista VIP são placeholders (sem tabela própria nesta fase).
- Perfil é read-only (a escrita em `partners` virá em fase posterior, respeitando RLS existente).
- Sem gráficos (apenas tabela diária); chart visual entra em fase seguinte.
- Quick Actions são apenas decorativas.
- Nenhuma migration aplicada, nenhuma alteração de RLS.

## Validação
- `tsc --noEmit` esperado verde — todos os imports resolvem.
- Sem novos imports em `src/App.tsx` → bundle público inalterado (páginas órfãs).
- ESLint: arquivos novos respeitam regras existentes (react-refresh, etc.).

## Próximos passos sugeridos
- Fase 9E: layout + navegação interna do Partner Pro + rota interna oculta para QA.
- Fase 9F: edição de `partners` com permissão `canEditProfile`.
- Fase 9G: subdomínio `parceiro.roxou.com.br` (multi-entry Vite ou rewrite Nginx).
