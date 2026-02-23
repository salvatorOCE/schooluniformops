-- =============================================================================
-- ONE-SHOT FIX: Run this in Supabase SQL Editor to fix all stock issues
-- =============================================================================

-- 1. Disable RLS on all tables (internal ops app, no public access)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- 2. Fix stock columns: convert from INTEGER to JSONB if they aren't already
DO $$
BEGIN
    -- Check if stock_on_shelf is not JSONB and convert it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'stock_on_shelf' AND data_type != 'jsonb'
    ) THEN
        ALTER TABLE products ALTER COLUMN stock_on_shelf TYPE JSONB USING COALESCE(to_jsonb(stock_on_shelf), '{}'::jsonb);
        ALTER TABLE products ALTER COLUMN stock_on_shelf SET DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Converted stock_on_shelf to JSONB';
    ELSE
        RAISE NOTICE 'stock_on_shelf is already JSONB';
    END IF;

    -- Check if stock_in_transit is not JSONB and convert it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'stock_in_transit' AND data_type != 'jsonb'
    ) THEN
        ALTER TABLE products ALTER COLUMN stock_in_transit TYPE JSONB USING COALESCE(to_jsonb(stock_in_transit), '{}'::jsonb);
        ALTER TABLE products ALTER COLUMN stock_in_transit SET DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Converted stock_in_transit to JSONB';
    ELSE
        RAISE NOTICE 'stock_in_transit is already JSONB';
    END IF;

    -- Make woocommerce_id nullable if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'woocommerce_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE products ALTER COLUMN woocommerce_id DROP NOT NULL;
        RAISE NOTICE 'Made woocommerce_id nullable';
    ELSE
        RAISE NOTICE 'woocommerce_id is already nullable';
    END IF;
END $$;

-- 3. Convert order status from ENUM to TEXT if it hasn't been done
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'status' AND udt_name = 'order_status'
    ) THEN
        ALTER TABLE orders ALTER COLUMN status TYPE TEXT USING status::TEXT;
        ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'Processing';
        DROP TYPE IF EXISTS order_status;
        RAISE NOTICE 'Converted order status to TEXT';
    ELSE
        RAISE NOTICE 'Order status is already TEXT';
    END IF;
END $$;

-- 4. Clean up any old status values
UPDATE orders SET status = 'Processing' WHERE status IN ('IMPORTED', 'AWAITING_EMBROIDERY', 'PENDING', 'IN_PRODUCTION', 'AWAITING_PACK', 'PACKED', 'Distribution');
UPDATE orders SET status = 'Completed' WHERE status IN ('DISPATCHED', 'COMPLETED', 'COLLECTED');
UPDATE orders SET status = 'On-Hold' WHERE status = 'EXCEPTION';
UPDATE orders SET status = 'Cancelled' WHERE status IN ('CANCELLED', 'FAILED');

-- 5. Verify everything
SELECT 'COLUMNS' as check_type, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('stock_on_shelf', 'stock_in_transit', 'woocommerce_id')
UNION ALL
SELECT 'ORDER STATUS', 'status', data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
