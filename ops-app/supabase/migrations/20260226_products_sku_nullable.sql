-- Allow products without SKU (e.g. manual/Elizabeth Downs sales separate from WooCommerce).
-- UNIQUE is kept: multiple rows can have NULL sku; non-null SKUs must still be unique.
ALTER TABLE products ALTER COLUMN sku DROP NOT NULL;

COMMENT ON COLUMN products.sku IS 'Stock/catalogue code. Null for manual products sold outside WooCommerce.';
