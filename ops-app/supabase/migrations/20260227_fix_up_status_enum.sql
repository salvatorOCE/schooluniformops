-- Align fix_ups.status enum with UI statuses
-- Existing type: fix_up_status AS ENUM ('OPEN', 'In_PRODUCTION', 'RESOLVED', 'CLOSED');

-- 1) Normalise existing 'In_PRODUCTION' casing
ALTER TYPE fix_up_status RENAME VALUE 'In_PRODUCTION' TO 'IN_PRODUCTION';

-- 2) Add additional states used in the app
ALTER TYPE fix_up_status ADD VALUE IF NOT EXISTS 'WAITING_STOCK';
ALTER TYPE fix_up_status ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE fix_up_status ADD VALUE IF NOT EXISTS 'DISPATCHED';

-- We keep 'RESOLVED' for backwards‑compat, but the UI will prefer 'DISPATCHED' and 'CLOSED'.

