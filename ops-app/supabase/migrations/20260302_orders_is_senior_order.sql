-- Ensure is_senior_order exists (sync from Woo uses it)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_senior_order BOOLEAN DEFAULT FALSE;

-- Optional: ensure other columns from 20250217 exist so sync and app work
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_school_run BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_issues BOOLEAN DEFAULT FALSE;
