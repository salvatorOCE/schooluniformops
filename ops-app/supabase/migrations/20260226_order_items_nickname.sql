-- Store nickname / personalisation from WooCommerce line item meta (e.g. senior uniform embroidery names).
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS nickname TEXT;

COMMENT ON COLUMN order_items.nickname IS 'Personalisation text from WooCommerce (e.g. Nickname for senior uniform embroidery).';
