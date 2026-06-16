# FIX — Public Home Mobile Overflow

## Sintoma
Home pública (`/`) em mobile (320–412px) apresentava scroll horizontal: cards de carrosséis e blocos decorativos vazavam para fora do viewport.

## Causa-raiz
1. Ausência de proteção global contra overflow horizontal em `html / body / #root`.
2. Wrapper raiz de `V3Home` sem `overflow-x-hidden`, deixando que descendentes com `w-[120%]`, rails (`shrink-0 w-[…px]`) e cards (`min-w-[…]`) escapassem.
3. Sem `box-sizing: border-box` global, paddings ocasionais somavam à largura calculada.

## Correções aplicadas
- `src/index.css`
  - `* { box-sizing: border-box; }`
  - `html, body, #root { width: 100%; max-width: 100%; overflow-x: hidden; }`
- `src/pages/v3/V3Home.tsx`
  - Wrapper raiz agora usa `className="w-full max-w-full overflow-x-hidden"`.

## Escopo preservado
- Nenhuma alteração em Admin, Partner Pro, Supabase/RLS, Nginx ou VPS.
- Componentes de Hero, rails, news e bottom nav não foram modificados — a proteção é via container global + raiz da home.

## Validação manual
- `/` em 320 / 360 / 390 / 412 px: sem scroll horizontal.
- `document.documentElement.scrollWidth <= window.innerWidth` ✅
- `/agenda`, `/jogos`, `/noticia/*` continuam renderizando normalmente (root global apenas restringe overflow horizontal, não vertical).
- Build / TSC: verdes.
