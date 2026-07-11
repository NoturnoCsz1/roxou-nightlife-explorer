# modules/partner/vip

**Responsabilidade:** camada de dados e regras de Lista VIP (listas,
convidados, promoters, estado operacional, links públicos e RPCs de
mutação SECURITY DEFINER).

**Estrutura**

- `services/vipService.ts` — listas + convidados + estado derivado.
- `services/promotersService.ts` — CRUD de promoters (usado pela VIP).
- `repositories/vipRepository.ts` — barrel público das operações.
- `types/index.ts` — tipos exportados.

**Imports permitidos**

- `@/integrations/supabase/client`
- `@/lib/dateUtils`, `@shared/*`, `@config/*`
- outros submódulos internos de `@modules/partner/*`

**Imports proibidos**

- páginas/componentes visuais
- outros produtos (`@modules/discovery|transport|admin`)
- `use-toast`, react-router, DOM

**Contrato público:** exportações em `services/`, `repositories/` e
`types/`.
