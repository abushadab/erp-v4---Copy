-- Create Activity Logs System
-- This system tracks user actions across the ERP application

-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT 'AL' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL, -- 'login', 'create', 'update', 'delete', 'view'
  resource_type TEXT NOT NULL, -- 'warehouse', 'product', 'packaging', 'purchase', 'sale', 'customer', 'supplier', etc.
  resource_id TEXT, -- ID of the affected resource
  resource_name TEXT, -- Name/title of the affected resource
  description TEXT NOT NULL, -- Human-readable description of the action
  old_values JSONB, -- Previous values (for updates/deletes)
  new_values JSONB, -- New values (for creates/updates)
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action ON activity_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- 3. Create a function to log activities
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_log_id TEXT;
  v_user_name TEXT;
  v_user_email TEXT;
  v_final_description TEXT;
BEGIN
  -- Generate log ID
  v_log_id := 'AL' || EXTRACT(EPOCH FROM NOW())::bigint::text || '_' || floor(random() * 1000000)::text;
  
  -- Get user details
  SELECT 
    COALESCE(up.name, au.email),
    au.email
  INTO v_user_name, v_user_email
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.id
  WHERE au.id = p_user_id;
  
  -- Generate description if not provided
  IF p_description IS NULL THEN
    v_final_description := v_user_name || ' ' || p_action || 'd ' || 
                          COALESCE(p_resource_name, p_resource_type) ||
                          CASE 
                            WHEN p_resource_id IS NOT NULL THEN ' (ID: ' || p_resource_id || ')'
                            ELSE ''
                          END;
  ELSE
    v_final_description := p_description;
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_logs (
    id,
    user_id,
    user_name,
    user_email,
    action,
    resource_type,
    resource_id,
    resource_name,
    description,
    old_values,
    new_values,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    v_log_id,
    p_user_id,
    v_user_name,
    v_user_email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    v_final_description,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent,
    p_session_id
  );
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create triggers for automatic logging of major operations
-- Products logging
CREATE OR REPLACE FUNCTION trigger_log_products() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NULL, -- Will be filled by application
      'create',
      'product',
      NEW.id,
      NEW.name,
      'Created new product: ' || NEW.name
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      NULL, -- Will be filled by application
      'update',
      'product',
      NEW.id,
      NEW.name,
      'Updated product: ' || NEW.name,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      NULL, -- Will be filled by application
      'delete',
      'product',
      OLD.id,
      OLD.name,
      'Deleted product: ' || OLD.name,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Warehouses logging
CREATE OR REPLACE FUNCTION trigger_log_warehouses() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NULL,
      'create',
      'warehouse',
      NEW.id,
      NEW.name,
      'Created new warehouse: ' || NEW.name
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      NULL,
      'update',
      'warehouse',
      NEW.id,
      NEW.name,
      'Updated warehouse: ' || NEW.name,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      NULL,
      'delete',
      'warehouse',
      OLD.id,
      OLD.name,
      'Deleted warehouse: ' || OLD.name,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Packaging logging
CREATE OR REPLACE FUNCTION trigger_log_packaging() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NULL,
      'create',
      'packaging',
      NEW.id,
      NEW.title,
      'Created new packaging: ' || NEW.title
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      NULL,
      'update',
      'packaging',
      NEW.id,
      NEW.title,
      'Updated packaging: ' || NEW.title,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      NULL,
      'delete',
      'packaging',
      OLD.id,
      OLD.title,
      'Deleted packaging: ' || OLD.title,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Purchases logging
CREATE OR REPLACE FUNCTION trigger_log_purchases() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NEW.created_by::UUID,
      'create',
      'purchase',
      NEW.id,
      'Purchase from ' || NEW.supplier_name,
      'Created new purchase from ' || NEW.supplier_name || ' for ৳' || NEW.total_amount
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      NEW.created_by::UUID,
      'update',
      'purchase',
      NEW.id,
      'Purchase from ' || NEW.supplier_name,
      'Updated purchase from ' || NEW.supplier_name,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      OLD.created_by::UUID,
      'delete',
      'purchase',
      OLD.id,
      'Purchase from ' || OLD.supplier_name,
      'Deleted purchase from ' || OLD.supplier_name,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Sales logging
CREATE OR REPLACE FUNCTION trigger_log_sales() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NEW.created_by::UUID,
      'create',
      'sale',
      NEW.id,
      'Sale to ' || NEW.customer_name,
      'Created new sale to ' || NEW.customer_name || ' for ৳' || NEW.total_amount
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      NEW.created_by::UUID,
      'update',
      'sale',
      NEW.id,
      'Sale to ' || NEW.customer_name,
      'Updated sale to ' || NEW.customer_name,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      OLD.created_by::UUID,
      'delete',
      'sale',
      OLD.id,
      'Sale to ' || OLD.customer_name,
      'Deleted sale to ' || OLD.customer_name,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Suppliers logging
CREATE OR REPLACE FUNCTION trigger_log_suppliers() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NULL,
      'create',
      'supplier',
      NEW.id,
      NEW.name,
      'Created new supplier: ' || NEW.name
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      NULL,
      'update',
      'supplier',
      NEW.id,
      NEW.name,
      'Updated supplier: ' || NEW.name,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      NULL,
      'delete',
      'supplier',
      OLD.id,
      OLD.name,
      'Deleted supplier: ' || OLD.name,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Customers logging
