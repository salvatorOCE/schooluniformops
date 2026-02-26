-- EDPS (Elizabeth Downs Primary School) + batch manufacturer/product data.
-- 1) Ensure EDPS school exists.
-- 2) Create EDPS products if they don't exist (from Bulk Order / catalogue).
-- 3) Update manufacturer + manufacturer_product + kids/adult IDs across all matched products.
-- Cost/embroidery fields left null for you to fill later.

-- ----- 1. EDPS school -----
INSERT INTO schools (id, code, name, slug, created_at, updated_at)
SELECT uuid_generate_v4(), 'EDPS', 'Elizabeth Downs Primary School', 'elizabeth-downs-primary', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE code = 'EDPS');

-- ----- 2. EDPS products (create if not exist) -----
-- Use school_id for EDPS so products link to the school.
INSERT INTO products (sku, name, category, price, requires_embroidery, school_id, attributes, stock_on_shelf, stock_in_transit, manufacturer_name, manufacturer_id, manufacturer_product, updated_at)
SELECT 'EDPS-FL02', '½ Zip Jumper - Black', 'Elizabeth Downs Primary School', 0, false, (SELECT id FROM schools WHERE code = 'EDPS' LIMIT 1), '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Unknown', 'FL02', '½ Zip Jumper', NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'EDPS-FL02');

INSERT INTO products (sku, name, category, price, requires_embroidery, school_id, attributes, stock_on_shelf, stock_in_transit, manufacturer_name, manufacturer_id, manufacturer_product, updated_at)
SELECT 'EDPS-HW3938', 'Headwear Bucket Hat 50cm Black', 'Elizabeth Downs Primary School', 0, false, (SELECT id FROM schools WHERE code = 'EDPS' LIMIT 1), '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Unknown', 'HW3938', 'Bucket Hat 50cm', NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'EDPS-HW3938');

INSERT INTO products (sku, name, category, price, requires_embroidery, school_id, attributes, stock_on_shelf, stock_in_transit, manufacturer_name, manufacturer_id, manufacturer_product, updated_at)
SELECT 'EDPS-HW3940', 'Headwear Bucket Hat 56cm Black', 'Elizabeth Downs Primary School', 0, false, (SELECT id FROM schools WHERE code = 'EDPS' LIMIT 1), '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Unknown', 'HW3940', 'Bucket Hat 56cm', NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'EDPS-HW3940');

INSERT INTO products (sku, name, category, price, requires_embroidery, school_id, attributes, stock_on_shelf, stock_in_transit, manufacturer_name, manufacturer_id, manufacturer_product, updated_at)
SELECT 'EDPS-PS61K', 'Cooldry Contrast Polo with Sleeve Panel', 'Elizabeth Downs Primary School', 0, false, (SELECT id FROM schools WHERE code = 'EDPS' LIMIT 1), '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Unknown', 'PS61K', 'Cooldry Contrast Polo', NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'EDPS-PS61K');

INSERT INTO products (sku, name, category, price, requires_embroidery, school_id, attributes, stock_on_shelf, stock_in_transit, manufacturer_name, manufacturer_id, manufacturer_product, updated_at)
SELECT 'EDPS-PS93K', 'Contrast Year 6 Polo Black/Aqua', 'Elizabeth Downs Primary School', 0, false, (SELECT id FROM schools WHERE code = 'EDPS' LIMIT 1), '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'Unknown', 'PS93K', 'Contrast Year 6 Polo', NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'EDPS-PS93K');

-- ----- 3. FLAXMILL SENIOR -----
-- Match by school/category (Flaxmill) and product type; exclude FLAX- SKUs (those are FLAX catalogue).
-- Polo (Navy/Blue) – Botany, Kids 3307, Adult 1307 (Aussie Pacific Botany adult)
UPDATE products SET
  manufacturer_name = 'AUSSIE PACIFIC',
  manufacturer_id_kids = '3307',
  manufacturer_id_adult = '1307',
  manufacturer_product = 'Botany',
  updated_at = NOW()
