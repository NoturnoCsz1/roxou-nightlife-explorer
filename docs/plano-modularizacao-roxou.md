# Plano de Modularização — Roxou

Execução em **ondas pequenas**. Cada onda tem objetivo, arquivos, risco, testes, rollback e critério.

**Nenhuma onda é executada nesta fase — apenas planejada.**

## Princípios de segurança

1. Nenhuma onda altera schema/RLS/RPC/Edge Function.
2. Nenhuma onda altera comportamento observável ao usuário.
3. Cada onda passa `bunx tsgo --noEmit` e `bun run build`.
4. Cada onda é revertível por um único `git revert` do commit.
5. Contratos entre módulos (`public-contracts/index.ts`) só entram depois que ambos os lados existem.

---

## Onda 0 — Auditoria e documentação (esta onda)

- **Objetivo**: mapear repositório real e propor plano.
- **Arquivos**: `docs/*.md` novos.
- **Risco**: nenhum.
- **Testes**: typecheck + build (para garantir que nada foi alterado).
- **Rollback**: rm dos docs.
- **Critério**: 10 documentos entregues + typecheck/build passando.

---

## Onda 1 — Fronteiras e contratos (só código, sem mover)

- **Objetivo**: criar `modules/{discovery,partner,transporte,admin}/public-contracts/index.ts` com **tipos** consumidos entre produtos (re-exportando do que já existe em `services/*` e `apps/*`). Nenhum arquivo movido.
- **Adicionar**: ESLint rule `no-restricted-imports` **como warning** para caminhos internos entre módulos (não bloquear ainda).
- **Arquivos**: novos `public-contracts/`, ajuste `eslint.config.js`.
- **Risco**: baixo.
- **Testes**: typecheck + build. Rodar ESLint e catalogar violações atuais (baseline).
- **Rollback**: git revert.
- **Critério**: contratos declarados; baseline de violações registrado.

---

## Onda 2 — Shared de baixo risco

- **Objetivo**: mover para `src/shared/` o que já é 100% genérico e não tem regra: `SafeHtml`, `SectionHeader`, `AuraBadge`, `sanitize`, `pii`, `formatRelativeTime`, `geoUtils`, `qrcode`, `calendarUtils`. (Já estão em `src/shared` — apenas garantir barrels.)
- **Também**: `use-mobile`, `useScrollFadeIn` (já em `src/shared/hooks/`).
- **Risco**: baixo — só ajusta re-exports.
- **Testes**: typecheck + build + rota Home visualmente.
- **Rollback**: git revert.
- **Critério**: build sem regressão.

---

## Onda 3 — Infraestrutura de roteamento/providers

- **Objetivo**: extrair `QueryClient`, `Toaster`, `TooltipProvider` para `src/app/providers/AppProviders.tsx`. Extrair definição de rotas por produto para `src/app/router/{discoveryRoutes,partnerRoutes,transporteRoutes,adminRoutes}.tsx` — ainda montadas em um único `BrowserRouter` no `App.tsx`.
- **Ganho**: `App.tsx` cai de 538 para ~80 LOC.
- **Risco**: médio (App.tsx é caminho crítico).
- **Testes**: smoke em todas as rotas top-level (Playwright: `/`, `/agenda`, `/local/:slug`, `/admin`, `/partner`, `/transportes`).
- **Rollback**: git revert.
- **Critério**: URLs continuam funcionando; bundle sem novo peso.

---

## Onda 4 — Partner Pro: services, repositories, types

- **Objetivo**: extrair todas as chamadas `supabase.from(...)` das páginas Partner para `apps/partner/services/*`. Mover `apps/admin/partnerPilot/*` e `partnerProCrm/*` para `modules/partner/admin/`.
- **Risco**: médio.
- **Testes**: fluxo login parceiro → dashboard → reservas → VIP → validator.
- **Critério**: nenhum componente Partner com Supabase inline.

---

