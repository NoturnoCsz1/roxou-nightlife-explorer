# Fase 5 — Arquivos alterados

## Editados (1)
- `src/pages/v3/V3Home.tsx` — 2.445 LOC → 198 LOC (shell orquestrador)

## Criados em `src/apps/public/home/` (15)

### Núcleo
- `src/apps/public/home/types.ts` — 31 LOC — `Ev`, `VenueRank`
- `src/apps/public/home/constants.ts` — 21 LOC — VIBE_FILTERS, TODAY_KEY/START/END, LIVE_TOLERANCE_MS, PINNED_PARTNERS
- `src/apps/public/home/utils.ts` — 64 LOC — helpers de data, normalizeEvent, safeEvents

### Componentes visuais
- `src/apps/public/home/HomeSkeletons.tsx` — 113 LOC
- `src/apps/public/home/HomeCuradoria.tsx` — 147 LOC (PremiumEventCard)
- `src/apps/public/home/HomeHero.tsx` — 419 LOC (ImmersiveHero + DesktopHeroSection)
- `src/apps/public/home/HomeLists.tsx` — 134 LOC (VenueSpotlight, VenueRankCard, FeaturedPartnerCard)
- `src/apps/public/home/HomeSections.tsx` — 225 LOC (BentoGrid, CategoryBentoCard, VibeSelector, Rail, QuickFilterTabs)
- `src/apps/public/home/HomeSidebar.tsx` — 198 LOC (DesktopProfilePanel, DesktopNavPanel, DesktopCategoriesPanel, DesktopWeekPanel, DesktopFeaturedPartnersPanel, NowPanel)
- `src/apps/public/home/HomeCommandCenter.tsx` — 392 LOC (layout principal desktop)
- `src/apps/public/home/HomeMobile.tsx` — 334 LOC (composição completa do bloco mobile)
- `src/apps/public/home/HomeDesktop.tsx` — 94 LOC (composição completa do bloco desktop)

### Hooks
- `src/apps/public/home/hooks/useHomeData.ts` — 311 LOC (queries + dados derivados + safety release)
- `src/apps/public/home/hooks/useHomeCarousels.ts` — 22 LOC (autoplay hero)
- `src/apps/public/home/hooks/useHomeSearch.ts` — 29 LOC (catFilter, vibeFilter)

## Documentação (3)
- `docs/refactor/FASE_05_v3home.md`
- `docs/refactor/FASE_05_v3home_CHANGED_FILES.md` (este arquivo)
- `docs/refactor/screenshots/FASE_05_mobile_360.png`
- `docs/refactor/screenshots/FASE_05_mobile_390.png`
- `docs/refactor/screenshots/FASE_05_desktop_1440.png`

## Resumo numérico
- 1 arquivo editado
- 15 módulos novos
- 3 screenshots
- 2 documentos
- Build verde · `tsc --noEmit` verde · ESLint 0/0 nos tocados
- Nenhum arquivo > 500 LOC · Shell < 200 LOC
