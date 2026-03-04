-- Ensure order_items (and orders) are readable by the anon client when used elsewhere.
-- The Orders list now uses GET /api/orders/history (service role); this is defence-in-depth.
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Add nickname if missing (pull-sync and webhook insert it for senior uniform personalisation).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS nickname TEXT;
COMMENT ON COLUMN order_items.nickname IS 'Personalisation text from WooCommerce (e.g. Nickname for senior uniform embroidery).';
