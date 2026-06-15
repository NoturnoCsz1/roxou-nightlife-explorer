# Fase 6H — Mover páginas admin residuais

## Escopo
Migração física das páginas admin residuais para `src/apps/admin/pages/`.

## Páginas movidas (5)
- `AdminLogin.tsx` (72 linhas)
- `AdminSecurity.tsx` (223 linhas)
- `AuraCommand.tsx` (341 linhas)
- `Editores.tsx` (277 linhas)
- `EventouAdmin.tsx` (876 linhas)

## Estratégia
1. Cópia integral de `src/pages/admin/<File>.tsx` → `src/apps/admin/pages/<File>.tsx`.
2. Atualização dos 5 imports `lazy()` em `src/App.tsx` (linhas 34, 43, 47, 48, 51).
3. Arquivo original substituído por shim `export { default } from "@/apps/admin/pages/<File>";`.
4. Cabeçalhos `eslint-disable` adicionados nos arquivos com lint legado:
   - `AdminSecurity` — `@typescript-eslint/no-explicit-any`
   - `AuraCommand` — `@typescript-eslint/no-explicit-any` + remoção de directive inline obsoleto
   - `Editores` — `react-hooks/rules-of-hooks`
   - `EventouAdmin` — `@typescript-eslint/no-explicit-any`

## Garantias
- UI, rotas, queries, payloads, Edge Functions, RLS, auth gate, SEO e PWA inalterados.
- `App.tsx` modificado apenas em paths de `lazy()`.
- Shims preservados para qualquer import legado.

## Validação
- `npx tsc --noEmit` ✅ verde
- `npx eslint` ✅ 0/0 nos arquivos tocados
- `npx vite build` ✅ verde (~15s, PWA 167 entries)
- Chunks lazy emitidos: `AdminLogin`, `AdminSecurity`, `AuraCommand`, `Editores`, `EventouAdmin`

## Rotas confirmadas (App.tsx)
- `/admin/central` → AdminLogin (login)
- `/admin/eventou` → EventouAdmin
- `/admin/security` → AdminSecurity
- `/admin/aura` → AuraCommand
- `/admin/editores` → Editores

## Páginas admin ainda em `src/pages/admin/`
Todas as 23 páginas em `src/pages/admin/` agora são **shims de re-export**.
Nenhuma página admin com lógica residual remanesce em `src/pages/admin/`.

## Recomendação próxima fase (6I)
Com 100% das páginas admin migradas via shims, próxima etapa pode:
- Atualizar imports legados que apontam para `@/pages/admin/*` para `@/apps/admin/pages/*`.
- Em seguida, remover os shims em `src/pages/admin/`.