WHERE (category ILIKE '%Flaxmill%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Flaxmill%'))
  AND (sku IS NULL OR sku NOT LIKE 'FLAX-%')
  AND (
    (name ILIKE '%Polo%' AND (name ILIKE '%Navy%' OR name ILIKE '%Blue%'))
    OR name ILIKE '%Polo%Navy%'
    OR name ILIKE '%Polo%Blue%'
    OR name ILIKE '%3307%'
  );

-- Jumper (Navy) – FL02, Half Zip Fleece, WinningSpirit
UPDATE products SET
  manufacturer_name = 'WinningSpirit',
  manufacturer_id = 'FL02',
  manufacturer_product = 'Half Zip Fleece',
  updated_at = NOW()
WHERE (category ILIKE '%Flaxmill%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Flaxmill%'))
  AND (sku IS NULL OR sku NOT LIKE 'FLAX-%')
  AND (
    name ILIKE '%Jumper%'
    AND (name ILIKE '%Navy%' OR name ILIKE '%FL02%' OR name ILIKE '%Half Zip%' OR name ILIKE '%Fleece%')
  );

-- ----- 4. WARRADALE SENIOR -----
-- Polo (Navy/Gold) Patterson – Kids 3305, Adult 1305, AUSSIE PACIFIC
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

-- Hoodie (Navy) Torque – Kids 3525, Adult 1525, AUSSIE PACIFIC
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

-- ----- 5. WESTPORT SENIOR -----
-- Polo (Black/White) Cottesloe – Kids 3319, Adult 1319, AUSSIE PACIFIC
UPDATE products SET
  manufacturer_name = 'AUSSIE PACIFIC',
  manufacturer_id_kids = '3319',
  manufacturer_id_adult = '1319',
  manufacturer_product = 'Cottesloe',
  updated_at = NOW()
WHERE (name ILIKE '%Polo%Cottesloe%' OR (name ILIKE '%Polo%' AND name ILIKE '%Black%White%'))
  AND (category ILIKE '%Westport%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Westport%'));

-- Jumper F096UN (Black/White) – Manufacturer Unknown
UPDATE products SET
  manufacturer_name = 'Unknown',
  manufacturer_id = 'F096UN',
  manufacturer_product = NULL,
  updated_at = NOW()
WHERE sku ILIKE '%F096UN%'
   OR (name ILIKE '%Jumper%Black%White%' AND (category ILIKE '%Westport%' OR school_id IN (SELECT id FROM schools WHERE name ILIKE '%Westport%')));

-- ----- 6. FLAX (Flaxmill) – Manufacturer Unknown, use code after FLAX- as Manufacturer ID -----
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'CJ1320', manufacturer_product = 'Jumper', updated_at = NOW() WHERE sku = 'FLAX-CJ1320';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'AP3305', manufacturer_product = 'Patterson Polo', updated_at = NOW() WHERE sku = 'FLAX-AP3305';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'BOCCJ1320', manufacturer_product = 'Crew Jumper', updated_at = NOW() WHERE sku = 'FLAX-BOCCJ1320';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'BOCCJ1621', manufacturer_product = 'Zip Jacket', updated_at = NOW() WHERE sku = 'FLAX-BOCCJ1621';

-- EDPS (ensure manufacturer set on any existing rows)
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'FL02', manufacturer_product = '½ Zip Jumper', updated_at = NOW() WHERE sku = 'EDPS-FL02';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'HW3938', manufacturer_product = 'Bucket Hat 50cm', updated_at = NOW() WHERE sku = 'EDPS-HW3938';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'HW3940', manufacturer_product = 'Bucket Hat 56cm', updated_at = NOW() WHERE sku = 'EDPS-HW3940';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'PS61K', manufacturer_product = 'Cooldry Contrast Polo', updated_at = NOW() WHERE sku = 'EDPS-PS61K';
UPDATE products SET manufacturer_name = 'Unknown', manufacturer_id = 'PS93K', manufacturer_product = 'Contrast Year 6 Polo', updated_at = NOW() WHERE sku = 'EDPS-PS93K';
