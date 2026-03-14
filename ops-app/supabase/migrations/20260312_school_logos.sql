-- Multiple logos per school (e.g. Standard, Senior) for stitched assets
CREATE TABLE IF NOT EXISTS school_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_logos_school_id ON school_logos (school_id);
COMMENT ON TABLE school_logos IS 'Logos per school for embroidery stitch; e.g. Standard, Senior.';
