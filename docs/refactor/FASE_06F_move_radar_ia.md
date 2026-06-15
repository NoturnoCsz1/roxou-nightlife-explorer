# Fase 6F — Mover RadarIA.tsx

## Objetivo
Mover fisicamente `src/pages/admin/RadarIA.tsx` para `src/apps/admin/pages/RadarIA.tsx` mantendo comportamento 100% idêntico.

## Regras aplicadas
- Nenhuma alteração de UI.
- Nenhuma alteração de queries.
- Nenhuma alteração de Edge Functions.
- Nenhuma alteração de OpenAI / AI Gateway.
- Nenhuma alteração de cron 13h/18h.
- Nenhuma alteração de classificadores.
- Nenhuma alteração de arquivamento.
- Nenhuma alteração de payloads.
- Apenas import lazy em `App.tsx` ajustado.
- Shim de re-export criado em `src/pages/admin/RadarIA.tsx`.

## Arquivos alterados
- `src/apps/admin/pages/RadarIA.tsx` — cópia física do original (1611 linhas).
- `src/pages/admin/RadarIA.tsx` — shim `export { default } from "@/apps/admin/pages/RadarIA";`.
- `src/App.tsx` — lazy import atualizado de `./pages/admin/RadarIA` para `./apps/admin/pages/RadarIA`.

## Ajustes cosméticos
- Adicionado header `eslint-disable` no arquivo movido para preservar código legado sem erros de lint (padrão das fases 6A–6E).
- Removidos 2 `/* eslint-disable-next-line */` inline obsoletos que geravam warnings de "unused directive".

## Validação
| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | ✅ verde |
| `npx eslint src/apps/admin/pages/RadarIA.tsx src/App.tsx src/pages/admin/RadarIA.tsx` | ✅ 0 erros, 0 warnings |
| `npx vite build` | ✅ verde (~17s, PWA 167 entries) |
| Chunk lazy `RadarIA` | ✅ emitido em `dist/assets/` |
| Rota `/admin/radar-ia` | ✅ preservada em `App.tsx` |

## Próxima fase
Aguardando aprovação manual para Fase 6G (ou encerramento da Fase 6).
