# Sprint UI/UX Premium — Roxou Partner Pro

Reposicionar o Partner Pro de "ferramenta admin" para SaaS premium mobile-first (OpenTable / Uber Driver). **Zero alterações em backend, RLS, RPC, migrations, lógica de reservas, Lista VIP, Conta Roxou, comprovantes, QR, analytics ou VPS.** Apenas UI/UX, consumindo dados já existentes.

---

## Fase 1 — Design System Roxou (base)

Sem isso, o resto fica inconsistente.

- `src/apps/partner/styles/partner-ui.css` (novo, importado no `App.tsx` do Partner): tokens dedicados ao painel — `--partner-radius: 24px`, spacing scale 4/8/12/16/20/24, glass tokens (`--partner-glass-bg`, `--partner-glass-border`, `--partner-glass-shadow`), gradiente Roxou (`--partner-gradient: linear-gradient(135deg, hsl(var(--primary)) 0%, #a855f7 50%, #ec4899 100%)`).
- `src/apps/partner/components/ui/` (novo): `GlassCard.tsx`, `KpiCard.tsx`, `StatusDot.tsx`, `SectionHeader.tsx`, `SkeletonBlock.tsx`. Cada componente usa tokens, animações `animate-fade-in` / `hover-scale`, alturas 90–110px nos KPIs.
- Aproveita o que já existe em `index.css` (cores, fontes Space Grotesk / Inter). Nada de cor hardcoded — tudo via tokens.

## Fase 2 — Dashboard Reservas (itens 1, 2, 3, 5)

Refatorar `PartnerReservationsPage.tsx` consumindo os mesmos dados que ele já carrega via `partnerReservations` service e o `DailyOperationsReport` existente.

- **Hero Card** (novo, `ReservationHeroCard.tsx`): glass + gradiente Roxou, mostra data atual (SP via `dateUtils`), confirmadas / pendentes / lista de espera / receita prevista, próxima reserva, próximo slot livre, ocupação % e mesas livres. Calculado em memo a partir das reservas já carregadas + `get_reservation_slot_availability` (já consumido pelo `OccupancyInsightsPanel`/público — sem nova RPC).
- **KPI Grid** (`ReservationKpiGrid.tsx` substitui o bloco superior do atual `ReservationStats`): 7 cards (Hoje, Confirmadas, Receita, Lista espera, Check-ins, No-show, Mesas liberadas). Grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, altura `min-h-[96px]`, ícones lucide, gradiente sutil por categoria. Mantém `ReservationStats.tsx` por compatibilidade mas o page passa a renderizar o novo grid.
- **Timeline Operacional** (`ReservationTimeline.tsx`): linha vertical com slot `HH:mm`, dot de status, nome, tipo, pessoas. Clique abre o `ReservationCard`/detalhe que já existe.
- **Reservas do dia (lista premium)**: reescrita visual de `ReservationCard.tsx` em modo "compact premium" (novo prop `variant="premium"`), botões `min-h-[44px]`, grid `grid-cols-2 md:grid-cols-5` para WhatsApp / Comprovante / Liberar / Concluir / Cancelar. Sem alterar handlers nem service.

## Fase 3 — Waitlist, IA, Heatmap (itens 4, 6, 7)

- `WaitlistManager.tsx` → cards glass premium: `#N` grande, nome, tipo + lugares, pessoas, "há X min" (já calculado), badge prioridade (derivada do tempo de espera, puro front). Botões Notificar / WhatsApp / Cancelar com `min-h-[44px]`, layout em coluna no mobile.
- `WeeklyHeatmap.tsx` (novo): consome as reservas dos últimos 7 dias já trazidas, agrupa por dia da semana (helper SP de `dateUtils`), renderiza barras horizontais com gradiente. Sem nova query — usa a janela já carregada; se faltar histórico, fallback "Coletando dados".
- `OccupancyInsightsPanel.tsx` repaginado: cards com ícone por tipo, barra de confiança (low/medium/high → 33/66/100%), gradiente Roxou no botão "Aplicar sugestão". Lógica de aplicar mantida (chama o mesmo update).

## Fase 4 — Navegação Mobile + Polish (itens 8, 10)

- `PartnerBottomNav.tsx` (novo) renderizado em `PartnerLayout` apenas em `< md`. 5 itens (Dashboard, Reservas, Fila, Relatório, Config). `fixed bottom-0`, `pb-[env(safe-area-inset-bottom)]`, `backdrop-blur-xl`, item ativo com pílula gradiente. Header desktop permanece igual.
- Padding inferior `pb-24 md:pb-0` nas páginas para não cobrir conteúdo.
- Auditoria responsiva 360 / 390 / 412 / 768 / 1024: `overflow-x-hidden` no shell, `truncate` / `min-w-0` nos cards, `flex-wrap` nos toolbars. Sem mexer em outras áreas (eventos, VIP, validator, comprovante, conta cliente).

---

## Arquivos previstos

Novos:

- `src/apps/partner/styles/partner-ui.css`
- `src/apps/partner/components/ui/{GlassCard,KpiCard,StatusDot,SectionHeader,SkeletonBlock}.tsx`
- `src/apps/partner/components/ReservationHeroCard.tsx`
- `src/apps/partner/components/ReservationKpiGrid.tsx`
- `src/apps/partner/components/ReservationTimeline.tsx`
- `src/apps/partner/components/WeeklyHeatmap.tsx`
- `src/apps/partner/components/PartnerBottomNav.tsx`

Editados (apenas visual / composição):

- `src/apps/partner/App.tsx` (import do CSS)
- `src/apps/partner/layouts/*` (bottom nav + safe area)
- `src/apps/partner/pages/PartnerReservationsPage.tsx`
- `src/apps/partner/components/ReservationCard.tsx` (variant premium)
- `src/apps/partner/components/WaitlistManager.tsx`
- `src/apps/partner/components/OccupancyInsightsPanel.tsx`
- `src/apps/partner/components/ReservationStats.tsx` (mantido, usado em outros pontos)
- `src/apps/partner/components/index.ts`

Não tocados: tudo de Lista VIP, Conta Roxou, Validador QR, Comprovantes, Analytics, Eventos, migrations, RPCs, RLS, `supabase/`, Nginx.

## Validação

- `bun run typecheck` + build automático após cada fase.
- Preview manual mobile 360 e desktop 1024 das telas: `/partner/reservas`, `/partner/dashboard`.
- Smoke test: criar reserva pública, ver aparecer no hero/timeline; mover para lista de espera; aplicar sugestão de duração.

## Pergunta antes de executar

Quer que eu execute as 4 fases em sequência (type-check + build entre cada), ou prefere aprovar fase a fase? Posso também começar direto pela Fase 1 + 2 (maior impacto visual) e parar para você revisar antes da 3 e 4.

&nbsp;

Importante, siga essa ordem:

&nbsp;

Fase 1

↓

Type-check

↓

Build

↓

Deploy VPS

↓

Revisão visual

↓

Fase 3

↓

Fase 4

↓

Build final