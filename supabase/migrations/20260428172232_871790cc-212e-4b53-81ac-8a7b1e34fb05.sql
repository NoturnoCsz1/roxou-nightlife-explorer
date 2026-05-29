ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS affiliate_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_affiliate_code
ON public.profiles (affiliate_code)
WHERE affiliate_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_profile_affiliate_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.affiliate_code IS NULL OR NEW.affiliate_code = '' THEN
    NEW.affiliate_code := lower(substr(replace(NEW.user_id::text, '-', ''), 1, 10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_profile_affiliate_code_trigger ON public.profiles;
CREATE TRIGGER ensure_profile_affiliate_code_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_affiliate_code();

UPDATE public.profiles
SET affiliate_code = lower(substr(replace(user_id::text, '-', ''), 1, 10))
WHERE affiliate_code IS NULL;

CREATE TABLE IF NOT EXISTS public.ai_message_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

ALTER TABLE public.ai_message_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI usage" ON public.ai_message_usage;
CREATE POLICY "Users can view own AI usage"
ON public.ai_message_usage
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own AI usage" ON public.ai_message_usage;
CREATE POLICY "Users can insert own AI usage"
ON public.ai_message_usage
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update own AI usage" ON public.ai_message_usage;
CREATE POLICY "Users can update own AI usage"
ON public.ai_message_usage
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_ai_message_usage_updated_at ON public.ai_message_usage;
CREATE TRIGGER update_ai_message_usage_updated_at
BEFORE UPDATE ON public.ai_message_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI chat" ON public.ai_chat_messages;
CREATE POLICY "Users can view own AI chat"
ON public.ai_chat_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create own AI chat" ON public.ai_chat_messages;
CREATE POLICY "Users can create own AI chat"
ON public.ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created
ON public.ai_chat_messages (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vip_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  source text NOT NULL DEFAULT 'manual',
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own VIP" ON public.vip_subscriptions;
CREATE POLICY "Users can view own VIP"
ON public.vip_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage VIP" ON public.vip_subscriptions;
CREATE POLICY "Admins can manage VIP"
ON public.vip_subscriptions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_vip_subscriptions_updated_at ON public.vip_subscriptions;
CREATE TRIGGER update_vip_subscriptions_updated_at
BEFORE UPDATE ON public.vip_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reward_days integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rewarded_at timestamp with time zone
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.affiliate_referrals;
CREATE POLICY "Users can view own referrals"
ON public.affiliate_referrals
FOR SELECT
TO authenticated
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create own referrals" ON public.affiliate_referrals;
CREATE POLICY "Users can create own referrals"
ON public.affiliate_referrals
FOR INSERT
TO authenticated
WITH CHECK (referrer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update referrals" ON public.affiliate_referrals;
CREATE POLICY "Admins can update referrals"
ON public.affiliate_referrals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.promotion_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid,
  title text NOT NULL,
  description text,
  offer_text text,
  affiliate_url text,
  image_url text,
  starts_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active opportunities" ON public.promotion_opportunities;
CREATE POLICY "Anyone can view active opportunities"
ON public.promotion_opportunities
FOR SELECT
TO public
USING (status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

DROP POLICY IF EXISTS "Admins can manage opportunities" ON public.promotion_opportunities;
CREATE POLICY "Admins can manage opportunities"
ON public.promotion_opportunities
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_promotion_opportunities_updated_at ON public.promotion_opportunities;
CREATE TRIGGER update_promotion_opportunities_updated_at
BEFORE UPDATE ON public.promotion_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();