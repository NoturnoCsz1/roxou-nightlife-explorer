
create table if not exists public.event_validation_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null,
  scan_id uuid null,
  flyer_hash text null,
  detected_ocr text null,
  detected_date timestamptz null,
  ai_date timestamptz null,
  form_date timestamptz null,
  similarity_score numeric null,
  entertainment_score numeric null,
  validation_status text not null,
  block_reasons text[] not null default '{}',
  warnings text[] not null default '{}',
  source text not null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

alter table public.event_validation_logs enable row level security;

drop policy if exists "Admins manage event_validation_logs" on public.event_validation_logs;
create policy "Admins manage event_validation_logs"
  on public.event_validation_logs for all
  to authenticated
  using (public.has_role(auth.uid(),'admin'::app_role))
  with check (public.has_role(auth.uid(),'admin'::app_role));

create index if not exists event_validation_logs_created_idx
  on public.event_validation_logs (created_at desc);
create index if not exists event_validation_logs_event_idx
  on public.event_validation_logs (event_id);
create index if not exists event_validation_logs_scan_idx
  on public.event_validation_logs (scan_id);
