CREATE OR REPLACE FUNCTION public.upsert_partner_radar_memory(_partner_id uuid, _handle text, _type text, _decision text, _genre text DEFAULT NULL::text, _weekday text DEFAULT NULL::text, _time text DEFAULT NULL::text)
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

  promo := COALESCE((new_counts ->> 'food_promo')::int, 0);
  menu  := COALESCE((new_counts ->> 'menu')::int, 0);
  ev    := COALESCE((new_counts ->> 'event_flyer')::int, 0)
         + COALESCE((new_counts ->> 'music_event')::int, 0)
         + COALESCE((new_counts ->> 'party_event')::int, 0)
         + COALESCE((new_counts ->> 'bar_event')::int, 0);

  FOR k, v IN
    SELECT key, (value)::int FROM jsonb_each_text(new_counts)
  LOOP
    IF v > dom_count THEN
      dom_count := v;
      dom := k;
    END IF;
  END LOOP;

  UPDATE public.partner_radar_memory
  SET
    instagram_handle = COALESCE(instagram_handle, _handle),
    partner_id = COALESCE(partner_id, _partner_id),
    type_counts = new_counts,
    dominant_type = COALESCE(dom, dominant_type),
    common_genres = CASE
      WHEN _genre IS NOT NULL AND NOT (common_genres @> ARRAY[_genre])
        THEN (common_genres || _genre)
      ELSE common_genres END,
    recurring_days = CASE
      WHEN _weekday IS NOT NULL AND NOT (recurring_days @> ARRAY[_weekday])
        THEN (recurring_days || _weekday)
      ELSE recurring_days END,
    common_times = CASE
      WHEN _time IS NOT NULL AND NOT (common_times @> ARRAY[_time])
        THEN (common_times || _time)
      ELSE common_times END,
    total_analyzed = total,
    total_created = created_n,
    total_ignored = ign,
    promo_rate = CASE WHEN total > 0 THEN ROUND((promo::numeric / total) * 100, 1) ELSE 0 END,
    menu_rate  = CASE WHEN total > 0 THEN ROUND((menu::numeric  / total) * 100, 1) ELSE 0 END,
    ignore_rate = CASE WHEN total > 0 THEN ROUND((ign::numeric  / total) * 100, 1) ELSE 0 END,
    event_accuracy_score = CASE WHEN total > 0 THEN ROUND((ev::numeric / total) * 100, 1) ELSE 0 END,
    confidence = LEAST(100, ROUND( LEAST(total, 30)::numeric / 30 * 100, 1)),
    last_confirmed_at = CASE WHEN _decision IN ('create','admin_created') THEN now() ELSE last_confirmed_at END,
    updated_at = now()
  WHERE id = row_id;
END;
$function$;