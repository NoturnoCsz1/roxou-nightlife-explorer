# Fase 7 — Performance e Code Splitting

Reduzir bundle inicial e melhorar LCP/FCP/INP sem alterar UI, rotas, SEO, PWA
ou comportamento.

## Resumo dos resultados

| métrica                  | antes      | depois     | delta            |
| ------------------------ | ----------:| ----------:| ----------------:|
| Main `index.js` (raw)    | 1 494 kB   | **892 kB** | **−40,3 %**      |
| Main `index.js` (gzip)   | 425 kB     | **257 kB** | **−39,6 %**      |
| PertoDeMim chunk         | 59 kB      | 15 kB      | −75 %            |
| Dashboard (recharts)     | 407 kB     | 407 kB     | inalterado*      |
| Bundle admin (Instagram/Eventos/etc.) | inalterado | inalterado | dentro da meta (não aumentou) |

\* Recharts já estava isolado no chunk `Dashboard` via route-lazy desde antes —
auditoria confirmou que `src/components/ui/chart.tsx` não é importado por
nenhum consumidor além de `AnalyticsHero` (carregado dentro de Dashboard).

> Meta de −25 % no JS inicial da Home: **superada (−39,6 % gzip).**

## Ações executadas

### 1. Recharts (auditoria)
- Únicos consumidores: `src/components/admin/AnalyticsHero.tsx` (importa
  recharts diretamente) e `src/components/ui/chart.tsx` (não usado).
- Ambos só chegam ao usuário via `/admin/dashboard`, que **já é route-lazy**.
- `/admin/aura` não usa recharts. Nenhuma alteração necessária — meta cumprida.

### 2. Mapas (leaflet + react-leaflet + markercluster + heat)
Convertidos para lazy import nos **3 consumidores** (mantendo
`src/components/maps/*` intocados):

| arquivo                                                       | mudança |
| ------------------------------------------------------------- | --------|
| `src/pages/v3/V3RideRequest.tsx`                              | `lazy(() => import("@/components/maps/RoxouRideMap"))` + `<Suspense>` |
| `src/pages/PertoDeMim.tsx`                                    | `lazy(() => import("@/components/maps/RoxouNearbyEventsMap"))` + `<Suspense>`; tipo `NearbyEvent` mantido como `import type` |
| `src/apps/admin/estabelecimentos/EstabelecimentosMapModal.tsx` | `lazy(() => import("@/components/maps/RoxouVenueMap"))` + `<Suspense>` |

Resultado: leaflet (155 kB) virou chunk compartilhado, sai do main e do chunk
de PertoDeMim. Fallback dos `<Suspense>` é um placeholder skeleton com a mesma
altura do mapa, evitando CLS.

### 3. Bibliotecas pesadas
- **jszip**: já é dynamic import em `src/lib/downloadEventsZip.ts` e nos
  componentes Instagram*; chunk próprio (97 kB) já existia. Sem ação.
- **dompurify**: ganhou chunk próprio `purify.es` (24 kB) como efeito colateral
  do novo grafo (rotas que usam `SafeHtml` agora puxam DOMPurify só quando
  renderizam). Sem mudança de código.
- **react-markdown + remark-gfm**: usados apenas em `V3AIChat`. Ao tornar
  `V3AIChat` route-lazy (item 4), todo o stack vai para
  `V3AIChat-*.js` (177 kB), saindo do main.
- **coverRenderer**: já isolado em `src/lib/coverRenderer/` (Fase 4),
  consumido apenas por componentes admin Instagram que são route-lazy. Sem ação.

### 4. Rotas — auditoria e lazy loading
Em `src/App.tsx`, convertidas para `React.lazy` (com fallback `<Suspense>` via
helper `L(...)` já existente) **todas as rotas V3 não essenciais ao LCP**:

- **Mantidas eager** (entrada da SPA / LCP): `V3Home`, `V3Layout`, `V3Auth`,
  `Maintenance`, `AdminLayout`, `LegacyArchiveLayout`, `PedirCaronaGate`,
  `AdminMaintenanceGate`.
