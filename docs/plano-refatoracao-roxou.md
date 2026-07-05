# Plano de refatoração Roxou — executável por etapas

Referência: `docs/auditoria-roxou.md` (mapa completo). Este
documento **traduz a auditoria em tarefas pequenas**, cada uma
executável num único PR, com risco, pré-requisitos, teste e comando
de validação.

Comando padrão de validação (rodar em todas as tarefas):

```bash
bunx tsgo --noEmit
bun run build
```

Convenções:

- **Risco baixo**: mover/renomear sem quebrar imports (com codemod).
- **Risco médio**: envolve rota compartilhada, componente com muitos
  imports ou hook usado em muitos lugares.
- **Risco alto**: envolve rotas públicas com deep links externos,
  RPCs, ou extração de regra de negócio.

Regra geral: **nunca combinar** duas tarefas de risco alto no mesmo
PR.

---

## Etapa 0 — Documentação (concluída)

| # | Tarefa | Módulo | Risco | Status |
|---|---|---|---|---|
| 0.1 | Auditoria completa (`docs/auditoria-roxou.md`) | — | — | ✅ |
| 0.2 | Estrutura base de pastas + READMEs + este plano | — | baixo | ✅ |

Validação: `bunx tsgo --noEmit && bun run build`.

---

## Etapa 1 — Documentação viva

| # | Tarefa | Arquivos | Risco | Pré-req |
|---|---|---|---|---|
| 1.1 | Adicionar `docs/architecture/DECISIONS.md` (ADR template) | novo | baixo | Etapa 0 |
| 1.2 | Adicionar diagrama de dependências entre módulos (Mermaid) em `docs/architecture/dependencies.md` | novo | baixo | 1.1 |
| 1.3 | Documentar rotas com dados sensíveis em `docs/architecture/public-tokens.md` | novo | baixo | 1.1 |

Como testar: revisar renderização Markdown no GitHub.
Validação: `bunx tsgo --noEmit && bun run build`.

---

## Etapa 2 — Shared (utilitários e design system)

Objetivo: mover código genuinamente compartilhado para
`src/shared/*` sem quebrar imports (codemod).

| # | Tarefa | Arquivos envolvidos | Risco | Pré-req | Como testar |
|---|---|---|---|---|---|
| 2.1 | Mover `src/components/ui/*` → `src/shared/ui/*` + codemod de imports | `src/components/ui/**`, todos os consumidores | médio | 0.2 | Abrir Home, Partner Dashboard, Admin Dashboard; conferir botões/dialogs |
| 2.2 | Mover utils puros para `shared/utils/`: `dateUtils`, `utils`, `sanitize`, `pii`, `utm`, `formatRelativeTime`, `supabaseFetchAll`, `analytics`, `ga`, `qrcode`, `imageHash`, `imageOptimizer`, `calendarUtils`, `geoUtils` | `src/lib/*.ts` + consumidores | médio | 2.1 | Rodar suite `bunx vitest run` |
| 2.3 | Mover hooks genéricos para `shared/hooks/`: `use-mobile`, `use-toast`, `useAuth`, `useSavedEvents`, `useSavedPartners`, `usePageTracking`, `useScrollFadeIn` | `src/hooks/*` + consumidores | médio | 2.2 | Abrir Home, `/salvos`, mobile menu |
| 2.4 | Mover componentes compartilhados (`EventCard`, `SEO`, `SafeHtml`, `AuraBadge`, `SectionHeader`) para `shared/components/` | 5 arquivos + consumidores | médio | 2.3 | Home, EventDetail, PartnerBio |
| 2.5 | Mover `V3Layout` para `shared/layouts/` (se usado só pelo portal, adiar) | avaliar | baixo | 2.4 | Home renderiza layout |

Validação: `bunx tsgo --noEmit && bun run build` a cada tarefa.

### Execução parcial concluída (2026-07-05) — subset de baixo risco

Movidos apenas arquivos genuinamente genéricos, com poucos consumidores
e sem risco de quebrar comportamento. Itens médios (`use-toast`, `SEO`,
`components/ui/*`, `dateUtils`, `utils`, `supabaseFetchAll`, `analytics`,
`ga`, `imageOptimizer`, `useAuth`, `useSavedEvents`, `useSavedPartners`,
`usePageTracking`, `EventCard`) permanecem em `src/lib/*`,
`src/hooks/*` e `src/components/*` até nova onda dedicada.

