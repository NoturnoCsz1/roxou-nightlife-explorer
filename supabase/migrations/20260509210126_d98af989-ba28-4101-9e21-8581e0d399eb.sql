-- Tabela de presença ao vivo
CREATE TABLE IF NOT EXISTS public.event_live_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid,
  session_id text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_elp_event ON public.event_live_presence(event_id);
CREATE INDEX IF NOT EXISTS idx_elp_last_seen ON public.event_live_presence(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_elp_event_lastseen ON public.event_live_presence(event_id, last_seen_at DESC);

ALTER TABLE public.event_live_presence ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver (apenas será usado em agregação)
CREATE POLICY "Anyone can view live presence"
  ON public.event_live_presence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_live_presence.event_id AND e.status = 'published'
    )
  );

-- Qualquer um pode inserir presença (anônimo ou auth)
CREATE POLICY "Anyone can insert live presence"
  ON public.event_live_presence FOR INSERT
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- Qualquer um pode atualizar a própria presença (matched por session_id)
CREATE POLICY "Anyone can update own live presence"
  ON public.event_live_presence FOR UPDATE
  USING (
    (user_id IS NULL) OR (user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (user_id IS NULL) OR (user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Delete apenas próprio ou admin
CREATE POLICY "Users delete own live presence"
  ON public.event_live_presence FOR DELETE
  USING (
    (user_id IS NULL) OR (user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_event_live_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.event_live_presence
  WHERE last_seen_at < now() - interval '5 minutes';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Função para contar online (3 min de janela)
CREATE OR REPLACE FUNCTION public.count_event_live_presence(_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.event_live_presence
  WHERE event_id = _event_id
    AND last_seen_at > now() - interval '3 minutes';
$$;