# Roxou — Plano de Performance Mobile (Fase 1: Diagnóstico)

> **Status:** apenas diagnóstico. Nenhum código funcional foi alterado nesta etapa.
> **Escopo:** Home V3, V3EventDetail, V3LocalDetail, V3Agenda, Notícias, Expo2026, Studio.
> **Restrições:** não tocar Home, IA, Transporte, Auth, timezone `America/Sao_Paulo`, Analytics, layout, migrations.

---

## 1. Diagnóstico geral

A Roxou V3 está visualmente sólida mas paga um custo de performance mobile concentrado em **3 frentes principais**:

1. **Bundle único e grande** — 69 rotas em `src/App.tsx` sem `React.lazy` / code-splitting. Toda visita carrega Home + Detail + Admin + Mapas + páginas auxiliares.
2. **Imagens sem hints de performance consistentes** — apenas ~21 de ~26 `<img>` no V3 têm `loading="lazy"` e `decoding="async"`; faltam `width/height` para evitar CLS, `fetchpriority` no hero e `srcset` responsivo.
3. **Mapas e libs de Google carregando antes da hora** — `RoxouVenueMap` importado estaticamente no detalhe do local; script Google Maps carregado mesmo quando o usuário não rola até a seção.

Páginas sensíveis identificadas (LOC indicativo de superfície de render):
- `V3Home.tsx` — 1708 LOC, 6 `useQuery` em paralelo no mount.
- `V3LocalDetail.tsx` — 826 LOC, 4 `useQuery`, mapa pesado, FAQ + cross-sell + IG placeholder.
- `V3Agenda.tsx`, `V3EventDetail.tsx` — menores, mas herdam o mesmo bundle.

---

## 2. Gargalos encontrados

### 2.1 Bundle / code-splitting
- ❌ Zero `React.lazy` em `src/App.tsx`. Todas as rotas viajam juntas.
- ❌ Páginas administrativas (Roxou Studio, dashboards) provavelmente entram no bundle público.
- ⚠️ `lucide-react` importado por nome — tree-shaking funciona, mas alguns arquivos importam 14+ ícones de uma vez (ex.: `V3LocalDetail` 14 ícones, `V3Home` 20+).
- ⚠️ Sem `manualChunks` em `vite.config.ts` — vendor (react, supabase, recharts, react-query) num único chunk.

### 2.2 Imagens
- ❌ Hero / capa de evento sem `fetchpriority="high"` + `width/height` explícitos → LCP e CLS sofrem em 3G/4G.
- ❌ Logos de parceiros e flyers servidos no tamanho original (sem `srcset`/`?width=` no Supabase Storage transform).
- ❌ `<img>` em carrosséis sem `loading="lazy"` em todos os pontos (5 de 26 ainda eagerly carregados).
- ❌ Falta placeholder/blur consistente — usuário vê "buracos" durante scroll.

### 2.3 Queries
- `V3Home`: 6 `useQuery` no mount → request waterfall mesmo com paralelismo do React Query.
- `V3LocalDetail`: 4 `useQuery` (`partner` → `events` + `viewCount` + `followerCount` + `relatedPartners`); a página renderiza shell antes do `partner.id` resolver, mas dependentes esperam.
- ⚠️ `viewCount` e `followerCount` são `count: exact` em `page_views` / `saved_partners` — escala mal sem índice; cresce com tráfego.
- ⚠️ Algumas listas (notícias, agenda) podem estar sem `limit` explícito — verificar caso a caso na Fase 2.
- ✅ Não há queries duplicadas óbvias (queryKeys consistentes).

### 2.4 Mapas
- ❌ `RoxouVenueMap` importado estático no topo do `V3LocalDetail` → script `@vis.gl/google-maps` ou Google JS entra mesmo se o usuário sair antes de rolar.
- ❌ Google Maps SDK em `V3RideRequest` é `await`-loaded — bom padrão; replicar em outras telas.

### 2.5 Render / componentes
- `V3Home.tsx` com 1708 LOC — múltiplas seções não memoizadas; `setInterval` de countdowns disparam re-renders globais se subirem demais no tree.
- JSON-LD inline no SEO — leve, OK.
- Fontes carregadas via `<link>` (Google Fonts) — verificar `display=swap` e preconnect.

### 2.6 PWA / cache
- Service Worker já configurado (memory). Validar se inclui runtime cache para imagens do Supabase Storage e Google Maps tile (não cacheável por CORS, mas SDK é).

---

## 3. Áreas mais críticas (ordenadas)

