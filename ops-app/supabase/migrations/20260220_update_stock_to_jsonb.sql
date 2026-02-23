-- Drop the old integer-based columns
ALTER TABLE products DROP COLUMN IF EXISTS stock_on_shelf CASCADE;
ALTER TABLE products DROP COLUMN IF EXISTS stock_in_transit CASCADE;

-- Add the new JSONB-based columns for size-level tracking
ALTER TABLE products ADD COLUMN stock_on_shelf JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN stock_in_transit JSONB DEFAULT '{}'::jsonb;

-- Drop the old deduct_stock function
DROP FUNCTION IF EXISTS deduct_stock(UUID, INTEGER);

-- Create the new JSONB-aware deduct_stock function
CREATE OR REPLACE FUNCTION deduct_stock(p_product_id UUID, p_size TEXT, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current stock for the specific size, default to 0 if not exists
  SELECT COALESCE((stock_on_shelf->>p_size)::INTEGER, 0) INTO current_stock
  FROM products
  WHERE id = p_product_id;

  -- Update the JSONB object with the new decremented value
  UPDATE products
  SET stock_on_shelf = jsonb_set(
    stock_on_shelf,
    array[p_size],
    to_jsonb(current_stock - p_quantity)
  )
  WHERE id = p_product_id;
END;
$$;
