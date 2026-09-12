-- =============================================================================
-- 0007 — Adoção administrativa de short links órfãos (banco OFICIAL)
-- =============================================================================
-- Contexto:
--   O encurtador oficial (public.short_links) é a única fonte de links da Bio.
--   Registros antigos existem sem tenancy (venue_id/organization_id/created_by
--   nulos). O trigger short_links_tenancy (migration 0005) impede — corretamente
--   — que qualquer usuário não-admin se aproprie desses registros, e também
--   bloqueia UPDATE manual no SQL Editor (auth.uid() nulo => 42501).
--
-- Esta migration NÃO:
--   * cria tabela nova (auditoria reusa public.audit_logs já existente);
--   * cria segundo encurtador;
--   * altera/desabilita o trigger short_links_tenancy;
--   * altera RLS ou grants de public.short_links;
--   * permite adoção por parceiro comum (manager/owner/staff incluídos).
--
-- Auditoria oficial reutilizada: public.audit_logs
--   colunas confirmadas: id, user_id, action, entity_type, entity_id,
--                        timestamp, changes, context
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_adopt_orphan_short_link(
  _slug text,
  _venue_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid   uuid := auth.uid();
  _link  public.short_links%ROWTYPE;
  _org   uuid;
  _rows  integer;
BEGIN
  -- 1) Identidade obrigatória -------------------------------------------------
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Operação administrativa exige usuário autenticado.'
      USING ERRCODE = '42501';
  END IF;

  -- 2) Autorização: somente admin/superadmin Roxou ----------------------------
  IF NOT public.is_admin_or_superadmin() THEN
    RAISE EXCEPTION 'Apenas administradores podem adotar links órfãos.'
      USING ERRCODE = '42501';
  END IF;

  IF _slug IS NULL OR btrim(_slug) = '' OR _venue_id IS NULL THEN
    RAISE EXCEPTION 'Informe o código do link e o estabelecimento de destino.'
      USING ERRCODE = '22023';
  END IF;

  -- 3) Link precisa existir ---------------------------------------------------
  SELECT * INTO _link
  FROM public.short_links
  WHERE slug = btrim(_slug);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link % não existe no encurtador oficial.', _slug
      USING ERRCODE = 'P0002';
  END IF;

  -- 4) Link precisa estar REALMENTE órfão -------------------------------------
  IF _link.venue_id IS NOT NULL OR _link.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Link % já está vinculado a um estabelecimento.', _slug
      USING ERRCODE = '55000';
  END IF;

  IF _link.created_by IS NOT NULL THEN
    RAISE EXCEPTION 'Link % possui criador registrado; adoção administrativa não se aplica.', _slug
      USING ERRCODE = '55000';
  END IF;

  -- 5) Venue precisa existir e ter organização (derivada, nunca parametrizada)-
  SELECT v.organization_id INTO _org
  FROM public.venues v
  WHERE v.id = _venue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento % não existe.', _venue_id
      USING ERRCODE = 'P0002';
  END IF;

  IF _org IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento % não possui organização válida.', _venue_id
      USING ERRCODE = '23503';
  END IF;

  -- 6) UPDATE defensivo: revalida a orfandade no próprio comando --------------
  --    organization_id também é recalculado pelo trigger short_links_tenancy,
  --    que permanece ativo e valida a operação com a identidade do admin.
  UPDATE public.short_links s
  SET venue_id        = _venue_id,
      organization_id = _org,
      updated_at      = now()
  WHERE s.id = _link.id
    AND s.venue_id IS NULL
    AND s.organization_id IS NULL
    AND s.created_by IS NULL;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows <> 1 THEN
    RAISE EXCEPTION 'Link % deixou de estar órfão durante a operação; nada foi alterado.', _slug
      USING ERRCODE = '40001';
  END IF;

  -- 7) Auditoria na estrutura oficial existente -------------------------------
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, changes, context)
  VALUES (
    _uid,
    'admin_adopt_orphan_short_link',
    'short_links',
    _link.id,
    jsonb_build_object(
      'venue_id',        jsonb_build_object('from', NULL, 'to', _venue_id),
      'organization_id', jsonb_build_object('from', NULL, 'to', _org)
    ),
    jsonb_build_object(
      'slug',            _link.slug,
      'title',           _link.title,
      'venue_id',        _venue_id,
      'organization_id', _org,
      'admin_user_id',   _uid,
      'executed_at',     now()
    )
  );

  RETURN jsonb_build_object(
    'short_link_id',   _link.id,
    'slug',            _link.slug,
    'venue_id',        _venue_id,
    'organization_id', _org,
    'adopted',         true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adopt_orphan_short_link(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_adopt_orphan_short_link(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_adopt_orphan_short_link(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_adopt_orphan_short_link(text, uuid) IS
  'Vincula um short link órfão (sem venue/organization/created_by) a um venue. '
  'Somente admin/superadmin. Não altera slug, título, destino, cliques, '
  'created_at, created_by, is_active, show_on_bio, bio_position nem bio_icon.';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--   DROP FUNCTION IF EXISTS public.admin_adopt_orphan_short_link(text, uuid);
--   -- desfazer um vínculo específico (somente se o parceiro ainda não usou):
--   -- UPDATE public.short_links
--   --    SET venue_id = NULL, organization_id = NULL, updated_at = now()
--   --  WHERE slug = 'expo2026' AND show_on_bio = false;
-- =============================================================================
