-- ============================================================================
-- PAYMENT TIMELINE MIGRATION
-- ============================================================================
-- This migration adds payment-related columns to the purchase_events table
-- to enable recording payment events in the purchase timeline.
--
-- HOW TO RUN:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire SQL
-- 5. Click "Run" to execute
-- ============================================================================

-- Step 1: Add payment-related columns to purchase_events table
ALTER TABLE purchase_events 
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Step 2: Add comments to document the new columns
COMMENT ON COLUMN purchase_events.payment_amount IS 'Amount of payment when event_type is payment_made or payment_voided';
COMMENT ON COLUMN purchase_events.payment_method IS 'Payment method (cash, bank_transfer, check, credit_card, other) when event_type is payment_made or payment_voided';
COMMENT ON COLUMN purchase_events.payment_id IS 'Reference to the payment record when event_type is payment_made or payment_voided';

-- Step 3: Update the event_type constraint to include new payment events
ALTER TABLE purchase_events 
DROP CONSTRAINT IF EXISTS purchase_events_event_type_check;

ALTER TABLE purchase_events 
ADD CONSTRAINT purchase_events_event_type_check 
CHECK (event_type IN (
  'order_placed', 
  'partial_receipt', 
  'full_receipt', 
  'partial_return', 
  'full_return', 
  'cancelled', 
  'status_change', 
  'balance_resolved',
  'payment_made',
  'payment_voided'
));

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_events_payment_id 
ON purchase_events(payment_id) 
WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_events_event_type 
ON purchase_events(event_type);

-- Step 5: Verify the migration
SELECT 
  'Payment timeline migration completed successfully!' AS status,
  'Added columns: payment_amount, payment_method, payment_id' AS columns_added,
  'Added event types: payment_made, payment_voided' AS event_types_added; 