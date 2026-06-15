# FASE 8A — Matriz de dependências dos shims

Somente leitura. Mapeia quem ainda depende dos shims criados nas Fases 6A–6H.

## Shims existentes

23 arquivos em `src/pages/admin/`, todos com o padrão:

```ts
export { default } from "@/apps/admin/pages/<Nome>";
```

| Shim                                            | Alvo                                                   |
| ----------------------------------------------- | ------------------------------------------------------ |
| `src/pages/admin/AdminLogin.tsx`                | `@/apps/admin/pages/AdminLogin`                        |
| `src/pages/admin/AdminSecurity.tsx`             | `@/apps/admin/pages/AdminSecurity`                     |
| `src/pages/admin/Artes.tsx`                     | `@/apps/admin/pages/Artes`                             |
| `src/pages/admin/AuraCommand.tsx`               | `@/apps/admin/pages/AuraCommand`                       |
| `src/pages/admin/AutoReels.tsx`                 | `@/apps/admin/pages/AutoReels`                         |
| `src/pages/admin/Dashboard.tsx`                 | `@/apps/admin/pages/Dashboard`                         |
| `src/pages/admin/Editores.tsx`                  | `@/apps/admin/pages/Editores`                          |
| `src/pages/admin/EstabelecimentosAudit.tsx`     | `@/apps/admin/pages/EstabelecimentosAudit`             |
| `src/pages/admin/EventoBulkForm.tsx`            | `@/apps/admin/pages/EventoBulkForm`                    |
| `src/pages/admin/EventoForm.tsx`                | `@/apps/admin/pages/EventoForm`                        |
| `src/pages/admin/EventosList.tsx`               | `@/apps/admin/pages/EventosList`                       |
| `src/pages/admin/EventouAdmin.tsx`              | `@/apps/admin/pages/EventouAdmin`                      |
| `src/pages/admin/InstagramAdmin.tsx`            | `@/apps/admin/pages/InstagramAdmin`                    |
| `src/pages/admin/InstagramDetected.tsx`         | `@/apps/admin/pages/InstagramDetected`                 |
| `src/pages/admin/JogosAdmin.tsx`                | `@/apps/admin/pages/JogosAdmin`                        |
| `src/pages/admin/NoticiaForm.tsx`               | `@/apps/admin/pages/NoticiaForm`                       |
| `src/pages/admin/NoticiasList.tsx`              | `@/apps/admin/pages/NoticiasList`                      |
| `src/pages/admin/ParceiroForm.tsx`              | `@/apps/admin/pages/ParceiroForm`                      |
| `src/pages/admin/ParceirosList.tsx`             | `@/apps/admin/pages/ParceirosList`                     |
| `src/pages/admin/Premiacoes.tsx`                | `@/apps/admin/pages/Premiacoes`                        |
| `src/pages/admin/RadarIA.tsx`                   | `@/apps/admin/pages/RadarIA`                           |
| `src/pages/admin/StoryAgendaDoDia.tsx`          | `@/apps/admin/pages/StoryAgendaDoDia`                  |
| `src/pages/admin/Sugestoes.tsx`                 | `@/apps/admin/pages/Sugestoes`                         |

## Importadores reais dos shims

Busca executada:

```bash
rg "from ['\"]@/pages/admin/"  src
rg "from ['\"]\.\./pages/admin/" src
rg "from ['\"]\./pages/admin/"  src
rg "pages/admin"                src/App.tsx
```

Resultado: **0 declarações de import** em código de produção.

Menções remanescentes (somente comentários/JSDoc/README, sem efeito em
runtime):

- `src/lib/radarPostClassifier.ts:9` (comentário JSDoc)
- `src/apps/admin/eventos/form/useEventoForm.ts:16` (comentário)
- `src/apps/admin/estabelecimentos/types.ts:3` (comentário)
- `src/apps/admin/estabelecimentos/scoring.ts:3` (comentário)
- `src/apps/admin/estabelecimentos/geocoding.ts:4` (comentário)
- `src/apps/admin/eventos/list/types.ts:2` (comentário)
- `src/apps/admin/eventos/list/helpers.ts:1` (comentário)
- `src/apps/admin/README.md:3` (documentação)

## App.tsx

Confirmado: `src/App.tsx` não contém nenhuma referência a `pages/admin/`. Todas
as rotas admin são `lazy(() => import("./apps/admin/pages/<X>"))`.

## Conclusão

- Todos os 23 shims em `src/pages/admin/` estão **órfãos** (re-exports sem
  consumidor real).
- A remoção dos shims em fase futura não deve quebrar nenhuma rota nem nenhum
  consumidor de código.
- Antes da remoção (fora desta fase), re-executar as 4 buscas acima e
  confirmar 0 linhas + `vite build` verde.
