
-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Storage policies
CREATE POLICY "Auth can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Auth can update uploads" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'uploads');
CREATE POLICY "Auth can delete uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads');
CREATE POLICY "Public can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
