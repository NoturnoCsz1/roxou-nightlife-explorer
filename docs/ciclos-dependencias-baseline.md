# Ciclos de Dependência — Baseline (Onda 1)

Gerado por `bun run audit:cycles -- --write-baseline`.

- Arquivos analisados: **652**
- SCCs (ciclos) encontrados: **1**

## Ciclos

### Ciclo #1 (2 nós)

- `src/apps/admin/eventos/form/eventoFormSubmit.ts`
- `src/apps/admin/eventos/form/eventoFormActions.ts`

## Política

- Este baseline é herdado do legado. **Nenhum ciclo novo é aceito** em
  `src/modules/**`, `src/contracts/**`, `src/app/**`, `src/shared/**`,
  `src/integrations/**`.
- Ciclos remanescentes devem ser eliminados nas Ondas 2–14 conforme
  o módulo é migrado (ver `docs/plano-modularizacao-roxou.md`).
