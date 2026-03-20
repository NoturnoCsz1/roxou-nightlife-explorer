
-- Add city column to events (backfill from partner or default)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Presidente Prudente';

-- Create admin_profiles table for city-scoped access
CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  allowed_city text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read their own profile
CREATE POLICY "Users can read own admin profile"
  ON public.admin_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Full access for the user's own row
CREATE POLICY "Users can update own admin profile"
  ON public.admin_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Backfill existing events city from their partner
UPDATE public.events e
SET city = p.city
FROM public.partners p
WHERE e.partner_id = p.id AND e.city = 'Presidente Prudente';