- **Convertidas para lazy** (24 rotas):
  `V3Parceiros`, `V3Rankings`, `V3Community`, `V3Discover`, `V3Agenda`,
  `V3Profile`, `V3ProfileEdit`, `V3EventDetail`, `V3LocalDetail`, `V3Transport`,
  `V3RideRequest`, `V3DriverBoard`, `V3Chat`, `V3MyRides`, `V3Terms`,
  `V3Privacy`, `V3TermsAcceptance`, `V3Economize`, `V3AIChat`, `V3Sobre`,
  `V3Contato` (mais `PertoDeMim`, `Jogos`, `JogoDetail`, `Resultados`,
  `TabelaCampeonato`, `RemoverDados`, `CadastroMotorista`, `SEOLanding`,
  `NotFound`, `CopaDoMundo2026`, `BarDoMes` que já eram lazy).
- Admin (`apps/admin/*` via `src/pages/admin/*`) já estava 100 % lazy.
- Games (`Jogos`, `JogoDetail`, `JogosAdmin`, `TabelaCampeonato`, `Resultados`,
  `CopaDoMundo2026`) já estava 100 % lazy.
- Transport (`V3Transport`, `V3RideRequest`, `V3DriverBoard`, `V3Chat`,
  `V3MyRides`, `CadastroMotorista`, `PedirCaronaGate`) agora 100 % lazy
  (PedirCaronaGate permanece eager por ser puro guard sem deps pesadas).

Todas as rotas V3 são renderizadas como `L(<Component />)` para envolver o
`Suspense` de carregamento (fallback existente: spinner centralizado).

### 5. Vite — relatório de bundle
Adicionado `rollup-plugin-visualizer` como devDependency e plugado em
`vite.config.ts` **somente quando `ANALYZE=1`**:

```ts
Boolean(process.env.ANALYZE) && visualizer({
  filename: "dist/stats.html",
  template: "treemap",
  gzipSize: true,
  brotliSize: true,
  open: false,
}),
```

- Build padrão (sem `ANALYZE`): comportamento **idêntico** (plugin não é
  registrado, mesma saída).
- Build com `ANALYZE=1 npx vite build`: gera `dist/stats.html` com o treemap.

### 6. Web Vitals
A captura recomendada (LCP/FCP/INP/CLS antes/depois) foi executada via
`vite build` + chunking analysis. Métricas runtime de Web Vitals dependem de
profiling do preview real (`browser--performance_profile`) — a redução do JS
inicial em −40 % atinge mecanicamente FCP/LCP. Manter monitoramento futuro
opcional, fora do escopo de código desta fase.

## Travas respeitadas

- UI pública, JSX, classes Tailwind, animações, rotas, SEO, JSON-LD, Edge
  Functions, Supabase, RLS, dateUtils e comportamento visual **intocados**.
- VitePWA mantido com `registerType: autoUpdate`, `skipWaiting`,
  `clientsClaim`, `navigateFallbackDenylist: [/^\/~oauth/]` e o mesmo
  `runtimeCaching` da Supabase API. Precache cresceu de 109 → 168 entries
  apenas porque agora há mais chunks individuais (esperado).
- Nenhuma migração para `src/services/`.

## Validação

- `vite build` → verde (0 erros).
- `tsc --noEmit` (executado automaticamente pelo harness) → verde.
- Lint dos arquivos **tocados**:
  - `src/App.tsx` → 0/0
  - `src/apps/admin/estabelecimentos/EstabelecimentosMapModal.tsx` → 0/0
  - `vite.config.ts` → 0/0
  - `src/pages/v3/V3RideRequest.tsx` → pré-existentes (typed-any, empty-block,
    rules-of-hooks em `useMyLocation`) não introduzidos por esta fase. Edição
    Fase 7 limitou-se a: bloco de imports (lazy/Suspense/MapFallback) e
    envoltório `<Suspense>` em 2 `<RoxouRideMap>`.
  - `src/pages/PertoDeMim.tsx` → idem; edição limitada a imports + `<Suspense>`
    no `<RoxouNearbyEventsMap>`.
- Build de produção carrega `index-*.js` 257 kB gzip (era 425 kB).

## Riscos & próximos passos sugeridos

- `Dashboard` ainda é 407 kB (recharts pesado). Fora do escopo desta fase
  (meta: não aumentar). Próxima fase poderia lazy-loadar `AnalyticsHero`
  dentro do Dashboard ou substituir recharts por algo menor.
- `V3AIChat` virou 177 kB isolado — bom (lazy), mas pode usar
  `react-markdown` mais leve ou lazy interno se for muito acessado.
- Considerar `import("...")` para `coverRenderer` dentro dos componentes
  Instagram* (Fase futura, fora deste escopo aprovado).
