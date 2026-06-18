create table if not exists public.expo2026_analytics (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  metadata jsonb,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists expo2026_analytics_event_idx on public.expo2026_analytics (event);
create index if not exists expo2026_analytics_created_at_idx on public.expo2026_analytics (created_at desc);
create index if not exists expo2026_analytics_session_idx on public.expo2026_analytics (session_id);

grant select on public.expo2026_analytics to authenticated;
grant insert on public.expo2026_analytics to anon, authenticated;
grant all on public.expo2026_analytics to service_role;

alter table public.expo2026_analytics enable row level security;

drop policy if exists "Anon insert expo analytics" on public.expo2026_analytics;
create policy "Anon insert expo analytics"
on public.expo2026_analytics
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins read expo analytics" on public.expo2026_analytics;
create policy "Admins read expo analytics"
on public.expo2026_analytics
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));