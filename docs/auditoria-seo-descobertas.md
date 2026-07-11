# Auditoria de SEO — Roxou Descobertas

Auditoria estática do código do repositório. Nenhuma alteração aplicada.

## 1. Infra de meta tags

- Componente `src/components/SEO.tsx` (React Helmet-style) usado em várias páginas via prop `title/description/canonical/og*`.
- Padrão inconsistente: nem toda página v3 chama `<SEO>`. Verificar `V3Home`, `V3Agenda`, `V3Discover`, `V3EventDetail`, `V3LocalDetail`, `V3Parceiros`, `V3Rankings`, `V3Community`.
- `index.html` carrega `<title>` e `<meta description>` padrão da Roxou. OK.

## 2. Rotas críticas (Descobertas)

| Rota | Title dinâmico | Meta desc | Canonical | OG image | JSON-LD | Observações |
|---|---|---|---|---|---|---|
| `/` (V3Home) | parcial | parcial | falta | og default | falta ItemList | LCP alto (audit LCP-4E) |
| `/agenda` | parcial | parcial | falta | og default | falta ItemList/Event | filtro `?cat=todos` já existente |
| `/evento/:slug` | sim | sim | sim | image do evento | **falta Event schema completo** | prioridade alta |
| `/local/:slug` | sim | sim | sim | image parceiro | **falta LocalBusiness/Restaurant** | prioridade alta |
| `/parceiros` (V3Parceiros) | parcial | parcial | falta | og default | falta ItemList | |
| `/jogos` | parcial | parcial | falta | — | falta SportsEvent | |
| `/jogo/:slug` | sim | sim | sim | — | falta SportsEvent | |
| `/tabela/:slug`, `/resultados` | parcial | — | — | — | — | baixa prioridade |
| `/copa-do-mundo-2026` | sim | sim | sim | sim | opcional Article | OK |
| `/noticias`, `/noticia/:slug` | sim | sim | sim | sim | falta Article + BreadcrumbList | |
| `/expo2026*` | sim | sim | sim | sim | Event schema faltando | |
| `/bar-do-mes` | sim | sim | sim | sim | opcional Article/CollectionPage | OK |
| `/:landingSlug` (SEOLanding) | dinâmico | dinâmico | dinâmico | dinâmico | falta BreadcrumbList | risco de soft-404 |
| `/bio/:slug`, `/bio/:slug/menu` | sim | sim | sim | sim | LocalBusiness | verificar Menu schema |
| `/vip/:listSlug`, `/:partnerSlug/vip` | parcial | parcial | parcial | — | **recomendado noindex** | é conteúdo transacional |
| `/reserva/*` | — | — | — | — | **noindex** | transacional |
| `/perto-de-mim`, `/salvos`, `/perfil*`, `/cliente*` | parcial | — | falta | — | — | **noindex** recomendado |
| `/admin/*`, `/partner*`, `/transportes/*` autenticadas | não deve | não deve | não deve | — | — | **noindex + auth gate** |

## 3. Robots / Sitemap

- `public/robots.txt` existe. Verificar: precisa `Disallow: /admin/`, `/cliente/`, `/partner/`, `/reserva/`, `/vip/`, `/auth`, `/seguranca/`, `/dev/`.
- `public/sitemap.xml` estático + Edge Function `sitemap/` que gera dinâmico. Verificar redundância — usar apenas o dinâmico.
- Sitemap atual mistura Descobertas + Partner + Transporte. **Recomendado**: sitemaps separados por domínio após migração.

## 4. Estrutura semântica

- `V3Layout` renderiza `<main>` implícito? Verificar — muitas páginas v3 usam `<div>` no root em vez de `<main>`.
- H1 duplicado em algumas páginas (hero + section title).
- Breadcrumbs textuais em algumas páginas, sem `BreadcrumbList` JSON-LD.
- Links internos entre `/evento/:slug` e `/local/:slug` existem, mas faltam links cruzados entre categoria → cidade → evento.

## 5. Conteúdo duplicado / soft 404

- Legado `/archive/legacy-v2/*` está com `noindex` via `LegacyArchiveLayout`. OK.
- `/hoje`, `/semana`, `/categorias`, `/indica`, `/salvos` (rotas antigas) — verificar se redirect 301 ou noindex.
- `/:landingSlug` inválido: hoje renderiza NotFound-like sem retornar 404 real. Google pode marcar como soft-404.
- Categorias podem gerar URLs paramétricas indexáveis (`/agenda?cat=X`) — hoje sem `<link rel="canonical">` para versão sem query.

## 6. Performance vs SEO (LCP)

Herdado das ondas LCP-4E/4F:
- Bundle público carrega Recharts como side-effect. Google Lighthouse penaliza.
- LCP em Home ~18s no relatório 4E — degrada Core Web Vitals.
- Imagens não otimizadas: 10.6 MB economizáveis.

## 7. OpenGraph / Twitter

- `og:image` fixa (1200x630) em muitas páginas. Evento/Local deveriam usar imagem própria.
- `twitter:card="summary_large_image"` presente em `index.html` mas não confirmado por rota.

## 8. Correções prioritárias (ordem)

1. **`/evento/:slug` + `/local/:slug`**: JSON-LD Event e LocalBusiness/Restaurant reais (impacto direto em CTR e rich results).
2. **`/agenda`**: ItemList schema + canonical sem query.
3. **noindex explícito** em `/admin/*`, `/cliente/*`, `/reserva/*`, `/vip/*`, `/partner/*`, `/transportes/*` (autenticadas), `/auth`, `/perfil*`, `/salvos`, `/dev/*`.
4. **`/:landingSlug` inválido** → retornar `<meta http-equiv="refresh">` para `/404` ou definir slug real como uma table lookup.
5. **BreadcrumbList** em Evento/Local/Noticia.
6. **Sitemap dinâmico** por domínio.
7. **Meta description** faltantes em V3Home/V3Agenda/V3Discover.

## 9. Não implementar agora

Esta é auditoria. Correções vão em Onda 9 do `plano-modularizacao-roxou.md`.


## Onda 11 — SEO Descobertas (concluída)
- Reuso do componente `src/components/SEO.tsx` (canonical, robots, OG, Twitter, JSON-LD).
- `DiscoveryCategoryPage` migrada de useEffect ad-hoc para <SEO/> + BreadcrumbList + CollectionPage/ItemList quando totalItems>0.
- Canonical: https://roxou.com.br/descobrir/:slug (sem query, sem tracking).
- Regra index: !indexable || (loaded && total<6) → noindex,follow; loading/erro → index (evita soft-404).
- Sitemap edge (`supabase/functions/sitemap`): 10 categorias adicionadas em /descobrir/:slug. Fallback script atualizado com /descobrir.
- robots.txt preservado (/descobrir/ já liberado; /admin/, /partner/, /auth etc. bloqueados).
- ads.txt inalterado.
