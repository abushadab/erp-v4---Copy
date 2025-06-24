-- Export Data from Cloud Supabase Script
-- This script generates INSERT statements for migrating existing data
-- Run this on your CLOUD Supabase database, then run the output on self-hosted

-- ================================
-- 1. Export User Profiles
-- ================================

SELECT 'INSERT INTO user_profiles (id, name, email, role, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  CASE WHEN name IS NULL THEN 'NULL' ELSE '''' || REPLACE(name, '''', '''''') || '''' END, ', ',
  CASE WHEN email IS NULL THEN 'NULL' ELSE '''' || REPLACE(email, '''', '''''') || '''' END, ', ',
  CASE WHEN role IS NULL THEN 'NULL' ELSE '''' || REPLACE(role, '''', '''''') || '''' END, ', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM user_profiles
ORDER BY created_at;

-- ================================
-- 2. Export Suppliers
-- ================================

SELECT 'INSERT INTO suppliers (id, name, email, phone, address, status, total_purchases, total_spent, join_date, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || REPLACE(name, '''', '''''') || ''', ',
  CASE WHEN email IS NULL THEN 'NULL' ELSE '''' || REPLACE(email, '''', '''''') || '''' END, ', ',
  CASE WHEN phone IS NULL THEN 'NULL' ELSE '''' || REPLACE(phone, '''', '''''') || '''' END, ', ',
  CASE WHEN address IS NULL THEN 'NULL' ELSE '''' || REPLACE(address, '''', '''''') || '''' END, ', ',
  '''' || status || ''', ',
  total_purchases, ', ',
  total_spent, ', ',
  '''' || join_date || ''', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM suppliers
ORDER BY created_at;

-- ================================
-- 3. Export Warehouses
-- ================================

SELECT 'INSERT INTO warehouses (id, name, location, status, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || REPLACE(name, '''', '''''') || ''', ',
  CASE WHEN location IS NULL THEN 'NULL' ELSE '''' || REPLACE(location, '''', '''''') || '''' END, ', ',
  '''' || status || ''', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM warehouses
ORDER BY created_at;

-- ================================
-- 4. Export Product Categories
-- ================================

SELECT 'INSERT INTO product_categories (id, name, description, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || REPLACE(name, '''', '''''') || ''', ',
  CASE WHEN description IS NULL THEN 'NULL' ELSE '''' || REPLACE(description, '''', '''''') || '''' END, ', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM product_categories
ORDER BY created_at;

-- ================================
-- 5. Export Products
-- ================================

SELECT 'INSERT INTO products (id, name, sku, description, category_id, purchase_price, selling_price, stock_quantity, min_stock_level, max_stock_level, status, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || REPLACE(name, '''', '''''') || ''', ',
  CASE WHEN sku IS NULL THEN 'NULL' ELSE '''' || REPLACE(sku, '''', '''''') || '''' END, ', ',
  CASE WHEN description IS NULL THEN 'NULL' ELSE '''' || REPLACE(description, '''', '''''') || '''' END, ', ',
  CASE WHEN category_id IS NULL THEN 'NULL' ELSE '''' || category_id || '''' END, ', ',
  COALESCE(purchase_price, 0), ', ',
  COALESCE(selling_price, 0), ', ',
  COALESCE(stock_quantity, 0), ', ',
  COALESCE(min_stock_level, 0), ', ',
  CASE WHEN max_stock_level IS NULL THEN 'NULL' ELSE max_stock_level::text END, ', ',
  '''' || status || ''', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM products
ORDER BY created_at;

-- ================================
-- 6. Export Customers
-- ================================

SELECT 'INSERT INTO customers (id, name, email, phone, address, status, total_orders, total_spent, join_date, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || REPLACE(name, '''', '''''') || ''', ',
  CASE WHEN email IS NULL THEN 'NULL' ELSE '''' || REPLACE(email, '''', '''''') || '''' END, ', ',
  CASE WHEN phone IS NULL THEN 'NULL' ELSE '''' || REPLACE(phone, '''', '''''') || '''' END, ', ',
  CASE WHEN address IS NULL THEN 'NULL' ELSE '''' || REPLACE(address, '''', '''''') || '''' END, ', ',
  '''' || status || ''', ',
  COALESCE(total_orders, 0), ', ',
  COALESCE(total_spent, 0), ', ',
  '''' || join_date || ''', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM customers
ORDER BY created_at;

-- ================================
-- 7. Export Sales
-- ================================

SELECT 'INSERT INTO sales (id, customer_id, customer_name, warehouse_id, warehouse_name, total_amount, profit, sale_date, status, payment_status, created_by, notes, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  CASE WHEN customer_id IS NULL THEN 'NULL' ELSE '''' || customer_id || '''' END, ', ',
  '''' || REPLACE(customer_name, '''', '''''') || ''', ',
  '''' || warehouse_id || ''', ',
  '''' || REPLACE(warehouse_name, '''', '''''') || ''', ',
  total_amount, ', ',
  COALESCE(profit, 0), ', ',
  '''' || sale_date || ''', ',
  '''' || status || ''', ',
  '''' || payment_status || ''', ',
  '''' || REPLACE(created_by, '''', '''''') || ''', ',
  CASE WHEN notes IS NULL THEN 'NULL' ELSE '''' || REPLACE(notes, '''', '''''') || '''' END, ', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM sales
ORDER BY created_at;

-- ================================
-- 8. Export Sale Items
-- ================================

