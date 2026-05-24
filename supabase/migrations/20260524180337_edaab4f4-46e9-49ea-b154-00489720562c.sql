-- Novas colunas
ALTER TABLE public.partner_radar_memory
  ADD COLUMN IF NOT EXISTS partner_state text NOT NULL DEFAULT 'mixed_partner',
  ADD COLUMN IF NOT EXISTS recent_created_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recent_ignored_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ignored_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_partner_radar_memory_state
  ON public.partner_radar_memory (partner_state);

-- RPC atualizada com decay temporal + classificação de estado
CREATE OR REPLACE FUNCTION public.upsert_partner_radar_memory(
  _partner_id uuid,
  _handle text,
  _type text,
  _decision text,
  _genre text DEFAULT NULL::text,
  _weekday text DEFAULT NULL::text,
  _time text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  row_id UUID;
  cur RECORD;
  new_counts JSONB;
  total INT;
  promo INT;
  menu INT;
  ev INT;
  ign INT;
  created_n INT;
  dom TEXT;
  dom_count INT := 0;
  k TEXT;
  v INT;
  decay CONSTANT NUMERIC := 0.97;          -- decaimento por upsert
  pos_inc NUMERIC := 0;
  neg_inc NUMERIC := 0;
  new_recent_pos NUMERIC;
  new_recent_neg NUMERIC;
  new_accuracy NUMERIC;
  new_promo_rate NUMERIC;
  new_menu_rate NUMERIC;
  new_ignore_rate NUMERIC;
  new_confidence NUMERIC;
  new_state TEXT;
BEGIN
  IF _partner_id IS NULL AND (_handle IS NULL OR length(btrim(_handle)) = 0) THEN
    RETURN;
  END IF;

  IF _partner_id IS NOT NULL THEN
    SELECT * INTO cur FROM public.partner_radar_memory WHERE partner_id = _partner_id LIMIT 1;
  ELSE
    SELECT * INTO cur FROM public.partner_radar_memory WHERE lower(instagram_handle) = lower(_handle) LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.partner_radar_memory (partner_id, instagram_handle)
    VALUES (_partner_id, _handle)
    RETURNING * INTO cur;
  END IF;

  row_id := cur.id;
  new_counts := COALESCE(cur.type_counts, '{}'::jsonb);

  IF _type IS NOT NULL THEN
    new_counts := jsonb_set(
      new_counts,
      ARRAY[_type],
      to_jsonb(COALESCE((new_counts ->> _type)::int, 0) + 1),
      true
    );
  END IF;

  total     := cur.total_analyzed + 1;
  created_n := cur.total_created + CASE WHEN _decision IN ('create','admin_created') THEN 1 ELSE 0 END;
  ign       := cur.total_ignored + CASE WHEN _decision IN ('ignore','admin_ignored','admin_archived','admin_duplicate') THEN 1 ELSE 0 END;

  -- Decay temporal: feedback recente pesa mais. Cada chamada decai 3%.
  IF _decision IN ('create','admin_created') THEN pos_inc := 1.0; END IF;
  IF _decision IN ('ignore','admin_ignored','admin_archived','admin_duplicate') THEN neg_inc := 1.0; END IF;

  new_recent_pos := ROUND( (COALESCE(cur.recent_created_score, 0) * decay) + pos_inc, 3);
  new_recent_neg := ROUND( (COALESCE(cur.recent_ignored_score, 0) * decay) + neg_inc, 3);

  promo := COALESCE((new_counts ->> 'food_promo')::int, 0);
  menu  := COALESCE((new_counts ->> 'menu')::int, 0);
  ev    := COALESCE((new_counts ->> 'event_flyer')::int, 0)
         + COALESCE((new_counts ->> 'music_event')::int, 0)
         + COALESCE((new_counts ->> 'party_event')::int, 0)
         + COALESCE((new_counts ->> 'bar_event')::int, 0);

  FOR k, v IN SELECT key, (value)::int FROM jsonb_each_text(new_counts)
  LOOP
    IF v > dom_count THEN dom_count := v; dom := k; END IF;
  END LOOP;

  -- Métricas base
  new_accuracy   := CASE WHEN total > 0 THEN ROUND((ev::numeric / total) * 100, 1) ELSE 0 END;
  new_promo_rate := CASE WHEN total > 0 THEN ROUND((promo::numeric / total) * 100, 1) ELSE 0 END;
  new_menu_rate  := CASE WHEN total > 0 THEN ROUND((menu::numeric / total) * 100, 1) ELSE 0 END;
  new_ignore_rate:= CASE WHEN total > 0 THEN ROUND((ign::numeric / total) * 100, 1) ELSE 0 END;

  -- Confiança: base no volume + bônus pelo histórico recente positivo, com penalidade se recente negativo dominar.
  new_confidence := LEAST(100, ROUND( LEAST(total, 30)::numeric / 30 * 100, 1));
  IF (new_recent_pos + new_recent_neg) > 0 THEN
    new_confidence := LEAST(100, GREATEST(0,
      ROUND(
        new_confidence
        + LEAST(15, new_recent_pos * 1.5)
        - LEAST(20, new_recent_neg * 1.2)
      , 1)
    ));
  END IF;

  -- Estado do parceiro
  IF total < 3 THEN
    new_state := 'mixed_partner';
  ELSIF new_promo_rate >= 40 OR new_menu_rate >= 40 THEN
    new_state := 'promotional_partner';
  ELSIF new_accuracy >= 60 AND new_confidence >= 50 AND new_recent_pos >= new_recent_neg THEN
    new_state := 'trusted_partner';
  ELSIF new_accuracy < 20 AND new_ignore_rate >= 60 AND new_confidence >= 40 THEN
    new_state := 'low_quality_partner';
  ELSE
    new_state := 'mixed_partner';
  END IF;

  UPDATE public.partner_radar_memory
  SET
    instagram_handle = COALESCE(instagram_handle, _handle),
    partner_id = COALESCE(partner_id, _partner_id),
    type_counts = new_counts,
    dominant_type = COALESCE(dom, dominant_type),
    common_genres = CASE
      WHEN _genre IS NOT NULL AND NOT (common_genres @> ARRAY[_genre])
        THEN (common_genres || _genre) ELSE common_genres END,
    recurring_days = CASE
      WHEN _weekday IS NOT NULL AND NOT (recurring_days @> ARRAY[_weekday])
        THEN (recurring_days || _weekday) ELSE recurring_days END,
    common_times = CASE
      WHEN _time IS NOT NULL AND NOT (common_times @> ARRAY[_time])
        THEN (common_times || _time) ELSE common_times END,
    total_analyzed = total,
    total_created = created_n,
    total_ignored = ign,
    promo_rate = new_promo_rate,
    menu_rate  = new_menu_rate,
    ignore_rate = new_ignore_rate,
    event_accuracy_score = new_accuracy,
    confidence = new_confidence,
    recent_created_score = new_recent_pos,
    recent_ignored_score = new_recent_neg,
    partner_state = new_state,
    last_confirmed_at = CASE WHEN _decision IN ('create','admin_created') THEN now() ELSE last_confirmed_at END,
    last_ignored_at  = CASE WHEN _decision IN ('ignore','admin_ignored','admin_archived','admin_duplicate') THEN now() ELSE last_ignored_at END,
    updated_at = now()
  WHERE id = row_id;
END;
$function$;