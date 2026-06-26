
-- =========================================================
-- 1) Evolução de partner_pro_requests
-- =========================================================
ALTER TABLE public.partner_pro_requests
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS phone_hash text,
  ADD COLUMN IF NOT EXISTS instagram_normalized text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

-- Constraints de domínio (drop+create p/ idempotência)
ALTER TABLE public.partner_pro_requests DROP CONSTRAINT IF EXISTS partner_pro_requests_stage_chk;
ALTER TABLE public.partner_pro_requests
  ADD CONSTRAINT partner_pro_requests_stage_chk
  CHECK (stage IN ('new','contacted','qualified','approved','rejected','converted'));

ALTER TABLE public.partner_pro_requests DROP CONSTRAINT IF EXISTS partner_pro_requests_priority_chk;
ALTER TABLE public.partner_pro_requests
  ADD CONSTRAINT partner_pro_requests_priority_chk
  CHECK (priority IN ('low','normal','high','urgent'));

-- Índices
CREATE INDEX IF NOT EXISTS partner_pro_requests_stage_idx ON public.partner_pro_requests (stage, created_at DESC);
CREATE INDEX IF NOT EXISTS partner_pro_requests_phone_hash_idx ON public.partner_pro_requests (phone_hash);
CREATE INDEX IF NOT EXISTS partner_pro_requests_created_at_idx ON public.partner_pro_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS partner_pro_requests_last_activity_idx ON public.partner_pro_requests (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS partner_pro_requests_next_followup_idx ON public.partner_pro_requests (next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS partner_pro_requests_categoria_idx ON public.partner_pro_requests (categoria);
CREATE INDEX IF NOT EXISTS partner_pro_requests_cidade_idx ON public.partner_pro_requests (cidade);

-- =========================================================
-- 2) Funções utilitárias
-- =========================================================
CREATE OR REPLACE FUNCTION public.partner_pro_normalize_phone(_raw text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE d text;
BEGIN
  IF _raw IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(_raw, '\D', '', 'g');
  d := regexp_replace(d, '^0+', '');
  IF d = '' THEN RETURN NULL; END IF;
  IF length(d) = 10 OR length(d) = 11 THEN d := '55' || d; END IF;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.partner_pro_normalize_instagram(_raw text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text;
BEGIN
  IF _raw IS NULL THEN RETURN NULL; END IF;
  s := lower(trim(_raw));
  s := regexp_replace(s, '^(https?://)?(www\.)?instagram\.com/', '');
  s := regexp_replace(s, '^@+', '');
  s := split_part(s, '/', 1);
  s := split_part(s, '?', 1);
  s := split_part(s, '#', 1);
  IF s = '' THEN RETURN NULL; END IF;
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.partner_pro_lead_score(_row public.partner_pro_requests)
RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s int := 0; cat text;
BEGIN
  cat := lower(coalesce(_row.categoria, ''));
  IF cat LIKE '%excurs%' THEN s := s + 25;
  ELSIF cat LIKE '%event%' OR cat LIKE '%noturna%' THEN s := s + 20;
  ELSIF cat LIKE '%bar%' OR cat LIKE '%restaur%' THEN s := s + 15;
  END IF;
  IF coalesce(_row.mensagem,'') <> '' THEN s := s + 10; END IF;
  IF coalesce(_row.instagram_normalized, _row.instagram, '') <> '' THEN s := s + 10; END IF;
  IF lower(coalesce(_row.cidade,'')) LIKE '%prudente%' THEN s := s + 10; END IF;
  IF _row.phone_normalized IS NOT NULL AND length(_row.phone_normalized) >= 12 THEN s := s + 20; END IF;
  IF coalesce(_row.responsavel,'') ~ '\s' THEN s := s + 5; END IF;
  RETURN least(s, 100);
END $$;

-- =========================================================
-- 3) Tabela de atividades
-- =========================================================
CREATE TABLE IF NOT EXISTS public.partner_pro_request_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.partner_pro_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_pro_request_activities DROP CONSTRAINT IF EXISTS partner_pro_request_activities_type_chk;
ALTER TABLE public.partner_pro_request_activities
  ADD CONSTRAINT partner_pro_request_activities_type_chk
  CHECK (type IN ('created','contacted','note_added','stage_changed','whatsapp_opened','approved','rejected','converted','follow_up_scheduled','priority_changed','assigned'));

CREATE INDEX IF NOT EXISTS partner_pro_request_activities_request_idx
  ON public.partner_pro_request_activities (request_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_pro_request_activities TO authenticated;
GRANT ALL ON public.partner_pro_request_activities TO service_role;

ALTER TABLE public.partner_pro_request_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage partner pro activities" ON public.partner_pro_request_activities;
CREATE POLICY "admins manage partner pro activities"
  ON public.partner_pro_request_activities FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =========================================================
-- 4) Triggers em partner_pro_requests
-- =========================================================
CREATE OR REPLACE FUNCTION public.partner_pro_requests_before_ins_upd()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.phone_normalized := public.partner_pro_normalize_phone(NEW.whatsapp);
  IF NEW.phone_normalized IS NOT NULL THEN
    NEW.phone_hash := encode(digest(NEW.phone_normalized, 'sha256'), 'hex');
  END IF;
  NEW.instagram_normalized := public.partner_pro_normalize_instagram(NEW.instagram);
  NEW.lead_score := public.partner_pro_lead_score(NEW);

  IF TG_OP = 'UPDATE' THEN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
      NEW.last_activity_at := now();
      IF NEW.stage = 'contacted' AND NEW.contacted_at IS NULL THEN NEW.contacted_at := now(); END IF;
      IF NEW.stage = 'qualified' AND NEW.qualified_at IS NULL THEN NEW.qualified_at := now(); END IF;
      IF NEW.stage = 'approved' AND NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
      IF NEW.stage = 'rejected' AND NEW.rejected_at IS NULL THEN NEW.rejected_at := now(); END IF;
      IF NEW.stage = 'converted' AND NEW.converted_at IS NULL THEN NEW.converted_at := now(); END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS partner_pro_requests_norm_trg ON public.partner_pro_requests;
CREATE TRIGGER partner_pro_requests_norm_trg
  BEFORE INSERT OR UPDATE ON public.partner_pro_requests
  FOR EACH ROW EXECUTE FUNCTION public.partner_pro_requests_before_ins_upd();

-- Trigger after: cria atividades de criação e de mudança de etapa
CREATE OR REPLACE FUNCTION public.partner_pro_requests_after_ins_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.partner_pro_request_activities (request_id, type, message, metadata)
    VALUES (NEW.id, 'created', 'Solicitação recebida pelo formulário público',
            jsonb_build_object('source', NEW.source, 'categoria', NEW.categoria, 'cidade', NEW.cidade));
  ELSIF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.partner_pro_request_activities (request_id, actor_id, type, message, metadata)
    VALUES (NEW.id, auth.uid(), 'stage_changed',
            format('Etapa: %s → %s', OLD.stage, NEW.stage),
            jsonb_build_object('from', OLD.stage, 'to', NEW.stage));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS partner_pro_requests_activity_trg ON public.partner_pro_requests;
CREATE TRIGGER partner_pro_requests_activity_trg
  AFTER INSERT OR UPDATE ON public.partner_pro_requests
  FOR EACH ROW EXECUTE FUNCTION public.partner_pro_requests_after_ins_upd();

-- =========================================================
-- 5) Backfill em registros existentes
-- =========================================================
UPDATE public.partner_pro_requests
SET whatsapp = whatsapp
WHERE phone_normalized IS NULL;

-- Mapear status legados → stage
UPDATE public.partner_pro_requests
SET stage = CASE
  WHEN status = 'approved'  THEN 'approved'
  WHEN status = 'rejected'  THEN 'rejected'
  WHEN status = 'contacted' THEN 'contacted'
  ELSE 'new'
END
WHERE stage = 'new' AND status <> 'pending';
