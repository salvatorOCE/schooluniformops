-- Cost and manufacturer product columns for Product List.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS manufacturer_product TEXT,
ADD COLUMN IF NOT EXISTS cost NUMERIC,
ADD COLUMN IF NOT EXISTS embroidery_print_cost NUMERIC;

COMMENT ON COLUMN products.manufacturer_product IS 'Manufacturer product name/code (as they refer to it).';
COMMENT ON COLUMN products.cost IS 'Cost for us (landed/cost price).';
COMMENT ON COLUMN products.embroidery_print_cost IS 'Total embroidery/print cost per unit.';
