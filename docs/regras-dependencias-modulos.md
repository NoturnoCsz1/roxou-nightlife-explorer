# Regras de Dependência entre Módulos

Estabelecidas na **Onda 1**. Fonte de verdade para revisão de PR e
para as regras de ESLint (`eslint.config.js`).

## Fronteiras oficiais

| Camada | Caminho | Papel |
|---|---|---|
| App shell | `src/app/**` | providers, router, guards genéricos |
| Módulos de produto | `src/modules/{discovery,partner,transport,admin}/**` | páginas, componentes, hooks, services por produto |
| Contratos | `src/contracts/{discovery,partner,transport,admin}/**` | tipos públicos entre produtos |
| Shared | `src/shared/**` | UI/utils/hooks 100% genéricos |
| Integrations | `src/integrations/**` | adapters de serviços externos |
| Config | `src/config/**` | configuração estática |

> Enquanto a migração não é concluída (Ondas 4-15), o legado permanece
> em `src/pages/**`, `src/apps/**`, `src/components/**`, `src/hooks/**`,
> `src/services/**`, `src/lib/**`. As regras desta onda **valem primeiro
> para os novos módulos** e para `src/contracts/**`. O legado só é
> restringido em modo warning (ver §5).

## Grafo permitido

```
                 ┌───────────────┐
                 │   shared      │
                 └───────▲───────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
┌──────┴──────┐   ┌──────┴──────┐   ┌──────┴──────┐
│  discovery  │   │   partner   │   │  transport  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └──────► @contracts/{discovery|partner|transport} ◄──────┘
                         ▲
                         │
                    ┌────┴────┐
                    │  admin  │  (consome contratos dos 3)
                    └─────────┘

  (todos os módulos podem importar de integrations/, config/ e shared/)
```

## Imports permitidos

- `@modules/discovery/**` → `@shared/**`, `@integrations/**`, `@config/**`, `@contracts/partner`, `@contracts/transport`.
- `@modules/partner/**` → `@shared/**`, `@integrations/**`, `@config/**`, `@contracts/discovery` (só quando necessário).
- `@modules/transport/**` → `@shared/**`, `@integrations/**`, `@config/**`, `@contracts/discovery` (só quando necessário).
- `@modules/admin/**` → `@shared/**`, `@integrations/**`, `@config/**`, `@contracts/discovery`, `@contracts/partner`, `@contracts/transport`.
- `@app/**` → tudo (é o shell).

## Imports proibidos (regra dura para novos módulos)

| Origem | Destino proibido | Motivo |
|---|---|---|
| `@modules/discovery/**` | `@modules/partner/**`, `@modules/transport/**`, `@modules/admin/**` | usar contratos |
| `@modules/partner/**` | `@modules/discovery/**`, `@modules/transport/**`, `@modules/admin/**` | usar contratos |
| `@modules/transport/**` | `@modules/partner/**`, `@modules/discovery/**`, `@modules/admin/**` | usar contratos |
| `@modules/admin/**` | `@modules/discovery/**/pages/**`, `@modules/partner/**/pages/**`, `@modules/transport/**/pages/**` | admin não renderiza páginas reais de produto |
| `@shared/**` | `@modules/**`, `@app/**`, `src/apps/**`, `src/pages/**` | shared não conhece produto |
| `@contracts/**` | `react`, `react-dom`, `@/integrations/supabase/**`, `@modules/**`, `@app/**`, `src/apps/**`, `src/pages/**`, `src/components/**`, `src/hooks/**` | contrato é TS puro |
| `@integrations/**` | `@modules/**`, `@app/**` | integração é adapter |

## Regra central

Produtos se comunicam por:

- **contratos públicos** (`@contracts/*`);
- **services públicos** (dentro do produto proprietário);
- **APIs / RPCs / Edge Functions** (via `@integrations/supabase`);
- **eventos / links / IDs estáveis** (`slug`, `id`, `token`);
- **URLs canônicas** (definidas nos próprios contratos).

Nunca por import direto de:

- páginas (`.../pages/**`);
- componentes internos (`.../components/**`);
- hooks internos (`.../hooks/**`);
- repositories privados (`.../repositories/**`);
- helpers do banco.

## §5 — Legado

O código atual em `src/pages/**`, `src/apps/**`, `src/components/**`,
`src/hooks/**`, `src/services/**`, `src/lib/**` **não é reescrito**
nesta onda. As regras rígidas ficam ativas apenas em:

- `src/contracts/**` (error);
- `src/modules/**` (warn/error conforme a regra).

O legado permanece funcional. Exceções são registradas em
`docs/excecoes-temporarias-dependencias.md` e removidas ao longo das
Ondas 2–14.

## Enforcement

- **ESLint** — `no-restricted-imports` configurado em `eslint.config.js`
  para as regras acima. Rodar `bun run lint`.
- **Script de ciclos** — `bun run audit:cycles` (Node puro, sem dependências novas).
- **Type paths** — `tsconfig.json` + `tsconfig.app.json` + `vite.config.ts` mantêm
  os aliases `@contracts`, `@modules`, `@app`, `@integrations`, `@config`,
  `@shared`, além dos legados `@`, `@public`, `@admin`, `@partner`,
  `@transport`, `@games`, `@services`.
