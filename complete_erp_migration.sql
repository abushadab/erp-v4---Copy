-- Complete ERP Database Migration Script
-- This script creates the entire ERP schema for migration to self-hosted Supabase

-- ================================
-- 1. Core Tables and Functions
-- ================================

-- First, let's ensure we have user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 2. Suppliers and Warehouses
-- ================================

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT 'SUP' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  total_purchases INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  join_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY DEFAULT 'WH' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 3. Products and Categories
-- ================================

-- Product categories
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY DEFAULT 'PC' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product attributes
CREATE TABLE IF NOT EXISTS product_attributes (
  id TEXT PRIMARY KEY DEFAULT 'PA' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  data_type TEXT DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'boolean', 'date')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT 'PROD' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  description TEXT,
  category_id TEXT REFERENCES product_categories(id),
  purchase_price DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 4. Packaging System
-- ================================

-- Packaging attributes
CREATE TABLE IF NOT EXISTS packaging_attributes (
  id TEXT PRIMARY KEY DEFAULT 'PKGATTR' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  data_type TEXT DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'boolean', 'date')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packaging table
CREATE TABLE IF NOT EXISTS packaging (
  id TEXT PRIMARY KEY DEFAULT 'PKG' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  description TEXT,
  purchase_price DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 5. Stock and Inventory
-- ================================

-- Multi-warehouse stock for products
CREATE TABLE IF NOT EXISTS product_warehouse_stock (
  id TEXT PRIMARY KEY DEFAULT 'PWS' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

-- Multi-warehouse stock for packaging
CREATE TABLE IF NOT EXISTS packaging_warehouse_stock (
  id TEXT PRIMARY KEY DEFAULT 'PKWS' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  packaging_id TEXT NOT NULL REFERENCES packaging(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(packaging_id, warehouse_id)
);

-- ================================
-- 6. Customers
-- ================================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT 'CUST' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  join_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 7. Sales System
-- ================================

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY DEFAULT 'SALE' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  warehouse_name TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled', 'returned')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale items
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY DEFAULT 'SITEM' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'package')),
  item_name TEXT NOT NULL,
  variation_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selling_price DECIMAL(12,2) NOT NULL CHECK (selling_price >= 0),
  purchase_price DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  profit DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 8. Purchases System (from your files)
-- ================================

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY DEFAULT 'PUR' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  warehouse_name TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_received', 'received', 'returned', 'cancelled')),
  created_by TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Items table
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY DEFAULT 'PIT' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'package')),
  item_name TEXT NOT NULL,
  variation_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
  purchase_price DECIMAL(12,2) NOT NULL CHECK (purchase_price >= 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 9. Accounting System
-- ================================

-- Account types and chart of accounts
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  account_number TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_account_id INTEGER REFERENCES accounts(id),
  balance DECIMAL(15,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries for double-entry bookkeeping
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY DEFAULT 'JE' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  reference_type TEXT NOT NULL, -- 'sale', 'purchase', 'payment', 'adjustment'
  reference_id TEXT NOT NULL, -- ID of the related transaction
  description TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(15,2) NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entry lines (debits and credits)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id TEXT PRIMARY KEY DEFAULT 'JEL' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  account_name TEXT NOT NULL,
  debit_amount DECIMAL(15,2) DEFAULT 0.00,
  credit_amount DECIMAL(15,2) DEFAULT 0.00,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 10. Payment System
-- ================================

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY DEFAULT 'PM' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'mobile', 'card', 'other')),
  account_id INTEGER REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale payments
CREATE TABLE IF NOT EXISTS sale_payments (
  id TEXT PRIMARY KEY DEFAULT 'SP' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase payments
CREATE TABLE IF NOT EXISTS purchase_payments (
  id TEXT PRIMARY KEY DEFAULT 'PP' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 11. Activity Logging System
-- ================================

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT 'AL' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_name TEXT,
  description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 12. Indexes for Performance
-- ================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_packaging_sku ON packaging(sku);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_warehouse_id ON sales(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_warehouse_id ON purchases(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);

-- ================================
-- 13. Essential Functions
-- ================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for timestamps
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packaging_updated_at BEFORE UPDATE ON packaging FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- 14. Basic Data Seeding
-- ================================

-- Insert default payment methods
INSERT INTO payment_methods (id, name, type, is_active) VALUES
('PM001', 'Cash', 'cash', true),
('PM002', 'Bkash', 'mobile', true),
('PM003', 'Nagad', 'mobile', true),
('PM004', 'Rocket', 'mobile', true),
('PM005', 'Bank Transfer', 'bank', true)
ON CONFLICT (id) DO NOTHING;

-- Insert basic account structure
INSERT INTO accounts (id, name, account_number, account_type, balance, description) VALUES
(1001, 'Cash', '1001', 'asset', 0.00, 'Cash in hand'),
(1002, 'Bkash Account', '1002', 'asset', 0.00, 'Bkash mobile banking'),
(1003, 'Nagad Account', '1003', 'asset', 0.00, 'Nagad mobile banking'),
(1004, 'Rocket Account', '1004', 'asset', 0.00, 'Rocket mobile banking'),
(1005, 'Bank Account', '1005', 'asset', 0.00, 'Primary bank account'),
(2001, 'Accounts Payable', '2001', 'liability', 0.00, 'Money owed to suppliers'),
(2002, 'Accounts Receivable', '2002', 'asset', 0.00, 'Money owed by customers'),
(3001, 'Owner Equity', '3001', 'equity', 0.00, 'Owner investment'),
(4001, 'Sales Revenue', '4001', 'revenue', 0.00, 'Revenue from sales'),
(5001, 'Cost of Goods Sold', '5001', 'expense', 0.00, 'Direct costs of inventory'),
(5002, 'Operating Expenses', '5002', 'expense', 0.00, 'General business expenses')
ON CONFLICT (id) DO NOTHING;

-- Update payment methods with account references
UPDATE payment_methods SET account_id = 1001 WHERE id = 'PM001' AND account_id IS NULL;
UPDATE payment_methods SET account_id = 1002 WHERE id = 'PM002' AND account_id IS NULL;
UPDATE payment_methods SET account_id = 1003 WHERE id = 'PM003' AND account_id IS NULL;
UPDATE payment_methods SET account_id = 1004 WHERE id = 'PM004' AND account_id IS NULL;
UPDATE payment_methods SET account_id = 1005 WHERE id = 'PM005' AND account_id IS NULL;

-- ================================
-- Migration Complete
-- ================================

-- Log the migration
INSERT INTO activity_logs (
  id, action, resource_type, description, created_at
) VALUES (
  'AL_MIGRATION_' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  'migrate',
  'database',
  'Complete ERP database schema migration completed successfully',
  NOW()
);

SELECT 'ERP Database Migration Complete!' as status; 