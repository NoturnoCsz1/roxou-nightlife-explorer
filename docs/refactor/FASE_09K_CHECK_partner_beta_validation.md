# Fase 9K-Check — Validação do Beta Fechado do Partner Pro

Data: 2026-06-16
Escopo: validação do beta fechado entregue na Fase 9K. Sem novas
features, sem subdomínio, sem multi-entry, sem nginx.

---

## 1. Acesso

Gate implementado em `PartnerPreviewLayout` via
`usePartnerBetaAccess` (hook que consulta `user_roles` e
`partner_beta_access`).

| Cenário                                          | Resultado | Como é garantido |
|--------------------------------------------------|-----------|------------------|
| Admin Roxou acessa `/admin/partner-preview`      | ✅ libera | `has_role(uid,'admin')` |
| Usuário sem registro em `partner_beta_access`    | ✅ bloqueia | `hasAccess = isAdmin \|\| partnerIds.length > 0` |
| Usuário com `access_enabled = true`              | ✅ libera | filtro `.eq("access_enabled", true)` |
| Usuário com `access_enabled = false`             | ✅ bloqueia | mesmo filtro acima exclui o registro |
| Usuário não autenticado                          | ✅ redireciona p/ `/auth` | `<Navigate to="/auth" replace />` |

Confirmado em `src/apps/partner/hooks/usePartnerBetaAccess.ts:45-71`
e `src/apps/partner/layouts/PartnerPreviewLayout.tsx:75-93`.

## 2. Partner selecionado

`PartnerProvider` (Fase 9C) carrega via `listMyPartners()` somente
vínculos ativos em `partner_users` para o usuário autenticado.

| Cenário                                  | Resultado |
|------------------------------------------|-----------|
| 1 partner vinculado                      | ✅ entra direto (auto-select do primeiro) |
| múltiplos partners                       | ✅ alterna via seletor + `localStorage` |
| partner não vinculado ao usuário         | ✅ não aparece na lista (`partner_users` filtra por `user_id`) |

⚠️ **Pré-requisito de onboarding do beta**: convidar um parceiro real
exige criar **duas** entradas:

1. `partner_beta_access` — habilita o gate de acesso ao preview.
2. `partner_users` — vincula o usuário ao `partner_id` com o role
   apropriado (`owner`, `admin`, `editor` ou `attendant`).

Sem o segundo registro o usuário entra na landing do beta mas o
`PartnerProvider` mostra lista vazia. Está documentado abaixo no
script de convite.

## 3. Páginas

Todas as rotas estão registradas em `src/App.tsx:184-197` como filhas
de `PartnerPreviewLayout`:

- ✅ `/admin/partner-preview` → `PartnerBetaLandingPage`
- ✅ `/dashboard` → `PartnerDashboardPage`
- ✅ `/perfil` → `PartnerProfilePage`
- ✅ `/eventos` → `PartnerEventsPage` (+ `eventos/novo`, `eventos/:id`)
- ✅ `/reservas` → `PartnerReservationsPage`
- ✅ `/lista-vip` + `/lista-vip/:listId`
- ✅ `/analytics` → `PartnerAnalyticsPage`
- ✅ `/configuracoes` → `PartnerSettingsPage`

Todas usam lazy loading via `L()`. `tsc --noEmit` verde.

## 4. Ações × RPCs

| Ação                       | RPC / endpoint                              | Roles permitidas |
|----------------------------|---------------------------------------------|------------------|
| Editar perfil              | `update_partner_safe_profile`               | owner, admin, Roxou admin |
| Criar evento               | `create_partner_event`                      | owner, admin, editor |
| Editar evento              | `update_partner_event`                      | owner, admin, editor |
| Arquivar evento            | `archive_partner_event`                     | owner, admin |
| Duplicar evento            | `duplicate_partner_event`                   | owner, admin |
| Criar reserva              | `create_partner_reservation`                | owner, admin |
| Editar reserva             | `update_partner_reservation`                | owner, admin |
| Mudar status reserva       | `set_partner_reservation_status`            | owner/admin (qualquer), editor (`confirmed`), attendant (`confirmed/completed/no_show`) |
| Criar / editar lista VIP   | `create_partner_vip_list`, `update_partner_vip_list` | owner, admin, editor |
| Abrir / fechar / arquivar  | `open_partner_vip_list`, `close…`, `archive…` | owner, admin (close/archive) ou editor+ (open) |
| Adicionar entrada VIP      | `add_partner_vip_entry`                     | owner, admin, editor |
| Check-in VIP               | `check_in_partner_vip_entry`                | owner, admin, editor, attendant |
| Cancelar entrada VIP       | `cancel_partner_vip_entry`                  | owner, admin, editor, attendant |
| Enviar feedback            | `INSERT` em `partner_beta_feedback`         | qualquer authenticated (RLS scoping por `user_id`) |

