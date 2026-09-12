# Adoção administrativa de short link órfão — plano de validação

Migration proposta (NÃO executada): `supabase/migrations-official/0007_admin_adopt_orphan_short_link.sql`

## Auditoria reutilizada
`public.audit_logs` (já existente no banco oficial) — colunas confirmadas:
`id, user_id, action, entity_type, entity_id, timestamp, changes, context`.
Nenhuma tabela nova é criada.

## Estado atual do caso `expo2026` (verificado)
- id `4d7b1366-95a4-4aa1-8a12-75a6596e9d48`
- `venue_id` NULL · `organization_id` NULL · `created_by` NULL
- `clicks_count` 4 · `created_at` 2026-09-12T15:37:35Z · `show_on_bio` false · `bio_icon` NULL

## Comando após aprovação
```sql
select public.admin_adopt_orphan_short_link(
  'expo2026',
  '5b1cc088-cb43-4429-a632-00df7980077e'
);
-- executado por sessão de admin/superadmin autenticado (não pelo SQL Editor anônimo)
```

## Verificação pós-execução
```sql
select id, slug, venue_id, organization_id, created_by, clicks_count,
       created_at, is_active, show_on_bio, bio_position, bio_icon
from public.short_links where slug = 'expo2026';

select user_id, action, entity_type, entity_id, changes, context, timestamp
from public.audit_logs
where action = 'admin_adopt_orphan_short_link'
order by timestamp desc limit 1;
```
Esperado: `venue_id = 5b1cc088-…`, `organization_id = 44d1d3a9-…`,
`created_by` NULL, `clicks_count` 4, `created_at` inalterado,
`show_on_bio` false, `bio_position` 0, `bio_icon` NULL.

## Matriz de testes (executar em staging/SQL com sessões reais)
| # | Cenário | Esperado |
|---|---------|----------|
| 1 | admin adota link órfão | JSON `adopted = true` + 1 linha em `audit_logs` |
| 2 | superadmin adota link órfão | idem |
| 3 | manager da org executa | 42501 "Apenas administradores…" |
| 4 | owner da org executa | 42501 |
| 5 | usuário comum autenticado | 42501 |
| 6 | sem sessão (SQL Editor / anon) | 42501 "exige usuário autenticado" |
| 7 | link já vinculado | 55000 "já está vinculado" |
| 8 | link com `created_by` preenchido | 55000 "possui criador registrado" |
| 9 | slug inexistente | P0002 "não existe no encurtador" |
| 10 | venue inexistente | P0002 "Estabelecimento … não existe" |
| 11 | venue sem organização | 23503 |
| 12 | corrida (link adotado entre leitura e UPDATE) | 40001 + nenhuma alteração |
| 13 | pós-adoção: cliques/created_at | inalterados |
| 14 | pós-adoção: `show_on_bio` | continua `false` |

O trigger `short_links_tenancy` permanece ativo e revalida a operação com a
identidade do admin (cenários 3–6 falham antes mesmo de chegar ao UPDATE).
