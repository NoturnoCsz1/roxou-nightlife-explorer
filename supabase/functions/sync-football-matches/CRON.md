# sync-football-matches — agendamento (cron)

A função `sync-football-matches` faz upsert dos jogos das ligas configuradas
em `theSportsDb.ts` para a tabela `public.sports_matches`. Roda barato
(uma chamada cada 6h) e não usa IA.

## Configurar cron a cada 6h

Execute o SQL abaixo **uma única vez** no banco (não criar como migration —
contém a anon key específica do projeto e não deve ser propagado para remixes):

```sql
-- Habilitar extensões (idempotente)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Agendar a cada 6h
select cron.schedule(
  'sync-football-matches-6h',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://bapdgykghciiyvlqdrqx.supabase.co/functions/v1/sync-football-matches',
    headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

Substitua `<ANON_KEY>` pela anon key do projeto (`VITE_SUPABASE_PUBLISHABLE_KEY`).

## Disparo manual

Pelo painel Admin: `/admin/jogos` → botão **"Sincronizar agora"**.

Ou via CLI:

```bash
curl -X POST https://bapdgykghciiyvlqdrqx.supabase.co/functions/v1/sync-football-matches \
  -H "Content-Type: application/json" \
  -H "apikey: <ANON_KEY>" \
  -d '{}'
```

## Custo

- 1 invocação edge / 6h = 4/dia = ~120/mês
- Cada invocação consulta TheSportsDB (free tier) e faz upsert no Postgres
- Zero IA, zero custo de tokens
