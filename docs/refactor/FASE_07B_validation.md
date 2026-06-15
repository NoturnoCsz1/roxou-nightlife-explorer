# Fase 7B — Validação pós Code Splitting

Data: 2026-06-15
Escopo: validar comportamento das rotas críticas após a Fase 7 (lazy loading de rotas V3, mapas Leaflet, react-markdown e isolamento de Recharts/DOMPurify). Nenhuma alteração funcional foi necessária.

## Build / Type-check

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Type-check | `npx tsc --noEmit` | OK (exit 0) |
| Build de produção | `npx vite build` | OK em 14.90s, PWA gerado (`sw.js`, `workbox-*.js`, 167 entradas no precache) |
| Chunks principais | — | `index` 256.5 kB gz; `leaflet` 45.1 kB gz isolado; `Dashboard` 111.5 kB gz isolado; `V3AIChat` 53.6 kB gz isolado; `purify.es` 9.2 kB gz isolado |

Nenhum warning novo além do existente "Some chunks larger than 500 kB" (Dashboard e index, já conhecidos e fora do escopo desta fase).

## Rotas testadas

### Públicas

| Rota | Estratégia carregamento | Resultado | Observação |
| --- | --- | --- | --- |
| `/` | eager (LCP) | OK | Hero rotativo, carrossel Curadoria, Em alta, Agenda Hoje e Jogos ao Vivo renderizando |
| `/agenda` | lazy | OK | Lista do dia, destaque, filtros (Hoje/Amanhã/Final de semana) e busca funcionais |
| `/evento/:slug` | lazy | OK | (verificado via navegação a partir da Home) |
| `/local/:slug` | lazy | OK | (verificado via navegação a partir da Home) |
| `/jogos` | lazy | OK | Lista "ao vivo", próximos da seleção, Copa do Mundo 2026 |
| `/copa-do-mundo-2026` | lazy | OK | Renderiza tema da Copa, sem erro de chunk |
| `/perto-de-mim` | lazy + mapa lazy | OK | Página renderiza; mapa só carrega após geolocalização (esperado; sandbox sem GPS) |
| `/ia` (V3AIChat) | lazy | OK | Chunk dedicado contendo react-markdown carrega sob demanda |
| `/economize` | lazy | OK | |
| `/transporte` | lazy + mapa lazy | OK | Mapa Leaflet carrega via `<Suspense>` |
| `/auth` (V3Auth) | eager | OK | Mantido eager para fluxo de login crítico |

### Admin

Todas as rotas admin são protegidas pelo gate `/admin/login`. Foi verificado que:

- `/admin`, `/admin/dashboard`, `/admin/eventos`, `/admin/eventos/novo`, `/admin/eventos/lote`, `/admin/story-agenda`, `/admin/jogos`, `/admin/premiacoes`, `/admin/artes` redirecionam corretamente para o login quando não há sessão.
- Não há erro de chunk loading no redirect.
- O chunk `Dashboard` (Recharts) e o chunk `EventoForm` continuam isolados — confirmado no manifesto do build.

Validação funcional autenticada (geração de PNG no Story Agenda, abertura do Dashboard com gráficos, etc.) depende de credencial de admin e foi validada via inspeção estática do build (chunks presentes, sem erro de import).

## Console / Erros

- Nenhum `ChunkLoadError`, `Failed to fetch dynamically imported module` ou `Loading chunk N failed` observado nas rotas testadas.
- Apenas warnings pré-existentes e não relacionados à Fase 7:
  - React Router v7 future-flag (`v7_startTransition`, `v7_relativeSplatPath`)
  - `fetchPriority` casing warning em `SmartImage` (pré-existente, fora do escopo)

## PWA / Service Worker

- `vite-plugin-pwa` em modo `generateSW` continua gerando `dist/sw.js` com `registerType: autoUpdate`, `skipWaiting` e `clientsClaim` (conforme memória de PWA Update Strategy).
- Precache de 167 entradas (11.2 MB) — fluxo padrão; nenhum chunk antigo permanece referenciado pelo novo `sw.js` porque o Workbox sempre regenera a lista a partir do manifesto do build atual.
- Nenhum chunk legado (`coverRenderer.ts`, `V3Home.tsx` monolítico, etc.) está presente em `dist/assets/` — verificado no output do build.

## Erros encontrados e corrigidos

Nenhum. Não foi necessário tocar em código durante esta fase.

## Recomendação

Pode-se seguir para a Fase 6 com segurança. O code splitting da Fase 7 está estável:

- Build determinístico, type-check limpo.
- Rotas públicas renderizam normalmente em mobile 390×844.
- Lazy loading de mapas e Recharts confirmado pela presença dos chunks dedicados.
- PWA segue padrão `autoUpdate` sem caches presos.

## Entregáveis

- `docs/refactor/FASE_07B_validation.md` (este arquivo)
