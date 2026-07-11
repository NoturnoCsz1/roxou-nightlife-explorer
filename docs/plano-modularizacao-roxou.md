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
