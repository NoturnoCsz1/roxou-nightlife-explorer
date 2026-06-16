# Fase 9E — Edição controlada do perfil do parceiro

Data: 2026-06-16

## Objetivo
Permitir que o parceiro (`owner`/`admin` em `partner_users`) edite um
subconjunto seguro do próprio cadastro em `partners`, sem criar tabelas
paralelas (`partner_profiles` continua **proibido**).

## Princípios
- Fonte única: tabela `partners`.
- Nenhuma migration, nenhuma alteração de RLS, nenhuma alteração de rota
  pública, App.tsx, Vite, nginx, subdomínio ou Edge Functions.
- Whitelist explícita no backend service — qualquer coluna fora da lista
  é descartada antes do `UPDATE`.

## Campos editáveis nesta fase
Confirmados na tabela `partners`:
| Coluna             | UI                       |
| ------------------ | ------------------------ |
| `short_description`| Descrição curta (160)    |
| `full_description` | Descrição completa (2000)|
| `instagram`        | Handle normalizado       |
| `whatsapp`         | Apenas dígitos / `+`     |
| `logo_url`         | Upload bucket `uploads`  |

## Campos solicitados que NÃO existem na tabela
Mantidos como placeholders informativos para a Fase 9F (quando uma migration
aprovada poderá adicioná-los):
- `phone`, `website`, `opening_hours`, `cover_image_url`, `menu_url`,
  `tags`, `amenities`.

O componente `PartnerOpeningHoursEditor` renderiza "Em breve" e não grava.

## Campos bloqueados (curadoria Roxou)
`name`, `slug`, `city`, `address`, `formatted_address`, `latitude`,
`longitude`, `status`, `featured_home`, `verified_partner`,
`partner_awards`, campos `aura_*`, `instagram_validated`, `manual_locked_fields`.

## Arquivos criados
```
src/apps/partner/services/partnerProfile.ts
src/apps/partner/components/PartnerProfileEditor.tsx
src/apps/partner/components/PartnerImageUploader.tsx
src/apps/partner/components/PartnerSocialLinksEditor.tsx
src/apps/partner/components/PartnerOpeningHoursEditor.tsx
src/apps/partner/components/PartnerProfilePreview.tsx
```
## Arquivos alterados
```
src/apps/partner/pages/PartnerProfilePage.tsx
src/apps/partner/components/index.ts
```

## API do service
```ts
getPartnerProfile(partnerId: string): Promise<PartnerProfileRow | null>
updatePartnerProfile(partnerId: string, payload: PartnerEditablePayload): Promise<PartnerProfileRow>
uploadPartnerImage(partnerId: string, file: File, type?: "logo"): Promise<string>
```
- `sanitizePayload()` aplica a whitelist e normaliza `instagram` via
  `normalizeInstagramHandle` e `whatsapp` para `[^0-9+]`.
- Upload usa bucket público `uploads`, pasta `partners/<partnerId>/`.

## Matriz de permissão (UI)
| Role        | Edita | Sugere | Lê |
| ----------- | :---: | :---:  | :---: |
| `owner`     | ✅    | —      | ✅ |
| `admin`     | ✅    | —      | ✅ |
| `editor`    | ❌    | UI mostra aviso "em breve" | ✅ |
| `attendant` | ❌    | ❌     | ✅ |

## UX
- Badge "Alterações salvas" (verde, com `CheckCircle2`) após sucesso.
- Toast `sonner` em sucesso/erro.
- Aviso fixo: "Nome, endereço e dados principais são revisados pela Roxou."
- Pré-visualização ao vivo do card público (`PartnerProfilePreview`).
- Barra de ação sticky com estado de dirty.

## Limitação conhecida (RLS)
A RLS atual de `partners` só permite `UPDATE` quando `is_admin() = true`.
Para um `partner_users.owner` não-admin, o `UPDATE` retornará 0 linhas e
o service lançará "Sem permissão…".

A função `public.is_partner_owner_or_admin(uuid, uuid)` já existe (Fase
9B), mas a política de UPDATE ainda não a usa. Uma migration adicional
(Fase 9F) deverá adicionar:

```sql
CREATE POLICY "Owners/admins update own partner safe fields"
  ON public.partners FOR UPDATE TO authenticated
  USING (public.is_partner_owner_or_admin(auth.uid(), id))
  WITH CHECK (public.is_partner_owner_or_admin(auth.uid(), id));
```
Esta fase **não** aplica essa migration, conforme escopo aprovado.

## Validação
- `tsc --noEmit`: verde.
- ESLint nos arquivos novos: 0 warnings.
- Nenhuma rota nova registrada em `App.tsx`; bundle público inalterado.
- Nenhuma alteração em Admin, Roxou pública, Edge Functions, eventos ou
  RLS.

## Próximas fases
- 9F: migration RLS para `is_partner_owner_or_admin` + colunas
  `opening_hours`, `website`, `menu_url`, `cover_image_url`, `tags`.
- 9G: layout interno e bottom-nav do app Partner.
