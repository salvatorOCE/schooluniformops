/* Xero integration: link products to Xero Item Code and schools to Xero Contact. */

-- Products: Xero inventory item code (e.g. EDPS-FL02, FLAX-CJ1320) for invoice line items.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS xero_item_code TEXT;

COMMENT ON COLUMN products.xero_item_code IS 'Xero Item Code for this product; used when creating Xero invoices. Fallback to sku if null.';

CREATE INDEX IF NOT EXISTS idx_products_xero_item_code ON products (xero_item_code) WHERE xero_item_code IS NOT NULL;

-- Schools: Xero Contact UUID for "Bill To" on invoices.
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS xero_contact_id TEXT;

COMMENT ON COLUMN schools.xero_contact_id IS 'Xero Contact ID (UUID) for this school; used as Bill To when creating invoices.';

CREATE INDEX IF NOT EXISTS idx_schools_xero_contact_id ON schools (xero_contact_id) WHERE xero_contact_id IS NOT NULL;