Arquivos movidos:

- `src/lib/sanitize.ts` → `src/shared/utils/sanitize.ts`
- `src/lib/pii.ts` → `src/shared/utils/pii.ts`
- `src/lib/utm.ts` → `src/shared/utils/utm.ts`
- `src/lib/formatRelativeTime.ts` → `src/shared/utils/formatRelativeTime.ts`
- `src/lib/qrcode.ts` → `src/shared/utils/qrcode.ts`
- `src/lib/imageHash.ts` → `src/shared/utils/imageHash.ts`
- `src/lib/calendarUtils.ts` → `src/shared/utils/calendarUtils.ts`
- `src/lib/geoUtils.ts` → `src/shared/utils/geoUtils.ts`
- `src/hooks/useScrollFadeIn.ts` → `src/shared/hooks/useScrollFadeIn.ts`
- `src/hooks/use-mobile.tsx` → `src/shared/hooks/use-mobile.tsx`
- `src/components/SafeHtml.tsx` → `src/shared/components/SafeHtml.tsx`
- `src/components/SectionHeader.tsx` → `src/shared/components/SectionHeader.tsx`
- `src/components/AuraBadge.tsx` → `src/shared/components/AuraBadge.tsx`

Imports atualizados em 29 arquivos consumidores (codemod `sed`).
`bunx tsgo --noEmit` ✅ · `bun run build` ✅ (22.59s).

**Status:** 2.2 (parcial), 2.3 (parcial), 2.4 (parcial) — restante
adiado para nova onda.

---

## Etapa 3 — Partner Pro

Objetivo: consolidar todo o Partner Pro em `src/modules/partner/`.

| # | Tarefa | Arquivos envolvidos | Risco | Pré-req | Como testar |
|---|---|---|---|---|---|
| 3.1 | Renomear `src/apps/partner/**` → `src/modules/partner/**`, atualizar alias `@partner/*` no `tsconfig` | todo `apps/partner`, `App.tsx` (imports) | médio | Etapa 2 | Abrir `/admin/partner-preview/dashboard` e todas as sub-rotas |
| 3.2 | Mover páginas públicas do parceiro: `src/pages/PublicVipList*.tsx`, `PublicReservation*.tsx`, `bio/PublicBioPage.tsx`, `bio/PublicBioMenuPage.tsx`, `PartnerScopedComingSoon.tsx` → `modules/partner/public/*` | 7 arquivos + `App.tsx` | **alto** (rotas públicas com deep link) | 3.1 | `/bio/teste`, `/bio/teste/menu`, `/vip/<slug>`, `/reserva/sucesso/<token>` |
| 3.3 | Mover área do cliente `src/pages/customer/*` → `modules/partner/customer/*` | 6 arquivos + `App.tsx` | médio | 3.2 | `/cliente`, `/cliente/login`, `/cliente/minhas-reservas` |
| 3.4 | Extrair regras do `PartnerNotificationsCenter` para `modules/partner/lib/insights.ts` (sem mover componente ainda) | 1 arquivo novo + refactor local | baixo | 3.1 | Dashboard sem alertas → mostra insights |
| 3.5 | Quebrar `PartnerPromoterCentralPage.tsx` (911 linhas) em subcomponentes locais | 1 arquivo | médio | 3.1 | `/admin/partner-preview` → Promoter Central |

Validação: `bunx tsgo --noEmit && bun run build`.

---

## Etapa 4 — Transporte

