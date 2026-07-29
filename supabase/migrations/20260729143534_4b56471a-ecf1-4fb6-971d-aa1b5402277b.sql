
-- ============ BDA PARTNERS ============
CREATE TABLE public.bda_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'apoio_oficial' CHECK (type IN ('patrocinio_oficial','apoio_oficial','realizacao')),
  logo_url text NOT NULL,
  logo_alt text NOT NULL DEFAULT '',
  site_url text,
  instagram_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bda_partners TO authenticated;
GRANT ALL ON public.bda_partners TO service_role;
ALTER TABLE public.bda_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bda_partners_admin_all" ON public.bda_partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BDA REGISTRATIONS ============
CREATE TABLE public.bda_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('solo','dupla')),
  team_name text,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho','aguardando_responsavel','aguardando_analise',
    'aprovada_privada','aprovada_publica','pendencia','recusada','cancelada')),
  admin_notes text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bda_registrations TO authenticated;
GRANT ALL ON public.bda_registrations TO service_role;
ALTER TABLE public.bda_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bda_registrations_admin_all" ON public.bda_registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ BDA PARTICIPANTS ============
CREATE TABLE public.bda_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.bda_registrations(id) ON DELETE CASCADE,
  slot smallint NOT NULL DEFAULT 1,
  full_name text NOT NULL,
  public_name text NOT NULL,
  birth_date date NOT NULL,
  city text,
  phone text,
  email text,
  instagram text,
  notes text,
  photo_original_path text,
  photo_public_url text,
  age_group text NOT NULL DEFAULT 'adulto' CHECK (age_group IN ('adulto','adolescente','crianca')),
  is_minor boolean NOT NULL DEFAULT false,
  show_public boolean NOT NULL DEFAULT false,
  show_city_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bda_participants TO authenticated;
GRANT ALL ON public.bda_participants TO service_role;
ALTER TABLE public.bda_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bda_participants_admin_all" ON public.bda_participants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- classificação etária automática
CREATE OR REPLACE FUNCTION public.bda_set_age_group()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE age_years integer;
BEGIN
  age_years := date_part('year', age(current_date, NEW.birth_date));
  NEW.age_group := CASE WHEN age_years >= 18 THEN 'adulto'
                        WHEN age_years >= 12 THEN 'adolescente'
                        ELSE 'crianca' END;
  NEW.is_minor := age_years < 18;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER bda_participants_age_group
BEFORE INSERT OR UPDATE ON public.bda_participants
FOR EACH ROW EXECUTE FUNCTION public.bda_set_age_group();

-- ============ BDA GUARDIANS ============
CREATE TABLE public.bda_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.bda_participants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  cpf_encrypted bytea,
  cpf_masked text,
  cpf_hash text,
  birth_date date,
  phone text,
  email text NOT NULL,
  relationship text NOT NULL,
  declaration_accepted boolean NOT NULL DEFAULT false,
  authority_confirmed boolean NOT NULL DEFAULT false,
  confirm_token_hash text,
  confirm_token_expires_at timestamptz,
  confirm_token_used_at timestamptz,
  confirmed_at timestamptz,
  refused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bda_guardians TO authenticated;
GRANT ALL ON public.bda_guardians TO service_role;
ALTER TABLE public.bda_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bda_guardians_admin_all" ON public.bda_guardians FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX bda_guardians_token_idx ON public.bda_guardians(confirm_token_hash);

-- ============ BDA CONSENTS ============
CREATE TABLE public.bda_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.bda_registrations(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.bda_participants(id) ON DELETE CASCADE,
  consent_key text NOT NULL,
  terms_version text NOT NULL DEFAULT 'v1-provisorio',
  terms_text text,
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  actor text NOT NULL DEFAULT 'participante',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bda_consents TO authenticated;
GRANT ALL ON public.bda_consents TO service_role;
ALTER TABLE public.bda_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bda_consents_admin_all" ON public.bda_consents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ STATUS HISTORY ============
CREATE TABLE public.bda_registration_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.bda_registrations(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bda_registration_status_history TO authenticated;
GRANT ALL ON public.bda_registration_status_history TO service_role;
ALTER TABLE public.bda_registration_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bda_status_history_admin_read" ON public.bda_registration_status_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "bda_status_history_admin_insert" ON public.bda_registration_status_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ADMIN AUDIT LOGS ============
CREATE TABLE public.bda_admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bda_admin_audit_logs TO authenticated;
GRANT ALL ON public.bda_admin_audit_logs TO service_role;
ALTER TABLE public.bda_admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bda_audit_admin_read" ON public.bda_admin_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "bda_audit_admin_insert" ON public.bda_admin_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ANTISPAM / RATE LIMIT ============
CREATE TABLE public.bda_submission_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  email_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bda_submission_attempts TO service_role;
ALTER TABLE public.bda_submission_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX bda_attempts_ip_idx ON public.bda_submission_attempts(ip_hash, created_at DESC);

-- ============ UPDATED_AT TRIGGERS ============
CREATE OR REPLACE FUNCTION public.bda_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER bda_partners_touch BEFORE UPDATE ON public.bda_partners FOR EACH ROW EXECUTE FUNCTION public.bda_touch_updated_at();
CREATE TRIGGER bda_registrations_touch BEFORE UPDATE ON public.bda_registrations FOR EACH ROW EXECUTE FUNCTION public.bda_touch_updated_at();
CREATE TRIGGER bda_guardians_touch BEFORE UPDATE ON public.bda_guardians FOR EACH ROW EXECUTE FUNCTION public.bda_touch_updated_at();
CREATE TRIGGER bda_consents_touch BEFORE UPDATE ON public.bda_consents FOR EACH ROW EXECUTE FUNCTION public.bda_touch_updated_at();

-- ============ VIEWS PÚBLICAS CURADAS ============
CREATE VIEW public.public_bda_partners
WITH (security_invoker = false) AS
SELECT id, name, slug, type, logo_url, logo_alt, site_url, instagram_url, display_order, is_featured
FROM public.bda_partners
WHERE is_active = true;
GRANT SELECT ON public.public_bda_partners TO anon, authenticated;

CREATE VIEW public.public_bda_participants
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.public_name,
  r.category,
  r.team_name,
  CASE WHEN p.show_city_public AND NOT p.is_minor THEN p.city ELSE NULL END AS city,
  p.photo_public_url,
  r.id AS registration_id
FROM public.bda_participants p
JOIN public.bda_registrations r ON r.id = p.registration_id
WHERE r.status = 'aprovada_publica' AND p.show_public = true;
GRANT SELECT ON public.public_bda_participants TO anon, authenticated;
