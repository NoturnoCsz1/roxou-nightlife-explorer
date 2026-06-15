# Fase 7 — Arquivos alterados

## Edits (5 arquivos)

- `src/App.tsx` — converteu imports eager das 21 páginas V3 não-críticas em
  `React.lazy`; envolveu cada `<Route element>` correspondente com o helper
  `L(...)` (Suspense). Mantidos eager: `V3Home`, `V3Layout`, `V3Auth`.
- `src/pages/v3/V3RideRequest.tsx` — `RoxouRideMap` virou lazy;
  adicionado `lazy`, `Suspense` e `MapFallback` no bloco de imports; dois
  `<RoxouRideMap>` envoltos em `<Suspense fallback={<MapFallback/>}>`.
- `src/pages/PertoDeMim.tsx` — `RoxouNearbyEventsMap` virou lazy (com
  `import type { NearbyEvent }` preservado); `<RoxouNearbyEventsMap>` envolto
  em `<Suspense>` com placeholder de mesma altura (420 px).
- `src/apps/admin/estabelecimentos/EstabelecimentosMapModal.tsx` —
  `RoxouVenueMap` virou lazy; `<RoxouVenueMap>` envolto em `<Suspense>` com
  placeholder de mesma altura (320 px).
- `vite.config.ts` — adicionado `visualizer` (rollup-plugin-visualizer) gated
  por `Boolean(process.env.ANALYZE)`. Build padrão **inalterado**.

## Dependências

- `+ rollup-plugin-visualizer@^7.0.1` (devDependency).

## Docs / artefatos

- `docs/refactor/FASE_07_bundle_optimization.md`
- `docs/refactor/FASE_07_bundle_report_before.md`
- `docs/refactor/FASE_07_bundle_report_after.md`
- `docs/refactor/FASE_07_bundle_optimization_CHANGED_FILES.md` (este arquivo)
- `docs/refactor/_fase07_baseline_sizes.txt` (snapshot `ls -la` antes)

## Não alterados (confirmado)

- `src/components/maps/RoxouVenueMap.tsx`
- `src/components/maps/RoxouRideMap.tsx`
- `src/components/maps/RoxouNearbyEventsMap.tsx`
- `src/lib/coverRenderer/**` (Fase 4 já isolou)
- `src/components/SafeHtml.tsx`
- `src/components/admin/EventFormBlock.tsx`
- `src/pages/v3/V3AIChat.tsx` (apenas mudou de eager → lazy via App.tsx)
- `src/lib/downloadEventsZip.ts` e qualquer arquivo Supabase/Edge Function.
- Bloco `VitePWA(...)` em `vite.config.ts` (manifest, workbox, runtimeCaching,
  skipWaiting, clientsClaim, denylist).

## Lint dos arquivos tocados

- `src/App.tsx` → 0 erros / 0 warnings.
- `src/apps/admin/estabelecimentos/EstabelecimentosMapModal.tsx` → 0/0.
- `vite.config.ts` → 0/0.
- `src/pages/v3/V3RideRequest.tsx` / `src/pages/PertoDeMim.tsx` →
  warnings/errors **pré-existentes** (typed-any, empty-block, rules-of-hooks)
  fora das linhas tocadas. Edições da Fase 7 limitaram-se a imports e
  `<Suspense>` wrappers.
