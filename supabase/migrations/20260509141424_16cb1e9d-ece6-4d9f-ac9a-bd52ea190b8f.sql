-- Add plate photo and vehicle type for stronger driver registration
ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS plate_photo_url text,
  ADD COLUMN IF NOT EXISTS vehicle_type text;

-- Mark legacy incomplete drivers (still pending and missing required photos) as rejected with note
UPDATE public.driver_applications
SET driver_status = 'rejected',
    admin_notes = COALESCE(NULLIF(admin_notes, ''), '') ||
                  CASE WHEN admin_notes IS NULL OR admin_notes = '' THEN '' ELSE E'\n' END ||
                  'Cadastro incompleto: imagens obrigatórias ausentes.',
    updated_at = now()
WHERE driver_status = 'pending'
  AND (face_photo_url IS NULL OR vehicle_photo_url IS NULL);