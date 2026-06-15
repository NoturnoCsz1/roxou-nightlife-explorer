# Fase 5B — Consolidação da Home pública

Fase curta de consolidação pós Fase 5. Nenhuma alteração de UI, JSX, classes
Tailwind, queries Supabase, SEO, animações, rotas ou comportamento.

## Escopo executado

- Auditoria de imports mortos em `src/apps/public/home/` — **nenhum encontrado**
  (`npx eslint src/apps/public/home/ --max-warnings=0` → 0/0 antes e depois).
- Revisão de responsabilidades — todos os módulos têm escopo claro (ver
  `src/apps/public/home/README.md`).
- Criação de `src/apps/public/home/README.md` documentando topologia, contratos
  de queries, `queryKey`s, regras de derivação (`usedIds`, `heroEvents`,
  `weeklyHighlight`), filtros de vibe e constantes sensíveis (`TODAY_*`,
  `LIVE_TOLERANCE_MS`, `PINNED_PARTNERS`).
- Confirmado que a Home **não usa** `localStorage`/`sessionStorage`. Telemetria
  permanece restrita ao shell.

## Resultado de paridade

- Nenhum `.ts`/`.tsx` foi modificado nesta fase.
- Apenas docs (`README.md` + dois arquivos em `docs/refactor/`) foram criados.
- Build / `tsc --noEmit` / lint verdes (sem arquivos de código tocados).
- Screenshots não obrigatórios — JSX intocado.

## LOC dos módulos da Home (snapshot)

| arquivo                                          | LOC |
| ------------------------------------------------ | --- |
| src/pages/v3/V3Home.tsx                          | 198 |
| src/apps/public/home/HomeHero.tsx                | 419 |
| src/apps/public/home/HomeCommandCenter.tsx       | 392 |
| src/apps/public/home/HomeMobile.tsx              | 334 |
| src/apps/public/home/hooks/useHomeData.ts        | 311 |
| src/apps/public/home/HomeSections.tsx            | 225 |
| src/apps/public/home/HomeSidebar.tsx             | 198 |
| src/apps/public/home/HomeCuradoria.tsx           | 147 |
| src/apps/public/home/HomeLists.tsx               | 134 |
| src/apps/public/home/HomeSkeletons.tsx           | 113 |
| src/apps/public/home/HomeDesktop.tsx             | 94  |
| src/apps/public/home/utils.ts                    | 64  |
| src/apps/public/home/types.ts                    | 31  |
| src/apps/public/home/hooks/useHomeSearch.ts      | 29  |
| src/apps/public/home/constants.ts                | 21  |
| src/apps/public/home/hooks/useHomeCarousels.ts   | 22  |

Todos < 500 LOC. Estrutura estável; pronta para futuras evoluções incrementais.

## Próximos passos sugeridos (somente após nova aprovação)

- Fase 6: candidatos potenciais a quebra (não iniciar agora).
