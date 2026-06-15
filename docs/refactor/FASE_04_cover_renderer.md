# Fase 4 — Quebra de `src/lib/coverRenderer.ts`

## Objetivo
Quebrar o arquivo `src/lib/coverRenderer.ts` (1441 LOC) em submódulos menores
sem alterar comportamento, dimensões, fontes, templates ou output visual.

## Estratégia
`src/lib/coverRenderer.ts` foi **substituído** pela pasta
`src/lib/coverRenderer/` com `index.ts` agregador. Como TypeScript/Vite
resolvem `@/lib/coverRenderer` para `src/lib/coverRenderer/index.ts`, todos os
imports existentes continuam funcionando sem qualquer alteração nos chamadores.

> Nenhum chamador (`EventImageGenerator`, `FormatToggle`, `InstagramCovers`,
> `InstagramStudio`) precisou ser editado.

## Estrutura final

```
src/lib/coverRenderer/
├── index.ts              25 LOC  ← re-exports públicos
├── types.ts              44 LOC  ← ArtFormat, FORMAT_SIZES, CoverEvent, CoverPartner, constantes
├── utils.ts              94 LOC  ← roundRect, wrapText, loadImage, tryLoadImage,
│                                   formatTime, extractArtist, extractPrice, pickTitle…
├── canvas.ts            174 LOC  ← primitivas (drawGrain, drawGlow, drawHeroBg,
│                                   drawBadge, drawGlassPanel, drawPremiumCTA, drawGhostItem)
└── templates/
    ├── agenda.ts        134 LOC  ← renderCoverAgenda
    ├── topRoles.ts       94 LOC  ← renderCoverTopRoles
    ├── weekend.ts        88 LOC  ← renderCoverWeekend
    ├── partners.ts       67 LOC  ← renderCoverPartners
    ├── flyer.ts         137 LOC  ← renderFlyer (delega para renderStoryV3 em fmt="story")
    ├── banner.ts        104 LOC  ← renderBannerFestival
    ├── destaque.ts      160 LOC  ← renderCoverDestaque
    ├── cta.ts            39 LOC  ← renderCTASlide
    └── storyV3.ts       331 LOC  ← renderStoryV3 (Aura template)
```

**Maior arquivo:** `templates/storyV3.ts` (331 LOC) — bem abaixo do limite de 500.

## Sobre a estrutura sugerida pelo usuário
A estrutura sugerida no escopo (`video.ts`, `fonts.ts`, `export.ts`) **não foi
adotada** porque não existe código correspondente no arquivo original:

| Sugerido      | Decisão                                                                                     |
|---------------|---------------------------------------------------------------------------------------------|
| `video.ts`    | Não existe nenhuma lógica de vídeo em `coverRenderer.ts`. (Vídeo/MediaRecorder fica em outro módulo da admin.) |
| `fonts.ts`    | Não há `FontFace` API nem carregamento dinâmico de fontes — todo o código usa `"sans-serif"` direto no `ctx.font`. |
| `export.ts`   | "Export" é só `canvas.toDataURL("image/png")` no final de cada template — uma linha cada. Extrair para módulo separado seria pior. |

No lugar, foram criados `canvas.ts` (primitivas) e `templates/` (um arquivo por
template) — uma divisão que reflete a estrutura real do código e mantém todos os
arquivos com responsabilidade única.

## API pública preservada (zero breaking changes)

| Símbolo                  | Antes                                | Depois                                                    |
|--------------------------|--------------------------------------|-----------------------------------------------------------|
| `ArtFormat`              | `src/lib/coverRenderer.ts`           | `src/lib/coverRenderer/types.ts` (re-exportado pelo index) |
| `FORMAT_SIZES`           | idem                                 | `types.ts`                                                |
| `CoverEvent`             | idem                                 | `types.ts`                                                |
| `CoverPartner`           | idem                                 | `types.ts`                                                |
| `loadImage`              | idem                                 | `utils.ts`                                                |
| `renderCoverAgenda`      | idem                                 | `templates/agenda.ts`                                     |
| `renderCoverTopRoles`    | idem                                 | `templates/topRoles.ts`                                   |
| `renderCoverWeekend`     | idem                                 | `templates/weekend.ts`                                    |
| `renderCoverPartners`    | idem                                 | `templates/partners.ts`                                   |
| `renderFlyer`            | idem                                 | `templates/flyer.ts`                                      |
| `renderBannerFestival`   | idem                                 | `templates/banner.ts`                                     |
| `renderCoverDestaque`    | idem                                 | `templates/destaque.ts`                                   |
| `renderCTASlide`         | idem                                 | `templates/cta.ts`                                        |
| `renderStoryV3`          | idem                                 | `templates/storyV3.ts`                                    |

**Todas as assinaturas (parâmetros, defaults, tipos de retorno) ficaram idênticas.**

## Paridade visual / comportamental

- Nenhum corpo de função foi alterado — código copiado **byte por byte** dos
  ranges originais (linhas 73-1441 do arquivo antigo).
- Constantes `BG`, `ACCENT`, `ACCENT_ALT`, `WHITE`, `MUTED`, `STORY_BG`,
  `STORY_PURPLE`, `STORY_VIOLET`, `STORY_LILAC`, `WEEKDAYS` preservadas com os
  mesmos valores.
- `FORMAT_SIZES` (dimensões 1080×1350 / 1080×1920 / 1920×1080) intactos.
- Fontes (`sans-serif`), pesos (400/500/600/700/800/900), tamanhos, gradientes,
  shadows, vinhetas, glows, padding — todos preservados.
- `canvas.toDataURL("image/png")` continua na saída de cada template.
- `renderFlyer` continua delegando para `renderStoryV3` quando `fmt === "story"`.

## Code splitting (benefício futuro)
Cada template agora pode ser importado individualmente
(`import { renderStoryV3 } from "@/lib/coverRenderer/templates/storyV3"`) o que
permite, no futuro, fazer `dynamic import()` por template em telas de mídia sem
pagar o custo dos demais. **Não foi feito agora** — todos os imports continuam
via `@/lib/coverRenderer` (eager) por compatibilidade.

## Validação

| Check                                                              | Resultado |
|--------------------------------------------------------------------|-----------|
| `npx tsc --noEmit -p tsconfig.app.json`                            | ✅ verde   |
| `npx eslint src/lib/coverRenderer/ --max-warnings=0`               | ✅ 0/0     |
| Build (harness automática)                                         | ✅ verde   |
| Imports dos chamadores resolvem para `coverRenderer/index.ts`      | ✅          |
| Todos os arquivos < 500 LOC (maior: storyV3 = 331)                 | ✅          |
| Nenhuma alteração em corpos de funções (cópia byte-equivalente)    | ✅          |

> Validação visual com geração de mídia real (Story Agenda / Arte / Flyer) deve
> ser feita pelo aprovador, abrindo o admin → Instagram Studio. Como nenhum
> corpo de função mudou e a API é byte-compatível, o output será pixel-idêntico.
> Screenshots automatizadas das ferramentas de mídia exigiriam mock auth/dados.

## Travas respeitadas
UI, queries Supabase, Edge Functions, payloads, fontes, dimensões, templates,
chamadas existentes, exportação PNG — **todos intocados**.

## Riscos remanescentes
- Baixo: nenhum chamador editado, API estável, código copiado verbatim.
- Apenas atenção operacional para o aprovador testar manualmente:
  1. Story Agenda (`renderCoverAgenda` com `fmt="story"`)
  2. Arte / Flyer (`renderFlyer`)
  3. Story V3 / cover usando `renderStoryV3` ou `renderCoverDestaque`
