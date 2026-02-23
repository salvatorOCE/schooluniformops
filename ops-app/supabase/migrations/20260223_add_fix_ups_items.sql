-- Add items column to fix_ups (array of line items for the fix-up)
ALTER TABLE fix_ups
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN fix_ups.items IS 'Line items for the fix-up (e.g. product name, sku, size, quantity)';