| # | Tarefa | Arquivos envolvidos | Risco | Pré-req | Como testar |
|---|---|---|---|---|---|
| 4.1 | Mover `src/pages/transportes/**` → `modules/transporte/excursoes/**` (exceto `motorista/*` e caronas) | ~11 arquivos + `App.tsx` | médio | Etapa 3 | `/transportes/excursoes`, `/transportes/excursoes/<slug>`, `/transportes/acompanhar/<token>` |
| 4.2 | Mover caronas: `V3Transport`, `V3RideRequest`, `V3DriverBoard`, `V3MyRides`, `V3Chat` → `modules/transporte/caronas/**` | 5 arquivos + `App.tsx` | **alto** (deep links) | 4.1 | `/transportes/caronas`, `/transportes/caronas/procurar`, `/chat/:requestId` |
| 4.3 | Extrair pricing de `V3RideRequest.tsx` para `modules/transporte/caronas/lib/pricing.ts` + testes unitários | 2 arquivos | **alto** (regra de negócio) | 4.2 | `bunx vitest run modules/transporte/caronas/lib/pricing` |
| 4.4 | Mover `services/transport.ts`, `services/excursionGps.ts`, `services/publicExcursoes.ts` → `modules/transporte/services/*` | 3 arquivos + consumidores | médio | 4.2 | Fluxo completo de excursão |
| 4.5 | Consolidar `src/components/maps/*` em `integrations/google-maps/*` (adapter) | ~5 arquivos + consumidores | **alto** | 4.4 | Mapa em `/perto-de-mim` e `/transportes/*` |
| 4.6 | Mover `pages/transportes/motorista/*` → `modules/transporte/excursoes/motorista/*` | 3 arquivos + `App.tsx` | médio | 4.1 | `/transportes/motorista/viagens|gps|checkins` |
| 4.7 | Mover `pages/CadastroMotorista.tsx` → `modules/transporte/caronas/CadastroMotorista.tsx` | 1 arquivo + `App.tsx` | baixo | 4.2 | `/cadastro-motorista` |

Validação: `bunx tsgo --noEmit && bun run build`.

---

## Etapa 5 — Motorista (novo módulo)

Depende do desenho do backend (fora do escopo deste plano). Pré-req
absoluto: pricing já extraído (4.3).

| # | Tarefa | Risco | Pré-req |
|---|---|---|---|
| 5.1 | Definir tabelas: `motorista_shifts`, `motorista_earnings`, `motorista_expenses`, `motorista_vehicles`, `motorista_fuel_logs`, `motorista_goals` — em documento separado (não migrar aqui) | — | 4.3 |
| 5.2 | Criar migrations + RLS (em onda dedicada de Supabase) | alto | 5.1 |
| 5.3 | Rotas `/motorista/painel`, `/motorista/ganhos`, `/motorista/turno`, etc — dentro de `modules/motorista/pages/*` | alto | 5.2 |
| 5.4 | Reuso do pricing (`modules/transporte/caronas/lib/pricing.ts`) para cálculo de ganhos | médio | 5.3 |

Fora do escopo desta etapa: validar via `bunx tsgo --noEmit` do que
for adicionado.

---

## Etapa 6 — Portal

| # | Tarefa | Arquivos envolvidos | Risco | Pré-req | Como testar |
|---|---|---|---|---|---|
| 6.1 | Mover `src/pages/v3/*` → `modules/portal/pages/*` | ~22 arquivos + `App.tsx` | médio | Etapa 4 | Home, Agenda, Discover, EventDetail |
| 6.2 | Mover Home hub `src/apps/public/home/*` → `modules/portal/pages/home/*` | ~13 arquivos + consumidores | médio | 6.1 | Home mobile e desktop |
| 6.3 | Consolidar `pages/Index.tsx` (legado) com `V3Home` — remover legacy | 2 arquivos + rota `/` | **alto** | 6.2 | `/` renderiza igual |
| 6.4 | Consolidar `pages/EventDetail.tsx` (legado) com `V3EventDetail` | 2 arquivos + rotas | **alto** | 6.3 | `/evento/:slug` |
| 6.5 | Mover páginas públicas de jogos, notícias, SEO, expo, contato para `modules/portal/pages/*` | ~15 arquivos + `App.tsx` | médio | 6.2 | `/jogos`, `/noticias`, `/expo2026`, `/contato` |
| 6.6 | Mover `components/{EventCountdown,PopularVenues,FeaturedCarousel,DateFilterPills,CategoryPills,DesktopNav,BottomNav,Footer,VenueList,TransmissionBlock}` para `modules/portal/components/*` | ~10 arquivos + consumidores | médio | 6.5 | Home renderiza |

Validação: `bunx tsgo --noEmit && bun run build`.

---

## Etapa 7 — Admin

