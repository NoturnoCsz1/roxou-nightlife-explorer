CREATE TABLE public.search_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  clicked_result text,
  result_type text,
  results_count integer NOT NULL DEFAULT 0,
  time_to_click_ms integer,
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_logs_query ON public.search_logs (lower(query));
CREATE INDEX idx_search_logs_created_at ON public.search_logs (created_at DESC);

GRANT INSERT ON public.search_logs TO anon, authenticated;
GRANT ALL ON public.search_logs TO service_role;

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search logs"
ON public.search_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read search logs"
ON public.search_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));