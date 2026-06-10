
-- 1. Tabela
CREATE TABLE public.partner_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  award_type text NOT NULL,
  title text NOT NULL,
  description text,
  month integer,
  year integer,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Grants (anon pode ler — página pública)
GRANT SELECT ON public.partner_awards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_awards TO authenticated;
GRANT ALL ON public.partner_awards TO service_role;

-- 3. RLS
ALTER TABLE public.partner_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active awards"
ON public.partner_awards FOR SELECT
USING (active = true);

CREATE POLICY "Admins can read all awards"
ON public.partner_awards FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert awards"
ON public.partner_awards FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update awards"
ON public.partner_awards FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete awards"
ON public.partner_awards FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Trigger updated_at
CREATE TRIGGER update_partner_awards_updated_at
BEFORE UPDATE ON public.partner_awards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Índices
CREATE INDEX idx_partner_awards_partner_id ON public.partner_awards(partner_id);
CREATE INDEX idx_partner_awards_award_type ON public.partner_awards(award_type);
CREATE INDEX idx_partner_awards_year_month ON public.partner_awards(year DESC, month DESC);
CREATE INDEX idx_partner_awards_active ON public.partner_awards(active) WHERE active = true;

-- 6. Seed inicial: Abril e Maio 2026 (Junho fica vazio = "sem vencedor")
INSERT INTO public.partner_awards (partner_id, award_type, title, description, month, year, active)
VALUES
  ('fe942778-8566-41e0-946a-9d43c5ab0b39', 'melhor_bar_mes', 'Melhor Bar do Mês', 'Arapuca Bar conquistou o reconhecimento do público e da curadoria Roxou em abril.', 4, 2026, true),
  ('03c26f8b-d702-4880-9389-b5f463d80bb6', 'melhor_bar_mes', 'Melhor Bar do Mês', 'Quinta Aula foi o destaque absoluto da cena prudentina em maio.', 5, 2026, true);
