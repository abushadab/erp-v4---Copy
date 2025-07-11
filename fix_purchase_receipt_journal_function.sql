-- Fix the purchase receipt journal entry function
-- The original had a bug in the second INSERT statement missing the journal_entry_id parameter

CREATE OR REPLACE FUNCTION create_purchase_receipt_journal_entry(
    p_receipt_id TEXT,
    p_purchase_id TEXT,
    p_supplier_name TEXT,
    p_total_amount DECIMAL,
    p_receipt_date DATE,
    p_created_by TEXT
) RETURNS TEXT AS $$
DECLARE
    v_journal_entry_id TEXT;
    v_inventory_account_id TEXT;
    v_payable_account_id TEXT;
BEGIN
    -- Generate journal entry ID
    v_journal_entry_id := 'JE-RECEIPT-' || p_purchase_id || '-' || EXTRACT(EPOCH FROM NOW())::bigint::text;
    
    -- Find or create Inventory account (Asset)
    SELECT id INTO v_inventory_account_id 
    FROM accounts 
    WHERE account_name = 'Inventory' 
    LIMIT 1;
    
    -- If no inventory account exists, create one
    IF v_inventory_account_id IS NULL THEN
        -- Look for Assets category
        INSERT INTO accounts (
            account_number, 
            account_name, 
            account_code, 
            category_id, 
            description
        ) 
        SELECT 
            '1200', 
            'Inventory', 
            'INV', 
            id, 
            'Inventory assets from purchases'
        FROM account_categories 
        WHERE type = 'asset' 
        LIMIT 1
        RETURNING id INTO v_inventory_account_id;
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
        'Purchase Receipt - ' || p_supplier_name || ' (PO: ' || p_purchase_id || ')',
        'purchase_receipt',
        p_receipt_id,
        p_receipt_date,
        p_total_amount,
        'posted',
        p_created_by
    );
    
    -- Create journal entry lines
    -- DEBIT: Inventory (increase asset)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        v_journal_entry_id,
        v_inventory_account_id,
        'Inventory received from ' || p_supplier_name,
        p_total_amount,
        0
    );
    
    -- CREDIT: Accounts Payable (increase liability) - FIXED PARAMETER ORDER
    INSERT INTO journal_entry_lines (
        journal_entry_id,      -- ✅ Fixed: Now includes journal_entry_id parameter
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        v_journal_entry_id,
        v_payable_account_id,
        'Amount owed to ' || p_supplier_name,
        0,
        p_total_amount
    );
    
    RETURN v_journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Failed to create purchase receipt journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql; 