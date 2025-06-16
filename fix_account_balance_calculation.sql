-- Fix account balance calculation to properly handle different account types
-- Asset accounts: Balance = Debits - Credits
-- Liability accounts: Balance = Credits - Debits  
-- Equity accounts: Balance = Credits - Debits
-- Revenue accounts: Balance = Credits - Debits
-- Expense accounts: Balance = Debits - Credits

CREATE OR REPLACE FUNCTION get_account_balance_at_date(
    p_account_id TEXT,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
    v_balance DECIMAL := 0;
    v_account_type TEXT;
    v_total_debits DECIMAL := 0;
    v_total_credits DECIMAL := 0;
BEGIN
    -- Get the account type
    SELECT ac.type 
    INTO v_account_type
    FROM accounts a
    JOIN account_categories ac ON a.category_id = ac.id
    WHERE a.id = p_account_id;
    
    -- Calculate total debits and credits up to the specified date
    SELECT 
        COALESCE(SUM(jel.debit_amount), 0),
        COALESCE(SUM(jel.credit_amount), 0)
    INTO v_total_debits, v_total_credits
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_id = p_account_id
    AND je.entry_date <= p_date
    AND je.status = 'posted';
    
    -- Calculate balance based on account type
    CASE 
        WHEN v_account_type IN ('asset', 'expense') THEN
            v_balance := v_total_debits - v_total_credits;
        WHEN v_account_type IN ('liability', 'equity', 'revenue') THEN
            v_balance := v_total_credits - v_total_debits;
        ELSE
            -- Default to asset calculation for unknown types
            v_balance := v_total_debits - v_total_credits;
    END CASE;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Drop existing generate_trial_balance function if it exists
DROP FUNCTION IF EXISTS generate_trial_balance(DATE);
DROP FUNCTION IF EXISTS generate_trial_balance();

-- Also create a function to generate trial balance with correct calculations
CREATE OR REPLACE FUNCTION generate_trial_balance(
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    account_id TEXT,
    account_number TEXT,
    account_name TEXT,
    account_type TEXT,
    debit_balance DECIMAL,
    credit_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id::TEXT,
        a.account_number,
        a.account_name,
        ac.type,
        CASE 
            WHEN get_account_balance_at_date(a.id, p_date) >= 0 
                AND ac.type IN ('asset', 'expense') 
            THEN get_account_balance_at_date(a.id, p_date)
            WHEN get_account_balance_at_date(a.id, p_date) < 0 
                AND ac.type IN ('liability', 'equity', 'revenue')
            THEN ABS(get_account_balance_at_date(a.id, p_date))
            ELSE 0
        END as debit_balance,
        CASE 
            WHEN get_account_balance_at_date(a.id, p_date) >= 0 
                AND ac.type IN ('liability', 'equity', 'revenue') 
            THEN get_account_balance_at_date(a.id, p_date)
            WHEN get_account_balance_at_date(a.id, p_date) < 0 
                AND ac.type IN ('asset', 'expense')
            THEN ABS(get_account_balance_at_date(a.id, p_date))
            ELSE 0
        END as credit_balance
    FROM accounts a
    JOIN account_categories ac ON a.category_id = ac.id
    WHERE a.is_active = true
    ORDER BY a.account_number;
END;
$$ LANGUAGE plpgsql;

-- Update accounts table with correct balances
-- This will recalculate all account balances using the correct method
UPDATE accounts 
SET balance = get_account_balance_at_date(id, CURRENT_DATE)
WHERE is_active = true; 