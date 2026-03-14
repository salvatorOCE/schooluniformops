-- Manufacturer garment library: high-res images you upload and name for stitching
CREATE TABLE IF NOT EXISTS manufacturer_garments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manufacturer_garments_created_at ON manufacturer_garments (created_at DESC);

COMMENT ON TABLE manufacturer_garments IS 'High-res manufacturer garment photos; used as source for logo stitch.';

-- Per-school stitched assets: result of Nano Banana (logo on garment) stored per school
CREATE TABLE IF NOT EXISTS school_stitched_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  manufacturer_garment_id UUID NOT NULL REFERENCES manufacturer_garments(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, manufacturer_garment_id)
);

CREATE INDEX IF NOT EXISTS idx_school_stitched_assets_school ON school_stitched_assets (school_id);
CREATE INDEX IF NOT EXISTS idx_school_stitched_assets_garment ON school_stitched_assets (manufacturer_garment_id);

COMMENT ON TABLE school_stitched_assets IS 'Stitched garment images (logo on garment) per school; for Canva proposals.';

-- Bucket for manufacturer garment uploads (high-res)
INSERT INTO storage.buckets (id, name, public)
VALUES ('manufacturer-garment-images', 'manufacturer-garment-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read manufacturer-garment-images" ON storage.objects;
CREATE POLICY "Public read manufacturer-garment-images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'manufacturer-garment-images' );

-- Bucket for stitched results per school
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-stitched-assets', 'school-stitched-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read school-stitched-assets" ON storage.objects;
CREATE POLICY "Public read school-stitched-assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'school-stitched-assets' );

-- Optional: bucket for school logos (if not using existing proposal-logos with path school/{id})
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read school-logos" ON storage.objects;
CREATE POLICY "Public read school-logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'school-logos' );
