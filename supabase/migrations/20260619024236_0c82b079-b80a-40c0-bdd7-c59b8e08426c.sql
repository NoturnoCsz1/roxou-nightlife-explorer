
CREATE TABLE IF NOT EXISTS public.expo2026_camarotes (
  number integer PRIMARY KEY CHECK (number BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold')),
  customer_name text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expo2026_camarotes_status ON public.expo2026_camarotes(status);
CREATE INDEX IF NOT EXISTS idx_expo2026_camarotes_updated_at ON public.expo2026_camarotes(updated_at DESC);

GRANT SELECT ON public.expo2026_camarotes TO anon, authenticated;
GRANT ALL ON public.expo2026_camarotes TO service_role;

ALTER TABLE public.expo2026_camarotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read camarotes" ON public.expo2026_camarotes;
CREATE POLICY "Public read camarotes"
  ON public.expo2026_camarotes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage camarotes" ON public.expo2026_camarotes;
CREATE POLICY "Admins manage camarotes"
  ON public.expo2026_camarotes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_expo2026_camarote_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_touch_expo2026_camarotes ON public.expo2026_camarotes;
CREATE TRIGGER trg_touch_expo2026_camarotes
  BEFORE UPDATE ON public.expo2026_camarotes
  FOR EACH ROW EXECUTE FUNCTION public.touch_expo2026_camarote_updated_at();

-- Seed 1..120
INSERT INTO public.expo2026_camarotes (number, status)
SELECT g, 'available' FROM generate_series(1,120) g
ON CONFLICT (number) DO NOTHING;

-- Realtime
ALTER TABLE public.expo2026_camarotes REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'expo2026_camarotes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.expo2026_camarotes';
  END IF;
END $$;
