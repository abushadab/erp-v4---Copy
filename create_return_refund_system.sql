-- Return-Refund System Implementation
-- Implements 30-day rule, FIFO refunds, payment tracking, and failure handling

-- 1. Add refund tracking columns to purchase_returns table
ALTER TABLE purchase_returns 
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'pending' CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS refund_processed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS refund_failure_reason TEXT,
ADD COLUMN IF NOT EXISTS auto_refund_eligible BOOLEAN DEFAULT true;

-- 2. Create refund_transactions table for detailed tracking
CREATE TABLE IF NOT EXISTS refund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    original_payment_id UUID NOT NULL REFERENCES purchase_payments(id),
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_method VARCHAR(20) NOT NULL CHECK (refund_method IN ('cash', 'bank_transfer', 'check', 'store_credit')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processed_at TIMESTAMP,
    failure_reason TEXT,
    bank_reference VARCHAR(100),
    check_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure refund doesn't exceed original payment
    CONSTRAINT refund_amount_positive CHECK (refund_amount > 0)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refund_transactions_return_id ON refund_transactions(return_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_payment_id ON refund_transactions(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_status ON refund_transactions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_refund_status ON purchase_returns(refund_status);

-- 4. Function to check if return is eligible for refund (30-day rule)
CREATE OR REPLACE FUNCTION is_return_refund_eligible(p_purchase_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    purchase_date DATE;
BEGIN
    SELECT created_at::DATE INTO purchase_date
    FROM purchases 
    WHERE id = p_purchase_id;
    
    -- Check if within 30 days of purchase date
    RETURN (CURRENT_DATE - purchase_date) <= 30;
END;
$$;

-- 5. Function to get available refund amount from a payment (FIFO consideration)
CREATE OR REPLACE FUNCTION get_available_refund_amount(p_payment_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    payment_amount DECIMAL(10,2);
    already_refunded DECIMAL(10,2);
    available_amount DECIMAL(10,2);
BEGIN
    -- Get original payment amount
    SELECT amount INTO payment_amount
    FROM purchase_payments
    WHERE id = p_payment_id AND status = 'completed';
    
    IF payment_amount IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get total already refunded from this payment
    SELECT COALESCE(SUM(refund_amount), 0) INTO already_refunded
    FROM refund_transactions
    WHERE original_payment_id = p_payment_id 
    AND status IN ('completed', 'processing');
    
    available_amount := payment_amount - already_refunded;
    
    RETURN GREATEST(available_amount, 0);
END;
$$;

-- 6. Function to calculate proportional refund amounts using FIFO
CREATE OR REPLACE FUNCTION calculate_return_refunds(
    p_return_id UUID,
    p_return_amount DECIMAL(10,2)
)
RETURNS TABLE(
    payment_id UUID,
    payment_method VARCHAR(20),
    refund_amount DECIMAL(10,2),
    payment_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
    remaining_refund DECIMAL(10,2) := p_return_amount;
    payment_rec RECORD;
    available_amount DECIMAL(10,2);
    refund_from_payment DECIMAL(10,2);
BEGIN
    -- Get payments in FIFO order (oldest first)
    FOR payment_rec IN
        SELECT pp.id, pp.payment_method, pp.created_at, pp.amount
        FROM purchase_returns pr
        JOIN purchases p ON pr.purchase_id = p.id
        JOIN purchase_payments pp ON pp.purchase_id = p.id
        WHERE pr.id = p_return_id 
        AND pp.status = 'completed'
        ORDER BY pp.created_at ASC
    LOOP
        EXIT WHEN remaining_refund <= 0;
        
        -- Get available amount from this payment
        available_amount := get_available_refund_amount(payment_rec.id);
        
        IF available_amount > 0 THEN
            -- Calculate refund amount from this payment
            refund_from_payment := LEAST(remaining_refund, available_amount);
            
            -- Return the refund allocation
            payment_id := payment_rec.id;
            payment_method := payment_rec.payment_method;
            refund_amount := refund_from_payment;
            payment_date := payment_rec.created_at;
            
            RETURN NEXT;
            
            remaining_refund := remaining_refund - refund_from_payment;
        END IF;
    END LOOP;
END;
$$;

-- 7. Function to process automatic refunds
CREATE OR REPLACE FUNCTION process_automatic_refund(
    p_return_id UUID,
    p_processed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    return_rec RECORD;
    refund_calc RECORD;
    refund_transaction_id UUID;
    total_refund_amount DECIMAL(10,2) := 0;
    result JSONB := '{"success": false, "refunds": [], "errors": []}'::JSONB;
    refunds_array JSONB := '[]'::JSONB;
    errors_array JSONB := '[]'::JSONB;
BEGIN
    -- Get return details
    SELECT pr.*, p.id as purchase_id, p.created_at as purchase_date
    INTO return_rec
    FROM purchase_returns pr
    JOIN purchases p ON pr.purchase_id = p.id
    WHERE pr.id = p_return_id;
    
    IF NOT FOUND THEN
        result := jsonb_set(result, '{errors}', errors_array || '"Return not found"');
        RETURN result;
    END IF;
    
    -- Check 30-day eligibility
    IF NOT is_return_refund_eligible(return_rec.purchase_id) THEN
        result := jsonb_set(result, '{errors}', errors_array || '"Return exceeds 30-day refund limit"');
        
        -- Update return as not eligible
        UPDATE purchase_returns 
        SET auto_refund_eligible = false,
            refund_status = 'cancelled'
        WHERE id = p_return_id;
        
        RETURN result;
    END IF;
    
    -- Calculate refund allocations using FIFO
    FOR refund_calc IN
        SELECT * FROM calculate_return_refunds(p_return_id, return_rec.total_amount)
    LOOP
        -- Create refund transaction record
        INSERT INTO refund_transactions (
            return_id,
            original_payment_id,
            refund_amount,
            refund_method,
            status,
            created_by
        ) VALUES (
            p_return_id,
            refund_calc.payment_id,
            refund_calc.refund_amount,
            CASE 
                WHEN refund_calc.payment_method = 'bank_transfer' THEN 'bank_transfer'
                WHEN refund_calc.payment_method = 'cash' THEN 'cash'
                ELSE 'check' -- Fallback for other methods
            END,
            'pending',
            p_processed_by
        ) RETURNING id INTO refund_transaction_id;
        
        total_refund_amount := total_refund_amount + refund_calc.refund_amount;
        
        -- Add to results
        refunds_array := refunds_array || jsonb_build_object(
            'transaction_id', refund_transaction_id,
            'payment_id', refund_calc.payment_id,
            'amount', refund_calc.refund_amount,
            'method', refund_calc.payment_method
        );
    END LOOP;
    
    -- Update return record
    UPDATE purchase_returns 
    SET refund_amount = total_refund_amount,
        refund_status = CASE 
            WHEN total_refund_amount > 0 THEN 'pending'
            ELSE 'cancelled'
        END,
        refund_processed_by = p_processed_by
    WHERE id = p_return_id;
    
    -- Create timeline event
    INSERT INTO purchase_events (
        purchase_id,
        event_type,
        description,
        created_by,
        return_id
    ) VALUES (
        return_rec.purchase_id,
        'refund_calculated',
        format('Automatic refund calculated: ৳%s across %s payments', 
               total_refund_amount, 
               jsonb_array_length(refunds_array)),
        p_processed_by,
        p_return_id
    );
    
    result := jsonb_set(result, '{success}', 'true');
    result := jsonb_set(result, '{refunds}', refunds_array);
    result := jsonb_set(result, '{total_amount}', to_jsonb(total_refund_amount));
    
    RETURN result;
END;
$$;

-- 8. Function to mark refund as completed
CREATE OR REPLACE FUNCTION complete_refund_transaction(
    p_transaction_id UUID,
    p_bank_reference VARCHAR(100) DEFAULT NULL,
    p_check_number VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    transaction_rec RECORD;
BEGIN
    -- Get transaction details
    SELECT rt.*, pr.purchase_id
    INTO transaction_rec
    FROM refund_transactions rt
    JOIN purchase_returns pr ON rt.return_id = pr.id
    WHERE rt.id = p_transaction_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update transaction status
    UPDATE refund_transactions 
    SET status = 'completed',
        processed_at = NOW(),
        bank_reference = p_bank_reference,
        check_number = p_check_number
    WHERE id = p_transaction_id;
    
    -- Create journal entry for refund
    PERFORM create_refund_journal_entry(
        transaction_rec.purchase_id,
        transaction_rec.refund_amount,
        transaction_rec.refund_method,
        p_transaction_id::TEXT
    );
    
    -- Create timeline event
    INSERT INTO purchase_events (
        purchase_id,
        event_type,
        description,
        return_id
    ) VALUES (
        transaction_rec.purchase_id,
        'refund_completed',
        format('Refund completed: ৳%s via %s', 
               transaction_rec.refund_amount, 
               transaction_rec.refund_method),
        transaction_rec.return_id
    );
    
    -- Check if all refunds for this return are completed
    UPDATE purchase_returns 
    SET refund_status = 'completed',
        refund_processed_at = NOW()
    WHERE id = transaction_rec.return_id
    AND NOT EXISTS (
        SELECT 1 FROM refund_transactions 
        WHERE return_id = transaction_rec.return_id 
        AND status NOT IN ('completed', 'cancelled')
    );
    
    RETURN TRUE;
END;
$$;

-- 9. Function to handle failed refunds
CREATE OR REPLACE FUNCTION fail_refund_transaction(
    p_transaction_id UUID,
    p_failure_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    transaction_rec RECORD;
BEGIN
    -- Get transaction details
    SELECT rt.*, pr.purchase_id
    INTO transaction_rec
    FROM refund_transactions rt
    JOIN purchase_returns pr ON rt.return_id = pr.id
    WHERE rt.id = p_transaction_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update transaction status
    UPDATE refund_transactions 
    SET status = 'failed',
        failure_reason = p_failure_reason,
        processed_at = NOW()
    WHERE id = p_transaction_id;
    
    -- Update return status
    UPDATE purchase_returns 
    SET refund_status = 'failed',
        refund_failure_reason = p_failure_reason
    WHERE id = transaction_rec.return_id;
    
    -- Create timeline event
    INSERT INTO purchase_events (
        purchase_id,
        event_type,
        description,
        return_id
    ) VALUES (
        transaction_rec.purchase_id,
        'refund_failed',
        format('Refund failed: ৳%s via %s - %s', 
               transaction_rec.refund_amount, 
               transaction_rec.refund_method,
               p_failure_reason),
        transaction_rec.return_id
    );
    
    RETURN TRUE;
END;
$$;

-- 10. Create journal entry function for refunds
CREATE OR REPLACE FUNCTION create_refund_journal_entry(
    p_purchase_id UUID,
    p_refund_amount DECIMAL(10,2),
    p_refund_method VARCHAR(20),
    p_reference_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_entry_number TEXT;
    v_journal_entry_id UUID;
    v_cash_account_id UUID;
    v_bank_account_id UUID;
    v_accounts_payable_id UUID;
    v_supplier_id UUID;
    v_line_number INTEGER := 1;
BEGIN
    -- Generate entry number
    v_entry_number := 'REF' || LPAD(nextval('journal_entry_sequence')::TEXT, 10, '0');
    
    -- Get supplier for this purchase
    SELECT supplier_id INTO v_supplier_id
    FROM purchases 
    WHERE id = p_purchase_id;
    
    -- Get or create required accounts
    SELECT id INTO v_cash_account_id FROM accounts WHERE account_code = '1001' AND account_type = 'asset';
    SELECT id INTO v_bank_account_id FROM accounts WHERE account_code = '1002' AND account_type = 'asset';
    SELECT id INTO v_accounts_payable_id FROM accounts WHERE account_code = '2001' AND account_type = 'liability';
    
    -- Create accounts if they don't exist
    IF v_cash_account_id IS NULL THEN
        INSERT INTO accounts (account_code, account_name, account_type, category)
        VALUES ('1001', 'Cash', 'asset', 'current_assets')
        RETURNING id INTO v_cash_account_id;
    END IF;
    
    IF v_bank_account_id IS NULL THEN
        INSERT INTO accounts (account_code, account_name, account_type, category)
        VALUES ('1002', 'Bank', 'asset', 'current_assets')
        RETURNING id INTO v_bank_account_id;
    END IF;
    
    IF v_accounts_payable_id IS NULL THEN
        INSERT INTO accounts (account_code, account_name, account_type, category)
        VALUES ('2001', 'Accounts Payable', 'liability', 'current_liabilities')
        RETURNING id INTO v_accounts_payable_id;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id,
        entry_number,
        entry_date,
        description,
        reference_type,
        reference_id,
        total_amount,
        created_by
    ) VALUES (
        gen_random_uuid(),
        v_entry_number,
        CURRENT_DATE,
        format('Refund for Purchase Return - %s', p_refund_method),
        'refund',
        p_reference_id,
        p_refund_amount,
        auth.uid()
    ) RETURNING id INTO v_journal_entry_id;
    
    -- DEBIT: Accounts Payable (reduces liability)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        line_number,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) VALUES (
        v_journal_entry_id,
        v_line_number,
        v_accounts_payable_id,
        p_refund_amount,
        0,
        format('Refund to supplier - %s', p_refund_method)
    );
    
    v_line_number := v_line_number + 1;
    
    -- CREDIT: Cash or Bank (reduces asset)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        line_number,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) VALUES (
        v_journal_entry_id,
        v_line_number,
        CASE 
            WHEN p_refund_method = 'cash' THEN v_cash_account_id
            ELSE v_bank_account_id
        END,
        0,
        p_refund_amount,
        format('Refund payment via %s', p_refund_method)
    );
    
    -- Update account balances
    PERFORM update_account_balance(v_accounts_payable_id);
    PERFORM update_account_balance(
        CASE 
            WHEN p_refund_method = 'cash' THEN v_cash_account_id
            ELSE v_bank_account_id
        END
    );
    
    RETURN v_journal_entry_id;
END;
$$;

-- 11. Update purchase_events constraint to include refund events
ALTER TABLE purchase_events 
DROP CONSTRAINT IF EXISTS purchase_events_event_type_check;

ALTER TABLE purchase_events 
ADD CONSTRAINT purchase_events_event_type_check 
CHECK (event_type IN (
    'order_placed', 'partial_receipt', 'full_receipt', 
    'partial_return', 'full_return', 'cancelled', 
    'status_change', 'balance_resolved', 'payment_made', 
    'payment_voided', 'refund_calculated', 'refund_completed', 
    'refund_failed'
));

-- 12. Create view for refund summary
CREATE OR REPLACE VIEW refund_summary AS
SELECT 
    pr.id as return_id,
    pr.return_number,
    pr.total_amount as return_amount,
    pr.refund_status,
    pr.refund_amount,
    pr.refund_processed_at,
    pr.auto_refund_eligible,
    p.purchase_number,
    p.created_at as purchase_date,
    s.name as supplier_name,
    COUNT(rt.id) as refund_transactions_count,
    COALESCE(SUM(CASE WHEN rt.status = 'completed' THEN rt.refund_amount ELSE 0 END), 0) as completed_refunds,
    COALESCE(SUM(CASE WHEN rt.status = 'pending' THEN rt.refund_amount ELSE 0 END), 0) as pending_refunds,
    COALESCE(SUM(CASE WHEN rt.status = 'failed' THEN rt.refund_amount ELSE 0 END), 0) as failed_refunds
FROM purchase_returns pr
JOIN purchases p ON pr.purchase_id = p.id
JOIN suppliers s ON p.supplier_id = s.id
LEFT JOIN refund_transactions rt ON pr.id = rt.return_id
GROUP BY pr.id, pr.return_number, pr.total_amount, pr.refund_status, 
         pr.refund_amount, pr.refund_processed_at, pr.auto_refund_eligible,
         p.purchase_number, p.created_at, s.name;

COMMENT ON TABLE refund_transactions IS 'Tracks individual refund transactions with FIFO payment source tracking';
COMMENT ON FUNCTION process_automatic_refund IS 'Processes automatic refunds using FIFO payment allocation with 30-day eligibility check';
COMMENT ON FUNCTION calculate_return_refunds IS 'Calculates proportional refund amounts using FIFO payment order';
COMMENT ON VIEW refund_summary IS 'Summary view of return refund status and transaction details'; 