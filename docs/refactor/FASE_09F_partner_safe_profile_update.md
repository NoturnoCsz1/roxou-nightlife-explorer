# Fase 9F — Partner Safe Profile Update

Status: ✅ Aplicado.

## Objetivo

Permitir que **owners/admins** de um parceiro editem campos seguros do próprio
estabelecimento na tabela `partners`, mantendo a tabela como **fonte única** (sem
`partner_profiles`, sem cadastro paralelo).

## Decisão de design

O RLS de `UPDATE` em `public.partners` permanece restrito ao Admin Roxou
(`is_admin()`). Não é trivial fazer whitelist por coluna apenas com policies, então
a edição feita por owners/admins de parceiro passa exclusivamente por uma função
`SECURITY DEFINER` com whitelist server-side:

```
public.update_partner_safe_profile(_partner_id uuid, _payload jsonb) RETURNS public.partners
```

- `SECURITY DEFINER` + `SET search_path = public`
- `REVOKE ALL FROM PUBLIC`
- `GRANT EXECUTE TO authenticated, service_role`

A autorização é validada dentro da função:

1. `auth.uid()` precisa existir (anon bloqueado → erro `42501`).
2. Chamador precisa ser `is_admin()` **ou** `is_partner_owner_or_admin(uid, partner)`.
3. `editor` e `attendant` reprovam — a função `is_partner_owner_or_admin` exige
   role em `('owner','admin')`.

Qualquer chave do payload fora da whitelist é **silenciosamente ignorada** pelo
`CASE WHEN _payload ? 'col' THEN ... ELSE col END`.

## Whitelist (campos permitidos)

| Coluna              | Tratamento                                       |
|---------------------|--------------------------------------------------|
| `short_description` | `btrim`, vazio → `NULL`                          |
| `full_description`  | `btrim`, vazio → `NULL`                          |
| `instagram`         | `btrim`, vazio → `NULL` (handle normalizado no front) |
| `whatsapp`          | `regexp_replace('[^0-9+]','')`, vazio → `NULL`   |
| `logo_url`          | `btrim`, vazio → `NULL`                          |

`updated_at` é sempre atualizado para `now()`.

> Observação: o escopo da Fase 9F mencionou `phone`, `website`, `cover_image_url`,
> `menu_url`, `tags/amenities`. **Essas colunas não existem hoje em `partners`** —
> serão adicionadas em fase futura. A whitelist reflete somente o que existe.

## Campos bloqueados (entre outros)

`id`, `name`, `slug`, `city`, `address`, `neighborhood`, `latitude`, `longitude`,
`maps_place_id`, `formatted_address`, `status`, `featured_home`, `verified_partner`,
`active`, `supports_sports`, `type`, `music_style_primary`, `music_styles_secondary`,
`sports_competitions`, `aura_*`, `instagram_*` (metadados sincronizados),
`manual_locked_fields`, `created_at`. Nenhuma policy de `INSERT`/`DELETE` foi
alterada — admin segue como única origem dessas operações.

## Matriz de permissões resultante

| Quem                            | Pode salvar perfil?               |
|---------------------------------|------------------------------------|
| anon                            | ❌ (erro `42501`)                  |
| authenticated sem vínculo       | ❌ (`Forbidden`)                   |
| partner_users editor / attendant| ❌ (`is_partner_owner_or_admin` false) |
| partner_users owner / admin     | ✅ (whitelist)                     |
| admin Roxou (`is_admin()`)      | ✅ (whitelist via RPC) e ✅ via policy `Admins update partners` |

`SELECT` público em `partners` segue intacto (policies existentes não foram tocadas).

## Integração no frontend

`src/apps/partner/services/partnerProfile.ts` agora chama:

```ts
await supabase.rpc("update_partner_safe_profile", {
  _partner_id: partnerId,
  _payload: clean,        // já sanitizado no client
});
```

O componente `PartnerProfileEditor` (Fase 9E) não muda — continua chamando
`updatePartnerProfile`.

## Exemplos

### Payload aceito

```json
{
  "short_description": "Bar com música ao vivo",
  "instagram": "barzinho",
  "whatsapp": "+5518999999999",
  "logo_url": "https://.../uploads/partners/abc/logo-xxx.jpg"
}
```

### Payload com campo proibido (ignorado em silêncio)

```json
{
  "short_description": "ok",
  "name": "Tentativa de renomear",   // ignorado
  "status": "destaque",              // ignorado
  "verified_partner": true           // ignorado
}
```

Resultado: apenas `short_description` é gravado.

### Chamadas que falham

- Sem login → `Not authenticated` (`42501`).
- Authenticated mas sem `partner_users` ativo como owner/admin → `Forbidden`.
- `partner_id` inexistente → `Partner not found`.

## Arquivos alterados

- `supabase/migrations/<timestamp>_fase_09f_partner_safe_profile.sql` — função SECURITY DEFINER + GRANTs.
- `src/apps/partner/services/partnerProfile.ts` — passa a chamar a RPC.
- `docs/refactor/FASE_09F_partner_safe_profile_update.md` — este documento.

## Validação

- ✅ Migration aplicada (warnings do linter são apenas o aviso genérico de
  `SECURITY DEFINER` acessível por usuários autenticados — comportamento
  intencional, autorização é feita dentro da função).
- ✅ `tsc` verde após ajuste de tipo do payload JSON.
- ✅ Nenhuma rota, UI pública, Admin, edge function, PWA/SEO ou App.tsx alterado.
- ✅ Policies de `partners` (`SELECT`, `INSERT`, `DELETE`, `UPDATE` admin) intactas.

## Próximos passos sugeridos

- Adicionar colunas `phone`, `website`, `cover_image_url`, `menu_url`, `tags`,
  `amenities` em `partners` quando o produto pedir, e estender a whitelist da
  função (basta editar a lista de `CASE WHEN` e adicionar testes).
- Trigger opcional de auditoria gravando `updated_by_partner_user_id` (não
  implementado nesta fase para manter o escopo cirúrgico).
