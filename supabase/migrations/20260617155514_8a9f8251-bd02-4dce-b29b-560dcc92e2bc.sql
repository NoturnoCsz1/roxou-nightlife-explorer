ALTER TABLE public.partner_reservations DROP CONSTRAINT IF EXISTS partner_reservations_status_check;
ALTER TABLE public.partner_reservations ADD CONSTRAINT partner_reservations_status_check CHECK (status IN ('pending','pending_payment','confirmed','completed','cancelled','expired','no_show'));
NOTIFY pgrst, 'reload schema';