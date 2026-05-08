-- Add confidence + review fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence text NOT NULL DEFAULT 'medium';

-- Learning memory from admin corrections
CREATE TABLE IF NOT EXISTS public.ai_event_feedback_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text,
  original_category text,
  corrected_category text,
  original_sub_category text,
  corrected_sub_category text,
  original_description text,
  corrected_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_venue ON public.ai_event_feedback_memory (lower(venue_name));

ALTER TABLE public.ai_event_feedback_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_event_feedback_memory"
  ON public.ai_event_feedback_memory
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));