| # | Área | Tipo | Impacto mobile | Risco de mexer |
|---|---|---|---|---|
| 1 | Code-splitting de rotas (`React.lazy`) | Bundle | 🔴 Alto (TTI/FCP) | 🟢 Baixo |
| 2 | Hero LCP (`fetchpriority`, `width/height`) | Imagem | 🔴 Alto (LCP) | 🟢 Baixo |
| 3 | `RoxouVenueMap` lazy + intersection | Bundle/JS | 🟠 Médio-alto | 🟢 Baixo |
| 4 | `srcset` + Supabase image transform | Rede | 🟠 Médio-alto | 🟡 Médio |
| 5 | `lucide-react` shake + barril | Bundle | 🟡 Médio | 🟢 Baixo |
| 6 | `count: exact` → estimado/`head:true` | DB | 🟡 Médio | 🟡 Médio |
| 7 | `vite.config` `manualChunks` | Bundle | 🟡 Médio | 🟡 Médio |
| 8 | Memoização em `V3Home` | Render | 🟢 Baixo | 🟡 Médio |

---

## 4. Top 5 melhorias de maior impacto

1. **Lazy-load de rotas** em `src/App.tsx` com `React.lazy` + `<Suspense>` (split por página). Reduz bundle inicial estimado em **40–60%**.
2. **Hero LCP**: adicionar `fetchpriority="high"`, `width`/`height` explícitos e `decoding="async"` na primeira imagem do Hero da Home e do EventDetail.
3. **Lazy do mapa**: `const RoxouVenueMap = lazy(() => import(...))` e renderizar dentro de `IntersectionObserver` (só quando entra na viewport).
4. **Supabase Storage transform** com `?width=400&quality=75` para logos/thumbnails (Supabase suporta no plano Pro). Combinar com `srcset` 1x/2x.
5. **`loading="lazy"` + `decoding="async"`** em **todas** as imagens fora do above-the-fold (auditoria sistemática nos 5 pontos faltantes).

## 5. Top 5 melhorias de menor risco

1. **Adicionar `loading="lazy" decoding="async"`** nos 5 `<img>` faltantes — zero risco visual.
2. **`<link rel="preconnect">`** para `bapdgykghciiyvlqdrqx.supabase.co` e `fonts.gstatic.com` no `index.html`.
3. **`fetchpriority="high"`** apenas no hero principal — diff de 1 atributo.
4. **Trocar `count: 'exact'` por `count: 'estimated'`** em `viewCount` / `followerCount` — não muda UX, alivia DB.
5. **Code-splitting de rotas pesadas** (Roxou Studio, Admin, Expo2026) primeiro — não afeta as páginas públicas e tira muito JS do bundle inicial.

---

## 6. O que NÃO fazer agora

- ❌ Mexer em `V3Home.tsx` (memoização, refactor) — alto risco de quebrar visual e o Hero recém-modularizado.
- ❌ Trocar `lucide-react` por outra lib de ícones — risco visual alto, ganho marginal.
- ❌ Reescrever queries da Home — analytics e timezone dependem delas.
- ❌ Reorganizar service worker / PWA — efeitos colaterais em update strategy já estabilizada.
- ❌ Migrar para Next.js / SSR — fora de escopo.
- ❌ Comprimir imagens existentes manualmente — substituir por transform on-the-fly.
- ❌ Tocar em Auth, Transporte, IA, Analytics, timezone `America/Sao_Paulo`.

---

## 7. Sequência recomendada de implementação

**PR-P1 — Quick wins de imagem (baixo risco, alto impacto LCP)**
- `fetchpriority="high"` no hero
- `width/height` nos heroes
- Auditoria `loading="lazy"` + `decoding="async"` global
- `<link rel="preconnect">` no `index.html`

**PR-P2 — Lazy de rotas pesadas (admin/studio/expo)**
- `React.lazy` apenas das rotas privadas/raras primeiro
- `<Suspense fallback={...}>` com skeleton existente

**PR-P3 — Lazy do mapa**
- `lazy(() => import("@/components/maps/RoxouVenueMap"))`
- Renderizar via `IntersectionObserver` (só quando rolar até a seção)

**PR-P4 — Imagens responsivas via Supabase transform**
- Helper `imgSrcSet(url, [320, 640, 960])`
- Aplicar em logos de parceiros, flyers, capas

**PR-P5 — Lazy de rotas públicas restantes (Home/Detail)**
- Última etapa, após validar que P2/P3 não regrediram nada

**PR-P6 — Otimizações DB (`count: estimated`, índices)**
- Apenas se métricas reais mostrarem necessidade

---

## 8. Próxima implementação recomendada

➡️ **PR-P1: Quick wins de imagem + preconnect.**
Risco mínimo, impacto direto em LCP/CLS mobile, zero mudança de query, zero mudança de layout, não toca Home/IA/Transporte/Auth/timezone.

---

## 9. Confirmações finais

- ✅ Nenhum código funcional foi alterado nesta fase.
- ✅ Apenas o documento `docs/ROXOU_MOBILE_PERFORMANCE_PLAN.md` foi criado.
- ✅ Timezone `America/Sao_Paulo` intacta.
- ✅ Home, IA, Transporte, Auth, Analytics, layout — não tocados.