## Onda 5 — Partner Pro: reservas, VIP, convites, validator

- **Objetivo**: consolidar `partner-reservations`, `partner-vip-lists`, `validator`, `promoters`, `check-in` como sub-módulos dentro de `apps/partner/`. Extrair contratos públicos para `public-contracts/`.
- **Risco**: médio.
- **Testes**: smoke completo Partner + rotas `/reserva/*`, `/vip/*`, `/bio/*` do público consumindo contratos.
- **Critério**: público continua lendo via `services/publicReservations/publicVipList/bio`.

---

## Onda 6 — Partner Pro: dashboard, analytics, financeiro, configurações

- **Objetivo**: dashboard heavy (charts, KPIs) fica em Partner. Isolar `recharts` como dynamic import por componente.
- **Risco**: baixo (rotas internas).
- **Testes**: fluxo dashboard.
- **Critério**: `recharts` desaparece do bundle público.

---

## Onda 7 — Transporte: mapa e services

- **Objetivo**: consolidar `services/transport.ts`, `excursionGps.ts`, `publicExcursoes.ts`, `lib/rideTimeRules.ts`, `driverValidation.ts`, `analyticsExcursoes.ts` em `modules/transporte/services/`.
- **Risco**: baixo.
- **Testes**: rotas de excursão e carona.
- **Critério**: services consolidados.

---

## Onda 8 — Transporte: passageiro, motorista, excursões, vans

- **Objetivo**: mover `pages/transportes/*` e `pages/v3/V3{Transport,RideRequest,DriverBoard,MyRides,Chat}.tsx`, `pages/CadastroMotorista.tsx`, `components/PedirCaronaGate.tsx`, `components/transportes/*`, `components/maps/*` para `modules/transporte/**`.
- **Risco**: alto (rotas públicas populares).
- **Testes**: Playwright em todas as rotas `/transportes/*` + `/motorista` + `/chat/:requestId`.
- **Rollback**: git revert.
- **Critério**: 0 regressão nas rotas de transporte.

---

## Onda 9 — Descobertas: SEO engine + páginas públicas existentes

- **Objetivo**: mover `pages/v3/*` públicos + `pages/{Index,Hoje,Semana,...,BarDoMes,SEOLanding,RoxouNoticias,RoxouNoticia,JogoDetail,Jogos,TabelaCampeonato,Resultados,CopaDoMundo2026,Contato,PertoDeMim,Salvos,RemoverDados}.tsx` para `modules/discovery/pages/`. Extrair layouts (`V3Layout`, `BottomNav`, `DesktopNav`, `Footer`) para `modules/discovery/layouts/`.
- **Correções SEO** (docs/auditoria-seo-descobertas.md): Event/LocalBusiness JSON-LD, canonical na Agenda, noindex em rotas privadas.
- **Risco**: alto (é o produto público principal).
- **Testes**: Playwright + Lighthouse antes/depois.
- **Critério**: LCP não regride; SEO melhora.

---

## Onda 10 — Descobertas: motor de categorias

- **Objetivo**: criar `modules/discovery/discovery-engine/` que recebe `{cidade, categoria, ocasião, preço, horário, ...}` e devolve resultados. Sem criar páginas ainda.
- **Risco**: baixo (novo código).
- **Testes**: unitários no engine.

---

## Onda 11 — Página da cidade

- **Objetivo**: `/cidade/:slug` como hub. Reaproveitar componentes existentes (Home/Agenda/Locais/Jogos).
- **Risco**: médio.
- **Testes**: Playwright + Lighthouse.

---

## Onda 12 — Landing pages de locais

- **Objetivo**: `/local/:slug` completo com hero, galeria, horários, JSON-LD, FAQ, IA (opcional).
- **Risco**: alto (SEO).
- **Testes**: rich results test.

---

## Onda 13 — IA contextual de Descobertas

