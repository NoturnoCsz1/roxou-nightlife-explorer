# Fase 7 — Bundle após otimizações

Build: `SKIP_SITEMAP=1 ANALYZE=1 npx vite build` (com visualizer →
`dist/stats.html` gerado, 1,49 MB de treemap).

## Maiores chunks

| chunk                                  | bytes (raw) | gzip     |
| -------------------------------------- | -----------:| --------:|
| **assets/index-*.js (main)**           | **892 kB**  | **257 kB** |
| Dashboard                              | 407 kB      | 111 kB   |
| V3AIChat (react-markdown + remark-gfm) | 177 kB      | 54 kB    |
| **leaflet (compartilhado)**            | **155 kB**  | **45 kB** |
| InstagramAdmin                         | 131 kB      | 34 kB    |
| jszip.min                              | 97 kB       | 30 kB    |
| adminEventPayload                      | 68 kB       | 19 kB    |
| EstabelecimentosAudit                  | 55 kB       | 14 kB    |
| EventosList                            | 52 kB       | 14 kB    |
| EventoBulkForm                         | 50 kB       | 15 kB    |
| RadarIA                                | 50 kB       | 14 kB    |
| EventoForm                             | 48 kB       | 14 kB    |
| RoxouNearbyEventsMap                   | 45 kB       | 13 kB    |
| purify.es (dompurify isolado)          | 24 kB       | 9 kB     |
| V3Discover                             | 20 kB       | 5 kB     |
| V3ProfileEdit / V3Profile / V3Agenda   | 16-19 kB    | 5-6 kB   |
| PertoDeMim                             | **15 kB**   | 5 kB     |
| V3EventDetail / V3Economize / V3Driver | 13-15 kB    | 4-5 kB   |
| V3Transport                            | 11 kB       | 3 kB     |
| RoxouRideMap                           | 4,7 kB      | 2,3 kB   |
| RoxouVenueMap                          | 1,2 kB      | 0,7 kB   |

## Delta vs. baseline

| métrica                                   | antes      | depois     | Δ              |
| ----------------------------------------- | ----------:| ----------:| --------------:|
| **main `index` (raw)**                    | 1 494 kB   | **892 kB** | **−602 kB / −40,3 %** |
| **main `index` (gzip)**                   | 425 kB     | **257 kB** | **−168 kB / −39,6 %** |
| PertoDeMim chunk (raw)                    | 59 kB      | 15 kB      | −44 kB / −75 % |
| Dashboard                                 | 407 kB     | 407 kB     | 0 (recharts já isolado) |
| InstagramAdmin                            | 131 kB     | 131 kB     | 0 (admin route já lazy) |
| jszip                                     | 97 kB      | 97 kB      | 0 (já isolado)         |

> Meta: −25 % no JS inicial da Home. **Atingido: −39,6 % gzip.**

## Novos chunks criados (code-splitting Fase 7)

- `leaflet-*.js` (155 kB) — compartilhado por mapas, carrega só sob demanda.
- `V3AIChat-*.js` (177 kB) — react-markdown/remark-gfm/highlight viraram lazy
  via rota.
- `V3*-*.js` (24 chunks) — cada rota V3 não-Home ganhou seu próprio chunk.
- `RoxouNearbyEventsMap-*.js` / `RoxouRideMap-*.js` / `RoxouVenueMap-*.js` —
  carregam só quando o componente Suspense renderiza.
- `purify.es-*.js` (24 kB) — DOMPurify movido para chunk dedicado por efeito
  colateral do novo grafo.

## Verificações

- Build verde (`vite build` → 0 erros, mesma config).
- PWA: precache passou de 109 → 168 entries (esperado: mais chunks individuais);
  service worker, manifest e runtime caching **idênticos** (vide diff vazio em
  `vite.config.ts` na seção VitePWA).
- `dist/stats.html` (treemap visual) gerado quando `ANALYZE=1`.
- Nenhuma mudança em UI, rotas, SEO, JSON-LD, Edge Functions, Supabase, RLS,
  dateUtils ou comportamento visual.
