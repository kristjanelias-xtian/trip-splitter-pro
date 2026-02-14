-- Create a public storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true);

-- Authenticated users can upload feedback screenshots
CREATE POLICY "Authenticated users can upload feedback screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots');

-- Anyone can view feedback screenshots (needed for GitHub markdown rendering)
CREATE POLICY "Anyone can view feedback screenshots"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'feedback-screenshots');
