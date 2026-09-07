# Migrations do Supabase OFICIAL da Roxou (`foteitrhbfwbzzeanxve`)

Estas migrations **não são executadas automaticamente** e **não pertencem ao
banco legado** (`bapdgykghciiyvlqdrqx`). Elas ficam fora de `supabase/migrations/`
justamente para não serem aplicadas por engano no legado.

## Pré-requisitos no banco oficial

Devem existir (já auditados): `users`, `venues`, `organizations`,
`organization_members`, `roles`, `partners`, `events`, `artists`, `event_artists`
e os helpers:

- `get_my_organization_ids()`
- `get_my_managed_organization_ids()`
- `is_org_member(uuid)`
- `is_org_manager_or_owner(uuid)`
- `is_staff_or_admin()`
- `is_admin_or_superadmin()`

Nenhum helper legado (`user_manages_partner`, `is_partner_member`,
`is_partner_owner_or_admin`) é usado ou copiado.

## Ordem de aplicação

1. `0001_partner_reservations.sql`
2. `0002_partner_vip.sql`
3. `0003_partner_promoters.sql`
4. `0004_partner_rpcs.sql`

## Regras aplicadas

- Toda tabela nasce em `public` com `GRANT` explícito + RLS habilitado.
- `organization_id` obrigatório; `venue_id` obrigatório nas operações de
  estabelecimento físico e sempre validado contra `venues.organization_id`.
- Nenhuma cópia de dados, PII, estabelecimentos, usuários ou eventos legados.
- `anon` nunca recebe acesso direto a tabela com PII: a superfície pública é
  exclusivamente por RPC `SECURITY DEFINER` com token/slug.

## Storage (pendente)

`vip_lists.public_cover_url` guarda apenas a URL final. O bucket oficial ainda
não foi inspecionado; ver "Contrato de Storage" no relatório da Fase 3. Nenhuma
imagem legada foi copiada e nenhuma URL permanente foi inventada.
