-- Fix visitor_sessions RLS: allow anon to UPDATE its own session (needed for upsert in usePageTracking)
-- Without this, recurring sessions silently fail and the table stagnates.

-- 1) Lock immutable fields so anon cannot tamper with started_at / session_id of arbitrary rows
CREATE OR REPLACE FUNCTION public.lock_visitor_session_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    RAISE EXCEPTION 'session_id is immutable';
  END IF;
  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    NEW.started_at := OLD.started_at;
  END IF;

  -- last_seen_at must move forward only
  IF NEW.last_seen_at < OLD.last_seen_at THEN
    NEW.last_seen_at := OLD.last_seen_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_visitor_session_immutable ON public.visitor_sessions;
CREATE TRIGGER trg_lock_visitor_session_immutable
BEFORE UPDATE ON public.visitor_sessions
FOR EACH ROW EXECUTE FUNCTION public.lock_visitor_session_immutable_fields();

-- 2) Allow anon UPDATE (required for PostgREST upsert with resolution=merge-duplicates)
--    SELECT is NOT granted to anon, so rows remain non-readable publicly.
DROP POLICY IF EXISTS "Anon can update visitor sessions" ON public.visitor_sessions;
CREATE POLICY "Anon can update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
TO anon, authenticated
USING (
  session_id IS NOT NULL
  AND length(session_id) BETWEEN 4 AND 128
)
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) BETWEEN 4 AND 128
);

-- 3) Ensure grants are in place (no SELECT for anon → no public read)
GRANT INSERT, UPDATE ON public.visitor_sessions TO anon;
GRANT INSERT, UPDATE ON public.visitor_sessions TO authenticated;
GRANT ALL ON public.visitor_sessions TO service_role;