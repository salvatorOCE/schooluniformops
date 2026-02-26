-- Manufacturer tracking for products (for purchase orders / garment orders).
-- All new columns nullable so existing records are unchanged.

-- Single manufacturer ID (when product has one code for all sizes)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_id TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_id_kids TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_id_adult TEXT;

-- Available for sale: when true, validation requires manufacturer to be assigned.
-- Default true for backward compatibility; UI validates on save.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_available_for_sale BOOLEAN DEFAULT true;

COMMENT ON COLUMN products.manufacturer_name IS 'Manufacturer/supplier name (e.g. AUSSIE PACIFIC, WinningSpirit). Used when placing garment orders.';
COMMENT ON COLUMN products.manufacturer_id IS 'Single manufacturer code when product has one code for all sizes.';
COMMENT ON COLUMN products.manufacturer_id_kids IS 'Manufacturer code for kids sizes (when different from adult).';
COMMENT ON COLUMN products.manufacturer_id_adult IS 'Manufacturer code for adult sizes (when different from kids).';
COMMENT ON COLUMN products.is_available_for_sale IS 'If true, product is saleable; validation requires manufacturer to be assigned.';

-- Future-ready: manufacturers table (for refactoring to FK later).
-- Not linked to products yet; manufacturer_name on products remains a string.
CREATE TABLE IF NOT EXISTS manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_manufacturer_name ON products (manufacturer_name);
CREATE INDEX IF NOT EXISTS idx_products_is_available_for_sale ON products (is_available_for_sale);
