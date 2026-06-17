CREATE OR REPLACE FUNCTION public.get_reservation_occupancy_insights(
  p_partner_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  reservation_type_id uuid,
  type_name text,
  type_kind text,
  sample_size integer,
  avg_usage_minutes integer,
  median_usage_minutes integer,
  p75_usage_minutes integer,
  current_duration_minutes integer,
  suggested_duration_minutes integer,
  confidence text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, p_partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      t.id   AS t_id,
      t.name AS t_name,
      t.kind::text AS t_kind,
      COALESCE(t.duration_minutes,
               (SELECT s.default_reservation_duration_minutes
                  FROM public.partner_reservation_settings s
                 WHERE s.partner_id = p_partner_id),
               90) AS t_current,
      r.id   AS r_id,
      EXTRACT(EPOCH FROM (
        r.released_at - COALESCE(r.checked_in_at, r.reservation_date)
      )) / 60.0 AS r_minutes
    FROM public.partner_reservation_types t
    LEFT JOIN public.partner_reservations r
      ON r.reservation_type_id = t.id
     AND r.partner_id = p_partner_id
     AND r.status IN ('completed','confirmed')
     AND r.released_at IS NOT NULL
     AND r.released_at >= now() - (p_days || ' days')::interval
    WHERE t.partner_id = p_partner_id
      AND t.active = true
  ),
  agg AS (
    SELECT
      b.t_id,
      b.t_name,
      b.t_kind,
      b.t_current,
      COUNT(b.r_id) FILTER (WHERE b.r_minutes IS NOT NULL AND b.r_minutes > 0)::int AS samples,
      COALESCE(AVG(b.r_minutes) FILTER (WHERE b.r_minutes > 0), 0) AS avg_m,
      COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY b.r_minutes)
               FILTER (WHERE b.r_minutes > 0), 0) AS med_m,
      COALESCE(percentile_cont(0.75) WITHIN GROUP (ORDER BY b.r_minutes)
               FILTER (WHERE b.r_minutes > 0), 0) AS p75_m
    FROM base b
    GROUP BY b.t_id, b.t_name, b.t_kind, b.t_current
  )
  SELECT
    a.t_id   AS reservation_type_id,
    a.t_name AS type_name,
    a.t_kind AS type_kind,
    a.samples AS sample_size,
    ROUND(a.avg_m)::int AS avg_usage_minutes,
    ROUND(a.med_m)::int AS median_usage_minutes,
    ROUND(a.p75_m)::int AS p75_usage_minutes,
    a.t_current::int AS current_duration_minutes,
    CASE
      WHEN a.samples < 5 THEN a.t_current::int
      ELSE
        LEAST(
          CASE WHEN a.t_kind = 'box' THEN 600 ELSE 240 END,
          GREATEST(
            60,
            (CEIL(a.p75_m / 30.0) * 30)::int
          )
        )
    END AS suggested_duration_minutes,
    CASE
      WHEN a.samples < 5 THEN 'low'
      WHEN a.samples <= 20 THEN 'medium'
      ELSE 'high'
    END AS confidence
  FROM agg a
  ORDER BY a.t_kind, a.t_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reservation_occupancy_insights(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reservation_occupancy_insights(uuid, integer) TO service_role;