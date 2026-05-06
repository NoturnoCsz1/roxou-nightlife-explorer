
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS receive_transport_proposals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS drivers_notified_at timestamp with time zone;
