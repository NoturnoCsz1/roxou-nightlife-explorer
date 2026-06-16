# Fase 9G — Partner Events (gestão de eventos pelo parceiro)

Status: ✅ Aplicada.

## Princípio

A tabela `events` continua sendo a **fonte única**. Nenhuma tabela paralela foi
criada. O Partner Pro escreve em `events` por meio de RPCs `SECURITY DEFINER`
com whitelist server-side; o RLS de `events` para `INSERT/UPDATE/DELETE`
continua restrito ao Admin Roxou.

## Mudanças no banco

### Coluna nova

- `events.submitted_by_partner boolean NOT NULL DEFAULT false`
  Marca eventos criados via Partner Pro (útil para curadoria no Admin).

### Helper

- `public.is_partner_editor_or_above(_user uuid, _partner uuid) RETURNS boolean`
  `true` se o usuário está em `partner_users` ativo como `owner | admin | editor`.

### Policy nova (SELECT-only)

- `events: "Partner staff read own partner events"`
  Permite que qualquer membro ativo (`is_partner_member`) leia eventos
  (rascunho, publicado, arquivado, etc.) do **próprio parceiro**. Nenhuma
  outra policy de `events` foi tocada — a leitura pública de eventos
  publicados (`Anyone can view published events`) e o controle total do Admin
  permanecem intactos.

### Funções `SECURITY DEFINER`

Todas: `REVOKE FROM PUBLIC`, `GRANT EXECUTE TO authenticated, service_role`,
`SET search_path = public`, autorização validada no corpo da função.

| Função | Permissão | Comportamento |
|--------|-----------|---------------|
| `create_partner_event(_partner_id, _payload)` | `is_admin()` **ou** `is_partner_editor_or_above` | Insere com `status='draft'`, `submitted_by_partner=true`, slug gerado, `city` herdada do parceiro. `title` e `date_time` obrigatórios. |
| `update_partner_event(_event_id, _payload)` | `is_admin()` **ou** `is_partner_editor_or_above` | Atualiza somente whitelist. `status`, `partner_id`, `featured`, `slug`, métricas e tudo mais ficam intactos. |
| `duplicate_partner_event(_event_id)` | `is_admin()` **ou** `is_partner_owner_or_admin` | Cria cópia com `" (cópia)"`, novo slug, `status='draft'`. |
| `archive_partner_event(_event_id)` | `is_admin()` **ou** `is_partner_owner_or_admin` | Soft archive (`status='archived'`). Nunca apaga. |

## Whitelist de campos (create/update)

| Campo                | Tratamento server-side |
|----------------------|------------------------|
| `title`              | `btrim`. Obrigatório no create. |
| `description`        | `btrim`, vazio → `NULL`. |
| `short_summary`      | `btrim`, vazio → `NULL`. |
| `image_url`          | `btrim`, vazio → `NULL`. (mapeia `cover_url` do escopo) |
| `date_time`          | `::timestamptz`. Obrigatório no create. |
| `venue_name`         | `btrim`, vazio → `NULL`. |
| `category`           | `btrim`, default `'festa'`. |
| `sub_category`       | `btrim`, vazio → `NULL`. |
| `instagram_caption`  | `btrim`, vazio → `NULL`. |
| `ticket_url`         | `btrim`, vazio → `NULL`. |
| `opportunity_tags`   | array de strings não vazias. (mapeia `tags` do escopo) |

Qualquer outra chave (ex.: `partner_id`, `status`, `featured`, `aura_score`,
`ai_confidence_score`, `slug`, `id`, métricas) é **silenciosamente ignorada**.

### Campos do escopo que não foram implementados

A coluna não existe hoje em `events` — **fora do escopo desta fase aplicar
schema novo**. Quando o produto pedir, basta adicionar a coluna e estender o
`CASE WHEN` da função:

- `end_date_time`
- `external_url`
- `is_free`
- `price_from`

## Matriz de permissões por role