SELECT 'INSERT INTO sale_items (id, sale_id, item_id, item_type, item_name, variation_id, quantity, selling_price, purchase_price, total, profit, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || sale_id || ''', ',
  '''' || item_id || ''', ',
  '''' || item_type || ''', ',
  '''' || REPLACE(item_name, '''', '''''') || ''', ',
  CASE WHEN variation_id IS NULL THEN 'NULL' ELSE '''' || variation_id || '''' END, ', ',
  quantity, ', ',
  selling_price, ', ',
  COALESCE(purchase_price, 0), ', ',
  total, ', ',
  COALESCE(profit, 0), ', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM sale_items
ORDER BY created_at;

-- ================================
-- 9. Export Purchases
-- ================================

SELECT 'INSERT INTO purchases (id, supplier_id, supplier_name, warehouse_id, warehouse_name, total_amount, purchase_date, status, created_by, last_updated, notes, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || supplier_id || ''', ',
  '''' || REPLACE(supplier_name, '''', '''''') || ''', ',
  '''' || warehouse_id || ''', ',
  '''' || REPLACE(warehouse_name, '''', '''''') || ''', ',
  total_amount, ', ',
  '''' || purchase_date || ''', ',
  '''' || status || ''', ',
  '''' || REPLACE(created_by, '''', '''''') || ''', ',
  '''' || last_updated || ''', ',
  CASE WHEN notes IS NULL THEN 'NULL' ELSE '''' || REPLACE(notes, '''', '''''') || '''' END, ', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM purchases
ORDER BY created_at;

-- ================================
-- 10. Export Purchase Items
-- ================================

SELECT 'INSERT INTO purchase_items (id, purchase_id, item_id, item_type, item_name, variation_id, quantity, received_quantity, purchase_price, total, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  '''' || purchase_id || ''', ',
  '''' || item_id || ''', ',
  '''' || item_type || ''', ',
  '''' || REPLACE(item_name, '''', '''''') || ''', ',
  CASE WHEN variation_id IS NULL THEN 'NULL' ELSE '''' || variation_id || '''' END, ', ',
  quantity, ', ',
  COALESCE(received_quantity, 0), ', ',
  purchase_price, ', ',
  total, ', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM purchase_items
ORDER BY created_at;

-- ================================
-- 11. Export Accounts
-- ================================

SELECT 'INSERT INTO accounts (id, name, account_number, account_type, parent_account_id, balance, is_active, description, created_at, updated_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(', id, ', ',
  '''' || REPLACE(name, '''', '''''') || ''', ',
  '''' || account_number || ''', ',
  '''' || account_type || ''', ',
  CASE WHEN parent_account_id IS NULL THEN 'NULL' ELSE parent_account_id::text END, ', ',
  COALESCE(balance, 0), ', ',
  is_active, ', ',
  CASE WHEN description IS NULL THEN 'NULL' ELSE '''' || REPLACE(description, '''', '''''') || '''' END, ', ',
  '''' || created_at || ''', ',
  '''' || updated_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY id) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM accounts
WHERE id > 1005  -- Skip the default accounts we already insert
ORDER BY id;

-- ================================
-- 12. Export Recent Activity Logs (Last 1000 entries)
-- ================================

SELECT 'INSERT INTO activity_logs (id, user_id, user_name, user_email, action, resource_type, resource_id, resource_name, description, old_values, new_values, ip_address, user_agent, session_id, created_at) VALUES' as export_start
UNION ALL
SELECT CONCAT(
  '(''', id, ''', ',
  CASE WHEN user_id IS NULL THEN 'NULL' ELSE '''' || user_id || '''' END, ', ',
  CASE WHEN user_name IS NULL THEN 'NULL' ELSE '''' || REPLACE(user_name, '''', '''''') || '''' END, ', ',
  CASE WHEN user_email IS NULL THEN 'NULL' ELSE '''' || REPLACE(user_email, '''', '''''') || '''' END, ', ',
  '''' || action || ''', ',
  '''' || resource_type || ''', ',
  CASE WHEN resource_id IS NULL THEN 'NULL' ELSE '''' || resource_id || '''' END, ', ',
  CASE WHEN resource_name IS NULL THEN 'NULL' ELSE '''' || REPLACE(resource_name, '''', '''''') || '''' END, ', ',
  '''' || REPLACE(description, '''', '''''') || ''', ',
  CASE WHEN old_values IS NULL THEN 'NULL' ELSE '''' || REPLACE(old_values::text, '''', '''''') || '''::jsonb' END, ', ',
  CASE WHEN new_values IS NULL THEN 'NULL' ELSE '''' || REPLACE(new_values::text, '''', '''''') || '''::jsonb' END, ', ',
  CASE WHEN ip_address IS NULL THEN 'NULL' ELSE '''' || ip_address || '''::inet' END, ', ',
  CASE WHEN user_agent IS NULL THEN 'NULL' ELSE '''' || REPLACE(user_agent, '''', '''''') || '''' END, ', ',
  CASE WHEN session_id IS NULL THEN 'NULL' ELSE '''' || session_id || '''' END, ', ',
  '''' || created_at || '''',
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at DESC) = COUNT(*) OVER () THEN ');'
    ELSE '),'
  END
) as insert_statement
FROM (
  SELECT * FROM activity_logs 
  ORDER BY created_at DESC 
  LIMIT 1000
) recent_logs
ORDER BY created_at DESC; 