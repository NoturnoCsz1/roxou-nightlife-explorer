# modules/partner

**Domínio:** Partner Pro — camada de dados/regras dos produtos do
parceiro (Reservas, Lista VIP, Validador, Convites e futuros).

**Submódulos ativos (Onda 4)**

- `reservations/` — Reservas Pro.
- `vip/` — Listas VIP + Promoters.
- `validator/` — Parse e validação de QR.
- `invitations/` — placeholder (aguardando fluxo).
- `shared/` — tipos/helpers cross-submódulo.

**Convenção**

- `services/` — regras de aplicação e queries.
- `repositories/` — barrel público das operações de banco.
- `types/` — tipos exportados.
- Nada de JSX, `use-toast`, react-router ou DOM aqui.

**Imports permitidos**

- `@shared/*`, `@integrations/*`, `@contracts/*`, `@config/*`
- tipos gerados do Supabase
- outros submódulos de `@modules/partner/*`

**Imports proibidos**

- `@modules/discovery`, `@modules/transport`, `@modules/admin`
- páginas ou componentes visuais (`src/apps/**`, `src/pages/**`)

**Status:** páginas continuam em `src/apps/partner/**` e importam
esta camada via shims em `src/apps/partner/services/partner*.ts`.
Consumidores novos devem importar diretamente de
`@modules/partner/<area>/...`.
