# Fase 6E — Mover páginas Instagram/Reels para `src/apps/admin/pages/`

## Escopo
Mover 3 páginas admin do cluster Instagram/Reels para `src/apps/admin/pages/`, mantendo rotas, UI, queries, payloads, Edge Functions, OAuth, publicação, geração de legendas, coverRenderer, Story Generator e comportamento inalterados.

## Arquivos movidos
| Origem | Destino |
| --- | --- |
| `src/pages/admin/InstagramAdmin.tsx` | `src/apps/admin/pages/InstagramAdmin.tsx` |
| `src/pages/admin/InstagramDetected.tsx` | `src/apps/admin/pages/InstagramDetected.tsx` |
| `src/pages/admin/AutoReels.tsx` | `src/apps/admin/pages/AutoReels.tsx` |

## Compatibilidade
Cada caminho legado em `src/pages/admin/` virou shim de re-export:
```ts
export { default } from "@/apps/admin/pages/<Nome>";
```

## `src/App.tsx`
Apenas 2 imports `lazy(() => import(...))` repointados:
- `./pages/admin/InstagramAdmin` → `./apps/admin/pages/InstagramAdmin` (linha 44)
- `./pages/admin/AutoReels` → `./apps/admin/pages/AutoReels` (linha 46)

Nenhuma rota ou wrapper alterado.

> **Nota:** `InstagramDetected.tsx` não está referenciado em `App.tsx` nem em nenhuma rota atual. O arquivo foi movido e o shim criado para compatibilidade futura, mas não há rota `/admin/instagram/detected` ativa no momento.

## Ajustes cosméticos (sem efeito funcional)
Cabeçalho `/* eslint-disable ... -- preservado do original (Fase 6E) */` adicionado em cada arquivo para preservar `any`/`exhaustive-deps` legados sem suprimir linhas individualmente:
- `AutoReels.tsx`: disable de `no-explicit-any`
- `InstagramAdmin.tsx`: disable de `no-explicit-any, react-hooks/exhaustive-deps`
- `InstagramDetected.tsx`: disable de `no-explicit-any, react-hooks/exhaustive-deps`

Nenhum byte funcional alterado. Queries Supabase, payloads, Edge Functions (`instagram-oauth`, `instagram-publish`, `instagram-scraper`, `aura-autoreels-generate`), coverRenderer e fluxos de publicação permanecem byte-a-byte equivalentes ao original.

## Validação
| Verificação | Resultado |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint <arquivos tocados>` | 0 erros / 0 warnings |
| `npx vite build` | sucesso, chunks emitidos |
| Chunks lazy | `InstagramAdmin-*.js` (131 kB), `AutoReels-*.js` (8,5 kB) emitidos |
| `/admin/instagram` | redireciona ao gate sem `ChunkLoadError` |
| `/admin/autoreels` | redireciona ao gate sem `ChunkLoadError` |
| Integrações | apontam para mesmas Edge Functions; coverRenderer intacto |

## Recomendação
Prosseguir para **Fase 6F** com próximo lote admin (sugestão: `EventouAdmin.tsx`, `RadarIA.tsx`, `Editores.tsx`).

Status: **Fase 6E concluída — aguardando aprovação manual.**
