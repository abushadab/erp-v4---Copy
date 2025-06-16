-- Create purchases and suppliers tables for Supabase database

-- 1. Suppliers table
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

-- 2. Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY DEFAULT 'WH' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY DEFAULT 'PUR' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL, -- Denormalized for performance
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  warehouse_name TEXT NOT NULL, -- Denormalized for performance
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partially_received', 'received', 'returned', 'cancelled')),
  created_by TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Purchase Items table
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY DEFAULT 'PIT' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL, -- Can be product_id or packaging_id
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'package')),
  item_name TEXT NOT NULL,
  variation_id TEXT, -- For variation products/packages
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
  purchase_price DECIMAL(12,2) NOT NULL CHECK (purchase_price >= 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Purchase Returns table
CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY DEFAULT 'PRET' || EXTRACT(EPOCH FROM NOW())::bigint::text,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Purchase Return Items table
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY DEFAULT 'PRTI' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text,
  purchase_return_id TEXT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'package')),
  item_name TEXT NOT NULL,
  variation_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purchase_price DECIMAL(12,2) NOT NULL CHECK (purchase_price >= 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_warehouse_id ON purchases(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_item_id ON purchase_items(item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_purchase_id ON purchase_returns(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id ON purchase_return_items(purchase_return_id);

-- Create functions to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_items_updated_at BEFORE UPDATE ON purchase_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_returns_updated_at BEFORE UPDATE ON purchase_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_return_items_updated_at BEFORE UPDATE ON purchase_return_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update purchase total when items change
CREATE OR REPLACE FUNCTION update_purchase_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchases 
  SET total_amount = (
    SELECT COALESCE(SUM(total), 0) 
    FROM purchase_items 
    WHERE purchase_id = COALESCE(NEW.purchase_id, OLD.purchase_id)
  ),
  last_updated = NOW()
  WHERE id = COALESCE(NEW.purchase_id, OLD.purchase_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating purchase totals
CREATE TRIGGER update_purchase_total_on_insert 
  AFTER INSERT ON purchase_items 
  FOR EACH ROW EXECUTE FUNCTION update_purchase_total();

CREATE TRIGGER update_purchase_total_on_update 
  AFTER UPDATE ON purchase_items 
  FOR EACH ROW EXECUTE FUNCTION update_purchase_total();

CREATE TRIGGER update_purchase_total_on_delete 
  AFTER DELETE ON purchase_items 
  FOR EACH ROW EXECUTE FUNCTION update_purchase_total();

-- Function to automatically update purchase return total when items change
CREATE OR REPLACE FUNCTION update_purchase_return_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_returns 
  SET total_amount = (
    SELECT COALESCE(SUM(total), 0) 
    FROM purchase_return_items 
    WHERE purchase_return_id = COALESCE(NEW.purchase_return_id, OLD.purchase_return_id)
  )
  WHERE id = COALESCE(NEW.purchase_return_id, OLD.purchase_return_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating purchase return totals
CREATE TRIGGER update_purchase_return_total_on_insert 
  AFTER INSERT ON purchase_return_items 
  FOR EACH ROW EXECUTE FUNCTION update_purchase_return_total();

CREATE TRIGGER update_purchase_return_total_on_update 
  AFTER UPDATE ON purchase_return_items 
  FOR EACH ROW EXECUTE FUNCTION update_purchase_return_total();

CREATE TRIGGER update_purchase_return_total_on_delete 
  AFTER DELETE ON purchase_return_items 
  FOR EACH ROW EXECUTE FUNCTION update_purchase_return_total();

-- Insert some initial suppliers data
INSERT INTO suppliers (id, name, email, phone, address, status, total_purchases, total_spent, join_date) VALUES
('SUP001', 'Dhaka Textile Mills', 'contact@dhakatextile.com', '+8801711111111', 'Savar, Dhaka, Bangladesh', 'active', 15, 450000, '2023-01-15'),
('SUP002', 'Bengal Fabrics Ltd', 'sales@bengalfabrics.com', '+8801722222222', 'Gazipur, Dhaka, Bangladesh', 'active', 12, 320000, '2023-02-20'),
('SUP003', 'Sylhet Cotton Works', 'info@sylhetcotton.com', '+8801733333333', 'Sylhet, Bangladesh', 'active', 8, 180000, '2023-03-10'),
('SUP004', 'Rangpur Garments', 'support@rangpurgarments.com', '+8801744444444', 'Rangpur, Bangladesh', 'active', 5, 95000, '2023-04-05'),
('SUP005', 'Chittagong Textiles', 'orders@ctgtextiles.com', '+8801755555555', 'Chittagong, Bangladesh', 'active', 10, 275000, '2023-05-12');

-- Insert some initial warehouses data
INSERT INTO warehouses (id, name, location, status) VALUES
('WH001', 'Main Warehouse', 'Dhaka Central', 'active'),
('WH002', 'North Warehouse', 'Gazipur', 'active'),
('WH003', 'South Warehouse', 'Chittagong', 'active'),
('WH004', 'East Warehouse', 'Sylhet', 'active'),
('WH005', 'West Warehouse', 'Rangpur', 'active'); 