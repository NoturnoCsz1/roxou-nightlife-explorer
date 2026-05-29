-- Tabela para rastrear cada post analisado pelo Radar IA
CREATE TABLE IF NOT EXISTS public.instagram_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id TEXT NOT NULL,
  permalink TEXT,
  source_handle TEXT,
  partner_id UUID,
  status TEXT NOT NULL DEFAULT 'scanned',
  reason TEXT,
  dedupe_key TEXT,
  event_id UUID,
  duplicate_of_event_id UUID,
  raw_ocr TEXT,
  raw_caption TEXT,
  extracted_json JSONB,
  keywords TEXT[] DEFAULT '{}',
  ai_confidence TEXT,
  scan_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT instagram_scans_media_unique UNIQUE (media_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_scans_status ON public.instagram_scans (status);
CREATE INDEX IF NOT EXISTS idx_instagram_scans_dedupe ON public.instagram_scans (dedupe_key);
CREATE INDEX IF NOT EXISTS idx_instagram_scans_partner ON public.instagram_scans (partner_id);

ALTER TABLE public.instagram_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage instagram_scans"
  ON public.instagram_scans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_instagram_scans_updated_at
  BEFORE UPDATE ON public.instagram_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- dedupe_key em events para bloquear duplicatas
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE INDEX IF NOT EXISTS idx_events_dedupe_key ON public.events (dedupe_key);