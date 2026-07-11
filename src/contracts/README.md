# `src/contracts/` — Contratos públicos entre produtos

**Onda 1** — fronteira formal criada.

## O que vive aqui

Somente **tipos TypeScript puros** que descrevem a superfície pública
de um produto para consumo de outros produtos. Um contrato é a
promessa de compatibilidade entre módulos.

Estrutura:

```
src/contracts/
  discovery/        # Roxou Descobertas expõe → Partner/Transport/Admin
  partner/          # Partner Pro expõe → Descobertas/Admin
  transport/        # Transporte expõe → Descobertas/Admin
  admin/            # Admin expõe → (raro)
```

## Regras absolutas

1. **TypeScript puro.** Sem React, sem Supabase, sem hooks, sem side-effects.
2. **Sem `.ts` executável.** Apenas `interface`/`type`/`enum`.
3. **Barrels controlados.** Cada produto expõe **um único** `index.ts`.
   Outros módulos importam apenas de `@contracts/<produto>`.
4. **Novas colunas do banco NÃO entram automaticamente.** Ampliar o
   contrato é decisão consciente que exige revisão dos consumidores.
5. **Renomear/remover campo é breaking change.** Documentar no PR e
   avisar todos os consumidores.

## Como importar

```ts
// ✅ correto
import type { PublicEvent } from "@contracts/discovery";
import type { PublicReservationLink, PublicVipLink } from "@contracts/partner";
import type { PublicTransportLink } from "@contracts/transport";

// ❌ proibido
import { PublicEvent } from "@modules/discovery/pages/EventDetail";
import { X } from "@contracts/partner/publicReservationLink"; // não use caminhos internos
```

## Como estender

- Adicionar um campo opcional → PR normal, sem impacto.
- Adicionar um campo obrigatório → coordenar com todos os consumidores.
- Adicionar um novo contrato → criar arquivo + exportar no `index.ts`.
- Remover um campo → mudança de major, listar impacto no PR.

## Fora de escopo

- Regras de negócio (vão em `@modules/<produto>/services/`).
- Chamadas ao Supabase (vão em `@modules/<produto>/services/`).
- Componentes React (vão em `@modules/<produto>/components/`).
- Zod schemas de validação: podem morar em `contracts/` **apenas** se
  o schema não puxar dependências pesadas. Preferir declarar em
  `services/` do produto proprietário.

## Ligação com ESLint

O `eslint.config.js` bloqueia (error) qualquer import de React,
Supabase ou de outros módulos dentro de `src/contracts/**`. Ver
`docs/regras-dependencias-modulos.md`.
