CREATE TABLE public.launch_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  whatsapp TEXT,
  source TEXT DEFAULT 'maintenance',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.launch_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can signup for launch"
ON public.launch_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view launch signups"
ON public.launch_signups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));