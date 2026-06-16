# FASE 10F — Lista VIP Profissional + Leads + LGPD

## Objetivo

Transformar a Lista VIP pública em ferramenta profissional para eventos:
URLs amigáveis por parceiro, QR Code individual, comprovante visual,
captura automática de leads e base para CRM futuro.

## URLs

| Antiga (Fase 10E) | Nova (Fase 10F) |
|---|---|
| `/vip/:publicSlug` | `/:partnerSlug/vip` |
| `/vip/:publicSlug/sucesso/:publicToken` | `/:partnerSlug/vip/sucesso/:publicToken` |
| `?promoter=:slug` | mantido |

URLs antigas redirecionam para `/` (`Navigate replace`).

### Rotas reservadas (arquitetura preparada, ainda sem funcionalidade)

- `/:partnerSlug/eventos`
- `/:partnerSlug/eventos/:eventSlug`
- `/:partnerSlug/mesas`
- `/:partnerSlug/reservas`

Renderizam placeholder `PartnerScopedComingSoon`.

## Regra oficial: 1 cadastro = 1 pessoa = 1 QR Code = 1 check-in

- Removida a entrada de "Pessoas" no formulário público.
- `people_count` sempre salvo como `1` em inscrições públicas.
- Adicionado `allow_multiple_people_per_entry boolean default false` em
  `partner_vip_lists` — uso futuro (lista casal, família, camarote).
  **Não habilitado nesta fase.**

## Antifraude

Bloqueia na mesma lista:

- mesmo telefone (após normalização: apenas dígitos);
- mesmo e-mail (case-insensitive);
- caso ambos preenchidos, qualquer um já existente.

Formatos `(18)99999-9999`, `18999999999`, `18 99999-9999` são considerados iguais.

Mensagem: `"Você já está inscrito nesta Lista VIP."`

Sem bloqueio entre listas distintas.

## Comprovante profissional

Cartão com:

- Logo do estabelecimento
- Nome da empresa
- Nome do convidado
- Telefone
- Promoter
- Código VIP (8 chars)
- Data
- QR Code
- Disclaimer: "Este QR Code é individual e válido para apenas 1 pessoa."
- Aviso LGPD: "Este documento é apenas um comprovante…"
- "Powered by Roxou Partner Pro"

Ações: **Baixar QR PNG**, **Salvar comprovante PNG**, **WhatsApp**, **Copiar código**.

Gerado com `html-to-image` (nó renderizado → PNG) e `qrcode` (PNG direto do payload).

## Check-in

Mantido `/checkin/:publicToken` (Partner Pro). QR Code pode apontar para
`vip:<token>` ou para `${origin}/checkin/<token>`. Bloqueio de dupla
utilização permanece via `check_in_partner_vip_entry`.

## CRM — `partner_leads`

Nova tabela:

```
partner_id, full_name, email, phone, normalized_phone,
first_seen_at, last_seen_at,
source ('vip_list'), source_reference_id, source_reference_type,
marketing_consent, whatsapp_consent, email_consent,
total_events, total_checkins
```

Índices únicos:
- `(partner_id, normalized_phone)` quando preenchido
- `(partner_id, lower(email))` quando preenchido

### Captura automática

Toda submissão pública chama `_upsert_partner_lead`:

- busca por `normalized_phone` → depois por `email`;
- se existir: incrementa `total_events`, atualiza `last_seen_at`,
  consentimentos são OR-acumulados (nunca remove);
- se não existir: insere com `total_events = 1`.

## LGPD

Checkbox opcional no formulário:

> "Autorizo receber informações, promoções e novidades deste
> estabelecimento e da Roxou."

Salva `marketing_consent`, `whatsapp_consent` e (se e-mail informado)
`email_consent` tanto na entry quanto no lead. **Desmarcado por padrão.**

Nenhuma comunicação automática nesta fase.

## Segurança

- `partner_leads`: RLS — apenas admin ou
  `is_partner_reservation_manager(uid, partner_id)` pode SELECT/UPDATE/DELETE.
- Nenhum SELECT público. Sem `GRANT SELECT` para `anon`.
- `_upsert_partner_lead` é SECURITY DEFINER e tem EXECUTE revogado de
  `PUBLIC` — chamada só por outras funções definer (submit RPC).
- `submit_public_vip_entry` é SECURITY DEFINER, EXECUTE para `anon, authenticated`.
- Promoter sempre validado contra `partner_id` do dono da lista.
- Dados pessoais nunca expostos em rotas públicas (success page lê apenas
  via `location.state`, não via SELECT).

## Arquivos

Backend:
- `supabase/migrations/2026… (Fase 10F)` —
  `partner_leads`, consentimentos, `allow_multiple_people_per_entry`,
  `submit_public_vip_entry` v2, `get_public_vip_list` v2,
  `get_public_vip_list_by_partner`, `_upsert_partner_lead`.

Frontend:
- `src/services/publicVipList.ts` — assinatura nova (com consents).
- `src/lib/qrcode.ts` — adiciona `generateQrPngDataUrl` + `downloadDataUrl`.
- `src/pages/PublicVipList.tsx` — `/:partnerSlug/vip`, sem campo Pessoas,
  com checkbox LGPD opcional.
- `src/pages/PublicVipListSuccess.tsx` — cartão profissional, 4 ações.
- `src/pages/PartnerScopedComingSoon.tsx` — placeholder das rotas reservadas.
- `src/App.tsx` — registra novas rotas, redireciona antigas.
- `package.json` — adiciona `html-to-image`.

## Validação

- build verde, tsc verde, eslint sem erros novos.
- URL `/cultbarpp/vip?promoter=fernando` renderiza com promoter rastreado.
- Mesmo telefone bloqueado: erro "Você já está inscrito nesta Lista VIP."
- Lead criado/atualizado automaticamente em `partner_leads`.
- Download PNG do QR funcional (`qr-vip-<nome>.png`).
- Download PNG do comprovante funcional (`comprovante-vip-<nome>.png`).
- Check-in pré-existente em `/checkin/:publicToken` mantido.
- Mobile sem overflow horizontal.

## Não alterado

Roxou pública fora das novas rotas, Admin antigo, Nginx, VPS, Google
OAuth, Reservas, Eventos, RLS fora desta fase.
