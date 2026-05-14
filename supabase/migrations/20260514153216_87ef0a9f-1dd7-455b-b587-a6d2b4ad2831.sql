
-- 1) Promover admins faltantes
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('dbbaba4c-7cc4-4999-b17e-bb987137b0fd', 'admin'),
  ('f0cc3ee4-90f7-4ed7-8724-2e0ba442da3f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) admin_profiles: fechar INSERT/UPDATE/DELETE para admins reais; manter SELECT do próprio perfil
DROP POLICY IF EXISTS "Admins can insert admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins can delete admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can update own admin profile" ON public.admin_profiles;

CREATE POLICY "Real admins insert admin_profiles"
  ON public.admin_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Real admins update admin_profiles"
  ON public.admin_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Real admins delete admin_profiles"
  ON public.admin_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) events: separar leitura pública de mutações administrativas
DROP POLICY IF EXISTS "Authenticated users can manage events" ON public.events;

CREATE POLICY "Admins insert events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete events"
  ON public.events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read all events"
  ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Tabelas sensíveis: ALL apenas para admins reais
DROP POLICY IF EXISTS "Allow authenticated full access on instagram_imports" ON public.instagram_imports;
CREATE POLICY "Admins manage instagram_imports"
  ON public.instagram_imports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can manage instagram_accounts" ON public.instagram_accounts;
CREATE POLICY "Admins manage instagram_accounts"
  ON public.instagram_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can manage instagram_posts" ON public.instagram_posts;
CREATE POLICY "Admins manage instagram_posts"
  ON public.instagram_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can manage content_generations" ON public.content_generations;
CREATE POLICY "Admins manage content_generations"
  ON public.content_generations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can manage eventou_imports" ON public.eventou_imports;
CREATE POLICY "Admins manage eventou_imports"
  ON public.eventou_imports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
