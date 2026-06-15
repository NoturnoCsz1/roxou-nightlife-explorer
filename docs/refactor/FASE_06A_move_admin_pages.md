# Fase 6A — Mover páginas admin modularizadas para `src/apps/admin/pages/`

Data: 2026-06-15

## Escopo

Mover fisicamente apenas as três páginas admin já modularizadas (Fases 3A, 3B, 3C1/3C2) para `src/apps/admin/pages/`, sem alterar UI, rotas ou comportamento.

## Arquivos movidos

| Origem | Destino |
| --- | --- |
| `src/pages/admin/EstabelecimentosAudit.tsx` | `src/apps/admin/pages/EstabelecimentosAudit.tsx` |
| `src/pages/admin/EventosList.tsx` | `src/apps/admin/pages/EventosList.tsx` |
| `src/pages/admin/EventoForm.tsx` | `src/apps/admin/pages/EventoForm.tsx` |

## Compatibilidade

Foram mantidos shims temporários nos caminhos antigos em `src/pages/admin/` apenas com `export { default } from "@/apps/admin/pages/..."`. Nenhum código fora de `src/App.tsx` importa as antigas, mas os shims garantem segurança caso surja um import legado durante a migração.

Nota: o re-export histórico de `getEventEditPath` (que existia no `EventosList.tsx` original) foi removido — verificado por `rg` que nenhum consumidor o usa via `pages/admin/EventosList`; todos os usos internos importam direto de `@/apps/admin/eventos/list/types`. Remoção elimina warning de fast-refresh sem alterar comportamento.

## Mudanças em `src/App.tsx`

Apenas três imports lazy reapontados (linhas 38–40):

```diff
-const EstabelecimentosAudit = lazy(() => import("./pages/admin/EstabelecimentosAudit"));
-const EventosList = lazy(() => import("./pages/admin/EventosList"));
-const EventoForm = lazy(() => import("./pages/admin/EventoForm"));
+const EstabelecimentosAudit = lazy(() => import("./apps/admin/pages/EstabelecimentosAudit"));
+const EventosList = lazy(() => import("./apps/admin/pages/EventosList"));
+const EventoForm = lazy(() => import("./apps/admin/pages/EventoForm"));
```

Rotas permanecem idênticas:

- `/admin/estabelecimentos` → `EstabelecimentosAudit`
- `/admin/eventos` → `EventosList`
- `/admin/eventos/novo` → `EventoForm`
- `/admin/eventos/:id/editar` → `EventoForm`

(A rota original solicitada no escopo `/admin/estabelecimentos-audit` está mapeada como `/admin/estabelecimentos` no `App.tsx` — não foi alterada.)

## Validação

| Checagem | Comando | Resultado |
| --- | --- | --- |
| Type-check | `npx tsc --noEmit` | OK |
| Lint | `npx eslint src/App.tsx src/apps/admin/pages/ src/pages/admin/EstabelecimentosAudit.tsx src/pages/admin/EventosList.tsx src/pages/admin/EventoForm.tsx --max-warnings=0` | 0/0 |
| Build | `npx vite build` | OK em 14.62s, PWA gerado (167 entradas) |
| Rotas admin | preview `/admin/eventos` | Gate redireciona para `/admin/login` sem erro de chunk |
| Console | preview | Sem `ChunkLoadError`/`Failed to fetch dynamically imported module` |

Não foi possível validar autenticado (gate de admin); estática do build confirma que os chunks `EventosList`, `EventoForm` e `EstabelecimentosAudit` continuam sendo emitidos como lazy chunks separados.

## Estado pós-Fase 6A

- Páginas admin modularizadas vivem fisicamente em `src/apps/admin/pages/`.
- Restante de `src/pages/admin/*` permanece intocado.
- Páginas públicas (`src/pages/`) permanecem intocadas.
- Rotas, UI, comportamento, queries, RLS e Edge Functions inalterados.

## Próximos passos sugeridos

Fases futuras (6B+) podem mover outras páginas admin já modularizadas conforme forem identificadas, e em seguida remover os shims de `src/pages/admin/`.
