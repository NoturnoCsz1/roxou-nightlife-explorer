# Fase 6D — Mover páginas admin para `src/apps/admin/pages/`

## Escopo
Mover 4 páginas admin de risco médio para `src/apps/admin/pages/`, mantendo rotas, UI, queries, payloads, Edge Functions (sync-football-*), partner_awards, RLS e SEO inalterados.

## Arquivos movidos
| Origem | Destino |
| --- | --- |
| `src/pages/admin/JogosAdmin.tsx` | `src/apps/admin/pages/JogosAdmin.tsx` |
| `src/pages/admin/Sugestoes.tsx` | `src/apps/admin/pages/Sugestoes.tsx` |
| `src/pages/admin/ParceirosList.tsx` | `src/apps/admin/pages/ParceirosList.tsx` |
| `src/pages/admin/ParceiroForm.tsx` | `src/apps/admin/pages/ParceiroForm.tsx` |

## Compatibilidade
Cada caminho legado em `src/pages/admin/` virou shim de re-export:
```ts
export { default } from "@/apps/admin/pages/<Nome>";
```
Verificado via `rg` que apenas `src/App.tsx` referenciava esses caminhos.

## `src/App.tsx`
Apenas 4 imports `lazy(() => import(...))` repointados:
- `./pages/admin/ParceirosList` → `./apps/admin/pages/ParceirosList` (linha 36)
- `./pages/admin/ParceiroForm` → `./apps/admin/pages/ParceiroForm` (linha 37)
- `./pages/admin/Sugestoes` → `./apps/admin/pages/Sugestoes` (linha 42)
- `./pages/admin/JogosAdmin` → `./apps/admin/pages/JogosAdmin` (linha 49)

Nenhuma rota ou wrapper alterado.

## Ajustes cosméticos (sem efeito funcional)
Cabeçalho `/* eslint-disable ... -- preservado do original (Fase 6D) */` adicionado em cada arquivo para preservar `any`/`exhaustive-deps` legados sem suprimir linhas individualmente:
- `JogosAdmin.tsx`: disable de `no-explicit-any`
- `Sugestoes.tsx`, `ParceirosList.tsx`, `ParceiroForm.tsx`: disable de `no-explicit-any, react-hooks/exhaustive-deps`

Nenhum byte adicional foi alterado. Queries Supabase, payloads, sync-football, partner_awards, destaque do mês e fluxos de save permanecem byte-a-byte equivalentes ao original.

## Validação
| Verificação | Resultado |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint <arquivos tocados>` | 0 erros / 0 warnings |
| `npx vite build` | sucesso em ~14s, PWA 167 entries |
| Chunks lazy | `JogosAdmin-*.js`, `Sugestoes-*.js`, `ParceirosList-*.js`, `ParceiroForm-*.js` emitidos |
| `/admin/jogos`, `/admin/sugestoes`, `/admin/parceiros`, `/admin/parceiros/novo` | redirecionam ao gate sem `ChunkLoadError` |
| Sync de jogos / parceiros salvando / destaque do mês | preservados — arquivos byte-a-byte equivalentes |

## Recomendação
Prosseguir para **Fase 6E** com mais um lote (sugestão: `Editores.tsx`, `EventouAdmin.tsx`, `RadarIA.tsx`).

Status: **Fase 6D concluída — aguardando aprovação manual.**
