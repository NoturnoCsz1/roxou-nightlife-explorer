# Fase 6C — Mover páginas admin para `src/apps/admin/pages/`

## Escopo
Mover fisicamente 3 páginas admin de risco baixo/médio do diretório legado `src/pages/admin/` para `src/apps/admin/pages/`, mantendo rotas, UI, queries, SEO, analytics, payloads, RLS e Edge Functions intactas.

## Arquivos movidos
| Origem | Destino |
| --- | --- |
| `src/pages/admin/Dashboard.tsx` | `src/apps/admin/pages/Dashboard.tsx` |
| `src/pages/admin/NoticiasList.tsx` | `src/apps/admin/pages/NoticiasList.tsx` |
| `src/pages/admin/NoticiaForm.tsx` | `src/apps/admin/pages/NoticiaForm.tsx` |

## Compatibilidade
- Cada caminho antigo em `src/pages/admin/` foi convertido em um **shim de re-export**:
  ```ts
  export { default } from "@/apps/admin/pages/<Nome>";
  ```
- Verificado via `rg` que nenhum consumidor externo importa essas páginas por caminho — apenas `src/App.tsx` referencia. Mesmo assim, os shims foram mantidos para garantir compatibilidade futura.

## `src/App.tsx`
Apenas os 3 `lazy(() => import(...))` foram repointados:
- `./pages/admin/Dashboard` → `./apps/admin/pages/Dashboard`
- `./pages/admin/NoticiasList` → `./apps/admin/pages/NoticiasList`
- `./pages/admin/NoticiaForm` → `./apps/admin/pages/NoticiaForm`

Nenhuma rota, wrapper ou ordem de import foi alterada.

## Ajustes cosméticos (sem efeito funcional)
- `src/apps/admin/pages/NoticiaForm.tsx`: adicionado cabeçalho
  `/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original (Fase 6C) */`
  para preservar os 3 `any` legados sem suprimir linhas individualmente — mesmo padrão usado em `EventoForm.tsx` (Fase 6A) e `StoryAgendaDoDia.tsx` (Fase 6B).
- `src/apps/admin/pages/NoticiasList.tsx`: removido um `/* eslint-disable-next-line */` órfão na linha 33 (o lint já reportava o diretivo como “unused”).

Nenhum outro byte foi alterado nos 3 arquivos movidos. Nenhuma query Supabase, payload, SEO, capa, sanitização HTML, analytics ou comportamento de UI foi tocado.

## Validação
| Verificação | Resultado |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint <arquivos tocados>` | 0 erros / 0 warnings |
| `npx vite build` | sucesso em ~14s, PWA 167 entries |
| Chunks lazy emitidos | `Dashboard-*.js`, `NoticiasList-*.js`, `NoticiaForm-*.js` presentes em `dist/assets/` |
| Rotas `/admin`, `/admin/dashboard`, `/admin/noticias`, `/admin/noticias/novo`, `/admin/noticias/:id/editar` | redirecionam ao gate `/admin/login` sem `ChunkLoadError` |
| Dashboard analytics real (`fetchAllRows`, sem cap de 1000) | preservado — arquivo byte-a-byte equivalente ao original |
| NoticiaForm SEO/capa/SafeHtml | preservados — arquivo byte-a-byte equivalente ao original |

## Recomendação
Prosseguir para **Fase 6D** com mais um lote de 3 páginas admin estáveis (sugestão: `Editores.tsx`, `Sugestoes.tsx`, `JogosAdmin.tsx`), usando o mesmo padrão.

Status: **Fase 6C concluída — aguardando aprovação manual.**