CREATE OR REPLACE FUNCTION trigger_log_customers() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NULL,
      'create',
      'customer',
      NEW.id,
      NEW.name,
      'Created new customer: ' || NEW.name
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      NULL,
      'update',
      'customer',
      NEW.id,
      NEW.name,
      'Updated customer: ' || NEW.name,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      NULL,
      'delete',
      'customer',
      OLD.id,
      OLD.name,
      'Deleted customer: ' || OLD.name,
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers (commented out initially - enable as needed)
-- DROP TRIGGER IF EXISTS trigger_products_log ON products;
-- CREATE TRIGGER trigger_products_log
--   AFTER INSERT OR UPDATE OR DELETE ON products
--   FOR EACH ROW EXECUTE FUNCTION trigger_log_products();

-- DROP TRIGGER IF EXISTS trigger_warehouses_log ON warehouses;
-- CREATE TRIGGER trigger_warehouses_log
--   AFTER INSERT OR UPDATE OR DELETE ON warehouses
--   FOR EACH ROW EXECUTE FUNCTION trigger_log_warehouses();

-- DROP TRIGGER IF EXISTS trigger_packaging_log ON packaging;
-- CREATE TRIGGER trigger_packaging_log
--   AFTER INSERT OR UPDATE OR DELETE ON packaging
--   FOR EACH ROW EXECUTE FUNCTION trigger_log_packaging();

-- DROP TRIGGER IF EXISTS trigger_purchases_log ON purchases;
-- CREATE TRIGGER trigger_purchases_log
--   AFTER INSERT OR UPDATE OR DELETE ON purchases
--   FOR EACH ROW EXECUTE FUNCTION trigger_log_purchases();

-- DROP TRIGGER IF EXISTS trigger_sales_log ON sales;
-- CREATE TRIGGER trigger_sales_log
--   AFTER INSERT OR UPDATE OR DELETE ON sales
--   FOR EACH ROW EXECUTE FUNCTION trigger_log_sales();

-- DROP TRIGGER IF EXISTS trigger_suppliers_log ON suppliers;
-- CREATE TRIGGER trigger_suppliers_log
--   AFTER INSERT OR UPDATE OR DELETE ON suppliers
--   FOR EACH ROW EXECUTE FUNCTION trigger_log_suppliers();

-- DROP TRIGGER IF EXISTS trigger_customers_log ON customers;
-- CREATE TRIGGER trigger_customers_log
--   AFTER INSERT OR UPDATE OR DELETE ON customers
--   FOR EACH ROW EXECUTE FUNCTION trigger_log_customers();

-- 6. Insert some sample activity logs for testing
INSERT INTO activity_logs (
  user_name,
  user_email,
  action,
  resource_type,
  resource_id,
  resource_name,
  description,
  created_at
) VALUES
  ('System Admin', 'admin@example.com', 'login', 'system', NULL, 'ERP System', 'User logged into the system', NOW() - INTERVAL '2 hours'),
  ('John Doe', 'john@example.com', 'create', 'product', 'PROD001', 'Cotton T-Shirt', 'Created new product: Cotton T-Shirt', NOW() - INTERVAL '1 hour 30 minutes'),
  ('Jane Smith', 'jane@example.com', 'update', 'warehouse', 'WH001', 'Main Warehouse', 'Updated warehouse: Main Warehouse', NOW() - INTERVAL '1 hour'),
  ('System Admin', 'admin@example.com', 'create', 'purchase', 'PUR001', 'Purchase from Dhaka Textile Mills', 'Created new purchase from Dhaka Textile Mills for ৳450,000', NOW() - INTERVAL '45 minutes'),
  ('John Doe', 'john@example.com', 'create', 'sale', 'SALE001', 'Sale to ABC Corp', 'Created new sale to ABC Corp for ৳25,000', NOW() - INTERVAL '30 minutes'),
  ('Jane Smith', 'jane@example.com', 'update', 'customer', 'CUST001', 'ABC Corporation', 'Updated customer: ABC Corporation', NOW() - INTERVAL '15 minutes'),
  ('System Admin', 'admin@example.com', 'create', 'supplier', 'SUP006', 'New Bengal Textiles', 'Created new supplier: New Bengal Textiles', NOW() - INTERVAL '10 minutes');

-- 7. Create view for activity summary
CREATE OR REPLACE VIEW activity_summary AS
SELECT 
  DATE(created_at) as activity_date,
  action,
  resource_type,
  COUNT(*) as activity_count,
  COUNT(DISTINCT user_id) as unique_users
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), action, resource_type
ORDER BY activity_date DESC, activity_count DESC;

-- 8. Function to get recent activities for a user
CREATE OR REPLACE FUNCTION get_user_recent_activities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id TEXT,
  action TEXT,
  resource_type TEXT,
  resource_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.resource_type,
    al.resource_name,
    al.description,
    al.created_at
  FROM activity_logs al
  WHERE al.user_id = p_user_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to get system-wide recent activities
CREATE OR REPLACE FUNCTION get_recent_activities(
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  id TEXT,
  user_name TEXT,
  action TEXT,
  resource_type TEXT,
  resource_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_name,
    al.action,
    al.resource_type,
    al.resource_name,
    al.description,
    al.created_at
  FROM activity_logs al
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE activity_logs IS 'Comprehensive activity logging for ERP system user actions';
COMMENT ON FUNCTION log_activity IS 'Main function to log user activities with flexible parameters';
COMMENT ON VIEW activity_summary IS 'Daily summary of activities by action and resource type'; 