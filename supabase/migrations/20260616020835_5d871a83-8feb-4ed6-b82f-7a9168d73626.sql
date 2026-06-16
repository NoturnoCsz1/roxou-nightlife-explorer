-- Fase 9K — Partner Closed Beta

-- ============ partner_beta_access (criada PRIMEIRO, sem depender do helper) ============
CREATE TABLE public.partner_beta_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  access_enabled boolean NOT NULL DEFAULT true,
  beta_role text NOT NULL DEFAULT 'partner',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_beta_access TO authenticated;
GRANT ALL ON public.partner_beta_access TO service_role;

ALTER TABLE public.partner_beta_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beta: user reads own access"
  ON public.partner_beta_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Beta: admin manages access"
  ON public.partner_beta_access FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX idx_partner_beta_access_user ON public.partner_beta_access(user_id) WHERE access_enabled = true;
CREATE INDEX idx_partner_beta_access_partner ON public.partner_beta_access(partner_id);

CREATE TRIGGER trg_partner_beta_access_updated
  BEFORE UPDATE ON public.partner_beta_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Helper criado ANTES das tabelas que o usam ============
CREATE OR REPLACE FUNCTION public.can_access_partner_beta(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user IS NOT NULL
    AND (
      public.has_role(_user, 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.partner_beta_access
        WHERE user_id = _user
          AND access_enabled = true
      )
    )
$$;

REVOKE ALL ON FUNCTION public.can_access_partner_beta(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_partner_beta(uuid) TO authenticated, service_role;

-- ============ partner_beta_feedback ============
CREATE TABLE public.partner_beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  page text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.partner_beta_feedback TO authenticated;
GRANT ALL ON public.partner_beta_feedback TO service_role;

ALTER TABLE public.partner_beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beta feedback: own read"
  ON public.partner_beta_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Beta feedback: insert own (beta-only)"
  ON public.partner_beta_feedback FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_partner_beta(auth.uid())
  );

CREATE POLICY "Beta feedback: admin manages"
  ON public.partner_beta_feedback FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX idx_partner_beta_feedback_user ON public.partner_beta_feedback(user_id);
CREATE INDEX idx_partner_beta_feedback_created ON public.partner_beta_feedback(created_at DESC);

-- ============ partner_beta_metrics ============
CREATE TABLE public.partner_beta_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  page text,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.partner_beta_metrics TO authenticated;
GRANT ALL ON public.partner_beta_metrics TO service_role;

ALTER TABLE public.partner_beta_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beta metrics: own read"
  ON public.partner_beta_metrics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Beta metrics: insert own (beta-only)"
  ON public.partner_beta_metrics FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_partner_beta(auth.uid())
  );

CREATE POLICY "Beta metrics: admin manages"
  ON public.partner_beta_metrics FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX idx_partner_beta_metrics_user ON public.partner_beta_metrics(user_id);
CREATE INDEX idx_partner_beta_metrics_action ON public.partner_beta_metrics(action);
CREATE INDEX idx_partner_beta_metrics_created ON public.partner_beta_metrics(created_at DESC);