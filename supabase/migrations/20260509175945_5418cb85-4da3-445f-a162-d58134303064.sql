
-- =========================================
-- COMUNIDADE ROXOU — FASE 1 (BACKEND SEGURO)
-- =========================================

-- 1) community_rooms
CREATE TABLE public.community_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NULL,
  partner_id uuid NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NULL,
  type text NOT NULL DEFAULT 'global',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_rooms_type_check CHECK (type IN ('event','partner','global'))
);

CREATE INDEX idx_community_rooms_event ON public.community_rooms(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_community_rooms_partner ON public.community_rooms(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX idx_community_rooms_active ON public.community_rooms(is_active);

ALTER TABLE public.community_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rooms"
  ON public.community_rooms FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage rooms"
  ON public.community_rooms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));


-- 2) community_user_states (criada antes de messages para uso em policy)
CREATE TABLE public.community_user_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_muted boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  mute_until timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_user_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read user states"
  ON public.community_user_states FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage user states"
  ON public.community_user_states FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Helper: verifica se usuário pode falar (não banido / não mutado)
CREATE OR REPLACE FUNCTION public.community_user_can_speak(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.community_user_states s
    WHERE s.user_id = _user_id
      AND (
        s.is_banned = true
        OR (s.is_muted = true AND (s.mute_until IS NULL OR s.mute_until > now()))
      )
  )
$$;


-- 3) community_messages
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.community_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  reply_to_id uuid NULL REFERENCES public.community_messages(id) ON DELETE SET NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_messages_room_created ON public.community_messages(room_id, created_at DESC);
CREATE INDEX idx_community_messages_user ON public.community_messages(user_id);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-deleted messages"
  ON public.community_messages FOR SELECT
  USING (is_deleted = false OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can post messages"
  ON public.community_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.community_user_can_speak(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.community_rooms r
      WHERE r.id = room_id AND r.is_active = true
    )
  );

CREATE POLICY "Admins update messages"
  ON public.community_messages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete messages"
  ON public.community_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: validações + rate limit (1 msg / 5s)
CREATE OR REPLACE FUNCTION public.validate_community_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_msg_at timestamptz;
  trimmed text;
BEGIN
  trimmed := btrim(NEW.message);

  IF trimmed IS NULL OR length(trimmed) = 0 THEN
    RAISE EXCEPTION 'A mensagem não pode estar vazia.';
  END IF;

  IF length(trimmed) > 500 THEN
    RAISE EXCEPTION 'A mensagem não pode exceder 500 caracteres.';
  END IF;

  NEW.message := trimmed;

  -- Bypass rate limit para admins
  IF public.has_role(NEW.user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Rate limit: 1 mensagem a cada 5 segundos
  SELECT MAX(created_at) INTO last_msg_at
  FROM public.community_messages
  WHERE user_id = NEW.user_id;

  IF last_msg_at IS NOT NULL AND last_msg_at > (now() - interval '5 seconds') THEN
    RAISE EXCEPTION 'Aguarde alguns segundos antes de enviar outra mensagem.';
  END IF;

  -- Anti-flood: bloqueia mensagem idêntica nos últimos 60s
  IF EXISTS (
    SELECT 1 FROM public.community_messages
    WHERE user_id = NEW.user_id
      AND room_id = NEW.room_id
      AND message = NEW.message
      AND created_at > (now() - interval '60 seconds')
  ) THEN
    RAISE EXCEPTION 'Mensagem repetida recentemente. Evite spam.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_community_message
  BEFORE INSERT ON public.community_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_community_message();


-- 4) community_reports
CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_reports_message ON public.community_reports(message_id);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can create reports"
  ON public.community_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins read reports"
  ON public.community_reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger: rate limit denúncias (5 por minuto)
CREATE OR REPLACE FUNCTION public.validate_community_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  IF NEW.reason IS NULL OR length(btrim(NEW.reason)) = 0 THEN
    RAISE EXCEPTION 'Informe um motivo para a denúncia.';
  END IF;

  IF length(NEW.reason) > 500 THEN
    NEW.reason := substr(NEW.reason, 1, 500);
  END IF;

  IF public.has_role(NEW.reporter_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM public.community_reports
  WHERE reporter_id = NEW.reporter_id
    AND created_at > (now() - interval '1 minute');

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Muitas denúncias em pouco tempo. Tente novamente em instantes.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_community_report
  BEFORE INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_community_report();

-- Quando uma denúncia é criada, marca a mensagem como flagged
CREATE OR REPLACE FUNCTION public.flag_message_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_messages
  SET is_flagged = true
  WHERE id = NEW.message_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_flag_message_on_report
  AFTER INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.flag_message_on_report();


-- 5) community_presence
CREATE TABLE public.community_presence (
  room_id uuid NOT NULL REFERENCES public.community_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_community_presence_room_seen ON public.community_presence(room_id, last_seen DESC);

ALTER TABLE public.community_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read presence"
  ON public.community_presence FOR SELECT
  USING (true);

CREATE POLICY "Users upsert own presence"
  ON public.community_presence FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own presence"
  ON public.community_presence FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 6) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_rooms;
