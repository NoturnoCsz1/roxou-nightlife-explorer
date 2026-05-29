CREATE TABLE public.saved_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_id)
);

ALTER TABLE public.saved_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own followed partners"
ON public.saved_partners FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can follow partners"
ON public.saved_partners FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow partners"
ON public.saved_partners FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_saved_partners_user ON public.saved_partners(user_id);
CREATE INDEX idx_saved_partners_partner ON public.saved_partners(partner_id);