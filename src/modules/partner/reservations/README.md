# modules/partner/reservations

**Responsabilidade:** camada de dados e regras de Reservas Pro (tipos
mesa/bistrô/camarote, ciclo de vida da reserva, comprovante público,
integração com o validador QR).

**Estrutura**

- `services/reservationsService.ts` — regras de aplicação + queries.
- `repositories/reservationsRepository.ts` — barrel público das
  operações de banco (queries/mutations/RPCs).
- `types/index.ts` — tipos exportados para consumidores externos.

**Imports permitidos**

- `@/integrations/supabase/client`
- `@/lib/dateUtils`, `@shared/*`, `@config/*`
- outros submódulos internos de `@modules/partner/*`
- tipos gerados do Supabase

**Imports proibidos**

- páginas ou componentes visuais (`src/apps/**`, `src/pages/**`)
- outros produtos (`@modules/discovery`, `@modules/transport`,
  `@modules/admin`)
- `use-toast`, react-router, DOM ou navegação

**Contrato público:** exportações estáveis em `services/`,
`repositories/` e `types/`. Não expor arquivos internos.
