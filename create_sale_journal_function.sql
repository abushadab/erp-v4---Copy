-- Create the sale journal entry function
-- This function creates journal entries when sales are made
-- Debit: Accounts Receivable (asset account) - money customers owe us
-- Credit: Sales Revenue (revenue account) - income from sales

CREATE OR REPLACE FUNCTION create_sale_journal_entry(
    p_sale_id TEXT,
    p_customer_name TEXT,
    p_total_amount DECIMAL,
    p_sale_date DATE,
    p_created_by TEXT
) RETURNS TEXT AS $$
DECLARE
    v_journal_entry_id TEXT;
    v_receivable_account_id TEXT;
    v_revenue_account_id TEXT;
BEGIN
    -- Generate journal entry ID
    v_journal_entry_id := 'JE-SALE-' || EXTRACT(EPOCH FROM NOW())::bigint::text;
    
    -- Find or create Accounts Receivable account (Asset)
    SELECT id INTO v_receivable_account_id 
    FROM accounts 
    WHERE account_name = 'Accounts Receivable' 
    LIMIT 1;
    
    -- If no receivable account exists, create one
    IF v_receivable_account_id IS NULL THEN
        -- Look for Assets category
        INSERT INTO accounts (
            account_number, 
            account_name, 
            account_code, 
            category_id, 
            description
        ) 
        SELECT 
            '1100', 
            'Accounts Receivable', 
            'AR', 
            id, 
            'Money owed by customers'
        FROM account_categories 
        WHERE category_name = 'Assets' 
        LIMIT 1
        RETURNING id INTO v_receivable_account_id;
    END IF;
    
    -- Find or create Sales Revenue account (Revenue)
    SELECT id INTO v_revenue_account_id 
    FROM accounts 
    WHERE account_name = 'Sales Revenue' 
    LIMIT 1;
    
    -- If no revenue account exists, create one
    IF v_revenue_account_id IS NULL THEN
        -- Look for Revenue category
        INSERT INTO accounts (
            account_number, 
            account_name, 
            account_code, 
            category_id, 
            description
        ) 
        SELECT 
            '4100', 
            'Sales Revenue', 
            'REV', 
            id, 
            'Income from sales'
        FROM account_categories 
        WHERE category_name = 'Revenue' 
        LIMIT 1
        RETURNING id INTO v_revenue_account_id;
    END IF;
    
    -- Create the journal entry header
    INSERT INTO journal_entries (
        id,
        description,
        reference_type,
        reference_id,
        entry_date,
        created_by
    ) VALUES (
        v_journal_entry_id,
        'Sale - ' || p_customer_name || ' (Sale: ' || p_sale_id || ')',
        'sale',
        p_sale_id,
        p_sale_date,
        p_created_by
    );
    
    -- Create journal entry lines
    -- DEBIT: Accounts Receivable (increase asset)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        description,
        debit_amount,
        credit_amount
    ) VALUES (
        v_journal_entry_id,
        v_receivable_account_id,
        'Sale to ' || p_customer_name,
        p_total_amount,
        0
    );
    
    -- CREDIT: Sales Revenue (increase revenue)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        v_revenue_account_id,
        'Revenue from sale to ' || p_customer_name,
        0,
        p_total_amount
    );
    
    RETURN v_journal_entry_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Failed to create sale journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql; 