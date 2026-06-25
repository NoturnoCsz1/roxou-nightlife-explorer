GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_pro_requests TO authenticated;
GRANT INSERT ON public.partner_pro_requests TO anon;
GRANT ALL ON public.partner_pro_requests TO service_role;