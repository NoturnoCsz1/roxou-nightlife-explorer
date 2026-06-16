# FASE 10E — Link público de Lista VIP + QR Code + link por promoter

## Objetivo
Transformar a Lista VIP do Partner Pro em ferramenta real de captação pública
de convidados, com link compartilhável, rastreamento por promoter, QR code e
confirmação na portaria via leitura do QR.

## Banco

### `partner_vip_lists` (novos campos)
- `public_slug text unique` — gerado automaticamente via trigger
- `public_enabled boolean default false`
- `public_title text`, `public_description text`, `public_cover_url text`, `public_rules text`
- `max_entries_per_person int default 1`
- `requires_approval boolean default false`

### `partner_vip_list_entries` (novos campos)
- `public_token uuid default gen_random_uuid() unique`
- `source text default 'manual'` — `manual` ou `public`
- `public_submitted_at timestamptz`
- `qr_code_payload text`

### `partner_promoters` (novo campo)
- `slug text` — único por `(partner_id, slug)`, gerado por trigger a partir do nome

## RPCs (SECURITY DEFINER)
- `set_partner_vip_list_public_enabled(_list_id, _enabled)` — owner/admin.
- `submit_public_vip_entry(p_public_slug, p_name, p_phone, p_email, p_people_count, p_promoter_slug)`
  – callable por `anon` e `authenticated`. Valida `public_enabled`, status,
  capacidade, duplicidade por telefone (quando `max_entries_per_person <= 1`)
  e o promoter. Retorna `entry_id`, `public_token`, `status`, `qr_code_payload`,
  `list_title`, `people_count`, `name`.
- `get_public_vip_list(p_public_slug)` – callable por `anon`. Devolve apenas
  campos seguros (sem expor inscrições). Usado pela página `/vip/:publicSlug`.
- `get_vip_entry_by_token(p_token)` – exige login e acesso ao parceiro.
  Usada por `/checkin/:publicToken`.

## Frontend

### App principal (roxou.com.br)
- Rota pública `/vip/:publicSlug` — `src/pages/PublicVipList.tsx`
  - aceita `?promoter=slug`
  - formulário mobile-first com nome, telefone, e-mail, pessoas, aceite LGPD
  - chama `submitPublicVipEntry`
- Rota pública `/vip/:publicSlug/sucesso/:publicToken` —
  `src/pages/PublicVipListSuccess.tsx`
  - mostra QR Code (SVG via `qrcode`), nome, pessoas, lista, estabelecimento
  - botões "Copiar comprovante" e "Abrir no WhatsApp"

### Partner Pro (parceiro.roxou.com.br)
- Nova rota `/checkin/:publicToken` — `PartnerVipCheckinPage`
  - exige login Partner
  - busca a entry via `get_vip_entry_by_token`
  - botão grande "Confirmar entrada"; mostra "Entrada já confirmada" se já feito
- `PartnerVipListDetailPage` ganhou bloco "Link público":
  - Ativar/Desativar link público
  - Link `https://roxou.com.br/vip/:publicSlug` + Copiar/Abrir
  - Lista de links por promoter (`?promoter=slug`) com contadores
    (inscritos / pessoas / check-ins / no-show)

### Serviços
- `src/services/publicVipList.ts` — wrappers públicos (`getPublicVipList`,
  `submitPublicVipEntry`).
- `src/apps/partner/services/partnerVipLists.ts` — adicionados:
  `setVipListPublicEnabled`, `getVipEntryByToken`, `computePromoterStats`,
  campos públicos nos tipos `PartnerVipList` / `PartnerVipEntry`.

### Utilitário
- `src/lib/qrcode.ts` — `generateQrSvg(payload)`, baseado em `qrcode`.

## Segurança
- Página pública usa apenas RPCs SECURITY DEFINER. Sem `SELECT` direto em
  `partner_vip_lists` ou `partner_vip_list_entries` por `anon`.
- Promoter inválido é ignorado silenciosamente (não bloqueia inscrição).
- Duplicidade de telefone bloqueia nova inscrição quando
  `max_entries_per_person <= 1`.
- Capacidade total respeitada por soma de `people_count` excluindo `cancelled`.
- Check-in por token só é executado por usuário Partner com permissão
  `is_partner_reservation_manager` no parceiro dono da entry.

## Não alterado
- Roxou pública fora de `/vip/*`
- Admin antigo, Nginx, OAuth Google, eventos, reservas, PWA principal
- RLS das demais tabelas