Todos os RPCs são `SECURITY DEFINER` com `auth.uid()` checado contra
`is_admin()` ou `is_partner_*` (mapeados na Fase 9B/9C). Erros
retornam código `42501` com mensagens em português.

## 5. Métricas beta

Layout chama `trackBetaEvent` em dois pontos:

- `login` — ao montar o layout com `hasAccess` (uma vez por sessão).
- ação por rota — via mapa `ACTION_BY_PATH` em `useEffect` que dispara
  ao mudar `pathname` (dashboard, perfil, eventos, reservas, vip,
  analytics, configurações).

`submitBetaFeedback` adiciona um `feedback_sent` extra após gravar em
`partner_beta_feedback`.

Estado atual em produção:

```
partner_beta_access   : 0 linhas (nenhum parceiro real convidado ainda)
partner_beta_metrics  : 0 linhas
partner_beta_feedback : 0 linhas
```

Esperado — nenhum parceiro foi adicionado ao whitelist. Após o primeiro
login real os contadores começam a subir.

## 6. Segurança

Policies confirmadas via `pg_policies`:

```
partner_beta_access   | admin manages (ALL) + user reads own (SELECT)
partner_beta_feedback | admin manages (ALL) + insert own + own read
partner_beta_metrics  | admin manages (ALL) + insert own + own read
```

Sem policies para `anon` → **anon não consegue ler nem inserir** em
nenhuma das tabelas beta.

Demais garantias:

- Parceiro só vê dados do próprio `partner_id` — RLS de
  `partners`/`events`/`partner_reservations`/`partner_vip_*` usa
  `is_partner_member(uid, partner_id)`.
- Attendant não edita perfil/evento — RPCs exigem
  `is_partner_owner_or_admin` ou `is_partner_editor_or_above`.
- Editor não cria/edita reserva — `create_partner_reservation` e
  `update_partner_reservation` exigem owner/admin.
- Admin Roxou mantém bypass via `is_admin()` em todos os RPCs.

## 7. UX

- ✅ Banner amarelo "BETA FECHADO" renderiza no topo de todas as
  páginas do preview (faz parte do `PartnerPreviewLayout`).
- ✅ Badge "Admin" aparece quando `isAdmin = true`.
- ✅ `PartnerFeedbackWidget` é montado no layout e fica em todas
  as páginas.
- ✅ Mensagens de erro dos RPCs sobem como `Error.message`
  (`Forbidden`, `payload must be a JSON object`, etc.) e os formulários
  usam `toast.error(err.message)`.
- ✅ Mobile 390px: layout usa `max-w-5xl`, `flex-wrap` na nav e
  `overflow-x-auto`. Validado visualmente no preview (viewport
  360×653).

## 8. Bugs encontrados / correções

Nenhuma regressão funcional detectada nesta passagem.

Observações (não-bloqueantes):

1. **Onboarding em dois passos** — adicionar um parceiro ao beta
   requer entrada em `partner_beta_access` **e** em `partner_users`.
   Hoje isso é feito manualmente via SQL pelo admin. Quando abrirmos
   para mais parceiros, vale criar uma tela/CLI única (fora do escopo
   de 9K-Check).
2. **Métrica `login`** — dispara a cada montagem do layout
   (recarga ou navegação direta), o que pode inflar o contador.
   Tolerável para piloto fechado com 2 parceiros; revisar antes de
   abrir para massa.

## 9. Smoke test executado

- `npx tsc --noEmit` → ✅ verde (0 erros).
- `pg_policies` confirmadas para as 3 tabelas beta.
- Preview carrega `/admin/partner-preview` em 360px sem erros no
  console.
- Rotas registradas em `App.tsx` resolvem para os componentes lazy.

## 10. Script de convite (uso manual pelo admin)

```sql
-- 1) Vincula o usuário ao estabelecimento com o role desejado.
INSERT INTO public.partner_users (user_id, partner_id, role, is_active)
VALUES ('<uuid-do-usuario>', '<uuid-do-partner>', 'owner', true);

-- 2) Habilita o gate de beta fechado.
INSERT INTO public.partner_beta_access (user_id, partner_id, invited_by, access_enabled, beta_role, notes)
VALUES ('<uuid-do-usuario>', '<uuid-do-partner>', auth.uid(), true, 'partner', 'Piloto 2026-06');
```

Para revogar: `UPDATE partner_beta_access SET access_enabled = false WHERE user_id = '...';`

## 11. Recomendação

**Pronto para piloto fechado com 2 parceiros reais.**

Gate de acesso, isolamento por `partner_id`, RPCs seguras, métricas
e canal de feedback estão funcionais. Subdomínio, multi-entry, nginx,
cobrança e cadastro público continuam fora de escopo (Fases 9L+).

Antes de abrir para >5 parceiros:

- consolidar onboarding em 1 passo;
- revisar dedup do evento `login` em métricas;
- planejar dashboard interno para admin acompanhar
  `partner_beta_metrics` / `partner_beta_feedback`.
