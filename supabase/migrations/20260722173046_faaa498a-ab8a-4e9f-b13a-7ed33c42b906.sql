
-- Helper: retorna a cidade permitida de um city_editor (ou NULL para outros).
CREATE OR REPLACE FUNCTION public.get_editor_city(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT allowed_city
  FROM public.admin_profiles
  WHERE user_id = _user_id
    AND role = 'city_editor'
  LIMIT 1
$$;

-- Helper central: pode administrar registro cuja cidade é _city?
-- - Se o usuário é city_editor (tem allowed_city), exige match exato.
-- - Caso contrário, exige admin global (has_role 'admin').
CREATE OR REPLACE FUNCTION public.can_admin_city(_city text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_editor_city(auth.uid()) IS NOT NULL
      THEN public.get_editor_city(auth.uid()) IS NOT DISTINCT FROM _city
    ELSE public.has_role(auth.uid(), 'admin'::app_role)
  END
$$;

-- ============================================================
-- EVENTS: substitui policies admin por versão com escopo de cidade
-- ============================================================
DROP POLICY IF EXISTS "Admins read all events"  ON public.events;
DROP POLICY IF EXISTS "Admins insert events"    ON public.events;
DROP POLICY IF EXISTS "Admins update events"    ON public.events;
DROP POLICY IF EXISTS "Admins delete events"    ON public.events;

CREATE POLICY "Admins read events in scope" ON public.events
  FOR SELECT TO authenticated
  USING (public.can_admin_city(city));

CREATE POLICY "Admins insert events in scope" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_admin_city(city));

CREATE POLICY "Admins update events in scope" ON public.events
  FOR UPDATE TO authenticated
  USING (public.can_admin_city(city))
  WITH CHECK (public.can_admin_city(city));

CREATE POLICY "Admins delete events in scope" ON public.events
  FOR DELETE TO authenticated
  USING (public.can_admin_city(city));

-- ============================================================
-- PARTNERS: idem
-- ============================================================
DROP POLICY IF EXISTS "Admins read all partners" ON public.partners;
DROP POLICY IF EXISTS "Admins insert partners"   ON public.partners;
DROP POLICY IF EXISTS "Admins update partners"   ON public.partners;
DROP POLICY IF EXISTS "Admins delete partners"   ON public.partners;

CREATE POLICY "Admins read partners in scope" ON public.partners
  FOR SELECT TO authenticated
  USING (public.can_admin_city(city));

CREATE POLICY "Admins insert partners in scope" ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (public.can_admin_city(city));

CREATE POLICY "Admins update partners in scope" ON public.partners
  FOR UPDATE TO authenticated
  USING (public.can_admin_city(city))
  WITH CHECK (public.can_admin_city(city));

CREATE POLICY "Admins delete partners in scope" ON public.partners
  FOR DELETE TO authenticated
  USING (public.can_admin_city(city));
