-- Add logo_url to proposals for school logo used in "Generate PDF with logo" pipeline
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN proposals.logo_url IS 'Public URL of school logo in proposal-logos bucket; used when generating PDF with logo.';
