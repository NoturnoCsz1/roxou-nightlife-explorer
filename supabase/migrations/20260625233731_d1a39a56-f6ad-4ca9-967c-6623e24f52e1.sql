
CREATE TABLE public.partner_pro_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  instagram TEXT,
  cidade TEXT,
  categoria TEXT,
  mensagem TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  converted_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  user_agent TEXT,
  source TEXT NOT NULL DEFAULT 'public_form',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX partner_pro_requests_status_idx ON public.partner_pro_requests(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_pro_requests TO authenticated;
GRANT INSERT ON public.partner_pro_requests TO anon;
GRANT ALL ON public.partner_pro_requests TO service_role;

ALTER TABLE public.partner_pro_requests ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (anon ou logada) pode criar uma solicitação
CREATE POLICY "anyone can submit partner pro request"
  ON public.partner_pro_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Apenas admins visualizam
CREATE POLICY "admins can view partner pro requests"
  ON public.partner_pro_requests
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Apenas admins atualizam
CREATE POLICY "admins can update partner pro requests"
  ON public.partner_pro_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Apenas admins deletam
CREATE POLICY "admins can delete partner pro requests"
  ON public.partner_pro_requests
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE TRIGGER partner_pro_requests_set_updated_at
  BEFORE UPDATE ON public.partner_pro_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
