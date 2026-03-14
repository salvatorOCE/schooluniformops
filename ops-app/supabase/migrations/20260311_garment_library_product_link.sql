-- Garment library: add manufacturer, code, price, type (polo/jumper/hat), extra.
ALTER TABLE manufacturer_garments
  ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC,
  ADD COLUMN IF NOT EXISTS garment_type TEXT,
  ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN manufacturer_garments.manufacturer_name IS 'Manufacturer/supplier name (e.g. AUSSIE PACIFIC).';
COMMENT ON COLUMN manufacturer_garments.code IS 'Manufacturer product code (e.g. FL02, 3307).';
COMMENT ON COLUMN manufacturer_garments.price IS 'Cost/price for this garment (used when linking to product).';
COMMENT ON COLUMN manufacturer_garments.garment_type IS 'Type: Polo, Jumper, Hat, Jacket, Other.';
COMMENT ON COLUMN manufacturer_garments.extra IS 'Extra key-value or notes (JSON).';

-- Products: link to garment library so product can use garment cost/info.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_garment_id UUID REFERENCES manufacturer_garments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_manufacturer_garment_id ON products (manufacturer_garment_id);
COMMENT ON COLUMN products.manufacturer_garment_id IS 'Linked garment from Garment library; apply garment info to sync manufacturer, code, cost.';
