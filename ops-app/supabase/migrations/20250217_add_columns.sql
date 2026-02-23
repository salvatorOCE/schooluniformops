-- Add columns to support advanced order tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_school_run BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_senior_order BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_issues BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create an index to support distribution filtering
CREATE INDEX IF NOT EXISTS idx_orders_distribution 
ON orders (school_id, is_school_run, is_senior_order);
