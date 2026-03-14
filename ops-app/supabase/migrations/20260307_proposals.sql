-- Proposals table: school uniform proposals (template + per-school instances)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  school_name TEXT NOT NULL DEFAULT '',
  school_code TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'sent')),
  pdf_url TEXT,
  template_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_proposals_school_id ON proposals (school_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals (created_at DESC);

COMMENT ON TABLE proposals IS 'School uniform proposals; template_snapshot = editor state (JSON); pdf_url = stored PDF in proposal-pdfs bucket';

-- Storage bucket for generated proposal PDFs (public read so links work)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-pdfs', 'proposal-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Optional: bucket for school logos used in proposals (if not using schools.logo_url only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-logos', 'proposal-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for proposal-pdfs
DROP POLICY IF EXISTS "Public read proposal-pdfs" ON storage.objects;
CREATE POLICY "Public read proposal-pdfs"
ON storage.objects FOR SELECT
USING ( bucket_id = 'proposal-pdfs' );

-- Public read for proposal-logos
DROP POLICY IF EXISTS "Public read proposal-logos" ON storage.objects;
CREATE POLICY "Public read proposal-logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'proposal-logos' );
