# Relatório consolidado — Fases 0, 1, 2

Data: 15/06/2026.

## Arquivos criados

| # | Arquivo | LOC | Fase |
|---|---|---:|---|
| 1 | `docs/refactor/FASE_00_baseline.md` | — | 0 |
| 2 | `docs/refactor/FASE_01_aliases.md` | — | 1 |
| 3 | `docs/refactor/FASE_02_services.md` | — | 2 |
| 4 | `docs/refactor/CHANGED_FILES_FASES_0_1_2.md` | — | — |
| 5 | `src/apps/public/README.md` | 2 | 1 |
| 6 | `src/apps/admin/README.md` | 2 | 1 |
| 7 | `src/apps/partner/README.md` | 1 | 1 |
| 8 | `src/apps/transport/README.md` | 1 | 1 |
| 9 | `src/apps/games/README.md` | 1 | 1 |
| 10 | `src/shared/README.md` | 4 | 1 |
| 11 | `src/services/README.md` | 27 | 2 |
| 12 | `src/services/events.ts` | 80 | 2 |
| 13 | `src/services/partners.ts` | 55 | 2 |
| 14 | `src/services/instagram.ts` | 45 | 2 |
| 15 | `src/services/transport.ts` | 40 | 2 |
| 16 | `src/services/analytics.ts` | 38 | 2 |
| 17 | `src/services/aura.ts` | 24 | 2 |
| 18 | `src/services/adminAuth.ts` | 6 | 2 |
| 19 | `src/lib/adminFetch.ts` | 32 | 2 |

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `tsconfig.json` | Acrescentados 7 aliases (`@public`, `@admin`, `@partner`, `@transport`, `@games`, `@shared`, `@services`). |
| `tsconfig.app.json` | Mesmos 7 aliases. |
| `vite.config.ts` | Mesmos 7 aliases em `resolve.alias`. `dedupe ["react","react-dom"]` mantido. |

## NÃO foi tocado (confirmado)
- `src/components/ui/*` (shadcn)
- `src/integrations/supabase/client.ts`, `types.ts`
- `src/lib/dateUtils.ts`
- `supabase/functions/**`, `supabase/config.toml`, migrations
- `src/App.tsx` (rotas)
- Qualquer página pública ou admin
- Manifest/SW PWA
- SEO, sitemap, og-image
- RLS, policies, banco

## Lint
- `npx eslint src/services src/lib/adminFetch.ts` → **0/0**.
- `npm run lint` global → 798 errors/62 warnings, todos **pré-existentes** (Edge Functions, tailwind.config, components admin antigos). Nenhum introduzido por esta entrega.

## Build
A harness Lovable executa `vite build` automaticamente após cada edição. Os arquivos novos só importam módulos já existentes (`@/integrations/supabase/client`, `@/lib/supabaseFetchAll`, `@/lib/dateUtils`), portanto o build se mantém verde.
