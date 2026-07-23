
-- ============================================================
-- SHORT LINKS: tabelas
-- ============================================================
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  destination_url text NOT NULL,
  title text NOT NULL,
  description text,
  campaign_name text,
  partner_id uuid,
  event_id uuid,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_clicks bigint,
  click_count bigint NOT NULL DEFAULT 0,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT short_links_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  CONSTRAINT short_links_destination_scheme CHECK (destination_url ~* '^https?://')
);

CREATE INDEX idx_short_links_slug ON public.short_links(slug);
CREATE INDEX idx_short_links_created_at ON public.short_links(created_at DESC);
CREATE INDEX idx_short_links_partner ON public.short_links(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX idx_short_links_event ON public.short_links(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_short_links_active ON public.short_links(is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view short links"
  ON public.short_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert short links"
  ON public.short_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update short links"
  ON public.short_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete short links"
  ON public.short_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Clicks
CREATE TABLE public.short_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  visitor_hash text,
  session_hash text,
  referrer text,
  referrer_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  country text,
  region text,
  city text,
  device_type text,
  browser text,
  os text,
  is_bot boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_short_link_clicks_link ON public.short_link_clicks(short_link_id, clicked_at DESC);
CREATE INDEX idx_short_link_clicks_clicked_at ON public.short_link_clicks(clicked_at DESC);

GRANT SELECT ON public.short_link_clicks TO authenticated;
GRANT ALL ON public.short_link_clicks TO service_role;

ALTER TABLE public.short_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view clicks"
  ON public.short_link_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger reuse
CREATE TRIGGER update_short_links_updated_at
  BEFORE UPDATE ON public.short_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RPCs (admin-only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.short_links_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_links', (SELECT count(*) FROM public.short_links),
    'active_links', (SELECT count(*) FROM public.short_links WHERE is_active = true),
    'total_clicks', (SELECT count(*) FROM public.short_link_clicks),
    'clicks_7d', (SELECT count(*) FROM public.short_link_clicks WHERE clicked_at >= now() - interval '7 days' AND is_bot = false),
    'clicks_30d', (SELECT count(*) FROM public.short_link_clicks WHERE clicked_at >= now() - interval '30 days' AND is_bot = false),
    'unique_visitors_30d', (SELECT count(DISTINCT visitor_hash) FROM public.short_link_clicks WHERE clicked_at >= now() - interval '30 days' AND visitor_hash IS NOT NULL AND is_bot = false),
    'bot_clicks_30d', (SELECT count(*) FROM public.short_link_clicks WHERE clicked_at >= now() - interval '30 days' AND is_bot = true)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.short_links_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.short_links_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.short_link_analytics(_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'total', count(*),
        'human', count(*) FILTER (WHERE is_bot = false),
        'bots', count(*) FILTER (WHERE is_bot = true),
        'unique_visitors', count(DISTINCT visitor_hash) FILTER (WHERE is_bot = false),
        'last_24h', count(*) FILTER (WHERE clicked_at >= now() - interval '1 day' AND is_bot = false),
        'last_7d', count(*) FILTER (WHERE clicked_at >= now() - interval '7 days' AND is_bot = false),
        'last_30d', count(*) FILTER (WHERE clicked_at >= now() - interval '30 days' AND is_bot = false)
      )
      FROM public.short_link_clicks WHERE short_link_id = _link_id
    ),
    'timeline', (
      SELECT COALESCE(jsonb_agg(row ORDER BY d ASC), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', clicked_at AT TIME ZONE 'America/Sao_Paulo') AS d,
               count(*) FILTER (WHERE is_bot = false) AS clicks,
               count(DISTINCT visitor_hash) FILTER (WHERE is_bot = false) AS uniques
        FROM public.short_link_clicks
        WHERE short_link_id = _link_id
          AND clicked_at >= now() - interval '30 days'
        GROUP BY 1
      ) t, LATERAL (SELECT jsonb_build_object('date', d, 'clicks', clicks, 'uniques', uniques) AS row) x
    ),
    'sources', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'clicks', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT COALESCE(referrer_domain, 'Direto') AS source, count(*) AS c
        FROM public.short_link_clicks
        WHERE short_link_id = _link_id AND is_bot = false
        GROUP BY 1 LIMIT 15
      ) s
    ),
    'devices', (
      SELECT COALESCE(jsonb_object_agg(device, c), '{}'::jsonb)
      FROM (
        SELECT COALESCE(device_type, 'unknown') AS device, count(*) AS c
        FROM public.short_link_clicks
        WHERE short_link_id = _link_id AND is_bot = false
        GROUP BY 1
      ) d
    ),
    'browsers', (
      SELECT COALESCE(jsonb_object_agg(browser, c), '{}'::jsonb)
      FROM (
        SELECT COALESCE(browser, 'unknown') AS browser, count(*) AS c
        FROM public.short_link_clicks
        WHERE short_link_id = _link_id AND is_bot = false
        GROUP BY 1 LIMIT 10
      ) b
    ),
    'os', (
      SELECT COALESCE(jsonb_object_agg(os, c), '{}'::jsonb)
      FROM (
        SELECT COALESCE(os, 'unknown') AS os, count(*) AS c
        FROM public.short_link_clicks
        WHERE short_link_id = _link_id AND is_bot = false
        GROUP BY 1 LIMIT 10
      ) o
    ),
    'utms', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', utm_source, 'medium', utm_medium, 'campaign', utm_campaign, 'clicks', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT utm_source, utm_medium, utm_campaign, count(*) AS c
        FROM public.short_link_clicks
        WHERE short_link_id = _link_id AND is_bot = false
          AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL)
        GROUP BY 1,2,3 LIMIT 20
      ) u
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.short_link_analytics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.short_link_analytics(uuid) TO authenticated;
