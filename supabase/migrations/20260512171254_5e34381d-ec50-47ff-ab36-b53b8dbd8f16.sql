CREATE TABLE IF NOT EXISTS public.football_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_slug text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'approved'
);

CREATE INDEX IF NOT EXISTS idx_fcm_match_slug ON public.football_chat_messages(match_slug);
CREATE INDEX IF NOT EXISTS idx_fcm_created_at ON public.football_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_fcm_user_id ON public.football_chat_messages(user_id);

ALTER TABLE public.football_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved messages"
ON public.football_chat_messages FOR SELECT
USING ((is_deleted = false AND moderation_status = 'approved') OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert own messages"
ON public.football_chat_messages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own messages"
ON public.football_chat_messages FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users/admins can delete own messages"
ON public.football_chat_messages FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.football_chat_messages;