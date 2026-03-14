-- Run this in Supabase Dashboard → SQL Editor if migrations aren't applied via CLI.
-- Requires: public.proposals table (from 20260307_proposals.sql).

-- Reusable proposal templates (editor_state = same shape as proposals.template_snapshot)
CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  editor_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_templates_created_at ON proposal_templates (created_at DESC);

COMMENT ON TABLE proposal_templates IS 'Saved proposal templates; editor_state = pages + elements (text, logo_placeholder, garment_image, etc.)';

-- Link proposals to optional template (clone on create; edits do not change template)
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES proposal_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_template_id ON proposals (template_id);

-- Storage bucket for garment photos (uploaded photos of garment with embroidered logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-garment-photos', 'proposal-garment-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read proposal-garment-photos" ON storage.objects;
CREATE POLICY "Public read proposal-garment-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'proposal-garment-photos' );
