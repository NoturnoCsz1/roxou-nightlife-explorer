
-- Lock down ride_requests writes to authenticated users only
DROP POLICY IF EXISTS "Passengers can create requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Owners can update own requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Anyone can view open requests" ON public.ride_requests;

CREATE POLICY "Authenticated passengers can create requests"
  ON public.ride_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Owners can update own requests"
  ON public.ride_requests
  FOR UPDATE
  TO authenticated
  USING ((passenger_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((passenger_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view ride requests"
  ON public.ride_requests
  FOR SELECT
  TO authenticated
  USING (
    (status = 'open'::text)
    OR (passenger_id = auth.uid())
    OR public.has_role(auth.uid(), 'driver'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
