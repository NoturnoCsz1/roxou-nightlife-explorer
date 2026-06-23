
-- ============================================================
-- FASE SEGURANÇA — pré-CRM (v2)
-- ============================================================

-- ---------- C1: partners — esconder colunas sensíveis do anon ----------
REVOKE SELECT ON public.partners FROM anon;

GRANT SELECT (
  id, name, slug, type, address, neighborhood, city,
  short_description, full_description, logo_url,
  verified_partner, active, status, featured_home,
  instagram_validated, created_at, updated_at,
  latitude, longitude, maps_place_id, formatted_address,
  instagram_username, instagram_profile_url, instagram_name,
  instagram_bio, instagram_profile_picture_url, instagram_website,
  instagram_followers_count, instagram_media_count,
  supports_sports, music_style_primary, music_styles_secondary,
  sports_competitions
) ON public.partners TO anon;

-- authenticated mantém SELECT total (policies já restringem por role)
-- Colunas escondidas do anon: whatsapp, instagram (raw handle legacy),
-- instagram_id, instagram_last_sync_at, instagram_sync_status,
-- instagram_sync_error, instagram_raw_json, instagram_recent_posts,
-- aura_partner_score, aura_partner_tags, aura_partner_summary,
-- aura_suggestions, aura_last_run_at, manual_locked_fields.

-- ---------- C2: excursion_seats — restringir PII a editor+ ----------
DROP POLICY IF EXISTS "Partner staff manage own seats" ON public.excursion_seats;

CREATE POLICY "Partner owners/admins read seats"
ON public.excursion_seats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.excursion_trips t
    WHERE t.id = excursion_seats.trip_id
      AND (
        public.is_partner_owner_or_admin(auth.uid(), t.partner_id)
        OR public.is_admin()
      )
  )
);

CREATE POLICY "Partner owners/admins manage seats"
ON public.excursion_seats
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.excursion_trips t
    WHERE t.id = excursion_seats.trip_id
      AND (
        public.is_partner_owner_or_admin(auth.uid(), t.partner_id)
        OR public.is_admin()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.excursion_trips t
    WHERE t.id = excursion_seats.trip_id
      AND (
        public.is_partner_owner_or_admin(auth.uid(), t.partner_id)
        OR public.is_admin()
      )
  )
);

-- Reservas públicas e embarque continuam via RPCs SECURITY DEFINER
-- (public_reserve_excursion_seat / board_excursion_seat) — ignoram RLS.

-- ---------- A1: partner_staff_accounts — somente owner/admin ----------
DROP POLICY IF EXISTS "Partner owners manage their staff" ON public.partner_staff_accounts;

CREATE POLICY "Partner owners/admins manage staff"
ON public.partner_staff_accounts
FOR ALL
TO authenticated
USING (
  public.is_partner_owner_or_admin(auth.uid(), partner_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.is_partner_owner_or_admin(auth.uid(), partner_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- ---------- A2: excursion_trips — coluna pública para anon ----------
REVOKE SELECT ON public.excursion_trips FROM anon;

GRANT SELECT (
  id, partner_id, vehicle_id, event_id, title, destination,
  departure_address, departure_at, return_at, session_date,
  capacity, price_cents, status, public_slug, is_public
) ON public.excursion_trips TO anon;

-- Colunas escondidas do anon: notes, created_by, driver_id,
-- operation_status, gps_started_at, gps_ended_at, created_at, updated_at.
