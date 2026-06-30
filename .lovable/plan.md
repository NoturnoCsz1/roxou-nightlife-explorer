# Partner Pro V2 — Plano por Ondas

Baseado na auditoria: 65+ rotas, 9 páginas > 400 linhas, 16 services, 8 duplicações de rota, 2 módulos ausentes (Cardápio e Integrações dedicada). Nada de novas tabelas/RPCs. Cada onda termina com typecheck + build verdes antes da próxima.

---

## Detecção de papel (base para a Onda 1)

O projeto já tem três fontes de papel — vou **consolidar num único hook** sem inventar nada:

1. `user_roles` (`app_role` enum: `admin`, etc.) — usado por `has_role()` no RLS.
2. `partner_users.role` — owner/admin/manager do estabelecimento.
3. `partner_staff_accounts` — papéis operacionais (`validador`, `recepcao`, `caixa`, `gerente`).
4. `partner_promoters` (linkado por `user_id`/e-mail) — promoter externo.

**Critério final único** em `usePartnerRole()`:

- `admin` global → vê tudo (modo super).
- `partner_users.role` ∈ {`owner`, `admin`, `manager`} → painel completo do estabelecimento.
- `partner_staff_accounts.role` → painel operacional restrito (sem configurações).
- `partner_promoters` ligado ao `auth.uid()` (ou e-mail confirmado) e não está acima → modo **Promoter exclusivo**.

Esse hook vira a fonte única para gates de menu, rotas e tiles.

---

## Onda 1 — Navegação, papéis e Dashboard (esta semana)

### O que entra

1. `usePartnerRole()` novo hook unificando as 4 fontes acima. Reusa `usePartnerAuth`, `usePartnerBetaAccess`, services existentes.
2. `partnerNavigation.ts` (config) — agrupa rotas por contexto:
  - **Operação**: Dashboard, Reservas, Atendimento, Check-in (Validator), Equipe
  - **Marketing**: Eventos, Lista VIP, Promoters, Bio, Cardápio*, QR Codes, Analytics
  - **Negócio**: Relatórios, CRM, Clientes
  - **Configurações**: Estabelecimento, PIX, Integrações, WhatsApp, Instagram, Google, Assinatura, Sistema
  - *Cardápio fica como item "em breve" se não existir página; não cria nada novo.
3. **Sidebar desktop nova** (`PartnerSidebar`) com shadcn `sidebar` collapsible="icon" + grupos. Mantém o `PartnerBottomNav` mobile.
4. `PartnerHomePage` vira Centro de Operações: Casa aberta/fechada, Reservas do dia, Receita prevista, Check-ins, Lista de espera, Taxa de ocupação, Próxima reserva, Evento do dia, Promoter destaque, Timeline. Tudo reusando `partnerAnalytics`, `partnerReservations`, `partnerDashboard`, `promoterCentral`, `partnerEvents`. Compõe novos cards a partir de componentes que já existem (`KpiCard`, `LiveOperationsPanel`, `ExecutiveDashboard`, `UpcomingReservationCard`, `OccupancyRing`, `WeeklyHeatmap`).
5. **Modo Promoter exclusivo**: quando `usePartnerRole()` = `promoter`, sidebar mostra apenas Dashboard, Campanhas, QR, Links, Lista VIP, Reservas, Excursões, Comissões, Ranking, Metas, Perfil. Tudo já existe dentro de `PartnerPromoterCentralPage` — vou apenas separar em **rotas filhas** dessa página para virar navegação real.
6. **Deduplicar rotas** (`/fila`, `/transportes/*`, `/configuracoes/operacao`): manter o caminho canônico, transformar o duplicado em `<Navigate>` (sem quebrar links existentes).

### O que NÃO entra

Reservas detalhado, Atendimento renomeado, Cardápio inteligente, Relatórios executivos, Configurações agrupadas, Bio integrada, Mobile audit, Performance — vão para ondas seguintes.

### Risco

Médio. Mexe em layout/sidebar (todos veem) e em detecção de papel. Mitigado por: feature flag local opcional (`?legacyNav=1`) durante a primeira validação.

---

## Onda 2 — Reservas, Atendimento, Relatórios

