-- Track how many units of each order line have been sent (for Partial Order Complete).
-- Lets ops app record what's been sent vs not so you can come back and complete the rest.
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS sent_quantity INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN order_items.sent_quantity IS 'Number of units sent so far (for Partial Order Complete). 0 = none sent, quantity = all sent.';
