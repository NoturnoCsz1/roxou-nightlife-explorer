# Fase 1 — Aliases e diretórios `apps/` + `shared/` + `services/`

Sem mover páginas, sem renomear nada, sem mudar UI.

## Aliases adicionados

`tsconfig.json`, `tsconfig.app.json`, `vite.config.ts`:

| Alias | Aponta para |
|---|---|
| `@/*` *(já existia)* | `src/*` |
| `@public/*` | `src/apps/public/*` |
| `@admin/*` | `src/apps/admin/*` |
| `@partner/*` | `src/apps/partner/*` |
| `@transport/*` | `src/apps/transport/*` |
| `@games/*` | `src/apps/games/*` |
| `@shared/*` | `src/shared/*` |
| `@services/*` | `src/services/*` |

## Diretórios criados (vazios, com README)

```
src/
├── apps/
│   ├── public/     README.md
│   ├── admin/      README.md
│   ├── partner/    README.md
│   ├── transport/  README.md
│   └── games/      README.md
├── shared/         README.md
└── services/       README.md  (módulos criados na Fase 2)
```

## Não foi alterado
- Nenhum arquivo `.tsx` de página/componente.
- Nenhuma rota em `src/App.tsx`.
- Nenhum import existente.
- shadcn UI, integrações Supabase, dateUtils, PWA, edge functions: **intocados**.

## Checkpoint
Antes da Fase 2, snapshot via History tab. Reversível: remover aliases dos 3 arquivos de config e apagar `src/apps/`, `src/shared/`, `src/services/`.
