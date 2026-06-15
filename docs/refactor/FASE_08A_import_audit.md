# FASE 8A — Auditoria final de imports e dependências

Data: 2026-06-15
Escopo: auditoria somente leitura. Nenhum arquivo movido, renomeado, removido
ou alterado.

## Objetivo

Mapear, antes de qualquer remoção de prefixo V3 ou remoção de shims, todas as
dependências restantes que apontam para:

- `src/pages/admin/*`
- `src/pages/v3/*`
- `src/components/v3/*`
- `src/lib/v3*`
- `useV3*`
- `V3Profile`

## Método

Buscas via `rg` (ripgrep) em `src/`, filtrando por declarações `import ... from
"@/..."` e re-exports. Apenas imports reais foram contabilizados; menções em
comentários/docstrings foram descartadas das matrizes mas listadas
separadamente.

## Resultado consolidado

### 1. `src/pages/admin/*` (shims pós Fase 6A–6H)

- Importadores em código de produção: **0**
- Importadores em `src/App.tsx`: **0** (todas as rotas admin já apontam para
  `src/apps/admin/pages/*`)
- Menções restantes: apenas comentários/JSDoc/README (`src/lib/radarPostClassifier.ts`,
  `src/apps/admin/eventos/form/useEventoForm.ts`,
  `src/apps/admin/estabelecimentos/*`,
  `src/apps/admin/eventos/list/*`,
  `src/apps/admin/README.md`).

Conclusão: **todos os shims em `src/pages/admin/` estão órfãos** e podem ser
removidos com segurança em fase posterior (não nesta fase).

### 2. `src/pages/v3/*`

- Importadores externos a `src/pages/v3/`:
  - `src/App.tsx` (lazy imports de todas as rotas V3)
  - `src/components/PedirCaronaGate.tsx` → `@/pages/v3/V3RideRequest`
- Importadores dentro de `src/pages/v3/`: cruzados via `@/components/v3/*` e
  `@/hooks/useV3Profile`.

Conclusão: as páginas V3 ainda são consumidas. Renomear/remover prefixo
exigirá atualizar `App.tsx` (lazy imports e nomes de símbolo) e
`PedirCaronaGate.tsx`.

### 3. `src/components/v3/*`

- Importadores fora de `src/components/v3/`:
  - `src/pages/v3/*` (V3Agenda, V3AIChat, V3DriverBoard, V3EventDetail,
    V3LocalDetail, V3ProfileEdit, V3RideRequest, V3TermsAcceptance,
    V3Transport)
  - `src/apps/public/home/*` (HomeCommandCenter, HomeCuradoria, HomeDesktop,
    HomeHero, HomeMobile, HomeSections, HomeSidebar)
- Cruzamentos internos em `src/components/v3/` (V3Layout, EventCardV3,
  CommunityConsentModal, AIHomeWidget, HeroCard, home/*).

Conclusão: `components/v3/*` é usado tanto pela área V3 quanto pela Home
pública atual (`src/apps/public/home/*`). Qualquer remoção do prefixo V3
precisa atualizar Home pública.

### 4. `src/lib/v3*`

- Único arquivo do grupo: `src/lib/v3Validation.ts`.
- Importadores: `src/pages/v3/V3RideRequest.tsx`,
  `src/pages/v3/V3ProfileEdit.tsx`.
- Sem importadores fora de `pages/v3/`.

### 5. `useV3*`

- Único hook do grupo: `useV3Profile` em `src/hooks/useV3Profile.ts`.
- Importadores (12):
  - `src/components/v3/AIHomeWidget.tsx`
  - `src/components/v3/CommunityConsentModal.tsx`
  - `src/components/v3/V3Layout.tsx`
  - `src/pages/v3/V3AIChat.tsx`
  - `src/pages/v3/V3Chat.tsx`
  - `src/pages/v3/V3DriverBoard.tsx`
  - `src/pages/v3/V3MyRides.tsx`
  - `src/pages/v3/V3Profile.tsx`
  - `src/pages/v3/V3ProfileEdit.tsx`
  - `src/pages/v3/V3Transport.tsx`
  - `src/apps/public/home/HomeSidebar.tsx`

### 6. `V3Profile`

- Definição: `src/pages/v3/V3Profile.tsx` (default export).
- Importadores: `src/App.tsx` (lazy import + rota `/v3/perfil`).

## Imports mortos / re-exports não utilizados

- Todos os 23 arquivos em `src/pages/admin/*` são shims (`export { default }
  from "@/apps/admin/pages/<X>"`) e **não possuem importadores em produção**.
  São candidatos a remoção (fora do escopo desta fase).
- Nenhum re-export órfão detectado em `src/apps/admin/pages/*`,
  `src/pages/v3/*`, `src/components/v3/*`, `src/lib/v3*`,
  `src/hooks/useV3Profile.ts`.

## Caminhos que podem quebrar após remoção dos shims

Nenhum, com base na busca atual. Para confirmar antes de remover:

1. Rodar `rg "from ['\"]@/pages/admin/" src` → deve retornar 0 linhas.
2. Rodar `rg "from ['\"]\.\./pages/admin/" src` → deve retornar 0 linhas.
3. Rodar `rg "from ['\"]\./pages/admin/" src` → deve retornar 0 linhas.
4. `vite build` deve permanecer verde após remoção.

## Caminhos que podem quebrar ao remover prefixo V3

- `src/App.tsx` (lazy imports + nomes de rota).
- `src/components/PedirCaronaGate.tsx` (`@/pages/v3/V3RideRequest`).
- Todo o consumo em `src/apps/public/home/*` (`@/components/v3/*`,
  `@/hooks/useV3Profile`).
- Cruzamentos internos `pages/v3/* ↔ components/v3/*`.
- `src/lib/v3Validation.ts` (consumido por 2 páginas V3).

## Próximos passos sugeridos (fora desta fase)

1. Fase 8B: remover shims em `src/pages/admin/*` (validados como órfãos).
2. Fase 8C: planejar des-prefixação V3 (Home pública depende de
   `components/v3/*` e `useV3Profile`).

Ver detalhamento em:

- `docs/refactor/FASE_08A_v3_dependency_map.md`
- `docs/refactor/FASE_08A_shim_dependency_map.md`
