## Refatoração Partner Pro — Mobile-first

### Nova arquitetura de navegação (5 abas)

Substituir o `PartnerBottomNav` atual por 5 itens:

| Ícone | Label | Rota |
|---|---|---|
| 🏠 | Início | `/partner` |
| 📅 | Reservas | `/partner/reservas` |
| ⏳ | Fila | `/partner/fila` |
| 📈 | Relatórios | `/partner/relatorios` |
| ⚙️ | Configurações | `/partner/configuracoes` |

Rotas antigas (`/partner/eventos`, `/partner/vip-list`, `/partner/analytics`, `/partner/settings`, `/partner/profile`, `/partner/validator`) **permanecem funcionando** via redirects e acessíveis a partir do menu Configurações / ações rápidas. Nada de mudar Supabase, RLS, hooks de dados ou serviços.

### Telas

**🏠 Início (`PartnerHomePage`)**
- Hero de ocupação com **progress ring** (capacidade ocupada × total) e badge de status de movimento (Tranquilo / Aquecendo / Cheio / Lotado), derivado dos dados já consumidos por `OccupancyInsightsPremium` + `LiveOperationsPanel`.
- Central de alertas clicável (reaproveita `PartnerNotificationsCenter`) num card compacto que abre sheet com a lista completa.
- KPIs do dia (reservas, check-ins, fila, no-show) em grid 2 col.
- FAB → **Bottom Sheet de Ações Rápidas**: Nova Reserva, Chamar Próximo, Compartilhar Link Público, Mostrar QR.

**📅 Reservas (`PartnerReservasPage`)**
- Tabs: **Ativas · Pendentes · Check-in · Histórico**.
- Cada tab usa o mesmo `useReservations` já existente, só muda o filtro de status.
- Cards `ReservationCard` redesenhados (variant `compact-mobile`): linha 1 nome + horário; linha 2 pessoas · mesa/área · tempo restante; linha 3 status badge + ações principais.

**⏳ Fila (`PartnerFilaPage`)**
- Tabs: **Mesas · Bistrôs · Camarotes · Lista de Espera**.
- Reaproveita `WaitlistManager` parametrizado por tipo (já existe `reservation_types`).
- Card de cliente: avatar inicial, pessoas, mesa/área alvo, tempo de espera (cronômetro) e expiração estimada.

**📈 Relatórios (`PartnerRelatoriosPage`)**
- Tabs: **Hoje · Semana · Mês · IA**.
- Hoje = `DailyOperationsReport`; Semana = `WeeklyHeatmap` + `GrowthSummaryCard`; Mês = `ExecutiveAnalyticsHero` (filtro 30d); IA = `OccupancyInsightsPremium` + insights existentes.

**⚙️ Configurações (`PartnerConfiguracoesPage`)**
- Lista de categorias (estilo iOS Settings): Perfil público · Horários · Reservas · Tipos de mesa · VIP/Listas · Equipe · Assinatura · Notificações · Sair.
- Cada item navega para a página correspondente já existente (sem alterar formulários).

### UI / estilo

- Novo arquivo `src/apps/partner/styles/partner-pro.css` com tokens mais sóbrios: reduzir `--partner-glow-*` (opacidades ~40%→18%), aumentar contraste de texto secundário (`text-muted-foreground` ≥ 70% L em dark).
- Componente compartilhado `PartnerScreen` (header sticky + safe areas + scroll container) usado por todas as telas.
- `PartnerActionsSheet` novo componente (shadcn `Sheet` lado `bottom`) com os 4 atalhos.
- `OccupancyRing` novo componente SVG reutilizando dados de ocupação.

### O que NÃO muda

- Schema/migrations Supabase, políticas RLS, edge functions.
- Hooks de dados (`useReservations`, `useWaitlist`, `usePartnerAnalytics` etc.).
- Tracking/analytics existente (eventos mantidos; só adiciono `partner_nav_*` para as novas abas).
- Páginas de detalhe (`PartnerReservationDetailPage`, `PartnerEventDetailPage`, VIP detail, validator, login, onboarding) — só recebem o novo layout/header.
- Admin, Public, Expo, VIP público, Search.

### Arquivos principais

Criar:
- `pages/PartnerHomePage.tsx`
- `pages/PartnerReservasPage.tsx`
- `pages/PartnerFilaPage.tsx`
- `pages/PartnerRelatoriosPage.tsx`
- `pages/PartnerConfiguracoesPage.tsx`
- `components/PartnerScreen.tsx`
- `components/PartnerActionsSheet.tsx`
- `components/OccupancyRing.tsx`
- `components/PartnerAlertsCenter.tsx` (wrapper clicável de `PartnerNotificationsCenter`)
- `styles/partner-pro.css`

Editar:
- `components/PartnerBottomNav.tsx` (5 itens + safe-area + grid)
- `components/ReservationCard.tsx` (variant compact-mobile)
- `App.tsx` ou router do partner (novas rotas + redirects das antigas)
- `layouts/PartnerStandaloneLayout.tsx` (header mais leve, safe-area)

### Validação

`bun run typecheck` e `bun run build`. Verificação visual rápida via Playwright headless nas 5 telas em 360×800.

---

Posso seguir com esta refatoração?