# FASE 10D — Lista VIP: Promoters + Check-in na portaria

## Objetivo
Transformar a Lista VIP do Partner Pro em um fluxo real de operação na portaria, com promoters identificados e ações rápidas de check-in / no-show / cancelamento.

## Escopo entregue

### 1. Rota de detalhe
- `src/apps/partner/App.tsx`: rota `lista-vip/:listId` registrada.
- `src/apps/partner/routes/PartnerVipListDetailRoute.tsx`: wrapper que extrai `listId` e renderiza `PartnerVipListDetailPage`.
- Botão **Abrir** em `/lista-vip` navega via `useNavigate` para `/lista-vip/:listId`.

### 2. Mobile
- `VipListTable.tsx` e `VipEntryTable.tsx`: layout dual — `<md` renderiza cards, `>=md` renderiza tabela.
- Cards mostram título, status, início, capacidade e ação Abrir.
- Sem overflow horizontal em 320–480 px.

### 3. Promoters (banco)
Migration `20260616141430_…`:
- Tabela `public.partner_promoters` (`id`, `partner_id`, `name`, `phone`, `instagram`, `is_active`, timestamps).
- GRANTs para `authenticated` / `service_role`.
- RLS:
  - owner/admin/editor gerencia promoters do próprio `partner_id`;
  - attendant lê;
  - anon sem acesso.
- `partner_vip_list_entries` ganha `promoter_id` (FK) e `promoter_name_snapshot` (histórico imutável).

### 4. RPCs atualizadas
- `add_partner_vip_entry` / `update_partner_vip_entry`: validam que o promoter pertence ao mesmo `partner_id` da lista e gravam o snapshot.
- `no_show_partner_vip_entry`: novo, permitido para owner/admin/editor/attendant.
- `check_in_partner_vip_entry`, `cancel_partner_vip_entry`: já existentes, reutilizados.

### 5. Services
- `src/apps/partner/services/partnerPromoters.ts`: `listPromoters`, `createPromoter`, `updatePromoter`, `deactivatePromoter`.
- `src/apps/partner/services/partnerVipLists.ts`: `listVipEntries`, `addVipEntry` (com `promoter_id`), `checkInVipEntry`, `cancelVipEntry`, `noShowVipEntry` (alias exportado como `markNoShowVipEntry` para compatibilidade com o nome do prompt).

### 6. UI da detail
`PartnerVipListDetailPage.tsx`:
- Dados da lista + estatísticas (total / aprovados / check-ins / no-show).
- Busca por nome, telefone ou promoter.
- Formulário de adição com seletor de promoter + quick-add inline (`VipEntryForm.tsx`).
- Ações por linha: **Confirmar entrada**, **No-show**, **Cancelar**.
- Ciclo de vida da lista: abrir / fechar / arquivar.

### 7. Modo portaria
`VipCheckInPanel.tsx`:
- Toggle “Modo portaria” na detail.
- Layout grande, mobile-first, alto contraste.
- Busca rápida por nome/telefone.
- Botão grande **Confirmar entrada** + indicação do promoter responsável.

### 8. Segurança
- Parceiro só vê listas e promoters do próprio `partner_id` (RLS + checagem nas RPCs).
- RPCs rejeitam `promoter_id` de outro parceiro com `Promoter not found for this partner`.
- attendant pode check-in/no-show mas não cria/edita lista nem promoter.
- owner/admin/editor gerenciam listas, entradas e promoters.

## Fora de escopo (não tocado)
Roxou pública, Admin antigo, Nginx/VPS, Google OAuth, Reservas, Eventos, RLS de outras tabelas.

## Validação
- TSC / ESLint sem novos erros.
- Botão Abrir navega para a detail.
- Mobile (320/360/390/412 px) sem scroll horizontal.
- Criar promoter → adicionar entrada com promoter → confirmar entrada → `status=checked_in`, `checked_in_at` preenchido, `promoter_name_snapshot` persistido.
