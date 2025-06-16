-- Fix purchase_items table ID generation to prevent duplicates
-- This adds a random component to make IDs unique even when created in the same second

-- Update the default value for purchase_items.id to include random component
ALTER TABLE purchase_items ALTER COLUMN id SET DEFAULT 'PIT' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text;

-- Update the default value for purchase_return_items.id to include random component  
ALTER TABLE purchase_return_items ALTER COLUMN id SET DEFAULT 'PRTI' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text;

-- Clear any existing duplicate data (optional - only if there are existing duplicates)
-- DELETE FROM purchase_items WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at) as rn
--     FROM purchase_items
--   ) t WHERE t.rn > 1
-- ); 