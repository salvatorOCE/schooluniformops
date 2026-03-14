-- Allow templates to be a single uploaded PDF (no editor_state required)
ALTER TABLE proposal_templates
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

COMMENT ON COLUMN proposal_templates.pdf_url IS 'Optional: public URL of uploaded PDF for this template (Supabase storage proposal-template-pdfs bucket)';

-- Bucket for template PDFs (one PDF per template)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-template-pdfs', 'proposal-template-pdfs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read proposal-template-pdfs" ON storage.objects;
CREATE POLICY "Public read proposal-template-pdfs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'proposal-template-pdfs' );
