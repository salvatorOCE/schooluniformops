-- Migration: Add stock_in_transit to products table

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_in_transit INTEGER DEFAULT 0;
