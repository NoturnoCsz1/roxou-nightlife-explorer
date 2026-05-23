-- Tabela de memória inteligente por parceiro do Radar IA
CREATE TABLE IF NOT EXISTS public.partner_radar_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID,
  instagram_handle TEXT,
  dominant_type TEXT,
  common_genres TEXT[] NOT NULL DEFAULT '{}',
  recurring_days TEXT[] NOT NULL DEFAULT '{}',
  common_times TEXT[] NOT NULL DEFAULT '{}',
  event_accuracy_score NUMERIC NOT NULL DEFAULT 0,
  promo_rate NUMERIC NOT NULL DEFAULT 0,
  menu_rate NUMERIC NOT NULL DEFAULT 0,
  ignore_rate NUMERIC NOT NULL DEFAULT 0,
  total_analyzed INTEGER NOT NULL DEFAULT 0,
  total_created INTEGER NOT NULL DEFAULT 0,
  total_ignored INTEGER NOT NULL DEFAULT 0,
  type_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_radar_memory_partner_unique
  ON public.partner_radar_memory(partner_id)
  WHERE partner_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_radar_memory_handle_unique
  ON public.partner_radar_memory(lower(instagram_handle))
  WHERE instagram_handle IS NOT NULL AND partner_id IS NULL;

CREATE INDEX IF NOT EXISTS partner_radar_memory_handle_idx
  ON public.partner_radar_memory(lower(instagram_handle));

ALTER TABLE public.partner_radar_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner_radar_memory"
  ON public.partner_radar_memory
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_partner_radar_memory_updated_at
  BEFORE UPDATE ON public.partner_radar_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função: incrementa memória com base em uma observação do Radar
CREATE OR REPLACE FUNCTION public.upsert_partner_radar_memory(
  _partner_id UUID,
  _handle TEXT,
  _type TEXT,
  _decision TEXT,         -- 'create' | 'review' | 'ignore' | 'admin_created' | 'admin_ignored'
  _genre TEXT DEFAULT NULL,
  _weekday TEXT DEFAULT NULL,
  _time TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- localizar linha existente
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

  total    := cur.total_analyzed + 1;
  created_n := cur.total_created + CASE WHEN _decision IN ('create','admin_created') THEN 1 ELSE 0 END;
  ign      := cur.total_ignored + CASE WHEN _decision IN ('ignore','admin_ignored') THEN 1 ELSE 0 END;

  -- recomputar taxas a partir de type_counts
  promo := COALESCE((new_counts ->> 'food_promo')::int, 0);
  menu  := COALESCE((new_counts ->> 'menu')::int, 0);
  ev    := COALESCE((new_counts ->> 'event_flyer')::int, 0)
         + COALESCE((new_counts ->> 'music_event')::int, 0)
         + COALESCE((new_counts ->> 'party_event')::int, 0)
         + COALESCE((new_counts ->> 'bar_event')::int, 0);

  -- tipo dominante
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
$$;