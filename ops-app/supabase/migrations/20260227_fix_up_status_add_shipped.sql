-- Add SHIPPED state for fix_ups to align with UI
ALTER TYPE fix_up_status ADD VALUE IF NOT EXISTS 'SHIPPED';

