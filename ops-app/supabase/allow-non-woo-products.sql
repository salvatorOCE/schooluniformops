-- =============================================================================
-- Migration: Allow products without WooCommerce IDs
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- Make woocommerce_id nullable so products can exist independently
ALTER TABLE products ALTER COLUMN woocommerce_id DROP NOT NULL;
