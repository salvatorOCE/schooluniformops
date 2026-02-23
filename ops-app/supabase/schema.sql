-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. SCHOOLS
-- -----------------------------------------------------------------------------
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE, -- 'STMARY'
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    woocommerce_id INTEGER UNIQUE, -- nullable: allows products not in WooCommerce
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    requires_embroidery BOOLEAN DEFAULT FALSE,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    attributes JSONB, -- store size, color, etc.
    stock_on_shelf JSONB DEFAULT '{}'::jsonb,
    stock_in_transit JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. EMBROIDERY BATCHES
-- -----------------------------------------------------------------------------
CREATE TYPE batch_status AS ENUM ('OPEN', 'LOCKED', 'IN_PRODUCTION', 'COMPLETED');

CREATE TABLE embroidery_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    status batch_status DEFAULT 'OPEN',
    machine_id INTEGER, -- 1-6
    is_senior_batch BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. ORDERS (Synced from Woo)
-- -----------------------------------------------------------------------------
-- Status is stored as TEXT to match WooCommerce display names directly
-- e.g. 'Processing', 'Embroidery', 'Distribution', 'Packed', 'Shipped', 'Completed', 'On-Hold', 'Failed'

CREATE TYPE delivery_method AS ENUM ('HOME', 'SCHOOL', 'STORE');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    woo_order_id INTEGER UNIQUE NOT NULL,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Processing',
    
    -- Customer Info
    customer_name TEXT NOT NULL,
    student_name TEXT,
    
    -- Relations
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    
    -- Delivery
    delivery_method delivery_method NOT NULL,
    shipping_address JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Woo created_at
    paid_at TIMESTAMP WITH TIME ZONE,
    embroidery_done_at TIMESTAMP WITH TIME ZONE,
    packed_at TIMESTAMP WITH TIME ZONE,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    notes TEXT,
    meta JSONB 
);

-- -----------------------------------------------------------------------------
-- 5. ORDER ITEMS
-- -----------------------------------------------------------------------------
CREATE TYPE embroidery_status AS ENUM ('NA', 'PENDING', 'DONE', 'PARTIAL');

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    sku TEXT NOT NULL, -- Cached in case product changes
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    size TEXT,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    
    requires_embroidery BOOLEAN DEFAULT FALSE,
    embroidery_status embroidery_status DEFAULT 'NA',
    
    -- Link to specific batch if assigned
    batch_id UUID REFERENCES embroidery_batches(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. PRODUCTION SCHEDULE (Calendar Events)
-- -----------------------------------------------------------------------------
CREATE TYPE shift_type AS ENUM ('PRODUCTION', 'EMBROIDERY', 'DISPATCH', 'FIX_UP', 'SENIOR_PRIORITY');

CREATE TABLE production_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type shift_type NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Optional linking
    linked_batch_id UUID REFERENCES embroidery_batches(id) ON DELETE SET NULL,
    
    assigned_staff_ids UUID[], -- Array of Profile IDs
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. FIX UPS (Service Tickets)
-- -----------------------------------------------------------------------------
CREATE TYPE fix_up_type AS ENUM ('SIZE_EXCHANGE', 'PRINT_ERROR', 'EMBROIDERY_ERROR', 'DAMAGED_ITEM', 'MISSING_ITEM');
CREATE TYPE fix_up_status AS ENUM ('OPEN', 'In_PRODUCTION', 'RESOLVED', 'CLOSED');

CREATE TABLE fix_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    type fix_up_type NOT NULL,
    status fix_up_status DEFAULT 'OPEN',
    priority TEXT DEFAULT 'NORMAL', -- 'NORMAL', 'HIGH', 'CRITICAL'
    
    items JSONB DEFAULT '[]'::jsonb, -- Line items for the fix-up (product/size/quantity etc.)
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- 8. SYNC LOGS (Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'ORDER_CREATED', 'PRODUCT_UPDATED'
    payload JSONB,
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_orders_woo_id ON orders(woo_order_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_school ON orders(school_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_items_embroidery ON order_items(embroidery_status) WHERE requires_embroidery = TRUE;

-- -----------------------------------------------------------------------------
-- 9. RPC FUNCTIONS
-- -----------------------------------------------------------------------------
-- Safe stock deduction using JSONB
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
