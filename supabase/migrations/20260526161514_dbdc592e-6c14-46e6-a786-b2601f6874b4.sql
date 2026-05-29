
-- ============================================
-- Security hardening: RLS, storage, SECURITY DEFINER grants
-- ============================================

-- 1) Tighten analytics tables (admin-only reads, ownership for visitor_sessions update)
DROP POLICY IF EXISTS "Authenticated users can read page views" ON public.page_views;
CREATE POLICY "Admins read page_views" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can read ticket clicks" ON public.ticket_clicks;
CREATE POLICY "Admins read ticket_clicks" ON public.ticket_clicks
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can read visitor sessions" ON public.visitor_sessions;
CREATE POLICY "Admins read visitor_sessions" ON public.visitor_sessions
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can update visitor sessions" ON public.visitor_sessions;
-- Allow updating only the session row matching the same session_id from client (still permissive on session_id but no longer a full table grant for arbitrary fields). Admins keep full control.
CREATE POLICY "Admins update visitor_sessions" ON public.visitor_sessions
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2) Storage uploads: only admins can write to public-facing folders; users may only write under v3-profiles/<their_uid>/
DROP POLICY IF EXISTS "uploads: authenticated insert" ON storage.objects;
CREATE POLICY "uploads: admin or own profile insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = ANY (ARRAY['uploads','event-flyers'])
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'v3-profiles'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

-- 3) Revoke EXECUTE on internal SECURITY DEFINER functions (trigger-only or admin/edge-only)
REVOKE EXECUTE ON FUNCTION public.archive_old_radar_scans()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_event_live_presence()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_user_risk_score(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_ride_requests()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flag_message_on_report()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_ride_request_immutable_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_security_report_insert()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_radar_repost(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_partner_radar_memory(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_community_message()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_community_report()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ride_request_capacity()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ride_request_event_binding() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ride_request_time_window() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_affiliate_code()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_eventou_imports_updated_at() FROM PUBLIC, anon, authenticated;

-- Admin-callable from frontend: keep authenticated execute, RLS/policy logic inside controls access
GRANT EXECUTE ON FUNCTION public.archive_old_radar_scans()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_user_risk_score(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_partner_radar_memory(uuid, text, text, text, text, text, text) TO authenticated;

-- Public RPCs intentionally callable
GRANT EXECUTE ON FUNCTION public.increment_match_view(text)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_event_presence(uuid)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_event_live_presence(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_user_can_speak(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()                       TO anon, authenticated;
