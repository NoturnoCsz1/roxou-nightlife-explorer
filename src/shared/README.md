# src/shared

Código verdadeiramente compartilhado entre dois ou mais módulos.
Nada aqui pode importar de `modules/*` ou `integrations/*` de forma
que crie ciclos.

Sub-pastas:

- `components/` — componentes UI reutilizados por 2+ módulos
  (ex.: `EventCard`, `SEO`, `SafeHtml`, `AuraBadge`). Design system
  shadcn vive em `shared/ui` (a criar quando `components/ui/*` for
  migrado).
- `hooks/` — hooks genéricos (`useAuth`, `use-mobile`, `use-toast`,
  `useSavedEvents`, etc).
- `utils/` — utilitários puros (`dateUtils`, `sanitize`, `qrcode`,
  `geoUtils`, `pii`, `utm`, `imageOptimizer`, `formatRelativeTime`,
  `supabaseFetchAll`, `analytics`, `ga`).
- `types/` — tipos compartilhados (DTOs entre módulos, enums de
  domínio comum).
- `layouts/` — layouts compartilhados (V3Layout, PartnerScreen
  candidatos).

**Status:** pastas criadas. Nada foi migrado ainda — os utilitários
continuam em `src/lib/*`, `src/hooks/*` e `src/components/*`.
