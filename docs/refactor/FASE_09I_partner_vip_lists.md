# Fase 9I — Lista VIP do Partner Pro

## Objetivo
Permitir que parceiros criem e gerenciem listas VIP vinculadas a estabelecimentos
existentes em `partners` (e opcionalmente a eventos em `events`), com fluxo
completo de convidados e check-in.

## Princípio
- Fonte única de estabelecimentos: `partners` (não há cadastro paralelo).
- Vínculo opcional a `events` quando a lista é de um evento específico.

## Schema

### `partner_vip_lists`
| coluna | tipo | nota |
| --- | --- | --- |
| id | uuid PK | gen_random_uuid() |
| partner_id | uuid FK partners ON DELETE CASCADE | obrigatório |
| event_id | uuid FK events ON DELETE SET NULL | opcional |
| title | text | obrigatório |
| description | text | |
| starts_at / ends_at | timestamptz | |
| max_entries | integer | capacidade da lista |
| status | text | `draft` \| `open` \| `closed` \| `archived` |
| created_at / updated_at | timestamptz | trigger `update_updated_at_column` |

### `partner_vip_list_entries`
| coluna | tipo | nota |
| --- | --- | --- |
| id | uuid PK | |
| vip_list_id | uuid FK partner_vip_lists ON DELETE CASCADE | |
| partner_id | uuid FK partners | redundante para RLS rápido |
| event_id | uuid FK events | herdado da lista |
| user_id | uuid FK auth.users | opcional |
| name | text | obrigatório |
| phone / email | text | |
| people_count | integer default 1 | |
| status | text | `pending` \| `approved` \| `checked_in` \| `cancelled` \| `no_show` |
| checked_in_at | timestamptz | preenchido por `check_in_partner_vip_entry` |

## RLS
- **SELECT**: `is_admin() OR is_partner_member(auth.uid(), partner_id)` — qualquer
  staff ativo do parceiro lê. `anon` não tem acesso.
- **INSERT/UPDATE/DELETE direto na tabela**: somente admin Roxou. Todas as
  mutações dos parceiros passam pelas RPCs abaixo.

## RPCs (SECURITY DEFINER)
Todas validam `auth.uid()` e papel via `partner_users` antes de aplicar:

| RPC | Quem pode |
| --- | --- |
| `create_partner_vip_list(partner_id, payload)` | admin Roxou, owner, admin, editor |
| `update_partner_vip_list(list_id, payload)` | admin Roxou, owner, admin, editor |
| `open_partner_vip_list(list_id)` | admin Roxou, owner, admin, editor |
| `close_partner_vip_list(list_id)` | admin Roxou, owner, admin |
| `archive_partner_vip_list(list_id)` | admin Roxou, owner, admin |
| `add_partner_vip_entry(list_id, payload)` | admin Roxou, owner, admin, editor |
| `update_partner_vip_entry(entry_id, payload)` | admin Roxou, owner, admin, editor |
| `check_in_partner_vip_entry(entry_id)` | admin Roxou, owner, admin, editor, attendant |
| `cancel_partner_vip_entry(entry_id)` | admin Roxou, owner, admin, editor, attendant |

Whitelisting de payload: apenas as chaves listadas no schema (acima) são gravadas.
Qualquer outra chave é ignorada silenciosamente.

## Matriz de permissões

| Ação | owner | admin | editor | attendant |
| --- | :---: | :---: | :---: | :---: |
| Ler listas / entradas | ✅ | ✅ | ✅ | ✅ |
| Criar/editar lista | ✅ | ✅ | ✅ | ❌ |
| Abrir lista | ✅ | ✅ | ✅ | ❌ |
| Fechar / arquivar lista | ✅ | ✅ | ❌ | ❌ |
| Adicionar / editar convidado | ✅ | ✅ | ✅ | ❌ |
| Check-in | ✅ | ✅ | ✅ | ✅ |
| Cancelar convidado | ✅ | ✅ | ✅ | ✅ |

`anon` não tem nenhum acesso — cadastro público é deliberadamente desligado nesta fase.

## Service — `src/apps/partner/services/partnerVipLists.ts`
- `listVipLists`, `getVipList`, `createVipList`, `updateVipList`
- `openVipList`, `closeVipList`, `archiveVipList`
- `listVipEntries`, `addVipEntry`, `updateVipEntry`
- `checkInVipEntry`, `cancelVipEntry`
- `computeVipListStats(entries, maxEntries)` → `{ total, approved, checkedIn, noShow, peopleTotal, capacityUsed }`

## Componentes — `src/apps/partner/components/`
- `VipListStatusBadge`
- `VipListEmptyState`
- `VipListCard` / `VipListTable`
- `VipListForm`
- `VipListStats`
- `VipEntryForm` / `VipEntryTable`
- `VipCheckInPanel`

## Páginas órfãs — `src/apps/partner/pages/`
- `PartnerVipListPage` — listagem + criação rápida
- `PartnerVipListDetailPage(listId)` — stats, ciclo de vida (open/close/archive),
  formulário de convidado, tabela e painel de check-in.

Nenhuma rota foi adicionada em `App.tsx`. As páginas seguem como "órfãs"
disponíveis para futura integração no entrypoint `parceiro.roxou.com.br`.

## Métricas
`computeVipListStats` retorna:
- `total` — entradas válidas (exclui canceladas)
- `approved` — aprovadas + checked_in
- `checkedIn` — quem confirmou presença
- `noShow` — não compareceram
- `peopleTotal` — soma de `people_count`
- `capacityUsed` — `peopleTotal / max_entries` em %

## Validação
- Migration aplicada com sucesso.
- `npx tsc --noEmit` ✅ verde.
- Nenhuma rota pública nova; `App.tsx` intocado.
- Bundle público inalterado (páginas órfãs não são importadas).
- Linter Supabase: avisos genéricos sobre `SECURITY DEFINER` executável por
  `authenticated` são intencionais — todas as funções validam papel internamente.

## Não alterado
Roxou pública, Admin, App.tsx, multi-entry, nginx, Edge Functions, OpenAI,
eventos existentes, reservas (Fase 9H).
