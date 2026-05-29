ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS instagram_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.partners
  DROP CONSTRAINT IF EXISTS partners_status_check;

ALTER TABLE public.partners
  ADD CONSTRAINT partners_status_check
  CHECK (status IN ('draft','ativo','destaque','oficial','bloqueado'));

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();