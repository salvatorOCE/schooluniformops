-- Policies for note-attachments bucket so uploaded images are publicly readable.
-- Run this if the bucket already existed but images 403; or run after 20260225_important_notes.sql.

-- Ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read objects in this bucket (so image URLs work in the app)
DROP POLICY IF EXISTS "Public read note-attachments" ON storage.objects;
CREATE POLICY "Public read note-attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'note-attachments' );
