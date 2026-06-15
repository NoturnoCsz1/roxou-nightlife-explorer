# Fase 5 — Refactor `src/pages/v3/V3Home.tsx`

**Status:** ✅ Concluída
**Escopo:** quebrar o megafile da Home pública em módulos < 500 LOC, sem alterar UI, queries, SEO, animações, rotas ou comportamento.

---

## Resultado

| Métrica | Antes | Depois |
|--------|------:|------:|
| `src/pages/v3/V3Home.tsx` | **2.445 LOC** | **198 LOC** (shell orquestrador) |
| Total módulos novos | 0 | 15 |
| Maior módulo novo | — | `HomeHero.tsx` (419 LOC) |
| Arquivos > 500 LOC | 1 | 0 |

---

## Estrutura criada (`src/apps/public/home/`)

```
src/apps/public/home/
├── types.ts                    (31 LOC)  — Ev, VenueRank
├── constants.ts                (21 LOC)  — VIBE_FILTERS, TODAY_KEY/START/END, LIVE_TOLERANCE_MS, PINNED_PARTNERS
├── utils.ts                    (64 LOC)  — toSafeDate, fmtTime, fmtDateFull, isEventLive, getDayLabel, normalizeEvent, safeEvents
├── HomeSkeletons.tsx          (113 LOC)  — HeroSkeleton, EmptyHero, RailSkeleton, VenueRankSkeleton, DesktopHomeSkeleton, HomeDataFallback, HomeBelowFoldBoundary
├── HomeCuradoria.tsx          (147 LOC)  — PremiumEventCard (card editorial reutilizado em todos os rails)
├── HomeHero.tsx               (419 LOC)  — ImmersiveHero (mobile) + DesktopHeroSection (desktop)
├── HomeLists.tsx              (134 LOC)  — VenueSpotlight (#1), VenueRankCard (#2-#5), FeaturedPartnerCard
├── HomeSections.tsx           (225 LOC)  — BentoGrid, CategoryBentoCard, VibeSelector, Rail, QuickFilterTabs
├── HomeSidebar.tsx            (198 LOC)  — DesktopProfilePanel, DesktopNavPanel, DesktopCategoriesPanel, DesktopWeekPanel, DesktopFeaturedPartnersPanel, NowPanel
├── HomeCommandCenter.tsx      (392 LOC)  — Layout principal desktop (hero + coluna principal + sidebar)
├── HomeMobile.tsx             (334 LOC)  — Composição completa do bloco mobile (lg:hidden)
├── HomeDesktop.tsx             (94 LOC)  — Composição completa do bloco desktop (hidden lg:block)
└── hooks/
    ├── useHomeData.ts         (311 LOC)  — 4 useQuery + heroEvents + trending + todayEvents + featured + weekEvents + weeklyHighlight + partnerRankMap + trendingIdSet + safety release de loading
    ├── useHomeCarousels.ts     (22 LOC)  — estado heroIdx + autoplay + pausa
    └── useHomeSearch.ts        (29 LOC)  — catFilter + vibeFilter + listas derivadas
```

> **Observação:** os arquivos `HomeMomentum.tsx` e `HomeCuradoria.tsx` da estrutura sugerida foram consolidados em `HomeCuradoria.tsx` (PremiumEventCard) e nas métricas inline do `DesktopHeroSection`. Nenhum bloco visual da Home dependia de um "HomeMomentum" isolado — o texto de "momentum" não era renderizado no código original (variável computada e descartada).

---

## Paridade preservada

| Item | Estado |
|------|--------|
| JSX renderizado | **idêntico** (literal-copy de cada seção) |
| Classes Tailwind | **inalteradas** |
| SEO + JSON-LD WebSite/Organization/EntertainmentBusiness | **inalterado** |
| `queryKey` de todas as 5 queries (`v3-events`, `v3-today-events`, `v3-trending`, `v3-venue-ranks`, `v3-featured-partners`) | **inalteradas** |
| `select(...)` colunas, filtros e ordenação | **inalterados** |
| `staleTime`, `retry`, `placeholderData`, `refetchOnWindowFocus` | **inalterados** |
| Ordem de execução dos `useMemo` (mutação de `usedIds`) | **preservada** |
| Safety release de 4s do loading | **preservado** (mesmo `setTimeout`) |
| Autoplay hero 4500ms + pausa em touch | **preservado** |
| Carrossel hero (mobile e desktop), strip de miniaturas, barra de progresso | **preservado** |
| Filtros `catFilter` / `vibeFilter` (incluindo lista `musicSubs`) | **preservados** |
| `weeklyHighlight` (categorias permitidas, ordem de fallback) | **preservado** |
| `mainEvents` (seed determinístico + shuffle) | **preservado** |
| `localStorage` keys | **nenhuma alterada** (V3Home não usa) |
| Comportamento mobile / desktop (breakpoint `lg`) | **inalterado** |
| `[DEBUG SORRISO MAROTO]` + `[HOME DEBUG]` logs de console | **preservados** no shell |

---

## Validação

| Verificação | Resultado |
|-------------|-----------|
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ verde |
| `npx eslint src/pages/v3/V3Home.tsx src/apps/public/home/ --max-warnings=0` | ✅ 0 erros / 0 warnings |
| Maior arquivo < 500 LOC | ✅ (419 LOC) |
| Shell < 200 LOC | ✅ (198 LOC) |
| Mobile 360×653 — Home abre, hero carrossel, badges, jogos, bottom nav | ✅ ver `screenshots/FASE_05_mobile_360.png` |
| Mobile 390×844 — idem | ✅ ver `screenshots/FASE_05_mobile_390.png` |
| Desktop 1440 — hero 2-colunas, sidebar Aura, métricas, strip slides | ✅ ver `screenshots/FASE_05_desktop_1440.png` |

---

## O que NÃO mudou (travas respeitadas)

- ❌ Nenhuma migração para `src/services/` (Fase 5 não autoriza)
- ❌ Nenhuma renomeação de V3 → public (regra explícita)
- ❌ Nenhum arquivo movido para `apps/public` (não fizemos mover, criamos pasta de extração)
- ❌ Edge Functions, RLS, rotas, BottomNav, DesktopNav, TodaySection, TodayTimeline, WeeklySpotlight, CopaHighlightCard, HomeJogosCard — intocados
- ❌ `src/components/v3/home/*` extraídos em fases anteriores — **não tocados**
- ❌ `src/integrations/supabase/client.ts`, `.env`, `supabase/config.toml` — intocados

---

## Próximos passos (Fase 5+, se aprovados)

- Migrar `useHomeData` para `src/services/events.ts` (já existe um service base)
- Criar barrel `src/apps/public/home/index.ts` para encurtar imports
- Renomear `src/pages/v3/V3Home.tsx` → `src/pages/Home.tsx` + alias de rota
- Mover pasta para `apps/public/home` (apenas após confirmar que não quebra type-imports em outros pontos)

**Aguardando aprovação manual antes de qualquer próxima fase.**
