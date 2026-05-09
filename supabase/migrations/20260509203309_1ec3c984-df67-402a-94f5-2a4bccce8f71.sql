
-- Add Aura ranking columns to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS aura_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hype_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aura_badge text,
  ADD COLUMN IF NOT EXISTS aura_score_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS aura_score_reason jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_events_aura_score ON public.events (aura_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_aura_badge ON public.events (aura_badge) WHERE aura_badge IS NOT NULL;

-- aura_home_logs
CREATE TABLE IF NOT EXISTS public.aura_home_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  aura_score numeric,
  trending_score numeric,
  hype_score numeric,
  badge text,
  signals jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aura_home_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read aura_home_logs" ON public.aura_home_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_aura_home_logs_created ON public.aura_home_logs (created_at DESC);

-- auto_reels_queue
CREATE TABLE IF NOT EXISTS public.auto_reels_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  partner_id uuid,
  status text NOT NULL DEFAULT 'pending',
  style text,
  script_json jsonb DEFAULT '{}'::jsonb,
  generated_caption text,
  generated_hashtags text[] DEFAULT '{}',
  suggested_audio text,
  video_prompt text,
  external_prompts jsonb DEFAULT '{}'::jsonb,
  preview_image_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz
);
ALTER TABLE public.auto_reels_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage auto_reels_queue" ON public.auto_reels_queue
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_auto_reels_queue_status ON public.auto_reels_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_reels_queue_event ON public.auto_reels_queue (event_id);

CREATE TRIGGER update_auto_reels_queue_updated_at
BEFORE UPDATE ON public.auto_reels_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
