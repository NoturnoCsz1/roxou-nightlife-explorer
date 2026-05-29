
CREATE POLICY "Admins can delete admin profiles"
ON public.admin_profiles
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Admins can insert admin profiles"
ON public.admin_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);
