
-- C1: Fix search_path on 4 functions (ALTER only, no body changes)
ALTER FUNCTION public._reservation_short_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_pro_lead_score(public.partner_pro_requests) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_pro_normalize_instagram(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.partner_pro_normalize_phone(text) SET search_path = public, pg_temp;

-- C2.1: expo2026_analytics — replace always-true INSERT policy with integrity checks
DROP POLICY IF EXISTS "Anon insert expo analytics" ON public.expo2026_analytics;

CREATE POLICY "Anon can insert expo analytics"
ON public.expo2026_analytics
FOR INSERT
TO anon
WITH CHECK (
  event IS NOT NULL
  AND length(event) BETWEEN 1 AND 100
  AND (session_id IS NULL OR length(session_id) <= 100)
  AND (metadata IS NULL OR pg_column_size(metadata) <= 8192)
);

CREATE POLICY "Authenticated can insert expo analytics"
ON public.expo2026_analytics
FOR INSERT
TO authenticated
WITH CHECK (
  event IS NOT NULL
  AND length(event) BETWEEN 1 AND 100
  AND (session_id IS NULL OR length(session_id) <= 100)
  AND (metadata IS NULL OR pg_column_size(metadata) <= 8192)
);

-- C2.2: search_logs — replace always-true INSERT policy with integrity checks
DROP POLICY IF EXISTS "Anyone can insert search logs" ON public.search_logs;

CREATE POLICY "Anon can insert search logs"
ON public.search_logs
FOR INSERT
TO anon
WITH CHECK (
  query IS NOT NULL
  AND length(btrim(query)) BETWEEN 1 AND 200
  AND (clicked_result IS NULL OR length(clicked_result) <= 500)
  AND (result_type IS NULL OR length(result_type) <= 50)
  AND results_count >= 0
  AND (time_to_click_ms IS NULL OR time_to_click_ms >= 0)
  AND (session_id IS NULL OR length(session_id) <= 100)
);

CREATE POLICY "Authenticated can insert search logs"
ON public.search_logs
FOR INSERT
TO authenticated
WITH CHECK (
  query IS NOT NULL
  AND length(btrim(query)) BETWEEN 1 AND 200
  AND (clicked_result IS NULL OR length(clicked_result) <= 500)
  AND (result_type IS NULL OR length(result_type) <= 50)
  AND results_count >= 0
  AND (time_to_click_ms IS NULL OR time_to_click_ms >= 0)
  AND (session_id IS NULL OR length(session_id) <= 100)
);
