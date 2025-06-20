-- Create sales payment system similar to purchases

-- 1. Add payment fields to sales table
ALTER TABLE sales 
ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overpaid'));

-- 2. Create sale_payments table
CREATE TABLE IF NOT EXISTS sale_payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit_card', 'other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  journal_entry_id TEXT REFERENCES journal_entries(id),
  created_by TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'void')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create triggers to update sales payment totals
CREATE OR REPLACE FUNCTION update_sale_payment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sales table with total payments and status
  UPDATE sales 
  SET 
    amount_paid = COALESCE((
      SELECT SUM(amount) 
      FROM sale_payments 
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id) 
      AND status = 'active'
    ), 0),
    payment_status = CASE 
      WHEN COALESCE((
        SELECT SUM(amount) 
        FROM sale_payments 
        WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id) 
        AND status = 'active'
      ), 0) = 0 THEN 'unpaid'
      WHEN COALESCE((
        SELECT SUM(amount) 
        FROM sale_payments 
        WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id) 
        AND status = 'active'
      ), 0) >= total_amount THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_sale_payment_totals_insert ON sale_payments;
DROP TRIGGER IF EXISTS trigger_update_sale_payment_totals_update ON sale_payments;
DROP TRIGGER IF EXISTS trigger_update_sale_payment_totals_delete ON sale_payments;

CREATE TRIGGER trigger_update_sale_payment_totals_insert
  AFTER INSERT ON sale_payments
  FOR EACH ROW EXECUTE FUNCTION update_sale_payment_totals();

CREATE TRIGGER trigger_update_sale_payment_totals_update
  AFTER UPDATE ON sale_payments
  FOR EACH ROW EXECUTE FUNCTION update_sale_payment_totals();

CREATE TRIGGER trigger_update_sale_payment_totals_delete
  AFTER DELETE ON sale_payments
  FOR EACH ROW EXECUTE FUNCTION update_sale_payment_totals();

-- 4. Create sale events table for timeline tracking
CREATE TABLE IF NOT EXISTS sale_events (
  id TEXT PRIMARY KEY DEFAULT 'SE-' || EXTRACT(EPOCH FROM NOW()) || '-' || FLOOR(RANDOM() * 1000),
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('order_placed', 'payment_made', 'payment_voided', 'returned', 'cancelled', 'status_change')),
  event_title TEXT NOT NULL,
  event_description TEXT,
  previous_status TEXT,
  new_status TEXT,
  payment_amount DECIMAL(10,2),
  payment_method TEXT,
  payment_id TEXT,
  return_amount DECIMAL(10,2),
  return_reason TEXT,
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_payment_date ON sale_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_sale_payments_status ON sale_payments(status);
CREATE INDEX IF NOT EXISTS idx_sale_events_sale_id ON sale_events(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_events_event_type ON sale_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sale_events_event_date ON sale_events(event_date);

-- 6. Update existing sales to have correct payment status
UPDATE sales 
SET 
  amount_paid = 0,
  payment_status = 'unpaid'
WHERE amount_paid IS NULL OR payment_status IS NULL;

-- Success message
SELECT 'Sales payment system created successfully!' as message; 