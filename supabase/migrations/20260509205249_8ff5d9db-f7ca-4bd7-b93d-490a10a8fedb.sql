-- Tabela de presença em eventos (Quem Vai / Interessados)
CREATE TABLE IF NOT EXISTS public.event_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('going', 'interested')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_presence_event ON public.event_presence(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_presence_user ON public.event_presence(user_id);

ALTER TABLE public.event_presence ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver presença de eventos publicados
CREATE POLICY "Anyone can view event presence"
ON public.event_presence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_presence.event_id
      AND e.status = 'published'
  )
);

-- Usuário autenticado registra a própria presença
CREATE POLICY "Users insert own presence"
ON public.event_presence
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuário atualiza apenas a própria presença
CREATE POLICY "Users update own presence"
ON public.event_presence
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Usuário remove apenas a própria presença
CREATE POLICY "Users delete own presence"
ON public.event_presence
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER event_presence_updated_at
BEFORE UPDATE ON public.event_presence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();