# Fase 4 — Arquivos alterados

## Deletados
- `src/lib/coverRenderer.ts` (1441 LOC)

## Criados (12 arquivos, total 1491 LOC distribuídos)

| Arquivo                                              | LOC | Conteúdo                                                                 |
|------------------------------------------------------|-----|--------------------------------------------------------------------------|
| `src/lib/coverRenderer/index.ts`                     | 25  | Re-exports públicos                                                      |
| `src/lib/coverRenderer/types.ts`                     | 44  | `ArtFormat`, `FORMAT_SIZES`, `CoverEvent`, `CoverPartner`, constantes de cor, `WEEKDAYS`, paleta Story V3 |
| `src/lib/coverRenderer/utils.ts`                     | 94  | `roundRect`, `wrapText`, `loadImage`, `tryLoadImage`, `getDayLabel`, `getDateShort`, `formatTime`, `extractArtist`, `extractPrice`, `pickTitle` |
| `src/lib/coverRenderer/canvas.ts`                    | 174 | `drawGrain`, `drawGlow`, `drawHeroBg`, `drawBadge`, `drawGlassPanel`, `drawPremiumCTA`, `drawGhostItem` |
| `src/lib/coverRenderer/templates/agenda.ts`          | 134 | `renderCoverAgenda`                                                      |
| `src/lib/coverRenderer/templates/topRoles.ts`        | 94  | `renderCoverTopRoles`                                                    |
| `src/lib/coverRenderer/templates/weekend.ts`         | 88  | `renderCoverWeekend`                                                     |
| `src/lib/coverRenderer/templates/partners.ts`        | 67  | `renderCoverPartners`                                                    |
| `src/lib/coverRenderer/templates/flyer.ts`           | 137 | `renderFlyer` (delega para `renderStoryV3` em `fmt="story"`)             |
| `src/lib/coverRenderer/templates/banner.ts`          | 104 | `renderBannerFestival`                                                   |
| `src/lib/coverRenderer/templates/destaque.ts`        | 160 | `renderCoverDestaque`                                                    |
| `src/lib/coverRenderer/templates/cta.ts`             | 39  | `renderCTASlide`                                                         |
| `src/lib/coverRenderer/templates/storyV3.ts`         | 331 | `renderStoryV3`                                                          |

## Editados
**Nenhum.** Como o path `@/lib/coverRenderer` agora resolve para
`src/lib/coverRenderer/index.ts` (folder + index), os 4 chamadores não foram
tocados:

- `src/components/admin/EventImageGenerator.tsx`
- `src/components/admin/FormatToggle.tsx`
- `src/components/admin/InstagramCovers.tsx`
- `src/components/admin/InstagramStudio.tsx`

## Docs criados
- `docs/refactor/FASE_04_cover_renderer.md`
- `docs/refactor/FASE_04_cover_renderer_CHANGED_FILES.md`

## LOC antes vs. depois

| Métrica                   | Antes | Depois |
|---------------------------|-------|--------|
| Arquivos                  | 1     | 13     |
| Maior arquivo             | 1441  | 331    |
| Total LOC                 | 1441  | 1491¹  |

¹ O leve aumento (~50 LOC) vem dos blocos `import { ... } from "../..."` e
cabeçalhos de cada módulo. Zero código duplicado.
