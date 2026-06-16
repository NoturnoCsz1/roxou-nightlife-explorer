# FIX — Partner Pro Analytics com métricas reais

## Causa raiz
A página `/analytics` consultava apenas `partner_metrics_daily`, que ainda está vazia
para a maioria dos parceiros, e exibia "em breve" para reservas/VIP. Não havia
agregação a partir das tabelas operacionais (`partner_vip_list_entries`,
`partner_leads`, `partner_promoters`, `partner_reservations`, `partner_vip_lists`).

## Mudanças
- Novo serviço `src/apps/partner/services/partnerAnalytics.ts` que agrega dados reais:
  - KPIs (views/clicks/favorites com fallback para `page_views`, inscrições, check-ins,
    no-show, taxa de presença, leads, promoters ativos, reservas, eventos vinculados);
  - Breakdown de Lista VIP (ativas/fechadas/encerradas, inscritos, check-ins, presença);
  - Breakdown de Leads (WhatsApp/e-mail/sem consentimento, novos no período);
  - Ranking de promoters (inscritos, check-ins, no-show, conversão).
- `PartnerAnalyticsPage` reescrita:
  - Filtro de período (7d/30d/Tudo), padrão 7d.
  - Skeleton de loading, mensagem amigável de erro.
  - Estado vazio claro ("Nenhum dado registrado ainda…").
  - Mobile: cards em 1–2 colunas, ranking vira lista de cards, sem overflow horizontal.
  - Sem mais placeholders "em breve".

## Segurança
- Todas as queries são filtradas por `partner_id = selectedPartnerId`. As RLS
  existentes (`is_partner_member` / `is_partner_reservation_manager`) já restringem
  a leitura por parceiro; admin enxerga via `is_admin()`. Nenhuma alteração de RLS.

## Validação
- `tsc`/build executados pelo harness.
- Teste manual sugerido com Cultura Prudente: criar inscrição VIP → check-in →
  abrir `/analytics` → números atualizam (7d e Tudo).
