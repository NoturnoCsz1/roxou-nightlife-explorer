
-- P0-A: driver_applications — restrict UPDATE to admin only
DROP POLICY IF EXISTS "Users can update own driver application" ON public.driver_applications;
CREATE POLICY "Admins can update driver applications"
  ON public.driver_applications
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- P0-B: expo2026_camarotes — remove public access to base table + create curated public view
DROP POLICY IF EXISTS "Public read camarotes" ON public.expo2026_camarotes;
REVOKE ALL ON public.expo2026_camarotes FROM anon, PUBLIC;

CREATE OR REPLACE VIEW public.public_expo2026_camarotes
  WITH (security_invoker = false) AS
  SELECT number, status, updated_at
  FROM public.expo2026_camarotes;

GRANT SELECT ON public.public_expo2026_camarotes TO anon, authenticated;