- **Objetivo**: `modules/discovery/ai/` — respostas para "Onde jantar hoje?", "Onde assistir ao jogo?" usando Lovable AI Gateway.
- **Risco**: médio.
- **Testes**: E2E de chat.

---

## Onda 14 — Split de bundles (transição real)

- **Objetivo**: transformar `vite.config.ts` em multi-entry ou dividir em workspaces. Deploy Nginx por subdomínio.
- **Pré-requisito**: ondas 1–13 concluídas.
- **Risco**: crítico.
- **Testes**: matriz completa.

---

## Onda 15 — Limpeza de legado

- Remover `src/apps/{public,transport,games}/` (só READMEs), `src/modules/{portal,motorista}/` se não usados, `src/pages/*` já migrados, `vite.config.ts.backup`, `src/data/events.ts` se mock.
- **Risco**: baixo (só se ninguém consumir).

---

## Matriz de regressão por onda

| Onda | Rotas críticas a testar |
|---|---|
| 3 | todas top-level (smoke) |
| 4–6 | login parceiro, dashboard, reservas, VIP, validator; público `/reserva/*`, `/vip/*`, `/bio/*` |
| 7–8 | `/transportes/*`, `/motorista`, `/chat/:id`, `/meus-pedidos`, `/cadastro-motorista` |
| 9–13 | `/`, `/agenda`, `/evento/:slug`, `/local/:slug`, `/parceiros`, `/jogos`, `/noticias`, `/:landingSlug` |
| 14 | matriz completa + subdomínios |

---

## Registro de execução

### Onda 2 — Concluída (2026-07-11)

Movidos 4 arquivos genéricos e de baixo risco para `src/shared/`:

- `useIsDesktop` → `src/shared/hooks/`
- `instagramHandle`, `locationDisplay`, `aiGatewayError` → `src/shared/utils/`

13 imports atualizados em 12 arquivos, todos via alias `@shared/...`. Detalhes, recusas e adiamentos em `docs/onda-2-shared-baixo-risco.md`.

- typecheck: ✅  build: ✅  audit:cycles: ✅ (1 ciclo herdado, sem regressão)
- Recusados: `titleCleaner` (Radar-específico), `useAuth`, `useSaved*`, `analytics`, `ga`, `supabaseFetchAll`, `EventCard`, `V3Layout`.
- Adiados para ondas próprias: `dateUtils` (TZ crítico, 45 consumidores), `utils.cn` (93), `use-toast` (42), `SEO` (45), `components/ui/*`, `imageOptimizer` (acoplado a Supabase Storage URL).

### Onda 3 — Concluída (2026-07-11)

Isolamento técnico das árvores de rotas por produto. Nenhuma funcionalidade,
UI, banco, RLS, RPC, edge function, guard, permissão, slug, redirect, deep
link, PWA ou SEO foi alterada. URLs preservadas 1:1.

**Arquivos criados**
- `src/app/routes/lazyFallback.tsx` — helper `L()` + `LazyFallback` compartilhados.
- `src/app/routes/adminRoutes.tsx` — árvore `/admin/*` (exceto partner-preview).
- `src/app/routes/partnerRoutes.tsx` — `/admin/partner-preview/*`, `/partner`, `/partner/*`, `/validator`.
- `src/app/routes/transportRoutes.tsx` — sub-árvore de transporte (caronas, excursões, privativo, motorista), filha de `V3Layout`.
- `src/app/routes/publicRoutes.tsx` — demais rotas públicas + `V3Layout` composto com `TransportRoutes()`.

**Arquivo alterado**
- `src/App.tsx` — reduzido de 538 → 41 linhas. Agora somente monta providers, `BrowserRouter` e compõe as três árvores.

**Imports estáticos removidos do entry principal**
- `AdminLayout` (`@/components/admin/AdminLayout`) — agora lazy.
- `AdminMaintenanceGate` — import morto removido.
- Todos os `lazy(() => import(...))` de páginas Admin, Partner, Notícias, Cliente, Bio, Expo, Legacy, Transporte, V3 saíram de `App.tsx` e vivem dentro de cada árvore.