| # | Tarefa | Arquivos envolvidos | Risco | Pré-req | Como testar |
|---|---|---|---|---|---|
| 7.1 | Renomear `src/apps/admin/**` → `src/modules/admin/**`, atualizar alias `@admin/*` | todo `apps/admin` + `App.tsx` | médio | Etapa 6 | `/admin/dashboard` e sub-rotas críticas |
| 7.2 | Mover `src/pages/admin/AdminBiosPage.tsx` para dentro do módulo admin | 1 arquivo + `App.tsx` | baixo | 7.1 | `/admin/bios` |
| 7.3 | Mover `components/admin/*` → `modules/admin/components/*` | pasta + consumidores | médio | 7.1 | Admin renderiza |

Validação: `bunx tsgo --noEmit && bun run build`.

---

## Etapa 8 — Segurança (auditoria + correção)

| # | Tarefa | Risco | Pré-req | Como testar |
|---|---|---|---|---|
| 8.1 | Auditar todas as RPCs `SECURITY DEFINER` — checar `SET search_path = public` | alto | Etapa 7 | `supabase--linter` + `select proname from pg_proc where prosecdef` |
| 8.2 | Auditar cobertura de `requireAdmin` em edge functions administrativas | alto | 8.1 | Chamar edge function como não-admin → 403 |
| 8.3 | Auditar RLS de `partners` e `events` (tabelas mais compartilhadas) | alto | 8.2 | `supabase--linter` |
| 8.4 | Auditar geração de tokens públicos (VIP, reserva, excursão, opt-out CRM) | médio | 8.2 | Amostragem SQL: tokens são UUID v4 |
| 8.5 | Auditar policies do bucket `uploads` | médio | 8.2 | Tentar upload como anon → negado |

Validação: `bunx tsgo --noEmit && bun run build` + `supabase--linter`.

---

## Etapa 9 — Limpeza de legado

| # | Tarefa | Arquivos envolvidos | Risco | Pré-req |
|---|---|---|---|---|
| 9.1 | Remover `vite.config.ts.backup` | 1 arquivo | baixo | Etapa 8 |
| 9.2 | Remover redirects `/v3/*` e `/expoprudente/*` após confirmar 0 tráfego em `page_views` (últimos 30 dias) | `App.tsx` | médio | 9.1 |
| 9.3 | Remover `components/LegacyArchiveLayout.tsx` + rota `/archive/legacy-v2` se sem referência | 2+ arquivos | médio | 9.2 |
| 9.4 | Arquivar `docs/refactor/FASE_*` em `docs/refactor/_archive/` | pasta | baixo | 9.1 |
| 9.5 | Revisar/remover `apps/games/` e `apps/transport/` (só README) | pastas | baixo | 9.1 |

Validação: `bunx tsgo --noEmit && bun run build` + smoke test das
rotas do `docs/auditoria-roxou.md` §2.

---

## Rotas críticas para smoke test (usar em toda etapa)

- `/`, `/agenda`, `/descobrir`, `/evento/<slug>`, `/local/<slug>`
- `/jogos`, `/noticia/<slug>`, `/expo2026`
- `/bio/<slug>`, `/bio/<slug>/menu`
- `/vip/<slug>`, `/:partnerSlug/vip`, `/reserva/sucesso/<token>`
- `/cliente`, `/cliente/minhas-reservas`
- `/admin/partner-preview/dashboard`, `/admin/partner-preview/reservas`,
  `/admin/partner-preview/lista-vip`, `/admin/partner-preview/analytics`,
  `/admin/partner-preview/configuracoes`
- `/admin/dashboard`, `/admin/parceiros`, `/admin/eventos`,
  `/admin/radar-ia`, `/admin/aura`
- `/transportes`, `/transportes/excursoes`, `/transportes/excursoes/<slug>`,
  `/transportes/caronas/procurar`, `/transportes/motorista/gps`

## Restrições permanentes

- Nunca combinar duas tarefas de risco alto no mesmo PR.
- Nunca alterar `src/integrations/supabase/{client,types}.ts`.
- Nunca criar novas tabelas/RPCs dentro de uma etapa de refatoração;
  agrupar em ondas Supabase separadas.
- Sempre rodar `bunx tsgo --noEmit && bun run build` antes de commitar.
