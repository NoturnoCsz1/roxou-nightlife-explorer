ALTER TABLE public.instagram_scans
  ADD COLUMN IF NOT EXISTS created_event_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_event_deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deletion_reason text,
  ADD COLUMN IF NOT EXISTS archived_by uuid;