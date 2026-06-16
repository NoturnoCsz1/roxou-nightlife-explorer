
-- =========================================================
-- FASE 9B — Roxou Partner Pro base schema
-- =========================================================

-- ---------------------------------------------------------
-- 1) partner_users
-- ---------------------------------------------------------
CREATE TABLE public.partner_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','editor','attendant')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_id)
);

CREATE INDEX idx_partner_users_user_id ON public.partner_users(user_id);
CREATE INDEX idx_partner_users_partner_id ON public.partner_users(partner_id);
CREATE INDEX idx_partner_users_active ON public.partner_users(partner_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_users TO authenticated;
GRANT ALL ON public.partner_users TO service_role;

ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 2) partner_subscriptions
-- ---------------------------------------------------------
CREATE TABLE public.partner_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','premium','enterprise')),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','canceled','expired')),
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_subscriptions_partner_id ON public.partner_subscriptions(partner_id);
CREATE INDEX idx_partner_subscriptions_status ON public.partner_subscriptions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_subscriptions TO authenticated;
GRANT ALL ON public.partner_subscriptions TO service_role;

ALTER TABLE public.partner_subscriptions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 3) partner_metrics_daily
-- ---------------------------------------------------------
CREATE TABLE public.partner_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  date date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  favorites integer NOT NULL DEFAULT 0,
  reservations integer NOT NULL DEFAULT 0,
  vip_signups integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, date)
);

CREATE INDEX idx_partner_metrics_partner_date ON public.partner_metrics_daily(partner_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_metrics_daily TO authenticated;
GRANT ALL ON public.partner_metrics_daily TO service_role;

ALTER TABLE public.partner_metrics_daily ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 4) Helper functions (SECURITY DEFINER, no recursive RLS)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_partner_member(_user uuid, _partner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_users
    WHERE user_id = _user
      AND partner_id = _partner
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_partner_owner_or_admin(_user uuid, _partner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_users
    WHERE user_id = _user
      AND partner_id = _partner
      AND is_active = true
      AND role IN ('owner','admin')
  )
$$;

-- ---------------------------------------------------------
-- 5) updated_at triggers
-- ---------------------------------------------------------
CREATE TRIGGER update_partner_users_updated_at
  BEFORE UPDATE ON public.partner_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_subscriptions_updated_at
  BEFORE UPDATE ON public.partner_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- 6) RLS Policies — partner_users
-- ---------------------------------------------------------
CREATE POLICY "Admins manage all partner_users"
  ON public.partner_users FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Members can view own links"
  ON public.partner_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner/admin can view partner members"
  ON public.partner_users FOR SELECT
  TO authenticated
  USING (public.is_partner_owner_or_admin(auth.uid(), partner_id));

CREATE POLICY "Owner/admin can insert partner members"
  ON public.partner_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_partner_owner_or_admin(auth.uid(), partner_id));

CREATE POLICY "Owner/admin can update partner members"
  ON public.partner_users FOR UPDATE
  TO authenticated
  USING (public.is_partner_owner_or_admin(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_owner_or_admin(auth.uid(), partner_id));

CREATE POLICY "Owner/admin can delete partner members"
  ON public.partner_users FOR DELETE
  TO authenticated
  USING (public.is_partner_owner_or_admin(auth.uid(), partner_id));

-- ---------------------------------------------------------
-- 7) RLS Policies — partner_subscriptions
-- ---------------------------------------------------------
CREATE POLICY "Admins manage all subscriptions"
  ON public.partner_subscriptions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Owner/admin can view own subscription"
  ON public.partner_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_partner_owner_or_admin(auth.uid(), partner_id));

CREATE POLICY "Owner/admin can update own subscription"
  ON public.partner_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_partner_owner_or_admin(auth.uid(), partner_id))
  WITH CHECK (public.is_partner_owner_or_admin(auth.uid(), partner_id));

-- ---------------------------------------------------------
-- 8) RLS Policies — partner_metrics_daily
-- ---------------------------------------------------------
CREATE POLICY "Admins manage all metrics"
  ON public.partner_metrics_daily FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Members can view own partner metrics"
  ON public.partner_metrics_daily FOR SELECT
  TO authenticated
  USING (public.is_partner_member(auth.uid(), partner_id));
