
CREATE OR REPLACE FUNCTION public.partner_pro_requests_before_ins_upd()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.phone_normalized := public.partner_pro_normalize_phone(NEW.whatsapp);
  IF NEW.phone_normalized IS NOT NULL THEN
    NEW.phone_hash := extensions.encode(extensions.digest(NEW.phone_normalized, 'sha256'), 'hex');
  END IF;
  NEW.instagram_normalized := public.partner_pro_normalize_instagram(NEW.instagram);
  NEW.lead_score := public.partner_pro_lead_score(NEW);

  IF TG_OP = 'UPDATE' THEN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
      NEW.last_activity_at := now();
      IF NEW.stage = 'contacted' AND NEW.contacted_at IS NULL THEN NEW.contacted_at := now(); END IF;
      IF NEW.stage = 'qualified' AND NEW.qualified_at IS NULL THEN NEW.qualified_at := now(); END IF;
      IF NEW.stage = 'approved'  AND NEW.approved_at  IS NULL THEN NEW.approved_at  := now(); END IF;
      IF NEW.stage = 'rejected'  AND NEW.rejected_at  IS NULL THEN NEW.rejected_at  := now(); END IF;
      IF NEW.stage = 'converted' AND NEW.converted_at IS NULL THEN NEW.converted_at := now(); END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
