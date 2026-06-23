CREATE TABLE public.partner_staff_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('validador','recepcao','caixa','gerente')),
  pin TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_staff_accounts_partner ON public.partner_staff_accounts(partner_id);
CREATE INDEX idx_partner_staff_accounts_active ON public.partner_staff_accounts(partner_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_staff_accounts TO authenticated;
GRANT ALL ON public.partner_staff_accounts TO service_role;

ALTER TABLE public.partner_staff_accounts ENABLE ROW LEVEL SECURITY;

-- Owners of a partner can manage their own staff accounts.
CREATE POLICY "Partner owners manage their staff"
ON public.partner_staff_accounts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partner_users pu
    WHERE pu.partner_id = partner_staff_accounts.partner_id
      AND pu.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partner_users pu
    WHERE pu.partner_id = partner_staff_accounts.partner_id
      AND pu.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER trg_partner_staff_accounts_updated_at
BEFORE UPDATE ON public.partner_staff_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();