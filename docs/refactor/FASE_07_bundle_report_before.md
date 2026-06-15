# Fase 7 — Bundle baseline (antes)

Build: `SKIP_SITEMAP=1 npx vite build` (mesma config, sem visualizer).
Captura imediatamente antes das otimizações de code-splitting da Fase 7.

## Maiores chunks

| chunk                                  | bytes (raw) | gzip     |
| -------------------------------------- | -----------:| --------:|
| **assets/index-*.js (main)**           | **1 494 kB** | **425 kB** |
| Dashboard                              | 406 kB      | 111 kB   |
| InstagramAdmin                         | 131 kB      | 34 kB    |
| jszip.min                              | 97 kB       | 30 kB    |
| adminEventPayload                      | 68 kB       | 19 kB    |
| PertoDeMim                             | 59 kB       | 18 kB    |
| EstabelecimentosAudit                  | 54 kB       | 14 kB    |
| EventosList                            | 52 kB       | 14 kB    |
| EventoBulkForm                         | 50 kB       | 14 kB    |
| RadarIA                                | 50 kB       | 14 kB    |
| EventoForm                             | 48 kB       | 14 kB    |

## Observações chave (antes)

- **Main chunk inclui todas as páginas V3** (eager imports em `App.tsx`):
  V3Discover, V3Agenda, V3Profile, V3EventDetail, V3LocalDetail, V3Transport,
  V3RideRequest, V3AIChat, V3Economize, V3Sobre, etc.
- **Leaflet + react-leaflet + markercluster + heat** entram via
  `V3RideRequest` (eager) → ficam **dentro do main**.
- **react-markdown + remark-gfm** entram via `V3AIChat` (eager) → main.
- `PertoDeMim` é route-lazy, mas importa map estaticamente → leaflet aparece
  duplicado no chunk de PertoDeMim (59 kB).
- `Dashboard` (lazy) já isola recharts.
- `jszip` já está em chunk próprio via imports dinâmicos existentes.

## Snapshot completo

`docs/refactor/_fase07_baseline_sizes.txt` contém a lista bruta `ls -la`.
