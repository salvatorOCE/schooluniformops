-- =============================================================================
-- Fix: Allow stock updates from the Ops App client
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- Option 1: Disable RLS on products table (simplest for internal-only app)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Option 2 (if you want RLS later): Add permissive policies instead
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all reads" ON products FOR SELECT USING (true);
-- CREATE POLICY "Allow all updates" ON products FOR UPDATE USING (true);
-- CREATE POLICY "Allow all inserts" ON products FOR INSERT WITH CHECK (true);

-- Also disable RLS on schools and orders for the internal ops app
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
