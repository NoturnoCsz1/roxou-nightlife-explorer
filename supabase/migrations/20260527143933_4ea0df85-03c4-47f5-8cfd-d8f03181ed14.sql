
-- 1) community_messages: restringe SELECT a autenticados
DROP POLICY IF EXISTS "Anyone can view non-deleted messages" ON public.community_messages;
CREATE POLICY "Authenticated can view non-deleted messages"
  ON public.community_messages
  FOR SELECT
  TO authenticated
  USING ((is_deleted = false) OR has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.community_messages FROM anon;

-- 2) football_chat_messages: restringe SELECT a autenticados
DROP POLICY IF EXISTS "Anyone can read approved messages" ON public.football_chat_messages;
CREATE POLICY "Authenticated read approved messages"
  ON public.football_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    ((is_deleted = false) AND (moderation_status = 'approved'::text))
    OR has_role(auth.uid(), 'admin'::app_role)
  );
REVOKE SELECT ON public.football_chat_messages FROM anon;

-- 3) ride_requests: remove leitura ampla para qualquer authenticated
DROP POLICY IF EXISTS "Authenticated users can view ride requests" ON public.ride_requests;
CREATE POLICY "Passengers, drivers and admins view ride requests"
  ON public.ride_requests
  FOR SELECT
  TO authenticated
  USING (
    passenger_id = auth.uid()
    OR has_role(auth.uid(), 'driver'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 4) public_partners: view segura sem campos sensíveis (whatsapp, instagram_raw_json,
--    instagram_recent_posts, aura_suggestions, aura_partner_summary, manual_locked_fields,
--    instagram_sync_*, aura_last_run_at).
DROP VIEW IF EXISTS public.public_partners;
CREATE VIEW public.public_partners
WITH (security_invoker = true)
AS
SELECT
  id, name, slug, type, address, neighborhood, city,
  instagram, instagram_username, instagram_profile_url, instagram_id,
  instagram_name, instagram_bio, instagram_profile_picture_url,
  instagram_website, instagram_followers_count, instagram_media_count,
  instagram_validated,
  short_description, full_description, logo_url,
  verified_partner, active, featured_home, status,
  latitude, longitude, maps_place_id, formatted_address,
  aura_partner_score, aura_partner_tags,
  supports_sports, created_at, updated_at
FROM public.partners
WHERE active = true;

GRANT SELECT ON public.public_partners TO anon, authenticated;