1. **Reservas reorganizada** por contexto: Operação (Dashboard, Lista, Atendimento, Check-in, Mesas, Equipe) vs Configuração (Tipos, Configurações). Sem mover arquivos — só reagrupar via menu e adicionar sub-tabs.
2. **Renomear "Fila" → "Atendimento"** com abas Mesas / Bistrôs / Camarotes / Lista de Espera / Clientes Presentes / Chamadas. Componentes já existem (`WaitlistManager`, `ReservationCard`, `OccupancyInsightsPanel`).
3. `PartnerRelatoriosPage` vira Dashboard Executivo. Reusa `partnerAnalytics`, `partnerMetrics`, `partnerReservations` para Receita, No-show, Ticket médio, Heatmap, Funil. Sem novas queries — apenas agrega o que `partnerAnalytics` já calcula.
4. Decidir o futuro de `PartnerAnalyticsPage` vs `PartnerRelatoriosPage`: um dos dois vira “Executivo”, o outro vira drill-down. Documento de decisão antes de mexer.

### Risco

Médio. Mexe em fluxo de produção (Reservas).

---

## Onda 3 — Cardápio inteligente, Bio integrada, Configurações agrupadas

1. **Cardápio inteligente** dentro do `PartnerBioHubPage` (`menu_categories` + `menu_items` já existem). Sem novas tabelas: combos / mais vendidos / "complete seu pedido" calculados em runtime a partir de `bio_analytics_events`. Adiciona tabs no editor de menu, sem nova rota.
2. **Bio integrada** ao painel: a aba "Marketing → Bio" usa o mesmo `BioTabs` já existente, com split-view Editor + Preview. Sem módulo separado.
3. **Configurações agrupadas** em accordion: Estabelecimento, Operação, Marketing, Financeiro, Integrações, Sistema. Subpáginas existentes viram seções dentro de `PartnerConfiguracoesPage` (sem deletar rotas — mantém deep-link).
4. **Página "Integrações"** dedicada agregando WhatsApp / Instagram / Google que hoje vivem dispersos no perfil.

### Risco

Médio-baixo. Cardápio é o mais novo, mas isolado.

---

## Onda 4 — Mobile, Performance, Refactor

1. **Auditoria mobile** de todas as páginas grandes (>400 linhas). Corrige overflow horizontal, scroll horizontal, tabs cortadas, safe-area, espaçamentos. Sem redesign.
2. **Quebrar páginas > 500 linhas** (`PartnerPromoterCentralPage` 911, `PartnerValidatorPage` 566, `PartnerLimpezaPage` 484) em subcomponentes + hooks. Não muda comportamento.
3. **Performance**:
  - `React.memo` em cards de listas grandes (reservas, listas VIP, viagens).
  - Skeleton padronizado via `SkeletonBlock` em todas as páginas com `useQuery`.
  - Debounce em buscas (CRM, Listas, Reservas) — `useDebouncedValue` simples.
  - Tornar `PartnerLoginPage` lazy também (única rota síncrona não-essencial pós-bundle).
  - Auditar `staleTime` e `gcTime` de queries pesadas (`partnerAnalytics`, `promoterCentral`).
4. **Consolidar services sobrepostos**: `partnerMetrics` + `partnerDashboard` viram um único `partnerKpis` (sem mudar API pública dos consumidores — re-export).

### Risco

Baixo. Refactor sem mudança de comportamento.

---

## Entrega ao fim de cada onda

- `bunx tsgo --noEmit` verde
- `bun run build` verde
- Resumo do que mudou, arquivos tocados, duplicações eliminadas
- Lista do que ficou para a próxima onda

---

## Decisões que preciso de você antes da Onda 1

1. **Sidebar desktop** com `shadcn/sidebar` collapsible (recomendado) ou continuar com nav horizontal e só agrupar com dropdowns?
2. **Promoter exclusivo**: se o login for promoter, **bloquear** o resto do painel (mesmo que o usuário seja owner de outro partner) ou só **mudar o default** e ainda permitir trocar de contexto?
3. **Rotas duplicadas (**`/transportes/*` **vs** `/excursoes/*`**)**: posso manter `/excursoes/*` como canônico e redirecionar `/transportes/*` para lá (mais curto e já é o nome interno), ou o público vai pelo `/transportes` e devo inverter?

Confirme as 3 decisões e dou início imediato à Onda 1.

&nbsp;

1. Sidebar desktop:

Usar shadcn/sidebar collapsible.

No desktop, navegação lateral agrupada por contexto.

No mobile, manter PartnerBottomNav.

&nbsp;

2. Promoter exclusivo:

Se o usuário for apenas promoter, bloquear o restante do painel e mostrar somente o modo Promoter.

Se o mesmo usuário também for owner/admin/manager de algum partner, permitir trocar contexto e acessar o painel completo daquele partner.

&nbsp;

3. Rotas duplicadas:

Manter /transportes como rota canônica pública/comercial.

Redirecionar /excursoes para /transportes quando fizer sentido.

Motivo: “Transportes” é mais amplo e comporta excursões, caronas, privativo e futuras modalidades.