**Layouts carregados sob demanda**
- `AdminLayout` — chunk próprio (`AdminLayout-*.js`), só baixa em rotas `/admin/*`.
- `PartnerPreviewLayout` — já lazy antes; permanece isolado em `PartnerPreviewLayout-*.js`.
- `V3Layout` e `V3Home` permanecem eager (decisão LCP da Fase 7 preservada).
- `LegacyArchiveLayout`, `Maintenance`, `PedirCaronaGate` permanecem eager (wrappers pequenos usados como `element=`).

**Chunks resultantes (relevantes)**
- `main-*.js` 319 KB / gzip 92 KB (shell público + V3Layout/V3Home eager).
- `AdminLayout-*.js` isolado do entry.
- `PartnerPreviewLayout-*.js` isolado do entry.
- `vendor-react-*.js` 142 KB / gzip 45 KB.
- `vendor-recharts-*.js` continua fora do preload inicial (LCP-4F preservada).

**Validação**
- `bunx tsgo --noEmit`: ✅
- `bun run build`: ✅ (393 precache entries)
- `bun run audit:cycles`: ✅ (baseline mantido — apenas o ciclo herdado `eventoFormSubmit ↔ eventoFormActions`).
- `bunx eslint src/App.tsx src/app/routes/*.tsx`: ✅ 0 erros.

**Exceções temporárias**
- Nenhuma nova exceção introduzida. Ver `docs/excecoes-temporarias-dependencias.md`.

**Riscos restantes**
- `Routes` recebe três fragmentos irmãos; ordem preservada da versão anterior — mudanças de ordem podem afetar catch-all `/:landingSlug` e `*`.
- Sub-árvore de transporte ainda vive dentro de `V3Layout` (compartilha header/footer público). Extração para layout próprio fica para onda futura conforme `docs/arquitetura-futura-roxou.md`.
- `AdminLayout` lazy adiciona um Suspense extra em `/admin/*` (fallback visual já usado em rotas filhas — sem regressão perceptível).

### Onda 4 — Concluída (2026-07-11)

Base modular do Partner Pro + camada de dados isolada das telas.
Nenhuma alteração em banco, RLS, RPC, Edge Functions, autenticação,
permissões, rotas, UI, textos, PWA ou SEO. Zero mudanças em consumidores
(páginas e componentes) — a compatibilidade é garantida por shims.

**Estrutura criada em `src/modules/partner/`**
- `reservations/{services,repositories,types}/`
- `vip/{services,repositories,types}/`
- `validator/{services,repositories,types}/`
- `invitations/` (placeholder — sem código ainda)
- `shared/{types}/`
- READMEs curtos em cada submódulo + `discovery`, `transport`, `admin`.

**Arquivos migrados (4 services movidos fisicamente)**
- `src/apps/partner/services/partnerReservations.ts` → `src/modules/partner/reservations/services/reservationsService.ts` (623 LOC)
- `src/apps/partner/services/partnerVipLists.ts` → `src/modules/partner/vip/services/vipService.ts` (380 LOC)
- `src/apps/partner/services/partnerValidator.ts` → `src/modules/partner/validator/services/validatorService.ts` (488 LOC)
- `src/apps/partner/services/partnerPromoters.ts` → `src/modules/partner/vip/services/promotersService.ts` (101 LOC)

**Repositories criados (barrels públicos)**
- `reservations/repositories/reservationsRepository.ts` — expõe operações de banco/RPCs de reservas, tipos, waitlist e insights.
- `vip/repositories/vipRepository.ts` — expõe operações de listas VIP, entries e promoters.
- `validator/repositories/validatorRepository.ts` — expõe `parseQrPayload` + `validateQrCode`.

**Types extraídos**
- `reservations/types/index.ts`, `vip/types/index.ts`, `validator/types/index.ts` — reexportam os tipos já declarados nos services (sem duplicação, sem cópia de schema).

