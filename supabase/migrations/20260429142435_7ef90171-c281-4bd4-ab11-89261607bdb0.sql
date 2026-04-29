CREATE TABLE IF NOT EXISTS public.ai_partner_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  created_by uuid NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  payment_status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_partner_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI partner boosts"
ON public.ai_partner_boosts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.ai_partner_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  user_id uuid,
  source text NOT NULL DEFAULT 'prudente_ai',
  prompt text,
  event_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_partner_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI partner recommendations"
ON public.ai_partner_recommendations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can register AI recommendations"
ON public.ai_partner_recommendations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ai_partner_boosts_active_window
ON public.ai_partner_boosts (partner_id, status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_ai_partner_recommendations_partner_created
ON public.ai_partner_recommendations (partner_id, created_at DESC);

CREATE TRIGGER update_ai_partner_boosts_updated_at
BEFORE UPDATE ON public.ai_partner_boosts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();