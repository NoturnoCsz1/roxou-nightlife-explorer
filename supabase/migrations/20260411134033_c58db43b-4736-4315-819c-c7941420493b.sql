CREATE TABLE public.saved_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved events"
ON public.saved_events FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can save events"
ON public.saved_events FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave events"
ON public.saved_events FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_saved_events_user ON public.saved_events(user_id);
CREATE INDEX idx_saved_events_event ON public.saved_events(event_id);