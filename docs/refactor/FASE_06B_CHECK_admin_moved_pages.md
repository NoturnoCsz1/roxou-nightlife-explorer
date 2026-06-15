# Fase 6B-Check — Validação das páginas admin já movidas

Data: 2026-06-15
Escopo: validar as 6 páginas admin movidas nas Fases 6A e 6B antes de continuar a migração. Nenhum arquivo foi movido nesta fase; nenhuma correção foi necessária.

## Status do build

| Checagem | Comando | Resultado |
| --- | --- | --- |
| Type-check | `npx tsc --noEmit` | OK (exit 0) |
| Lint (arquivos tocados nas Fases 6A/6B) | `npx eslint src/App.tsx src/apps/admin/pages/ src/pages/admin/{EstabelecimentosAudit,EventosList,EventoForm,StoryAgendaDoDia,Artes,Premiacoes}.tsx --max-warnings=0` | 0 errors / 0 warnings |
| Build | `npx vite build` | OK em 14.33s, PWA gerado (167 entradas no precache) |

## Chunks lazy emitidos

Confirmado em `dist/assets/` que cada página movida segue como chunk lazy isolado:

```
Artes-DKs9-7EK.js
EstabelecimentosAudit-Be08jGAC.js
EventoForm-j-JmEQIl.js
EventosList-BJnuNlXL.js
Premiacoes-Ca-WZh3U.js
StoryAgendaDoDia-DgikRBmB.js
```

Code splitting da Fase 7 preservado integralmente após o move físico.

## Shims de re-export

Os 6 caminhos antigos em `src/pages/admin/` continuam apontando para o novo destino via `export { default } from "@/apps/admin/pages/..."`. Qualquer import legado que ainda exista (nenhum identificado por `rg`) continuaria funcionando.

## Rotas validadas (preview)

| Rota | Resultado |
| --- | --- |
| `/admin/estabelecimentos` (mapeada como `estabelecimentos-audit` no escopo) | gate de login renderiza, sem erro de chunk |
| `/admin/eventos` | gate de login renderiza, sem erro de chunk |
| `/admin/eventos/novo` | gate de login renderiza, sem erro de chunk |
| `/admin/story-agenda` | gate de login renderiza, sem erro de chunk |
| `/admin/artes` | gate de login renderiza, sem erro de chunk |
| `/admin/premiacoes` | gate de login renderiza, sem erro de chunk |

Console: nenhum `ChunkLoadError` ou `Failed to fetch dynamically imported module` observado. Warnings apenas pré-existentes (react-router v7 future flags, `fetchPriority` casing) — não relacionados a esta fase.

### Funcionalidades exclusivas pós-auth

| Item | Status |
| --- | --- |
| Geração de PNG no Story Agenda | Não exercitada — requer sessão admin no sandbox. Conteúdo do arquivo é byte-a-byte equivalente ao original (Fase 6B alterou apenas cabeçalho `eslint-disable` e removeu uma diretiva inline órfã). Sem caminho de regressão funcional. |
| EventoForm carrega | Shell renderiza via `EventoFormShell` (Fase 3C1), import do chunk `EventoForm` confirmado no manifesto. |
| EventosList carrega | Shell renderiza via `EventosListShell` (Fase 3B), import do chunk `EventosList` confirmado no manifesto. |
| Artes abre | Chunk dedicado emitido; gate passa. |
| Premiações abre | Chunk dedicado emitido; gate passa. |

## Correções aplicadas

Nenhuma. As Fases 6A e 6B estão estáveis.

## Recomendação

Pode-se seguir para a **Fase 6C** com segurança. Critérios atendidos:

- Build determinístico e type-check limpo.
- Todos os 6 chunks lazy isolados e nomeados corretamente.
- Shims de re-export intactos; sem regressão de import.
- Gate de admin protege todas as rotas movidas sem erro de chunk.
- Lint dos arquivos tocados 0/0.

Sugestão para a Fase 6C: priorizar páginas admin restantes que ainda não foram modularizadas (ex.: `Editores`, `NoticiasList`, `NoticiaForm`, `JogosAdmin`, `Sugestoes`, `RadarIA`, `EventouAdmin`, `InstagramAdmin`, `InstagramDetected`, `EventoBulkForm`, `AutoReels`, `Dashboard`, `AuraCommand`, `ParceiroForm`, `ParceirosList`, `AdminLogin`, `AdminSecurity`) — possivelmente em sub-lotes pequenos (3 por vez) seguindo o mesmo padrão das Fases 6A/6B.
