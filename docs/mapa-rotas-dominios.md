# Mapa de Rotas e Domínios — Roxou

Extraído de `src/App.tsx` (versão auditada, 538 LOC).

## Classificação por produto e domínio-alvo

| URL | Arquivo | Produto | Auth | Domínio ideal | Risco de mudança |
|---|---|---|---|---|---|
| `/` | `pages/v3/V3Home.tsx` via `V3Layout` | Descobertas | público | `roxou.com.br` | crítico |
| `/descobrir`, `/agenda`, `/perfil`, `/perfil/editar` | `pages/v3/V3{Discover,Agenda,Profile,ProfileEdit}.tsx` | Descobertas | público/auth | `roxou.com.br` | crítico |
| `/evento/:slug`, `/local/:slug` | `pages/v3/V3{EventDetail,LocalDetail}.tsx` | Descobertas | público | `roxou.com.br` | crítico (SEO) |
| `/hoje`, `/semana`, `/categorias`, `/indica`, `/salvos` (via `/archive/legacy-v2/*`) | `pages/*` legado | Descobertas legado | público | `roxou.com.br` | baixo (noindex) |
| `/noticias`, `/noticia/:slug` | `pages/RoxouNoticias.tsx`, `RoxouNoticia.tsx` | Descobertas | público | `roxou.com.br` | baixo |
| `/jogos`, `/jogo/:slug`, `/tabela/:slug`, `/resultados`, `/copa-do-mundo-2026` | `pages/*` | Descobertas/Sports | público | `roxou.com.br` | médio |
| `/expo2026`, `/expo2026/*` | `pages/expo2026/*`, `pages/Expo2026.tsx` | Descobertas/Expo | público | `roxou.com.br` | médio |
| `/bar-do-mes` | `pages/BarDoMes.tsx` | Descobertas | público | `roxou.com.br` | baixo |
| `/:landingSlug` (catch-all) | `pages/SEOLanding.tsx` | Descobertas/SEO | público | `roxou.com.br` | alto (SEO) |
| `/perto-de-mim`, `/rankings`, `/comunidade`, `/economize`, `/ia`, `/sobre`, `/contato` | `pages/PertoDeMim.tsx`, `pages/v3/V3{Rankings,Community,Economize,AIChat,Sobre,Contato}.tsx` | Descobertas | público | `roxou.com.br` | médio |
| `/parceiros` | `pages/v3/V3Parceiros.tsx` | Descobertas | público | `roxou.com.br` | médio |
| `/bio/:slug`, `/bio/:slug/menu` | `pages/bio/*` | Partner público | público | `roxou.com.br` (contrato) | alto (SEO parceiro) |
| `/:partnerSlug/vip`, `/vip/:listSlug` | `pages/PublicVipList.tsx` | Partner público | público | `roxou.com.br` (contrato) | alto |
| `/reserva/*` (via PublicReservation) | `pages/PublicReservation*.tsx` | Partner público | público | `roxou.com.br` (contrato) | alto |
| `/cliente`, `/cliente/*` | `pages/customer/*` | Partner cliente-final | auth | `roxou.com.br` (contrato) | médio |
| `/partner`, `/partner/*` | `components/PartnerShortcutRedirect.tsx` | Redirect | público | remover do bundle público | baixo |
| `/validator` → `/partner/validator` | Navigate | Partner | auth | `parceiro.roxou.com.br` | baixo |
| `/admin/central`, `/admin/login` | `apps/admin/pages/AdminLogin.tsx` | Admin | público→auth | `roxou.com.br/admin` ou subdomínio `admin.` | alto |
| `/admin/*` (30+ rotas) | `apps/admin/pages/*` | Admin | auth+role | `admin.roxou.com.br` (recomendado) | crítico |
| `/admin/partner-preview/*` | `apps/partner/pages/*` **reutilizados** | Partner via Admin | auth | remover — bundle Partner | alto (import cruzado) |
| `/auth`, `/auth/*`, `/auth/update-password` | `pages/v3/V3Auth.tsx`, `pages/auth/*` | Auth compartilhada | público | por domínio | alto |
| `/seguranca/revisao` | `pages/SegurancaRevisao.tsx` | Admin/Segurança | auth | `admin.roxou.com.br` | baixo |
| `/manutencao` | `pages/Maintenance.tsx` | Infra | público | por domínio | baixo |
| `/remover-dados`, `/privacidade/optout/:token` | `pages/RemoverDados.tsx`, `pages/privacidade/*` | Institucional | público | `roxou.com.br` | baixo |
| `/cadastro-motorista` | `pages/CadastroMotorista.tsx` | Transporte | público | `transporte.roxou.com.br` | médio |
| `/pedir-carona` | `components/PedirCaronaGate.tsx` | Transporte | público | `transporte.roxou.com.br` | baixo |
| `/transportes`, `/transportes/*` (18 rotas) | `pages/transportes/*`, `pages/v3/V3{Transport,RideRequest,DriverBoard,MyRides,Chat}.tsx` | Transporte | pub/auth | `transporte.roxou.com.br` | crítico |
| `/motorista`, `/chat/:requestId`, `/meus-pedidos` | `pages/v3/V3{DriverBoard,Chat,MyRides}.tsx` | Transporte | auth | `transporte.roxou.com.br` | alto |
| `/dev/rotas` | `pages/DevRoutes.tsx` | Interna | dev | remover em prod | baixo |
| `/archive/legacy-v2/*` | `pages/*` legado | Legado noindex | público | remover a médio prazo | baixo |
| `/v3`, `/v3/*` | `RedirectV3` | Redirect | público | manter | baixo |
| `*` | `pages/NotFound.tsx` | 404 | público | por domínio | baixo |

