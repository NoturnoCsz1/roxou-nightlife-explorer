GRANT SELECT ON public.bda_settings TO anon, authenticated;
GRANT UPDATE ON public.bda_settings TO authenticated;
GRANT ALL ON public.bda_settings TO service_role;
GRANT SELECT ON public.public_bda_stats TO anon, authenticated;
GRANT SELECT ON public.public_bda_participants TO anon, authenticated;
GRANT SELECT ON public.public_bda_partners TO anon, authenticated;