**Shims de compatibilidade**
- `src/apps/partner/services/partner{Reservations,VipLists,Validator,Promoters}.ts` viraram 3-linhas `export * from "@modules/partner/..."`. Zero páginas/componentes precisaram ser tocados.

**Chamadas diretas ao Supabase removidas das telas:** 0 — os fluxos de Reservas/VIP/Validador **já** iam via services antes desta onda. A única `supabase.from(...)` residual no visual Partner (`PartnerRequestAccessPage.tsx` e `bio/tabs/BioHomeTab.tsx`) está fora do escopo desta onda (não pertence a Reservas/VIP/Validador/Convites).

**Áreas concluídas**
- Reservas: ✅
- VIP: ✅
- Validador: ✅
- Convites: adiado (só existe stub `"invite"` no validator).

**Ciclos:** antes = 1 (`eventoFormSubmit ↔ eventoFormActions`, herdado do Admin); depois = 1 (mesmo, sem novos).

**Validação**
- `bunx tsgo --noEmit`: ✅
- `bun run build`: ✅ (393 precache entries)
- `bun run audit:cycles`: ✅ (baseline mantido)
- lint dos 14 arquivos alterados: ✅ 0 erros.

**Pendências / dívida técnica**
- Split físico interno service ↔ repository (mover as `supabase.from/rpc/functions.invoke` para dentro dos arquivos `repositories/*` como funções pilha-baixa) fica para onda futura — hoje o repository é um barrel que re-exporta os símbolos do service. Contrato público estável, então esse split não quebra consumidores.
- Migrar imports das páginas/componentes de `../services/partner*` para `@modules/partner/*` diretamente (permite eventualmente remover os shims) — pendente.
- Módulo `invitations/` aguarda o fluxo real do produto.

**Riscos restantes**
- Shims em `src/apps/partner/services/partner*.ts` são bidirecionais no efeito: se um consumidor novo importar do caminho antigo, a fronteira modular ainda funciona, mas a métrica de adoção do `@modules/partner/*` fica menos limpa até a migração dos imports.
- `partnerValidator` importa `vip` e `reservations` diretamente (permitido pela regra Onda 1 — mesmo produto). Nenhum ciclo detectado, mas o grafo de dependências internas do Partner cresce; monitorar via `audit:cycles`.

---

## Onda 5 (2026-07-11) — Adoção real do módulo Partner + remoção dos shims

**Barrels criados**
- `src/modules/partner/reservations/index.ts`
- `src/modules/partner/vip/index.ts`
- `src/modules/partner/vip/promoters.ts` (Promoters permanece sob VIP — consumido apenas por VIP/Listas)
- `src/modules/partner/validator/index.ts`

**Consumidores migrados:** 40 arquivos em `src/apps/partner/**` tiveram os imports de `../services/partner{Reservations,VipLists,Validator,Promoters}` reescritos para `@modules/partner/{reservations,vip,vip/promoters,validator}`. Zero mudança de API pública, zero mudança de UI/rotas/permissões.

**Shims removidos**
- `src/apps/partner/services/partnerReservations.ts`
- `src/apps/partner/services/partnerVipLists.ts`
- `src/apps/partner/services/partnerValidator.ts`
- `src/apps/partner/services/partnerPromoters.ts`

**Adiado (respeitando o limite de segurança da onda)**
- Split físico interno service ↔ repository dentro de `@modules/partner/*` (repository continua reexportando do service). Contrato público estável.
- Extração das duas chamadas Supabase inline residuais (`PartnerRequestAccessPage.tsx`, `bio/tabs/BioHomeTab.tsx`) — envolve acesso/autenticação e escopo incerto; mantidas como pendência.
- Mover `usePartnerAuth` / `usePartnerBetaAccess` / `usePartnerRole` para `@modules/partner/shared/hooks` — mexe em provider e fluxo de login, preservados.
- Módulo `invitations/` continua placeholder até existir fluxo real.

