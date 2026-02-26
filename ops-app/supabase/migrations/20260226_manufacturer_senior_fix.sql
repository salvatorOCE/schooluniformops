-- One-time fix: apply manufacturer data to Flaxmill Senior, Warradale Senior & Westport Senior
-- products that may not have matched earlier (e.g. different WooCommerce name/category format).
-- Safe to run multiple times (idempotent).

-- FLAXMILL SENIOR: Polo (Navy/Blue) – AUSSIE PACIFIC, Botany, Kids 3307, Adult 1307
UPDATE products SET
  manufacturer_name = 'AUSSIE PACIFIC',
  manufacturer_id_kids = '3307',
  manufacturer_id_adult = '1307',
  manufacturer_product = 'Botany',
  updated_at = NOW()
WHERE (category ILIKE '%Flaxmill%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Flaxmill%'))
  AND (sku IS NULL OR sku NOT LIKE 'FLAX-%')
  AND (
    (name ILIKE '%Polo%' AND (name ILIKE '%Navy%' OR name ILIKE '%Blue%' OR name ILIKE '%3307%' OR name ILIKE '%Botany%'))
    OR name ILIKE '%3307%'
    OR name ILIKE '%Botany%'
  );

-- FLAXMILL SENIOR: Jumper (Navy) – WinningSpirit, FL02, Half Zip Fleece
UPDATE products SET
  manufacturer_name = 'WinningSpirit',
  manufacturer_id = 'FL02',
  manufacturer_product = 'Half Zip Fleece',
  updated_at = NOW()
WHERE (category ILIKE '%Flaxmill%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Flaxmill%'))
  AND (sku IS NULL OR sku NOT LIKE 'FLAX-%')
  AND (
    name ILIKE '%Jumper%'
    OR name ILIKE '%FL02%'
    OR (name ILIKE '%Half Zip%' OR name ILIKE '%Fleece%' OR (name ILIKE '%Zip%' AND name ILIKE '%Navy%'))
  );

-- WARADALE SENIOR: Polo (Navy/Gold) Patterson – AUSSIE PACIFIC, Kids 3305, Adult 1305
UPDATE products SET
  manufacturer_name = 'AUSSIE PACIFIC',
  manufacturer_id_kids = '3305',
  manufacturer_id_adult = '1305',
  manufacturer_product = 'Patterson',
  updated_at = NOW()
WHERE (category ILIKE '%Warradale%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Warradale%'))
  AND (
    name ILIKE '%Patterson%'
    OR (name ILIKE '%Polo%' AND (name ILIKE '%Navy%' OR name ILIKE '%Gold%'))
    OR name ILIKE '%Polo%Patterson%'
    OR name ILIKE '%Patterson%Polo%'
    OR name ILIKE '%3305%'
  );

-- WARADALE SENIOR: Hoodie (Navy) Torque – AUSSIE PACIFIC, Kids 3525, Adult 1525
UPDATE products SET
  manufacturer_name = 'AUSSIE PACIFIC',
  manufacturer_id_kids = '3525',
  manufacturer_id_adult = '1525',
  manufacturer_product = 'Torque',
  updated_at = NOW()
WHERE (category ILIKE '%Warradale%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Warradale%'))
  AND (
    name ILIKE '%Hoodie%'
    OR name ILIKE '%Torque%'
    OR name ILIKE '%3525%'
  );

-- WESTPORT: Polo (Black/White) Cottesloe – AUSSIE PACIFIC, Kids 3319, Adult 1319
-- Matches "Westport Year 6 Polo" and any Polo with Cottesloe/Black/White/3319
UPDATE products SET
  manufacturer_name = 'AUSSIE PACIFIC',
  manufacturer_id_kids = '3319',
  manufacturer_id_adult = '1319',
  manufacturer_product = 'Cottesloe',
  updated_at = NOW()
WHERE (category ILIKE '%Westport%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Westport%'))
  AND (
    name ILIKE '%Cottesloe%'
    OR (name ILIKE '%Polo%' AND (name ILIKE '%Black%' OR name ILIKE '%White%'))
    OR (name ILIKE '%Year 6%' AND name ILIKE '%Polo%')
    OR name ILIKE '%Westport%Polo%'
    OR name ILIKE '%3319%'
    OR name ILIKE '%1319%'
  );

-- WESTPORT: Jumper/Jacket (Black/White) – Unknown, F096UN
-- Matches "Westport Year 6 Jacket" and any Jumper with F096UN/Black/White
UPDATE products SET
  manufacturer_name = 'Unknown',
  manufacturer_id = 'F096UN',
  manufacturer_product = NULL,
  updated_at = NOW()
WHERE (category ILIKE '%Westport%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Westport%'))
  AND (
    sku ILIKE '%F096UN%'
    OR name ILIKE '%F096UN%'
    OR (name ILIKE '%Jumper%' AND (name ILIKE '%Black%' OR name ILIKE '%White%'))
    OR (name ILIKE '%Year 6%' AND (name ILIKE '%Jacket%' OR name ILIKE '%Jumper%'))
    OR name ILIKE '%Westport%Jacket%'
  );
