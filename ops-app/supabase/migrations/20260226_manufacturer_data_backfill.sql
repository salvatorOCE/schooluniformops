-- Backfill manufacturer data for known products.
-- Matches by SKU where possible. Does NOT overwrite SKU, price, or existing data.
-- Products not matched remain unchanged (manufacturer fields null); assign manually in Product List.

-- EDPS (Elizabeth Downs Primary): use code after EDPS- as Manufacturer ID
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'FL02', updated_at = NOW() WHERE sku = 'EDPS-FL02';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'HW3938', updated_at = NOW() WHERE sku = 'EDPS-HW3938';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'HW3940', updated_at = NOW() WHERE sku = 'EDPS-HW3940';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'PS61K', updated_at = NOW() WHERE sku = 'EDPS-PS61K';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'PS93K', updated_at = NOW() WHERE sku = 'EDPS-PS93K';

-- FLAX (Flaxmill items): use code after FLAX- as Manufacturer ID
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'CJ1320', updated_at = NOW() WHERE sku = 'FLAX-CJ1320';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'AP3305', updated_at = NOW() WHERE sku = 'FLAX-AP3305';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'BOCCJ1320', updated_at = NOW() WHERE sku = 'FLAX-BOCCJ1320';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'BOCCJ1621', updated_at = NOW() WHERE sku = 'FLAX-BOCCJ1621';

-- Westport Senior: Jumper (Black/White) - single code
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'F096UN', updated_at = NOW()
WHERE sku ILIKE '%F096UN%' OR (name ILIKE '%Jumper%Black%White%' AND (category ILIKE '%Westport%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Westport%')));

-- Westport Senior: Polo (Black/White - Cottesloe) - AUSSIE PACIFIC
UPDATE products SET manufacturer_name = 'AUSSIE PACIFIC', manufacturer_id_kids = '3319', manufacturer_id_adult = '1319', updated_at = NOW()
WHERE (name ILIKE '%Polo%Cottesloe%' OR (name ILIKE '%Polo%Black%White%' AND name ILIKE '%Cottesloe%')) AND (category ILIKE '%Westport%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Westport%'));

-- Flaxmill Senior: Jumper (Navy) - WinningSpirit FL02
UPDATE products SET manufacturer_name = 'WinningSpirit', manufacturer_id = 'FL02', updated_at = NOW()
WHERE name ILIKE '%Jumper%Navy%' AND (category ILIKE '%Flaxmill%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Flaxmill%'));

-- Flaxmill Senior: Polo (Navy/Blue) - AUSSIE PACIFIC kids 3307; adult TBD (leave null)
UPDATE products SET manufacturer_name = 'AUSSIE PACIFIC', manufacturer_id_kids = '3307', manufacturer_id_adult = NULL, updated_at = NOW()
WHERE (name ILIKE '%Polo%Navy%' OR name ILIKE '%Polo%Blue%') AND (category ILIKE '%Flaxmill%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Flaxmill%'));

-- Warradale Senior: Polo Patterson (Navy/Gold) - AUSSIE PACIFIC kids 3305
UPDATE products SET manufacturer_name = 'AUSSIE PACIFIC', manufacturer_id_kids = '3305', manufacturer_id_adult = NULL, updated_at = NOW()
WHERE name ILIKE '%Polo%Patterson%' AND (category ILIKE '%Warradale%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Warradale%'));

-- Warradale Senior: Hoodie (Navy) - AUSSIE PACIFIC kids 3525, adult 1525
UPDATE products SET manufacturer_name = 'AUSSIE PACIFIC', manufacturer_id_kids = '3525', manufacturer_id_adult = '1525', updated_at = NOW()
WHERE name ILIKE '%Hoodie%Navy%' AND (category ILIKE '%Warradale%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Warradale%'));
