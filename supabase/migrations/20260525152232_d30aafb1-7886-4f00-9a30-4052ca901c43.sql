
-- ============================================
-- Security Hardening Migration — Roxou
-- ============================================

-- ---------- Helper ----------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin'::app_role) $$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ============================================
-- PRIORIDADE 1 — STORAGE / UPLOADS
-- ============================================
-- Bucket "uploads": qualquer authenticated podia delete/update qualquer arquivo.
-- Bucket "event-flyers": ALL com true/true.
DROP POLICY IF EXISTS "Auth can delete uploads" ON storage.objects;
DROP POLICY IF EXISTS "Auth can update uploads" ON storage.objects;
DROP POLICY IF EXISTS "Auth can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage event-flyers" ON storage.objects;
DROP POLICY IF EXISTS "Public read event-flyers" ON storage.objects;

-- Leitura pública (URLs de imagens precisam funcionar).
CREATE POLICY "uploads: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id IN ('uploads','event-flyers'));

-- Upload: somente authenticated; admin pode tudo, demais só em pastas conhecidas.
CREATE POLICY "uploads: authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('uploads','event-flyers')
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] IN (
        'events','partners','event-flyers','v3-profiles','content','reels','stories'
      )
    )
  );

-- Update: somente admin (evita sobrescrita por terceiros).
CREATE POLICY "uploads: admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('uploads','event-flyers') AND public.is_admin())
  WITH CHECK (bucket_id IN ('uploads','event-flyers') AND public.is_admin());

-- Delete: somente admin.
CREATE POLICY "uploads: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('uploads','event-flyers') AND public.is_admin());

-- ============================================
-- PRIORIDADE 2 — PARTNERS
-- ============================================
-- Removia ALL com true/true para authenticated. Restringe a admin.
DROP POLICY IF EXISTS "Authenticated users can manage partners" ON public.partners;

CREATE POLICY "Admins insert partners"
  ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update partners"
  ON public.partners FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete partners"
  ON public.partners FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins read all partners"
  ON public.partners FOR SELECT TO authenticated
  USING (public.is_admin());
-- "Anyone can view active partners" (active=true) permanece para o site público.

-- ============================================
-- PRIORIDADE 3 — PROFILES (telefones privados)
-- ============================================
-- Antes: "Anyone can view profiles" USING (true) expunha phone/whatsapp.
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
-- Não há mais SELECT público em profiles. App só lê o próprio.

-- ============================================
-- PRIORIDADE 4 — ATTENDANCE
-- ============================================
-- event_presence: dropar SELECT público e expor contagem via RPC.
DROP POLICY IF EXISTS "Anyone can view event presence" ON public.event_presence;

CREATE POLICY "Users view own presence"
  ON public.event_presence FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.count_event_presence(_event_id uuid)
RETURNS TABLE(status text, total int)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, COUNT(*)::int
  FROM public.event_presence
  WHERE event_id = _event_id
  GROUP BY status;
$$;
REVOKE EXECUTE ON FUNCTION public.count_event_presence(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_event_presence(uuid) TO anon, authenticated;

-- event_live_presence: remover update/delete anônimo com user_id NULL spoofável.
DROP POLICY IF EXISTS "Anyone can view live presence" ON public.event_live_presence;
DROP POLICY IF EXISTS "Anyone can update own live presence" ON public.event_live_presence;
DROP POLICY IF EXISTS "Users delete own live presence" ON public.event_live_presence;
DROP POLICY IF EXISTS "Anyone can insert live presence" ON public.event_live_presence;

-- Insert anônimo é OK (sessão), mas user_id deve casar (ou ser null).
CREATE POLICY "live presence: insert"
  ON public.event_live_presence FOR INSERT TO public
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Update/Delete: apenas dono autenticado da linha (ou admin). Anônimo não toca.
CREATE POLICY "live presence: owner update"
  ON public.event_live_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "live presence: owner delete"
  ON public.event_live_presence FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Leitura: somente admin (contagem para o público é via RPC count_event_live_presence existente).
CREATE POLICY "live presence: admin read"
  ON public.event_live_presence FOR SELECT TO authenticated
  USING (public.is_admin());

-- ============================================
-- PRIORIDADE 6 — SECURITY DEFINER hygiene
-- ============================================
-- Garante search_path nas funções que ainda não tinham.
ALTER FUNCTION public.validate_ride_request_event_binding() SET search_path = public;

-- Revoga EXECUTE de funções internas (triggers / cron) que não precisam ser chamadas do cliente.
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN
    SELECT format('%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
      AND p.proname IN (
        'handle_new_user','flag_message_on_report','lock_ride_request_immutable_fields',
        'on_security_report_insert','ensure_profile_affiliate_code',
        'validate_ride_request_event_binding','validate_ride_request_capacity',
        'validate_ride_request_time_window','validate_community_message',
        'validate_community_report','expire_stale_ride_requests',
        'cleanup_event_live_presence','record_radar_repost','update_updated_at_column',
        'update_eventou_imports_updated_at'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- ============================================
-- PRIORIDADE 7 — Bucket listing
-- ============================================
-- Mantém leitura pública (URLs de imagens), porém deixa registrado em security_memory
-- que a listagem por URL pública é intencional para flyers. Nenhuma ação destrutiva.
