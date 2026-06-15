# Fase 5B — Arquivos alterados

Apenas documentação. **Nenhum** arquivo `.ts`/`.tsx` foi modificado.

## Criados

- `src/apps/public/home/README.md` — contrato interno da Home (topologia,
  queries, queryKeys, regras de derivação, constantes).
- `docs/refactor/FASE_05B_home_consolidation.md` — relatório da fase.
- `docs/refactor/FASE_05B_home_consolidation_CHANGED_FILES.md` — este arquivo.

## Imports removidos

Nenhum. Lint (`eslint --max-warnings=0`) em `src/apps/public/home/` já estava
em 0 erros / 0 warnings antes da fase; nenhum import morto foi detectado.

## Confirmação de paridade

- JSX, classes Tailwind, queries Supabase, `queryKey`s, SEO, animações, rotas e
  efeitos permanecem **byte-idênticos** à Fase 5.
- Nenhuma migração para `src/services/`, nenhuma mudança em V3, nenhum início
  da Fase 6.
