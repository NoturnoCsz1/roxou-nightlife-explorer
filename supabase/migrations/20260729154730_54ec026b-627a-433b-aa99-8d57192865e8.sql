-- ============ BDA: grants mínimos ============
-- Tabelas internas: nenhum acesso para anon; leitura/escrita apenas para
-- authenticated (filtrada por RLS de admin) e service_role.
REVOKE ALL ON public.bda_registrations, public.bda_participants,
  public.bda_guardians, public.bda_consents, public.bda_admin_audit_logs,
  public.bda_registration_status_history, public.bda_submission_attempts,
  public.bda_partners, public.bda_settings
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.bda_registrations, public.bda_participants,
  public.bda_guardians, public.bda_consents, public.bda_admin_audit_logs,
  public.bda_registration_status_history, public.bda_submission_attempts,
  public.bda_partners, public.bda_settings
  TO service_role;

-- Painel admin (RLS exige has_role(admin))
GRANT SELECT ON public.bda_registrations, public.bda_participants,
  public.bda_guardians, public.bda_consents TO authenticated;
GRANT SELECT, INSERT ON public.bda_admin_audit_logs,
  public.bda_registration_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bda_partners TO authenticated;
GRANT SELECT, UPDATE ON public.bda_settings TO authenticated;

-- Configuração pública do hotsite (somente leitura, sem dados pessoais)
GRANT SELECT ON public.bda_settings TO anon;

-- Views curadas (security definer) permanecem públicas
GRANT SELECT ON public.public_bda_participants, public.public_bda_partners,
  public.public_bda_stats TO anon, authenticated;

-- ============ Índices ============
CREATE INDEX IF NOT EXISTS bda_participants_registration_idx
  ON public.bda_participants (registration_id);
CREATE INDEX IF NOT EXISTS bda_consents_participant_idx
  ON public.bda_consents (participant_id);
CREATE INDEX IF NOT EXISTS bda_consents_registration_idx
  ON public.bda_consents (registration_id);
CREATE INDEX IF NOT EXISTS bda_guardians_participant_idx
  ON public.bda_guardians (participant_id);
CREATE INDEX IF NOT EXISTS bda_registrations_status_created_idx
  ON public.bda_registrations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS bda_attempts_created_idx
  ON public.bda_submission_attempts (created_at DESC);