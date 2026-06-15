# Fase 8B — Remoção dos Shims Admin Órfãos

## Objetivo
Limpar os 23 re-export shims órfãos em `src/pages/admin/` após a migração completa das páginas admin para `src/apps/admin/pages/`.

## Base
- `docs/refactor/FASE_08A_shim_dependency_map.md` confirmou zero imports ativos em produção.
- `src/App.tsx` já aponta todas as rotas admin diretamente para `src/apps/admin/pages/`.

## Shims Removidos (23 arquivos)

| # | Arquivo removido | Alvo real |
|---|------------------|-----------|
| 1 | `src/pages/admin/AdminLogin.tsx` | `src/apps/admin/pages/AdminLogin.tsx` |
| 2 | `src/pages/admin/AdminSecurity.tsx` | `src/apps/admin/pages/AdminSecurity.tsx` |
| 3 | `src/pages/admin/Artes.tsx` | `src/apps/admin/pages/Artes.tsx` |
| 4 | `src/pages/admin/AuraCommand.tsx` | `src/apps/admin/pages/AuraCommand.tsx` |
| 5 | `src/pages/admin/AutoReels.tsx` | `src/apps/admin/pages/AutoReels.tsx` |
| 6 | `src/pages/admin/Dashboard.tsx` | `src/apps/admin/pages/Dashboard.tsx` |
| 7 | `src/pages/admin/Editores.tsx` | `src/apps/admin/pages/Editores.tsx` |
| 8 | `src/pages/admin/EstabelecimentosAudit.tsx` | `src/apps/admin/pages/EstabelecimentosAudit.tsx` |
| 9 | `src/pages/admin/EventoBulkForm.tsx` | `src/apps/admin/pages/EventoBulkForm.tsx` |
| 10 | `src/pages/admin/EventoForm.tsx` | `src/apps/admin/pages/EventoForm.tsx` |
| 11 | `src/pages/admin/EventosList.tsx` | `src/apps/admin/pages/EventosList.tsx` |
| 12 | `src/pages/admin/EventouAdmin.tsx` | `src/apps/admin/pages/EventouAdmin.tsx` |
| 13 | `src/pages/admin/InstagramAdmin.tsx` | `src/apps/admin/pages/InstagramAdmin.tsx` |
| 14 | `src/pages/admin/InstagramDetected.tsx` | `src/apps/admin/pages/InstagramDetected.tsx` |
| 15 | `src/pages/admin/JogosAdmin.tsx` | `src/apps/admin/pages/JogosAdmin.tsx` |
| 16 | `src/pages/admin/NoticiaForm.tsx` | `src/apps/admin/pages/NoticiaForm.tsx` |
| 17 | `src/pages/admin/NoticiasList.tsx` | `src/apps/admin/pages/NoticiasList.tsx` |
| 18 | `src/pages/admin/ParceiroForm.tsx` | `src/apps/admin/pages/ParceiroForm.tsx` |
| 19 | `src/pages/admin/ParceirosList.tsx` | `src/apps/admin/pages/ParceirosList.tsx` |
| 20 | `src/pages/admin/Premiacoes.tsx` | `src/apps/admin/pages/Premiacoes.tsx` |
| 21 | `src/pages/admin/RadarIA.tsx` | `src/apps/admin/pages/RadarIA.tsx` |
| 22 | `src/pages/admin/StoryAgendaDoDia.tsx` | `src/apps/admin/pages/StoryAgendaDoDia.tsx` |
| 23 | `src/pages/admin/Sugestoes.tsx` | `src/apps/admin/pages/Sugestoes.tsx` |

## O que NÃO foi alterado
- Nenhuma página real em `src/apps/admin/pages/` foi removida.
- `src/App.tsx` não foi modificado.
- Nenhuma rota foi alterada.
- Nenhuma query, RLS, Edge Function, PWA ou SEO foi tocada.

## Validação

| Check | Resultado |
|-------|-----------|
| `npx tsc --noEmit` | Verde (0 erros) |
| `npx eslint --max-warnings=0 src/App.tsx src/apps/admin/pages/` | 0 warnings, 0 errors |
| `npx vite build` | Verde (chunks emitidos corretamente) |
| `rg -l "pages/admin" src` | Apenas comentários/documentação (sem imports ativos) |
| `src/pages/admin/` | Diretório vazio |

## Estado pós-Fase 8B
- `src/pages/admin/` existe mas está vazio.
- Todas as páginas admin vivem exclusivamente em `src/apps/admin/pages/`.
- Pronto para Fase 8C (remoção do prefixo V3 / renomeação) quando aprovado.
