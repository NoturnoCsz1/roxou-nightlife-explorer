# Auditoria do Ecossistema Roxou

Auditoria somente-leitura do repositório real (Julho/2026).
Nenhum arquivo funcional foi alterado nesta fase — apenas documentos foram criados em `docs/`.

## 1. Arquitetura atual encontrada

O repositório é um **monorepo Vite single-bundle** com um pequeno segundo entry `partner/index.html` (subdomínio Partner). Toda a árvore React é montada por `src/App.tsx` (538 LOC) com `BrowserRouter` único que registra ~120 rotas. Não há code-split por produto no nível do roteador — apenas `React.lazy` por página.

Existem quatro "namespaces" físicos que competem entre si:

- `src/pages/**` — legado + páginas públicas + auth + cliente + admin (parcial) + transporte (parcial) + v3.
- `src/apps/{admin,partner,public,transport,games}/**` — nova organização por produto, migração incompleta.
- `src/modules/{portal,partner,transporte,motorista}/**` — pastas criadas na "Etapa 0" do plano de refatoração mas ainda **vazias** (apenas READMEs).
- `src/components/**` — mistura genérica + `admin/`, `partners/`, `v3/`, `transportes/`, `expo/`, `jogos/`, `maps/`, `search/`.

Consequência: cada produto vive em pelo menos 2 lugares (o "antigo" em `src/pages` e o "novo" em `src/apps`), e a fronteira teórica em `src/modules` ainda não foi ativada.

## 2. Principais acoplamentos

- **App.tsx único** importa páginas de admin, partner-preview, partner-pro, transporte, v3 público, cliente, bio, auth, expo, jogos, legado — tudo compartilha o mesmo `QueryClient`, `Toaster`, `TooltipProvider` e `BrowserRouter`.
- **`src/components/*` sem prefixo de produto** (`EventCard`, `FeaturedCarousel`, `PopularVenues`, `VenueList`, `CategoryPills`, `DateFilterPills`, `Footer`, `BottomNav`, `DesktopNav`, `SEO`) — consumidos por Roxou pública, por páginas admin e por Partner Pro simultaneamente.
- **Chamadas diretas a `supabase.from(...)` dentro de componentes** (13 arquivos identificados via grep):
  `components/v3/CommunityConsentModal.tsx`, `components/v3/ReportDialog.tsx`,
  `components/admin/{InstagramContentGenerator, AdminAIStrategy, DashboardAlerts, TopPartners, InstagramAgenda, TopEvents, InstagramCovers, PartnerInstagramAura, InstagramStudio}.tsx`,
  `components/jogos/FootballMatchChat.tsx`,
  `components/search/GlobalSearchOverlay.tsx`.
- **Hooks compartilhados sem produto** em `src/hooks/*` (ex.: `useAuth`, `useAdminProfile`, `useCustomerSession`, `useV3Profile`, `useSavedEvents`, `useEventPresence`) usados por 2+ produtos.
- **Services parcialmente extraídos** (`src/services/events.ts`, `partners.ts`, `bio.ts`, `crm.ts`, `transport.ts`, `publicVipList.ts`, etc.) — coexistem com `supabase.from(...)` inline em páginas admin e partner.
- **Partner Pro tem sub-tree própria** (`src/apps/partner/App.tsx`) mas ainda importa `@/components/ui/*`, `@/hooks/*`, `@/integrations/supabase/client`, `@/lib/*` — todos compartilhados com a Roxou pública.
- **Admin importa `apps/partner`** via rota `/admin/partner-preview` (`PartnerPreviewLayout`, `PartnerDashboardPage`, etc.) — dependência Admin→Partner de páginas internas, exatamente o padrão que se quer eliminar.

## 3. Dependências circulares (potenciais)

- `apps/partner/**` ↔ `components/ui/*` ↔ `hooks/*` ↔ `services/*` — não é ciclo estrito, mas cria acoplamento em anel entre "shared" e produtos.
- `apps/admin/pages/EventoBulkForm.tsx` → `lib/bulkEvents*.ts` → `integrations/supabase/client` → tipos de `events` também usados em `services/events.ts` consumido por `pages/v3/*` (público). Uma mudança de payload em Admin propaga silenciosamente para o público.

## 4. Rotas misturadas

Ver `docs/mapa-rotas-dominios.md`. Resumo:

- `/admin/partner-preview/*` é **Partner Pro renderizado dentro do Admin** — deveria viver apenas em `parceiro.roxou.com.br`.
- `/partner`, `/partner/*` → `PartnerShortcutRedirect` no bundle público (custo desnecessário no LCP da Home).
- `/cliente/*` (área do cliente final do parceiro) está no bundle público.
- `/bio/:slug`, `/vip/:listSlug`, `/:partnerSlug/vip`, `/reserva/*` — páginas de contrato público do Partner, mas hoje moram no bundle público e importam componentes de `apps/partner`.
- Rotas de transporte (`/transportes/*`, `/motorista`, `/chat/:requestId`, `/meus-pedidos`, `/pedir-carona`, `/cadastro-motorista`) estão no mesmo bundle da Home pública.
- `/:landingSlug` (SEOLanding catch-all) precede `*` — precisa manter, mas hoje conflita conceitualmente com futuras rotas de descoberta.

