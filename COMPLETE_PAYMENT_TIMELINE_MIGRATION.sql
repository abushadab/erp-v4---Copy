-- ============================================================================
-- COMPLETE PAYMENT TIMELINE MIGRATION
-- ============================================================================
-- This migration does TWO things:
-- 1. Adds payment timeline columns to purchase_events table
-- 2. Creates the missing payment reversal journal entry function
--
-- HOW TO RUN:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire SQL
-- 5. Click "Run" to execute
-- ============================================================================

-- ========================================
-- PART 1: TIMELINE COLUMNS
-- ========================================

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

-- ========================================
-- PART 2: PAYMENT REVERSAL FUNCTION
-- ========================================

-- Create the payment reversal journal entry function
-- This function creates journal entries when payments are voided/reversed
-- It creates the opposite entries of the original payment:
-- Debit: Cash (decrease asset - money comes back)
-- Credit: Accounts Payable (increase liability - we owe supplier again)

CREATE OR REPLACE FUNCTION create_payment_reversal_journal_entry(
    p_original_payment_id TEXT,
    p_reversal_payment_id TEXT,
    p_purchase_id TEXT,
    p_supplier_name TEXT,
    p_amount DECIMAL,
    p_reversal_date DATE,
    p_payment_method TEXT,
    p_created_by TEXT,
    p_void_reason TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_journal_entry_id TEXT;
    v_cash_account_id TEXT;
    v_payable_account_id TEXT;
    v_description TEXT;
BEGIN
    -- Generate journal entry ID
    v_journal_entry_id := 'JE-PAYMENT-VOID-' || p_original_payment_id || '-' || EXTRACT(EPOCH FROM NOW())::bigint::text;
    
    -- Build description
    v_description := 'Payment Reversal - Voided payment to ' || p_supplier_name || ' (PO: ' || p_purchase_id || ')';
    IF p_void_reason IS NOT NULL THEN
        v_description := v_description || ' - Reason: ' || p_void_reason;
    END IF;
    
    -- Find or create Cash account (Asset)
    SELECT id INTO v_cash_account_id 
    FROM accounts 
    WHERE account_name = 'Cash' 
    LIMIT 1;
    
    -- If no cash account exists, create one
    IF v_cash_account_id IS NULL THEN
        -- Look for Assets category
        INSERT INTO accounts (
            account_number, 
            account_name, 
            account_code, 
            category_id, 
            description
        ) 
        SELECT 
            '1001', 
            'Cash', 
            'CASH', 
            id, 
            'Cash on hand and in bank accounts'
        FROM account_categories 
        WHERE type = 'asset' 
        LIMIT 1
        RETURNING id INTO v_cash_account_id;
    END IF;
    
    -- Find or create Accounts Payable account (Liability)
    SELECT id INTO v_payable_account_id 
    FROM accounts 
    WHERE account_name = 'Accounts Payable' 
    LIMIT 1;
    
    -- If no payable account exists, create one
    IF v_payable_account_id IS NULL THEN
        -- Look for Liabilities category
        INSERT INTO accounts (
            account_number, 
            account_name, 
            account_code, 
            category_id, 
            description
        ) 
        SELECT 
            '2001', 
            'Accounts Payable', 
            'AP', 
            id, 
            'Amounts owed to suppliers'
        FROM account_categories 
        WHERE type = 'liability' 
        LIMIT 1
        RETURNING id INTO v_payable_account_id;
    END IF;
    
    -- Create the journal entry header
    INSERT INTO journal_entries (
        entry_number,
        description,
        reference_type,
        reference_id,
        entry_date,
        total_amount,
        status,
        created_by
    ) VALUES (
        v_journal_entry_id,
        v_description,
        'payment_reversal',
        p_reversal_payment_id,
        p_reversal_date,
        p_amount,
        'posted',
        p_created_by
    );
    
    -- Create journal entry lines
    -- DEBIT: Cash (increase asset - money comes back from voided payment)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        v_journal_entry_id,
        v_cash_account_id,
        'Voided payment reversal - Cash increased',
        p_amount,
        0
    );
    
    -- CREDIT: Accounts Payable (increase liability - we owe the supplier again)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        v_journal_entry_id,
        v_payable_account_id,
        'Voided payment reversal - Amount owed to ' || p_supplier_name,
        0,
        p_amount
    );
    
    RETURN v_journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Failed to create payment reversal journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VERIFICATION
-- ========================================

-- Step 5: Verify the migration
SELECT 
  'COMPLETE PAYMENT TIMELINE MIGRATION SUCCESSFUL!' AS status,
  'Timeline columns: payment_amount, payment_method, payment_id' AS timeline_columns_added,
  'Timeline event types: payment_made, payment_voided' AS timeline_events_added,
  'Accounting function: create_payment_reversal_journal_entry' AS accounting_function_added; 