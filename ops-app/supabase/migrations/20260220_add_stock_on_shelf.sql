-- Migration: Add stock_on_shelf to products table and create deduct_stock RPC

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_on_shelf INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION deduct_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock_on_shelf = stock_on_shelf - p_quantity
  WHERE id = p_product_id;
END;
$$;