## 5. Módulos com responsabilidade incorreta

- `src/pages/admin/AdminBiosPage.tsx` — deveria estar em `src/apps/admin/pages/`.
- `src/apps/admin/eventos/form/` — contrato bem definido (README interno), mas `useEventoForm` chama Supabase diretamente (loadPartners, loadEvent) — mistura orquestração e I/O.
- `src/components/{PopularVenues,VenueList,EventCard,FeaturedCarousel}.tsx` — regra de negócio "Roxou Descobertas" morando em `components/` (shared).
- `src/hooks/useAdminProfile.ts` (Admin) e `useV3Profile.ts` (público) coexistem em `src/hooks/`.
- Admin `partner-preview` reutilizando páginas reais do Partner Pro sem contrato — deveria ser um iframe ou proxy autenticado.

## 6. Componentes compartilhados indevidamente

Ver `docs/mapa-modulos-roxou.md` §4. Alta prioridade:
`EventCard`, `FeaturedCarousel`, `PopularVenues`, `VenueList`, `SEO`, `Footer`, `BottomNav`, `DesktopNav`, `CategoryPills`, `DateFilterPills`, `AdBanner`, `EventCountdown`, `TransmissionBlock`.

## 7. Chamadas diretas ao Supabase fora de services

13 componentes citados em §2. Além disso, todas as páginas em `src/pages/v3/*`, `src/pages/admin/*`, `src/apps/admin/pages/*` e `src/apps/partner/pages/*` fazem `supabase.from(...)` sem intermediação. Estima-se >200 pontos de chamada direta no repositório (grep amplo requerido — fora desta amostra).

## 8. Riscos de autenticação

- Um único `useAuth` para admin + parceiro + cliente + motorista + público.
- Sem guard por produto: uma rota Partner sem `<ProtectedRoute>` explícito depende apenas de UI condicional.
- `AdminMaintenanceGate` roda **antes** de todas as rotas — inclusive públicas — o que acopla operação admin ao SEO público.
- Cookie/localStorage do Supabase é compartilhado entre `roxou.com.br` e `parceiro.roxou.com.br` — desejado para SSO, mas exige revisão de escopo por domínio antes de separar.

## 9. Riscos de domínio

- Hoje `roxou.com.br` serve **tudo** (público + admin + partner + transporte). Separar `parceiro.roxou.com.br` e `transporte.roxou.com.br` sem redirects quebra links salvos e SEO.
- `partner/index.html` já existe como entry secundário (Fase 9M) mas não é o bundle servido em produção (VPS serve `dist/index.html`).
- Sitemap único em `public/sitemap.xml` — precisa ser dividido por domínio antes da migração.

## 10. Problemas de SEO

Ver `docs/auditoria-seo-descobertas.md`. Pontos críticos:

- `<title>` e `<meta description>` genéricos em várias rotas dinâmicas (setados via `SEO.tsx`, sem verificação por rota).
- `LocalDetail`/`V3LocalDetail` sem JSON-LD `LocalBusiness`/`Restaurant`.
- Sem `ItemList` schema na Agenda e na Home.
- Rotas admin/partner potencialmente indexáveis (mitigado por `AdminMaintenanceGate` mas não por `noindex` explícito).
- `/:landingSlug` pode gerar soft-404 se slug inválido — validado em runtime pelo componente, mas não retorna 410/404 real.

## 11. Problemas de performance

Ver `docs/auditoria-performance-produtos.md`. Herdado de LCP-4E/4F:

- Bundle público ainda importa Recharts como side-effect (parcialmente mitigado por `vendor-react` na LCP-4F-1-B).
- `partner-preview` no bundle público adiciona ~120 KiB gzip desnecessários.
- `V3Layout` renderiza `BottomNav`+`DesktopNav`+`Footer` mesmo em rotas Admin/Partner/Transporte.

## 12. Estrutura futura sugerida

Ver `docs/arquitetura-futura-roxou.md`. Três bundles independentes:
`dist/public/` (Descobertas), `dist/partner/` (Partner Pro), `dist/transporte/` (Transporte).

## 13. Contratos entre produtos

Ver `docs/matriz-responsabilidades.md` §5.

## 14. Plano de modularização

Ver `docs/plano-modularizacao-roxou.md`.

## 15. Preparação da Fase Descobertas

Ver `docs/plano-fase-descobertas.md`.

## 16. Pendências

- Autoria de testes E2E por produto (Playwright): hoje só existe `src/test/example.test.ts`.
- Extração completa de `supabase.from` para `src/services/*` (fase 2 iniciada, ~40% feita).
- Migração real de `src/pages/**` → `src/modules/**` (0% feita, apenas READMEs).
- Sitemap por domínio.
- Auth guard por produto/role.

## 17. Resultado do typecheck

`bunx tsgo --noEmit` — a rodar (documentado no relatório final desta mensagem).

## 18. Resultado do build

`bun run build` — a rodar (documentado no relatório final desta mensagem).

## Regra absoluta cumprida

Nenhum arquivo funcional foi alterado nesta fase. Somente `docs/*.md` novos.
