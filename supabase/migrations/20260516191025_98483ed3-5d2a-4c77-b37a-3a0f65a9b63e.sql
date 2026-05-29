alter table public.events
  add column if not exists flyer_fingerprint text,
  add column if not exists duplicate_group_id uuid,
  add column if not exists duplicate_checked_at timestamptz;

alter table public.instagram_scans
  add column if not exists flyer_fingerprint text,
  add column if not exists duplicate_score numeric,
  add column if not exists duplicate_reason text;

create index if not exists idx_events_flyer_fingerprint
  on public.events(flyer_fingerprint) where flyer_fingerprint is not null;
create index if not exists idx_scans_flyer_fingerprint
  on public.instagram_scans(flyer_fingerprint) where flyer_fingerprint is not null;