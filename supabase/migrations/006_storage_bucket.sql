-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view images
CREATE POLICY "Event images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

-- Policy: Authenticated users and anonymous users can upload images
CREATE POLICY "Anyone can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-images');

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-images' AND auth.uid()::text = (storage.foldername(name))[1]);

