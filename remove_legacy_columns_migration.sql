-- Migration: Remove Legacy Columns from Products Table
-- Date: 2025-06-07
-- Description: Remove warehouse_id, buying_price, stock, and bought_quantity columns 
--              from products table since we now use the multi-warehouse system

-- Step 1: Ensure all data is migrated to product_warehouse_stock table
-- This query shows any products that might still need migration
SELECT 
  p.id as product_id,
  p.name,
  p.warehouse_id,
  p.stock,
  p.buying_price,
  p.bought_quantity,
  CASE WHEN pws.id IS NULL THEN 'NEEDS_MIGRATION' ELSE 'MIGRATED' END as status
FROM products p
LEFT JOIN product_warehouse_stock pws ON p.id = pws.product_id AND p.warehouse_id = pws.warehouse_id
WHERE p.warehouse_id IS NOT NULL
ORDER BY status DESC, p.name;

-- Step 2: Final migration for any remaining products (run this if needed)
/*
INSERT INTO product_warehouse_stock (product_id, warehouse_id, current_stock, reserved_stock, buying_price, bought_quantity)
SELECT 
  p.id as product_id,
  p.warehouse_id,
  COALESCE(p.stock, 0) as current_stock,
  0 as reserved_stock,
  p.buying_price,
  COALESCE(p.bought_quantity, 0) as bought_quantity
FROM products p
LEFT JOIN product_warehouse_stock pws ON p.id = pws.product_id AND p.warehouse_id = pws.warehouse_id
WHERE p.warehouse_id IS NOT NULL
  AND pws.id IS NULL
ON CONFLICT (product_id, warehouse_id, variation_id) DO NOTHING;
*/

-- Step 3: Remove the legacy columns
-- First, drop the foreign key constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_warehouse_id_fkey;

-- Remove the legacy columns
ALTER TABLE products DROP COLUMN IF EXISTS warehouse_id;
ALTER TABLE products DROP COLUMN IF EXISTS buying_price;
ALTER TABLE products DROP COLUMN IF EXISTS stock;
ALTER TABLE products DROP COLUMN IF EXISTS bought_quantity;

-- Step 4: Verify the changes
\d products;

-- Step 5: Update any views or functions that might reference these columns
-- (Add any custom views/functions here if they exist)

-- Note: After running this migration, you'll need to update the application code
-- to remove references to these legacy columns. 