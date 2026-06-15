# Home pública (V3) — contrato interno

Módulos extraídos de `src/pages/v3/V3Home.tsx` na Fase 5 e consolidados na Fase 5B.
**Travas:** nenhum arquivo aqui pode alterar JSX, classes Tailwind, queries
Supabase, SEO, animações, rotas ou comportamento observável da Home pública.
Mudanças funcionais devem virar uma nova fase aprovada.

## Topologia

```
src/pages/v3/V3Home.tsx          # shell: SEO + telemetria + delega para mobile/desktop
src/apps/public/home/
├── README.md                    # este arquivo
├── constants.ts                 # VIBE_FILTERS, TODAY_*, LIVE_TOLERANCE_MS, PINNED_PARTNERS
├── types.ts                     # Ev, VenueRank
├── utils.ts                     # safeEvents, toSafeDate (helpers puros)
├── hooks/
│   ├── useHomeData.ts           # queries Supabase + memos derivados (ordem preservada)
│   ├── useHomeCarousels.ts      # autoplay do hero (4500ms)
│   └── useHomeSearch.ts         # filtros locais de categoria/vibe
├── HomeMobile.tsx               # orquestra layout mobile
├── HomeDesktop.tsx              # orquestra layout desktop (≥ lg)
├── HomeCommandCenter.tsx        # barra superior mobile (busca + atalhos)
├── HomeHero.tsx                 # ImmersiveHero (mobile) + DesktopHero
├── HomeCuradoria.tsx            # PremiumEventCard / Destaque da Semana
├── HomeSections.tsx             # Bento / rails (hoje, semana, etc.)
├── HomeLists.tsx                # rankings de venues
├── HomeSidebar.tsx              # sidebar desktop
└── HomeSkeletons.tsx            # placeholders de loading
```

Cada arquivo está abaixo do limite de 500 LOC (maior: `HomeHero.tsx` 419).

## Contrato de dados (`useHomeData`)

Queries Supabase e `queryKey`s preservados literalmente da V3Home original:

| queryKey                                | tabela(s)                                    | staleTime | observações                                    |
| --------------------------------------- | -------------------------------------------- | --------- | ---------------------------------------------- |
| `["v3-events", TODAY_KEY]`              | `events`                                     | 60s       | published, futuros (com `LIVE_TOLERANCE_MS`), limit 80 |
| `["v3-today-events", TODAY_KEY]`        | `events`                                     | 60s       | corte por `TODAY_END` (SP)                     |
| `["v3-trending"]`                       | `page_views`                                 | default   | janela 24h, top 12 por event_id                |
| `["v3-venue-ranks"]`                    | `page_views` + `saved_partners` + `partners` + `events` | default | janela 7d, top 8 parceiros                     |
| `["v3-featured-partners"]`              | `partners` + `events` + `page_views`         | default   | depende de `venueRanks`; aplica `PINNED_PARTNERS` |

**Regras de derivação (não alterar a ordem dos `useMemo`):**

1. `heroEvents` (top 4) — tier: hoje → próximos 7d → resto; tie-break por `featured`, depois views (trending), depois data.
2. `usedIds` é incrementado em sequência por: `heroEvents` → `trending` → `todayEvents` → `featured` → `weekEvents` → `weeklyHighlight`. Trocar a ordem **muda a Home**.
3. `weeklyHighlight` aceita só `category ∈ {festa, show, balada}`.
4. Safety release: o skeleton do `events` é liberado após 4s mesmo sem resposta (`loadingTimedOut`).

## Carrossel e busca

- `useHomeCarousels`: autoplay 4500ms, pausa quando `total ≤ 1` ou `isHeroPaused`.
- `useHomeSearch`: filtros derivados de `catFilter` / `vibeFilter`. Vibes:
  - `bombando` → ids presentes no trending
  - `musica` → `category === "show"` ou `sub_category ∈ {show, sertanejo, rock, pagode, mpb, pop_rock, samba}`
  - `happy` → `category ∈ {bar, gastrobar, restaurante}`
  - `grandes` → `category ∈ {festival, festa}`

## Constantes sensíveis

- `TODAY_KEY` / `TODAY_START` / `TODAY_END` derivam de `@/lib/dateUtils` (timezone SP). **Nunca** usar `new Date().toISOString()` para esses cortes.
- `LIVE_TOLERANCE_MS = 4h` — eventos iniciados nas últimas 4h continuam visíveis.
- `PINNED_PARTNERS` — lista literal usada para fixar parceiros em `featuredPartners`.

## Storage / efeitos colaterais

A Home não lê nem escreve `localStorage` / `sessionStorage`. Telemetria/console
permanece restrita ao shell (`V3Home.tsx`) — logs `[V3Home]` e
`[DEBUG SORRISO MAROTO]`.

## SEO

JSON-LD e `<SEO />` ficam no shell (`src/pages/v3/V3Home.tsx`). Não duplicar nos
módulos filhos.

## Como evoluir sem quebrar

1. Mudança de UI/animação → editar o componente correspondente, sem tocar
   `useHomeData` nem `constants.ts`.
2. Nova query → adicionar em `useHomeData` mantendo as existentes intactas e
   documentar nova linha na tabela acima.
3. Nova seção → criar `Home<Nome>.tsx`, importar em `HomeMobile`/`HomeDesktop`.
   Se consumir `usedIds`, decidir conscientemente a posição na cadeia de dedupe.
