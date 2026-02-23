-- Add price column to products table for analytics
ALTER TABLE products
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0.00;

-- Optionally add price to order_items for historical accuracy
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) DEFAULT 0.00;
