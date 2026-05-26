
-- analytics_events
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Public can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (event_type IS NOT NULL AND length(event_type) BETWEEN 1 AND 120);

-- page_views
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Public can insert page views"
ON public.page_views FOR INSERT
WITH CHECK (page_path IS NOT NULL AND length(page_path) BETWEEN 1 AND 2048);

-- visitor_sessions
DROP POLICY IF EXISTS "Anyone can upsert visitor sessions" ON public.visitor_sessions;
CREATE POLICY "Public can upsert visitor sessions"
ON public.visitor_sessions FOR INSERT
WITH CHECK (session_id IS NOT NULL AND length(session_id) BETWEEN 4 AND 128);

-- ticket_clicks
DROP POLICY IF EXISTS "Anyone can insert ticket clicks" ON public.ticket_clicks;
CREATE POLICY "Public can insert ticket clicks"
ON public.ticket_clicks FOR INSERT
WITH CHECK (event_id IS NOT NULL);

-- sports_match_events
DROP POLICY IF EXISTS "Anyone can insert match events" ON public.sports_match_events;
CREATE POLICY "Public can insert match events"
ON public.sports_match_events FOR INSERT
WITH CHECK (action IS NOT NULL AND length(action) BETWEEN 1 AND 64);

-- launch_signups
DROP POLICY IF EXISTS "Anyone can signup for launch" ON public.launch_signups;
CREATE POLICY "Public can signup for launch"
ON public.launch_signups FOR INSERT
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 320
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

-- expo2026_contacts
DROP POLICY IF EXISTS "Allow public contact inserts" ON public.expo2026_contacts;
CREATE POLICY "Public contact form insert (expo2026)"
ON public.expo2026_contacts FOR INSERT
WITH CHECK (name IS NOT NULL AND length(name) BETWEEN 2 AND 200);

-- roxou_contacts
DROP POLICY IF EXISTS "Allow public roxou contact inserts" ON public.roxou_contacts;
CREATE POLICY "Public contact form insert (roxou)"
ON public.roxou_contacts FOR INSERT
WITH CHECK (name IS NOT NULL AND length(name) BETWEEN 2 AND 200);

-- community_presence: restrict read to authenticated
DROP POLICY IF EXISTS "Anyone can read presence" ON public.community_presence;
CREATE POLICY "Authenticated can read presence"
ON public.community_presence FOR SELECT
TO authenticated
USING (true);

-- SECURITY DEFINER hardening
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flag_message_on_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_security_report_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_ride_request_immutable_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_community_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_community_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ride_request_capacity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ride_request_event_binding() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ride_request_time_window() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_affiliate_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_eventou_imports_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.archive_old_radar_scans() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_event_live_presence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_ride_requests() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.compute_user_risk_score(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_partner_radar_memory(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_radar_repost(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.count_event_presence(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_event_live_presence(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_match_view(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.community_user_can_speak(uuid) FROM PUBLIC, anon;

-- Realtime authorization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='realtime' AND table_name='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated participants only" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Authenticated participants only"
      ON realtime.messages FOR SELECT
      TO authenticated
      USING (
        (
          topic LIKE 'chat-%'
          AND EXISTS (
            SELECT 1 FROM public.ride_requests rr
            WHERE rr.id::text = replace(topic, 'chat-', '')
              AND (rr.passenger_id = auth.uid()
                   OR EXISTS (SELECT 1 FROM public.ride_offers ro
                              WHERE ro.ride_request_id = rr.id
                                AND ro.driver_id = auth.uid()))
          )
        )
        OR topic LIKE 'football_chat_%'
        OR (topic = 'aura_alerts_admin' AND public.has_role(auth.uid(), 'admin'::app_role))
      )
    $p$;
  END IF;
END $$;