**Validação**
- typecheck: ✅
- build: ✅ (393 precache entries)
- audit:cycles: ✅ (baseline: 1 ciclo herdado do Admin `eventoFormSubmit ↔ eventoFormActions`, sem novos ciclos)
- lint dos arquivos alterados: ✅ (0 novos erros; 1 erro `no-explicit-any` pré-existente em `PartnerCrmPage.tsx`, fora do escopo).

---

## Onda 6 (2026-07-11) — Fundação do módulo Discovery

**Estrutura criada em `src/modules/discovery/`**
`categories/`, `cities/`, `events/`, `venues/`, `guides/`, `search/`, `recommendations/`, `shared/` (apenas as pastas de `events/` e `venues/` receberam código nesta onda; as demais ficam como reserva oficial do domínio, com README já pré-existente na raiz do módulo).

**Serviços movidos (2, ambos com zero consumidores atuais — bridges aditivas)**
- `src/services/events.ts` → `src/modules/discovery/events/services/eventService.ts`
- `src/services/partners.ts` → `src/modules/discovery/venues/services/venueService.ts`

**Barrels criados (4):** `events/index.ts`, `events/types/index.ts`, `venues/index.ts`, `venues/types/index.ts`.

**Não movidos (mantidos no legado por risco/escopo)**
- `src/lib/categoryConfig.ts` — 15 consumidores cruzando Admin + V3, migração precisa ser dedicada.
- `src/lib/auraVenue{Insights,Pricing,Rankings}.ts` — acoplados a componentes V3 específicos, ficam para onda dedicada de Rankings/Aura.
- Páginas, layouts, Home, V3Layout, SEO, hooks, componentes — preservados 1:1.

**Validação:** typecheck ✅ · build ✅ (393 precache) · audit:cycles ✅ (1 ciclo herdado, sem novos) · lint dos criados ✅ 0 erros.

---

## Onda 7 (2026-07-11) — Adoção real de Discovery (Eventos + Locais)

**Fonte real anterior dos dados**
- Eventos: `supabase.from("events")` inline em `EventDetail.tsx` (slug + similares por categoria e por dia).
- Locais: `supabase.from("partners")` inline (base table, `active = true`) em `LocalDetail.tsx` e `LocalEventos.tsx`, mais lookup `partners` por id em `EventDetail.tsx`.

**Arquivos criados (2)**
- `src/modules/discovery/events/repositories/eventsRepository.ts` — 6 funções (`fetchPublishedEventBySlug`, `fetchSimilarByCategory`, `fetchSimilarByDate`, `fetchUpcomingEventsByPartner`, `fetchPastEventsByPartner`, `countPastEventsByPartner`). Preserva selects, filtros e ordenação atuais 1:1.
- `src/modules/discovery/venues/repositories/venuesRepository.ts` — 3 funções (`fetchActiveVenueBySlug`, `fetchActiveVenueIdentityBySlug`, `fetchVenueById`).

**Arquivos alterados (5)**
- `src/modules/discovery/events/index.ts` e `src/modules/discovery/venues/index.ts` — passam a expor o repository.
- `src/pages/EventDetail.tsx`, `src/pages/LocalDetail.tsx`, `src/pages/LocalEventos.tsx` — migradas para os módulos.

**Consumidores migrados:** 3 páginas públicas (EventDetail, LocalDetail, LocalEventos).

**Chamadas Supabase consolidadas:** 9 chamadas inline em 3 páginas removidas e centralizadas em 2 repositories.

**Legado**
- `services/eventService.ts` e `services/venueService.ts` (herdados da Onda 6, sem consumidores) foram mantidos — o barrel reexporta ambos, sem duplicação de query com o repository (funções e nomes distintos). Sem shims novos.

**Query keys / cache:** preservados — as páginas migradas não usam React Query (chamadas via `useEffect` + `Promise.all`). Nenhuma query key alterada em nenhum outro consumidor.

