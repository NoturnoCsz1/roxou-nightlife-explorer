
-- =========================================================
-- ONDA B1 — Fecha exposição pública direta de excursion_trips.
-- Estratégia: view proxy + revoke total do anon na tabela base.
-- =========================================================

-- 1) View pública segura (owner = postgres → bypassa RLS,
--    mas com WHERE embutido e apenas colunas seguras).
CREATE OR REPLACE VIEW public.public_excursion_trips
WITH (security_invoker = false) AS
SELECT
  id,
  public_slug,
  title,
  destination,
  departure_address,
  departure_at,
  return_at,
  session_date,
  capacity,
  price_cents,
  status,
  is_public,
  partner_id
FROM public.excursion_trips
WHERE is_public = true
  AND status = 'open'
  AND departure_at >= (now() - interval '1 day');

COMMENT ON VIEW public.public_excursion_trips IS
  'Interface pública somente-leitura de excursion_trips. Expõe apenas colunas seguras de viagens abertas e futuras. Anon não tem acesso à tabela base.';

-- 2) GRANTs mínimos na view: leitura para anon e authenticated.
REVOKE ALL ON public.public_excursion_trips FROM PUBLIC;
GRANT SELECT ON public.public_excursion_trips TO anon, authenticated;

-- 3) Fecha COMPLETAMENTE o anon na tabela base.
--    A migração 20260623182232 já havia trocado o "SELECT ALL" por column-level
--    grants; aqui removemos tudo (incluindo qualquer grant column-level residual).
REVOKE ALL ON public.excursion_trips FROM anon;
-- Remove privilégios de coluna eventualmente concedidos individualmente.
DO $$
DECLARE
  col_grant RECORD;
BEGIN
  FOR col_grant IN
    SELECT column_name
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'excursion_trips'
      AND grantee = 'anon'
      AND privilege_type = 'SELECT'
  LOOP
    EXECUTE format(
      'REVOKE SELECT (%I) ON public.excursion_trips FROM anon',
      col_grant.column_name
    );
  END LOOP;
END $$;

-- 4) Substitui a policy "Public read open public trips" (que cobria
--    {anon, authenticated}) por uma equivalente restrita a authenticated —
--    staff/CRM/promoters continuam funcionando; anon já não tem GRANT nenhum.
DROP POLICY IF EXISTS "Public read open public trips" ON public.excursion_trips;

CREATE POLICY "Authenticated read open public trips"
  ON public.excursion_trips FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Nota: a policy "Partner staff manage own trips" (ALL, roles=public,
-- USING is_partner_member OR is_admin) é preservada integralmente — cobre
-- edição, promoter central, CRM e visualização completa por staff/admin.

-- 5) Garante service_role irrestrito (edge functions / cron).
GRANT ALL ON public.excursion_trips TO service_role;
