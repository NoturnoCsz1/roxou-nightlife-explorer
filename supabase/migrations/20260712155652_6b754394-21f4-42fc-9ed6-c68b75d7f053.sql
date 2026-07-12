-- Onda 20: coluna JSONB para features do estabelecimento.
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.partners.features IS
  'Feature Engine (Onda 18-20). Array JSONB de VenueFeatureAssignment {featureId, featureSlug, source, verifiedBy, approved, createdAt, updatedAt}.';

-- RPC dedicada para escrita segura das features.
CREATE OR REPLACE FUNCTION public.set_partner_features(
  _partner_id uuid,
  _slugs text[],
  _source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean := false;
  _verified_by text;
  _now text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  _features jsonb := '[]'::jsonb;
  _slug text;
  _existing jsonb;
  _prev jsonb;
  _created_at text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id is required';
  END IF;

  _is_admin := public.is_admin();

  IF NOT (
    _is_admin
    OR public.is_partner_owner_or_admin(_uid, _partner_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: requires partner owner/admin or Roxou admin'
      USING ERRCODE = '42501';
  END IF;

  IF _source IS NULL OR _source NOT IN ('manual_partner','manual_admin') THEN
    _source := CASE WHEN _is_admin THEN 'manual_admin' ELSE 'manual_partner' END;
  END IF;
  _verified_by := CASE WHEN _source = 'manual_admin' THEN 'admin' ELSE 'partner' END;

  -- Snapshot atual para preservar createdAt das features já existentes.
  SELECT COALESCE(p.features, '[]'::jsonb) INTO _existing
  FROM public.partners p WHERE p.id = _partner_id;

  IF _slugs IS NOT NULL THEN
    FOREACH _slug IN ARRAY _slugs LOOP
      IF _slug IS NULL OR btrim(_slug) = '' THEN CONTINUE; END IF;
      _prev := (
        SELECT elem FROM jsonb_array_elements(_existing) elem
        WHERE elem->>'featureSlug' = _slug LIMIT 1
      );
      _created_at := COALESCE(_prev->>'createdAt', _now);
      _features := _features || jsonb_build_object(
        'featureId', _slug,
        'featureSlug', _slug,
        'source', _source,
        'verifiedBy', _verified_by,
        'approved', true,
        'createdAt', _created_at,
        'updatedAt', _now
      );
    END LOOP;
  END IF;

  UPDATE public.partners
     SET features = _features,
         updated_at = now()
   WHERE id = _partner_id;

  RETURN _features;
END;
$$;

REVOKE ALL ON FUNCTION public.set_partner_features(uuid, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_partner_features(uuid, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_partner_features(uuid, text[], text) TO service_role;

COMMENT ON FUNCTION public.set_partner_features(uuid, text[], text) IS
  'Onda 20: grava public.partners.features (Feature Engine). Autoriza admin ou owner/admin do partner. Preserva createdAt de assignments existentes.';