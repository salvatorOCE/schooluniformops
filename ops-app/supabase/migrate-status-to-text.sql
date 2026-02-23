-- =============================================================================
-- Migration: Convert order status from ENUM to TEXT
-- Run this in the Supabase SQL Editor BEFORE doing a full re-sync
-- =============================================================================

-- Step 1: Change the column type from ENUM to TEXT
ALTER TABLE orders 
  ALTER COLUMN status TYPE TEXT 
  USING status::TEXT;

-- Step 2: Set a sensible default
ALTER TABLE orders 
  ALTER COLUMN status SET DEFAULT 'Processing';

-- Step 3: Set ALL old statuses to 'Processing' as a safe default.
-- The FULL re-sync button will then overwrite each order with the real WooCommerce status.
UPDATE orders SET status = 'Processing'   WHERE status NOT IN ('Processing', 'Completed', 'On-Hold', 'Failed', 'Cancelled', 'Shipped', 'Packed', 'Embroidery', 'Distribution', 'In Production', 'Pending Payment', 'Refunded');
-- Also fix any that were incorrectly mapped in a previous migration run
UPDATE orders SET status = 'Processing'   WHERE status = 'Distribution';

-- Step 4: Drop the old ENUM type (cleanup)
DROP TYPE IF EXISTS order_status;

-- Step 5: Verify - see what statuses remain
SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY count DESC;
