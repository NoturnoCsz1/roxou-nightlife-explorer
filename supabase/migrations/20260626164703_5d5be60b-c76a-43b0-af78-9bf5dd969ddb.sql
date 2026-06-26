-- Grants para que PostgREST consiga acessar as tabelas Bio/Menu (RLS já filtra)
GRANT SELECT ON public.bio_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_profiles TO authenticated;
GRANT ALL ON public.bio_profiles TO service_role;

GRANT SELECT ON public.bio_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_links TO authenticated;
GRANT ALL ON public.bio_links TO service_role;

GRANT SELECT ON public.menu_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;
GRANT ALL ON public.menu_categories TO service_role;

GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;

GRANT SELECT ON public.bio_qr_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_qr_codes TO authenticated;
GRANT ALL ON public.bio_qr_codes TO service_role;

-- Analytics: anon precisa inserir eventos de visita
GRANT INSERT ON public.bio_analytics_events TO anon;
GRANT SELECT, INSERT ON public.bio_analytics_events TO authenticated;
GRANT ALL ON public.bio_analytics_events TO service_role;

-- Bio de teste pública
INSERT INTO public.bio_profiles (slug, display_name, headline, bio, type, is_active, is_public, theme, accent_color, show_menu, show_events, show_reservations, show_vip, show_transport)
VALUES ('teste', 'Bio Teste Roxou', 'Demonstração da Smart Bio Roxou', 'Esta é uma bio de teste pública para validar o produto Roxou Bio.', 'roxou_official', true, true, 'default', 'linear-gradient(90deg,#a855f7,#ec4899)', false, true, false, false, true)
ON CONFLICT (slug) DO UPDATE SET is_active = EXCLUDED.is_active, is_public = EXCLUDED.is_public, display_name = EXCLUDED.display_name, headline = EXCLUDED.headline;