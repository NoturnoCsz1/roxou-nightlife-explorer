
ALTER TABLE public.instagram_scans
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS hidden_from_radar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reposted_at timestamptz,
  ADD COLUMN IF NOT EXISTS repost_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_instagram_scans_hidden ON public.instagram_scans (hidden_from_radar, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_scans_archived ON public.instagram_scans (archived_at DESC) WHERE archived_at IS NOT NULL;

-- Retenção inteligente
CREATE OR REPLACE FUNCTION public.archive_old_radar_scans()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
  c integer;
BEGIN
  -- Ignorados > 7 dias
  UPDATE public.instagram_scans s
  SET hidden_from_radar = true,
      archived_at = COALESCE(archived_at, now()),
      archive_reason = COALESCE(archive_reason, 'auto: ignorado > 7 dias')
  WHERE hidden_from_radar = false
    AND (
      EXISTS (SELECT 1 FROM public.events e WHERE e.id = s.event_id AND e.status = 'archived' AND e.created_at < now() - interval '7 days')
      OR (s.status = 'ignored' AND s.last_seen_at < now() - interval '7 days')
    );
  GET DIAGNOSTICS c = ROW_COUNT; affected := affected + c;

  -- Duplicados > 3 dias
  UPDATE public.instagram_scans
  SET hidden_from_radar = true,
      archived_at = COALESCE(archived_at, now()),
      archive_reason = COALESCE(archive_reason, 'auto: duplicado > 3 dias')
  WHERE hidden_from_radar = false
    AND status IN ('skipped_duplicate', 'possible_duplicate')
    AND last_seen_at < now() - interval '3 days';
  GET DIAGNOSTICS c = ROW_COUNT; affected := affected + c;

  -- Publicados > 15 dias
  UPDATE public.instagram_scans s
  SET hidden_from_radar = true,
      archived_at = COALESCE(archived_at, now()),
      archive_reason = COALESCE(archive_reason, 'auto: publicado > 15 dias')
  WHERE hidden_from_radar = false
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = s.event_id AND e.status = 'published' AND e.date_time < now() - interval '15 days');
  GET DIAGNOSTICS c = ROW_COUNT; affected := affected + c;

  RETURN affected;
END;
$$;

-- Reencontro: incrementa repost_count quando o evento associado já está publicado
CREATE OR REPLACE FUNCTION public.record_radar_repost(_scan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev_status text;
BEGIN
  SELECT e.status INTO ev_status
  FROM public.instagram_scans s
  LEFT JOIN public.events e ON e.id = s.event_id
  WHERE s.id = _scan_id;

  IF ev_status = 'published' THEN
    UPDATE public.instagram_scans
    SET repost_count = repost_count + 1,
        last_reposted_at = now(),
        first_published_at = COALESCE(first_published_at, now()),
        reason = 'Radar reencontrou flyer já publicado'
    WHERE id = _scan_id;
  END IF;
END;
$$;