## Rotas duplicadas / conflitantes

- `/jogos` está registrada duas vezes (contexto `V3Layout` e antes dele). Verificar precedência.
- `/motorista`, `/transportes/motorista`, `/transportes/caronas/motorista` apontam para `V3DriverBoard` — três aliases sem canonical.
- `/pedir-carona` (gate público) vs `/transportes/caronas/procurar` (V3RideRequest) — dois pontos de entrada para o mesmo fluxo.
- `/auth` registrado 3× (raiz, dentro do V3Layout, e `/auth/*`).

## Rotas com responsabilidades misturadas

- `V3Layout` (rota `/`) envolve rotas de **Descobertas + Transporte + Jogos + Institucional + Auth**. Um erro no layout derruba tudo.
- `/admin/partner-preview/*` renderiza Partner Pro dentro do Admin — mistura produtos.
- `/cliente/*` (Partner cliente-final) fora de `V3Layout` mas no bundle público.

## Rotas administrativas no bundle público

Todas as `/admin/*` e `/admin/partner-preview/*` são lazy, mas o `AdminLayout` e `PartnerPreviewLayout` são importados **estaticamente** pelo `App.tsx` — puxam CSS e providers para o bundle público.

## Rotas com risco de SEO

- `/:landingSlug` catch-all: pode gerar soft-404 se slug não existir. Não retorna status 404 real (SPA).
- `/local/:slug`, `/evento/:slug`: sem JSON-LD adequado hoje.
- Rotas admin não têm `<meta name="robots" content="noindex">` explícito.

## Redirects futuros necessários

Ao migrar para subdomínios:

- `roxou.com.br/admin/*` → `admin.roxou.com.br/*` (ou manter path com auth gate no Nginx).
- `roxou.com.br/partner/*` → `parceiro.roxou.com.br/*`.
- `roxou.com.br/transportes/*` → `transporte.roxou.com.br/*` (com preservação de deep links de excursão).
- `roxou.com.br/motorista`, `/chat/:id`, `/meus-pedidos`, `/cadastro-motorista`, `/pedir-carona` → subdomínio de Transporte.
- Rotas de contrato público (`/bio/:slug`, `/vip/:listSlug`, `/reserva/*`) permanecem em `roxou.com.br` para SEO.
