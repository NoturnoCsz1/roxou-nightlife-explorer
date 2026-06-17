
-- 1) Slot availability: do not emit slots whose end exceeds daily_close_time (SP TZ)
CREATE OR REPLACE FUNCTION public.get_reservation_slot_availability(
  p_partner_id uuid,
  p_reservation_type_id uuid,
  p_date date
) RETURNS TABLE(
  slot_start timestamptz,
  slot_end   timestamptz,
  quantity_total integer,
  reserved_count integer,
  available_count integer
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  _settings public.partner_reservation_settings;
  _type public.partner_reservation_types;
  _interval int;
  _duration int;
  _open_time time;
  _close_time time;
  _first timestamptz;
  _last  timestamptz;
BEGIN
  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = p_partner_id;
  SELECT * INTO _type FROM public.partner_reservation_types
    WHERE id = p_reservation_type_id AND partner_id = p_partner_id;
  IF _type.id IS NULL THEN RETURN; END IF;

  _interval   := COALESCE(_settings.slot_interval_minutes, 30);
  _duration   := COALESCE(_type.duration_minutes, _settings.default_reservation_duration_minutes, 90);
  _open_time  := COALESCE(_settings.daily_open_time, '18:00'::time);
  _close_time := COALESCE(_settings.daily_close_time, '23:30'::time);

  -- SP-local timestamps for the requested day (avoid UTC shift)
  _first := ((p_date::timestamp + _open_time)  AT TIME ZONE 'America/Sao_Paulo');
  _last  := ((p_date::timestamp + _close_time) AT TIME ZONE 'America/Sao_Paulo');

  RETURN QUERY
  WITH slots AS (
    SELECT gs AS s_start,
           gs + (_duration || ' minutes')::interval AS s_end
      FROM generate_series(
        _first,
        _last - (_interval || ' minutes')::interval,
        (_interval || ' minutes')::interval
      ) gs
  )
  SELECT
    sl.s_start,
    sl.s_end,
    _type.quantity::int,
    COALESCE(cnt.c, 0)::int,
    GREATEST(_type.quantity - COALESCE(cnt.c, 0), 0)::int
  FROM slots sl
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS c
      FROM public.partner_reservations r
     WHERE r.reservation_type_id = _type.id
       AND r.status IN ('pending','pending_payment','confirmed')
       -- pending reservations older than 30 min no longer occupy a slot
       AND NOT (r.status = 'pending' AND r.created_at < now() - interval '30 minutes')
       AND r.reservation_date < sl.s_end
       AND COALESCE(
             r.released_at,
             r.reservation_date + (COALESCE(r.duration_minutes, _duration) || ' minutes')::interval
           ) > sl.s_start
  ) cnt ON true
  WHERE sl.s_end <= _last  -- hide slots that would end after closing time
  ORDER BY sl.s_start;
END $$;

GRANT EXECUTE ON FUNCTION public.get_reservation_slot_availability(uuid, uuid, date) TO anon, authenticated;

-- 2) Expire stale reservations: pending_payment past expires_at AND pending older than 30 min
CREATE OR REPLACE FUNCTION public.expire_due_partner_reservations()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int := 0;
BEGIN
  WITH upd AS (
    UPDATE public.partner_reservations
       SET status = 'expired', updated_at = now()
     WHERE (
       (status = 'pending_payment'
        AND payment_confirmed_at IS NULL
        AND expires_at IS NOT NULL
        AND now() > expires_at)
       OR
       (status = 'pending'
        AND created_at < now() - interval '30 minutes')
     )
    RETURNING 1
  )
  SELECT count(*)::int INTO _n FROM upd;
  RETURN COALESCE(_n,0);
END $$;
