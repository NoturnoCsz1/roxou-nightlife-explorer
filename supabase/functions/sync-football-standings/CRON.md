# Cron — sync-football-standings

Sincroniza tabelas de classificação (Brasileirão, Libertadores, Champions etc.) a cada 6 horas.

## Setup

Habilite as extensões `pg_cron` e `pg_net` no projeto (uma vez) e crie o agendamento abaixo via SQL Editor (não comitar a anon key):

```sql
select cron.schedule(
  'sync-football-standings-6h',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-football-standings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Para rodar manualmente, use o botão **"Sincronizar tabelas"** em `/admin/jogos`.

Para remover: `select cron.unschedule('sync-football-standings-6h');`
