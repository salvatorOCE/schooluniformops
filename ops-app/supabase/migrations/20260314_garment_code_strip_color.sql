-- Remove colour component from garment codes so PS75-BLACK → PS75 for grouping.
-- Fixes PS75, FL02Y, FL01 (and any other code with trailing -COLOR).
UPDATE manufacturer_garments
SET code = regexp_replace(code, '-[A-Za-z]+$', '')
WHERE code IS NOT NULL
  AND code ~ '-[A-Za-z]+$';