**categoryConfig:** adiado (15 consumidores cross-produto, sem separação clara pública vs admin nesta onda).

**Não migrado (fora do escopo desta onda por volume/risco)**
- Home (`Index.tsx`, `Semana.tsx`, `Hoje.tsx`, `PertoDeMim.tsx`) — cada uma tem shape de query específico + join `partners` para slug; migração completa exigiria >30 arquivos.
- V3 (`V3Home`, `V3Agenda`, `V3Discover`, `V3EventDetail`, `V3LocalDetail`, `V3Parceiros`, `V3Profile`, `V3AIChat`) — vertical V3 completo fica para onda dedicada.
- `GlobalSearchOverlay`, `PopularVenues`, `VenueList`, `FeaturedCarousel` — pertencem ao vertical search/home.

**Ciclos:** antes 1 → depois 1 (baseline herdado do Admin).

**Validação:** typecheck ✅ · build ✅ (394 precache) · audit:cycles ✅ · lint dos arquivos novos ✅ 0 erros (erros `no-explicit-any` reportados em `EventDetail`/`LocalDetail` são pré-existentes em trechos não tocados).

---

## Onda 8 (2026-07-11) — Adoção Discovery nas superfícies públicas de maior tráfego

**Arquivos criados:** nenhum (apenas extensão dos repositories existentes).

**Arquivos alterados (7)**
- `src/modules/discovery/events/repositories/eventsRepository.ts` (+5 funções)
- `src/modules/discovery/venues/repositories/venuesRepository.ts` (+3 funções)
- `src/pages/Index.tsx`, `src/pages/Hoje.tsx`, `src/pages/Semana.tsx`, `src/pages/PertoDeMim.tsx`, `src/components/search/GlobalSearchOverlay.tsx`

**Consumidores migrados (5):** Home (`Index`), Hoje, Semana, Perto de Mim, GlobalSearchOverlay.

**Queries públicas consolidadas em `@modules/discovery/events`**
- `fetchUpcomingPublishedEventsForHome` (Home)
- `fetchTodayPublishedEvents(startOfDay, endOfDay)` (Hoje)
- `fetchWeekPublishedEvents` (Semana)
- `fetchUpcomingEventsForNearby(limit)` (PertoDeMim)
- `searchPublicEvents(limit)` (GlobalSearchOverlay)

**Queries públicas consolidadas em `@modules/discovery/venues`**
- `fetchPartnerSlugsByIds` (Home, Hoje, Semana)
- `fetchPartnerCoordsByIds` (PertoDeMim)
- `searchPublicVenues(limit)` (GlobalSearchOverlay)

**Chamadas Supabase inline removidas:** 11 (5 events + 4 partners + 2 nas páginas Home/agenda). Chamadas fora do domínio Discovery (page_views, partner_awards, roxou_news, sports_matches, search_logs) foram mantidas onde já estavam.

**Fontes de dados preservadas:** todas as leituras continuam batendo em `.from("events")` e `.from("partners")` (base table, `active = true` + `status = 'ativo'` quando aplicável). Sem troca para `public_partners`.

**React Query / cache:** nenhuma das 5 superfícies usa React Query — mantidas em `useEffect + Promise.all`. O cache in-memory do `GlobalSearchOverlay` (`cachedData`, TTL 5min) foi preservado 1:1. Nenhuma query key nova, nenhum provider novo.

**Legados:** nenhum arquivo removido. `services/eventService.ts` / `services/venueService.ts` continuam expostos pelo barrel (funções distintas do repository, sem duplicação de query real).

**Adiado (fora do limite)**
- V3Home / V3Agenda / V3Discover / V3EventDetail / V3LocalDetail / V3Parceiros / V3Profile / V3AIChat (vertical V3 dedicado).
- `PopularVenues`, `VenueList`, `FeaturedCarousel` — não acessam Supabase diretamente (recebem props); nada a migrar aqui.
- `categoryConfig` — 15 consumidores cross-produto, mantido.