| Role no parceiro | Listar | Criar | Editar | Duplicar | Arquivar |
|------------------|:------:|:-----:|:------:|:--------:|:--------:|
| `owner`          | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin`          | ✅ | ✅ | ✅ | ✅ | ✅ |
| `editor`         | ✅ | ✅ | ✅ | ❌ | ❌ |
| `attendant`      | ✅ | ❌ | ❌ | ❌ | ❌ |
| anon             | ❌ | ❌ | ❌ | ❌ | ❌ |
| Admin Roxou      | ✅ (via policy admin) | ✅ | ✅ | ✅ | ✅ |

A exclusão física (`DELETE`) **continua exclusiva do Admin Roxou** via policy
`Admins delete events`. Parceiros só arquivam.

## Frontend

### Service

`src/apps/partner/services/partnerEvents.ts`

- `listMyEvents(partnerId, { status, search, limit })`
- `getMyEvent(eventId, partnerId)`
- `createPartnerEvent(partnerId, payload)`
- `updatePartnerEvent(eventId, partnerId, payload)`
- `duplicatePartnerEvent(eventId)`
- `archivePartnerEvent(eventId)`

Sanitização client-side garante que somente campos da whitelist sejam enviados
(defesa em profundidade; a barreira definitiva é o SQL).

### Componentes

`src/apps/partner/components/`

- `PartnerEventStatusBadge`
- `PartnerEventEmptyState`
- `PartnerEventFilters`
- `PartnerEventQuickActions`
- `PartnerEventCard`
- `PartnerEventsTable`
- `PartnerEventForm`

### Páginas (orfãs — sem rota em `App.tsx`)

- `PartnerEventsPage` — lista + filtros + form inline.
- `PartnerEventFormPage` — criação/edição standalone.
- `PartnerEventDetailPage` — visualização detalhada com ações rápidas.

As páginas usam `usePartnerAuth` para derivar permissões e o
`selectedPartner` persistido em `localStorage` (Fase 9C).

## Exemplos

### Payload aceito (create)

```json
{
  "title": "Sertanejou Sextou",
  "date_time": "2026-07-04T22:00:00-03:00",
  "venue_name": "Bar do Zé",
  "category": "festa",
  "sub_category": "sertanejo",
  "short_summary": "DJ residente + duplas convidadas",
  "ticket_url": "https://ingressos.exemplo.com/abc",
  "opportunity_tags": ["sertanejo", "sexta", "open bar"]
}
```

Resultado: linha inserida com `status='draft'`, `submitted_by_partner=true`,
`partner_id` = parceiro do chamador, `city` herdada do parceiro, `slug`
gerado a partir do título.

### Payload com campos proibidos (silenciosamente ignorados)

```json
{
  "title": "Tentativa",
  "date_time": "2026-07-04T22:00:00-03:00",
  "partner_id": "<outro_parceiro>",   // ignorado
  "status": "published",              // ignorado — sai como draft
  "featured": true,                   // ignorado
  "aura_score": 9999                  // ignorado
}
```

### Erros típicos

- Sem login → `Not authenticated` (`42501`).
- `attendant` tentando criar/editar/duplicar/arquivar → `Forbidden` (`42501`).
- `editor` tentando duplicar ou arquivar → `Forbidden`.
- Tentar editar evento de outro parceiro → `Forbidden`.
- Tentar arquivar evento sem `partner_id` → `Event not found or not linked to a partner`.

## Não alterado

- Admin Roxou (policies, telas, fluxos de ingestão, RadarIA, EventoBulkForm).
- Site público da Roxou (leitura de eventos publicados intacta).
- Edge functions, OpenAI, PWA/SEO.
- `App.tsx` e roteamento: as páginas do Partner Pro continuam **orfãs**
  (sem rota pública). Bundle público não cresce.

## Validação

- ✅ Migration aplicada (warnings de SECURITY DEFINER são o padrão do projeto
  — autorização é feita dentro de cada função).
- ✅ `tsc --noEmit` verde.
- ✅ `submitted_by_partner` default `false` em todas as linhas existentes
  (eventos legados não são alterados).
- ✅ Policies pré-existentes de `events` preservadas; nova policy é
  exclusivamente `SELECT`.
- ✅ Bundle público inalterado (páginas Partner Pro continuam fora do
  `App.tsx`).

## Arquivos novos/alterados

- `supabase/migrations/<timestamp>_fase_09g_partner_events.sql`
- `src/apps/partner/services/partnerEvents.ts`
- `src/apps/partner/components/PartnerEventStatusBadge.tsx`
- `src/apps/partner/components/PartnerEventEmptyState.tsx`
- `src/apps/partner/components/PartnerEventFilters.tsx`
- `src/apps/partner/components/PartnerEventQuickActions.tsx`
- `src/apps/partner/components/PartnerEventCard.tsx`
- `src/apps/partner/components/PartnerEventsTable.tsx`
- `src/apps/partner/components/PartnerEventForm.tsx`
- `src/apps/partner/components/index.ts` (re-exports)
- `src/apps/partner/pages/PartnerEventsPage.tsx` (substituiu placeholder)
- `src/apps/partner/pages/PartnerEventFormPage.tsx` (novo)
- `src/apps/partner/pages/PartnerEventDetailPage.tsx` (novo)
- `src/apps/partner/pages/index.ts` (re-exports)
- `docs/refactor/FASE_09G_partner_events.md` (este documento)
