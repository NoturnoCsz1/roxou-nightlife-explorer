# modules/partner/validator

**Responsabilidade:** parse e validação de QR Codes para check-in de
Reservas e Lista VIP. Orquestra `reservations` + `vip`.

**Estrutura**

- `services/validatorService.ts` — parse + orquestração de validação.
- `repositories/validatorRepository.ts` — barrel público.
- `types/index.ts` — `ValidatorItemType`, `ParsedQrPayload`.

**Imports permitidos**

- `@/integrations/supabase/client`
- `@modules/partner/vip/*`
- `@modules/partner/reservations/*`
- `@shared/*`, `@config/*`

**Imports proibidos**

- páginas/componentes visuais
- outros produtos
- `use-toast`, DOM