**Ciclos:** antes 1 → depois 1 (baseline herdado do Admin).

**Validação:** typecheck ✅ · build ✅ (394 precache, 12 877 KiB) · audit:cycles ✅ · lint dos alterados ✅ 0 erros novos (14 erros `no-explicit-any` / `no-empty` reportados são pré-existentes em `PertoDeMim` e `GlobalSearchOverlay` fora dos trechos migrados).

---

## Onda 9 — Discovery Engine (base)

**Motor:** `src/modules/discovery/recommendations/services/discoveryService.ts` (`discover(query, options)`) + repository interno em `recommendations/repositories/discoveryRepository.ts`.

**Contratos:** `DiscoveryQuery`, `DiscoveryResult`, `DiscoveryVenueResult`, `DiscoveryEventResult`, `DiscoveryReason`, `DiscoveryContext` em `src/modules/discovery/shared/types/discoveryQuery.ts`.

**Categorias iniciais (10):** onde-comer, onde-sair, happy-hour, romantico, familia, pet-friendly, churrascarias, pizzarias, hamburguerias, cafeterias — em `src/modules/discovery/categories/discoveryCategories.ts` (declarativo, com slug/title/description/filters/seoIntent/canonicalPath/indexable/enabled). Não substitui `src/lib/categoryConfig.ts`.

**Ranking:** determinístico e explicável (`DiscoveryReason` tipado: matches_category/occasion/cuisine/feature/city, open_now, nearby, has_event, featured, verified). Score interno, nunca exibido como avaliação pública.

**Queries reutilizadas / novas:** o repository compõe leituras contra `partners` (base `active + status=ativo`) e `events` (base `status=published + date_time >= hoje-SP`); nenhuma nova view, RPC ou migration.

**Consumidor real:** `src/modules/discovery/__dev__/discoveryUsage.example.ts` (interno, sem rota) — não há `/cidade/:slug` estável hoje; integração real em superfície pública fica para a próxima onda.

**Adiado:** integração em superfície pública (Home/PertoDeMim/Semana/`/cidade/:slug`), SEO Engine, sitemap dinâmico, IA contextual, mapeamento `features`/`priceRange` para colunas reais.

**Validação:** typecheck ✅ · build ✅ (394 precache) · audit:cycles ✅ (baseline 1) · lint dos criados ✅ 0.

## Onda 10
Ativação pública do Discovery Engine em rota genérica única `/descobrir/:categorySlug`. Ver `docs/plano-fase-descobertas.md`.


## Onda 11 — SEO Descobertas (concluída)
- Reuso do componente `src/components/SEO.tsx` (canonical, robots, OG, Twitter, JSON-LD).
- `DiscoveryCategoryPage` migrada de useEffect ad-hoc para <SEO/> + BreadcrumbList + CollectionPage/ItemList quando totalItems>0.
- Canonical: https://roxou.com.br/descobrir/:slug (sem query, sem tracking).
- Regra index: !indexable || (loaded && total<6) → noindex,follow; loading/erro → index (evita soft-404).
- Sitemap edge (`supabase/functions/sitemap`): 10 categorias adicionadas em /descobrir/:slug. Fallback script atualizado com /descobrir.
- robots.txt preservado (/descobrir/ já liberado; /admin/, /partner/, /auth etc. bloqueados).
- ads.txt inalterado.


## Onda 12 — Modularização Transporte (concluída)
- src/services/{publicExcursoes,excursionGps,transport}.ts movidos para src/modules/transport/{excursoes/{repositories,services},rides/repositories}.
- Barrels criados: excursoes/index.ts, rides/index.ts, transport/index.ts (superfície única).
- 7 consumidores migrados para @modules/transport; sem Supabase inline novo.
- Rotas preservadas 1:1; nenhuma URL, layout ou navegação alterada.
- Ciclos 1→1 (baseline eventoForm* herdado).
