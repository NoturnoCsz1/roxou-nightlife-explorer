-- Driver applications table
CREATE TABLE IF NOT EXISTS public.driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  cpf text NOT NULL UNIQUE,
  whatsapp text NOT NULL,
  email text NOT NULL,
  city text NOT NULL,
  neighborhood text,
  face_photo_url text,
  vehicle_photo_url text,
  apps_experience text[] DEFAULT '{}',
  vehicle_model text,
  vehicle_year text,
  vehicle_color text,
  vehicle_plate text,
  vehicle_good_condition boolean,
  availability text[] DEFAULT '{}',
  attends_events boolean,
  regions text,
  receive_driver_lead_emails boolean NOT NULL DEFAULT true,
  accepted_terms boolean NOT NULL DEFAULT false,
  accepted_privacy boolean NOT NULL DEFAULT false,
  accepted_data_removal boolean NOT NULL DEFAULT false,
  accepted_connection_only boolean NOT NULL DEFAULT false,
  declared_truthful boolean NOT NULL DEFAULT false,
  understood_suspension boolean NOT NULL DEFAULT false,
  driver_status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own driver application"
  ON public.driver_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own driver application"
  ON public.driver_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own driver application"
  ON public.driver_applications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete driver applications"
  ON public.driver_applications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_driver_applications_updated_at
BEFORE UPDATE ON public.driver_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reports table
CREATE TABLE IF NOT EXISTS public.driver_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id uuid,
  ride_request_id uuid,
  report_type text NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own report"
  ON public.driver_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own report"
  ON public.driver_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage reports"
  ON public.driver_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));