import { createClient } from './client'
import type { 
  Account, 
  AccountCategory, 
  JournalEntry, 
  JournalEntryLine, 
  AccountWithCategory,
  JournalEntryWithLines,
  TrialBalanceRow
} from './types'

// Function-level request deduplication
const pendingRequests = new Map<string, Promise<any>>()

function withDeduplication<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existingRequest = pendingRequests.get(key)
  
  if (existingRequest) {
    console.log(`⏳ Using existing request for ${key}`)
    return existingRequest
  }
  
      // console.log(`🆕 Creating new request for ${key}`)
  const promise = fn().finally(() => {
    pendingRequests.delete(key)
  })
  
  pendingRequests.set(key, promise)
  return promise
}

export interface CreateAccountData {
  account_number: string
  account_name: string
  account_code?: string
  category_id: string
  description?: string
  opening_balance?: number
}

export interface CreateJournalEntryData {
  description: string
  reference_type?: string
  reference_id?: string
  entry_date?: string
  lines: {
    account_id: string
    description?: string
    debit_amount?: number
    credit_amount?: number
  }[]
  created_by: string
}

// Get all account categories
export async function getAccountCategories(): Promise<AccountCategory[]> {
  return withDeduplication('account_categories', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('account_categories')
      .select('*')
      .eq('status', 'active')
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching account categories:', error)
      throw error
    }

    return data || []
  })
}

// Get all accounts with their categories
export async function getAccountsWithCategories(): Promise<AccountWithCategory[]> {
  return withDeduplication('accounts_with_categories', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        *,
        account_categories (*)
      `)
      .eq('is_active', true)
      .order('account_number', { ascending: true })

    if (error) {
      console.error('Error fetching accounts:', error)
      throw error
    }

    return data || []
  })
}

// Get accounts by category type
export async function getAccountsByType(type: string): Promise<AccountWithCategory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      *,
      account_categories!inner (*)
    `)
    .eq('account_categories.type', type)
    .eq('is_active', true)
    .order('account_number', { ascending: true })

  if (error) {
    console.error('Error fetching accounts by type:', error)
    throw error
  }

  return data || []
}

// Create a new account
export async function createAccount(accountData: CreateAccountData): Promise<Account> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('accounts')
    .insert([accountData])
    .select()
    .single()

  if (error) {
    console.error('Error creating account:', error)
    throw error
  }

  return data
}

// Update account
export async function updateAccount(id: string, updates: Partial<CreateAccountData>): Promise<Account> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating account:', error)
    throw error
  }

  return data
}

// Create journal entry
export async function createJournalEntry(entryData: CreateJournalEntryData): Promise<string> {
  const supabase = createClient()
  
  // Validate that debits equal credits
  const totalDebits = entryData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
  const totalCredits = entryData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error('Debits must equal credits in journal entry')
  }
  
  // Generate entry number
  const timestamp = Date.now()
  const entryNumber = `JE-${timestamp}`
  
  // Create journal entry
  const { data: journalEntry, error: journalError } = await supabase
    .from('journal_entries')
    .insert([{
      entry_number: entryNumber,
      description: entryData.description,
      reference_type: entryData.reference_type,
      reference_id: entryData.reference_id,
      entry_date: entryData.entry_date || new Date().toISOString().split('T')[0],
      total_amount: totalDebits,
      created_by: entryData.created_by
    }])
    .select()
    .single()

  if (journalError) {
    console.error('Error creating journal entry:', journalError)
    throw journalError
  }

  // Create journal entry lines
  const lines = entryData.lines.map((line, index) => ({
    journal_entry_id: journalEntry.id,
    account_id: line.account_id,
    description: line.description,
    debit_amount: line.debit_amount || 0,
    credit_amount: line.credit_amount || 0,
    line_number: index + 1
  }))

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(lines)

  if (linesError) {
    console.error('Error creating journal entry lines:', linesError)
    throw linesError
  }

  return journalEntry.id
}

// Get journal entries with lines
export async function getJournalEntriesWithLines(): Promise<JournalEntryWithLines[]> {
  return withDeduplication('journal_entries_with_lines', async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          accounts (*)
        )
      `)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching journal entries:', error)
      throw error
    }

    return data || []
  })
}

// Get trial balance
export async function getTrialBalance(date?: string): Promise<TrialBalanceRow[]> {
  const supabase = createClient()
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .rpc('generate_trial_balance', { p_date: targetDate })

  if (error) {
    console.error('Error generating trial balance:', error)
    throw error
  }

  return data || []
}

// Get account balance at specific date
export async function getAccountBalanceAtDate(accountId: string, date: string): Promise<number> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .rpc('get_account_balance_at_date', { 
      p_account_id: accountId, 
      p_date: date 
    })

  if (error) {
    console.error('Error getting account balance:', error)
    throw error
  }

  return data || 0
}

// Get financial summary
export async function getFinancialSummary(): Promise<{
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}> {
  return withDeduplication('financial_summary', async () => {
    const accounts = await getAccountsWithCategories()
    
    const totalAssets = accounts
      .filter(a => a.account_categories.type === 'asset')
      .reduce((sum, a) => sum + (a.balance || 0), 0)
      
    const totalLiabilities = accounts
      .filter(a => a.account_categories.type === 'liability')
      .reduce((sum, a) => sum + (a.balance || 0), 0)
      
    const totalEquity = accounts
      .filter(a => a.account_categories.type === 'equity')
      .reduce((sum, a) => sum + (a.balance || 0), 0)
      
    const totalRevenue = accounts
      .filter(a => a.account_categories.type === 'revenue')
      .reduce((sum, a) => sum + (a.balance || 0), 0)
      
    const totalExpenses = accounts
      .filter(a => a.account_categories.type === 'expense')
      .reduce((sum, a) => sum + (a.balance || 0), 0)
    
    const netIncome = totalRevenue - totalExpenses

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome
    }
  })
}

// Auto-create journal entries for sales
export async function createSaleJournalEntry(
  saleId: string,
  customerName: string,
  totalAmount: number,
  saleDate: string,
  createdBy: string
): Promise<string> {
  const supabase = createClient()
  
  try {
  const { data, error } = await supabase
    .rpc('create_sale_journal_entry', {
      p_sale_id: saleId,
      p_customer_name: customerName,
      p_total_amount: totalAmount,
      p_sale_date: saleDate,
      p_created_by: createdBy
    })

  if (error) {
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating sale journal entry:', {
        error,
        message: errorMessage,
        saleId,
        customerName,
        totalAmount
      })
      throw new Error(`Failed to create sale journal entry: ${errorMessage}`)
  }

  return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Exception creating sale journal entry:', {
      error: err,
      message: errorMessage,
      saleId,
      customerName,
      totalAmount
    })
    
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_sale_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create sale journal entry: ${errorMessage}`)
  }
}

// Auto-create journal entries for returns
export async function createReturnJournalEntry(
  returnId: string,
  customerName: string,
  totalAmount: number,
  returnDate: string,
  createdBy: string
): Promise<string> {
  const supabase = createClient()
  
  try {
  const { data, error } = await supabase
    .rpc('create_return_journal_entry', {
      p_return_id: returnId,
      p_customer_name: customerName,
      p_total_amount: totalAmount,
      p_return_date: returnDate,
      p_created_by: createdBy
    })

  if (error) {
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating return journal entry:', {
        error,
        message: errorMessage,
        returnId,
        customerName,
        totalAmount
      })
      throw new Error(`Failed to create return journal entry: ${errorMessage}`)
  }

  return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Exception creating return journal entry:', {
      error: err,
      message: errorMessage,
      returnId,
      customerName,
      totalAmount
    })
    
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_return_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create return journal entry: ${errorMessage}`)
  }
}

// Auto-create journal entries for purchase returns
export async function createPurchaseReturnJournalEntry(
  returnId: string,
  purchaseId: string,
  supplierName: string,
  returnAmount: number,
  returnDate: string,
  createdBy: string
): Promise<string> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .rpc('create_purchase_return_journal_entry', {
        p_return_id: returnId,
        p_purchase_id: purchaseId,
        p_supplier_name: supplierName,
        p_return_amount: returnAmount,
        p_return_date: returnDate,
        p_created_by: createdBy
      })

    if (error) {
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating purchase return journal entry:', {
        error,
        message: errorMessage,
        returnId,
        purchaseId,
        supplierName,
        returnAmount
      })
      throw new Error(`Failed to create purchase return journal entry: ${errorMessage}`)
    }

    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Exception creating purchase return journal entry:', {
      error: err,
      message: errorMessage,
      returnId,
      purchaseId,
      supplierName,
      returnAmount
    })
    
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_purchase_return_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create purchase return journal entry: ${errorMessage}`)
  }
}

// Auto-create journal entries for purchases
export async function createPurchaseJournalEntry(
  purchaseId: string,
  supplierName: string,
  totalAmount: number,
  purchaseDate: string,
  createdBy: string
): Promise<string> {
  const supabase = createClient()
  
  try {
  const { data, error } = await supabase
    .rpc('create_purchase_journal_entry', {
      p_purchase_id: purchaseId,
      p_supplier_name: supplierName,
      p_total_amount: totalAmount,
      p_purchase_date: purchaseDate,
      p_created_by: createdBy
    })

  if (error) {
      // Handle empty error objects from Supabase
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating purchase journal entry:', {
        error,
        message: errorMessage,
        purchaseId,
        supplierName,
        totalAmount
      })
      throw new Error(`Failed to create purchase journal entry: ${errorMessage}`)
  }

  return data
  } catch (err) {
    // Handle any other errors (network, parsing, etc.)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Exception creating purchase journal entry:', {
      error: err,
      message: errorMessage,
      purchaseId,
      supplierName,
      totalAmount
    })
    
    // Check if it's a missing function error
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_purchase_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create purchase journal entry: ${errorMessage}`)
  }
}

// Auto-create journal entries for purchase receipts (only received quantities)
export async function createPurchaseReceiptJournalEntry(
  receiptId: string,
  purchaseId: string,
  supplierName: string,
  totalAmount: number,
  receiptDate: string,
  createdBy: string
): Promise<string> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .rpc('create_purchase_receipt_journal_entry', {
        p_receipt_id: receiptId,
        p_purchase_id: purchaseId,
        p_supplier_name: supplierName,
        p_total_amount: totalAmount,
        p_receipt_date: receiptDate,
        p_created_by: createdBy
      })

    if (error) {
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating purchase receipt journal entry:', {
        error,
        message: errorMessage,
        receiptId,
        purchaseId,
        supplierName,
        totalAmount
      })
      throw new Error(`Failed to create purchase receipt journal entry: ${errorMessage}`)
    }

    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Exception creating purchase receipt journal entry:', {
      error: err,
      message: errorMessage,
      receiptId,
      purchaseId,
      supplierName,
      totalAmount
    })
    
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_purchase_receipt_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create purchase receipt journal entry: ${errorMessage}`)
  }
}

/*
🔥 PAYMENT DEBUGGING IS NOW ACTIVE! 🔥

The createPaymentJournalEntry function now includes detailed console logging that will show:
- 📋 Payment details being processed
- 💰 Account balances BEFORE payment creation
- 🛠️ Database function call results
- 📊 The exact journal entry created with all debit/credit lines
- 💰 Account balances AFTER payment creation

When you create a payment, check your browser console (F12 > Console) to see the complete flow.

KEY FIXES APPLIED:
✅ Fixed create_payment_journal_entry database function - removed incorrect manual balance updates
✅ The function now lets the trigger handle balance calculations using proper account-type logic
✅ Test entries showed the real issue: we were making more payments than what we owed
✅ The real Accounts Payable balance should be ৳0 (not negative)

WHAT TO LOOK FOR:
- Journal entries should show: DR Accounts Payable, CR Cash (correct!)
- Balance calculation should use: Credits - Debits for liability accounts
- No more negative liability balances after payments
*/

// Auto-create journal entries for payments
export async function createPaymentJournalEntry(
  paymentId: string,
  purchaseId: string,
  supplierName: string,
  amount: number,
  paymentDate: string,
  paymentMethod: string,
  createdBy: string
): Promise<string> {
  const supabase = createClient()
  
  // 🔍 DETAILED LOGGING - START
  console.log('🔥 PAYMENT JOURNAL ENTRY - STARTING CREATION')
  console.log('📋 Payment Details:', {
    paymentId,
    purchaseId,
    supplierName,
    amount,
    paymentDate,
    paymentMethod,
    createdBy
  })

  // Check account balances BEFORE creating the journal entry
  try {
    const { data: accountsBefore, error: balanceError } = await supabase
      .from('accounts')
      .select('account_name, balance')
      .in('account_name', ['Cash', 'Accounts Payable'])
    
    console.log('💰 BALANCES BEFORE PAYMENT:', accountsBefore)
  } catch (err) {
    console.log('⚠️ Could not fetch balances before payment:', err)
  }
  
  try {
    console.log('🛠️ Calling database function create_payment_journal_entry...')
    const { data, error } = await supabase
      .rpc('create_payment_journal_entry', {
        p_payment_id: paymentId,
        p_purchase_id: purchaseId,
        p_supplier_name: supplierName,
        p_amount: amount,
        p_payment_date: paymentDate,
        p_payment_method: paymentMethod,
        p_created_by: createdBy
      })

    if (error) {
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('❌ ERROR creating payment journal entry:', {
        error,
        message: errorMessage,
        paymentId,
        purchaseId,
        supplierName,
        amount
      })
      throw new Error(`Failed to create payment journal entry: ${errorMessage}`)
    }

    console.log('✅ Database function returned:', data)

    // Check what journal entries were actually created
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          accounts (account_name, account_number)
        )
      `)
      .eq('id', data)
      .single()

    if (journalEntries) {
      console.log('📊 CREATED JOURNAL ENTRY:', journalEntries)
      console.log('🔑 IMPORTANT: Function returned journal_entry_id:', data)
      console.log('📋 Display entry_number:', journalEntries.entry_number)
      console.log('📝 JOURNAL LINES DETAIL:')
      journalEntries.journal_entry_lines.forEach((line: any, index: number) => {
        console.log(`   Line ${index + 1}: ${line.accounts.account_name} (${line.accounts.account_number})`)
        console.log(`     Debit: ৳${line.debit_amount || 0}, Credit: ৳${line.credit_amount || 0}`)
        console.log(`     Description: ${line.description}`)
      })
    }

    // Check account balances AFTER creating the journal entry
    const { data: accountsAfter, error: balanceError2 } = await supabase
      .from('accounts')
      .select('account_name, balance')
      .in('account_name', ['Cash', 'Accounts Payable'])
    
    console.log('💰 BALANCES AFTER PAYMENT:', accountsAfter)
    console.log('🔥 PAYMENT JOURNAL ENTRY - COMPLETED')

    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('💥 EXCEPTION creating payment journal entry:', {
      error: err,
      message: errorMessage,
      paymentId,
      purchaseId,
      supplierName,
      amount
    })
    
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_payment_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create payment journal entry: ${errorMessage}`)
  }
}

// Create reversal journal entries for voided payments
export async function createPaymentReversalJournalEntry(
  originalPaymentId: string,
  reversalPaymentId: string,
  purchaseId: string,
  supplierName: string,
  amount: number,
  reversalDate: string,
  paymentMethod: string,
  createdBy: string,
  voidReason?: string
): Promise<string> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .rpc('create_payment_reversal_journal_entry', {
        p_original_payment_id: originalPaymentId,
        p_reversal_payment_id: reversalPaymentId,
        p_purchase_id: purchaseId,
        p_supplier_name: supplierName,
        p_amount: amount,
        p_reversal_date: reversalDate,
        p_payment_method: paymentMethod,
        p_created_by: createdBy,
        p_void_reason: voidReason
      })

    if (error) {
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating payment reversal journal entry:', {
        error,
        message: errorMessage,
        originalPaymentId,
        reversalPaymentId,
        supplierName,
        amount
      })
      throw new Error(`Failed to create payment reversal journal entry: ${errorMessage}`)
    }

    return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Exception creating payment reversal journal entry:', {
      error: err,
      message: errorMessage,
      originalPaymentId,
      reversalPaymentId,
      supplierName,
      amount
    })
    
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_payment_reversal_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create payment reversal journal entry: ${errorMessage}`)
  }
}

// Auto-create journal entries for expenses
export async function createExpenseJournalEntry(
  expenseId: string,
  expenseType: string,
  amount: number,
  expenseDate: string,
  description: string,
  createdBy: string
): Promise<string> {
  const supabase = createClient()
  
  try {
  const { data, error } = await supabase
    .rpc('create_expense_journal_entry', {
      p_expense_id: expenseId,
      p_expense_type: expenseType,
      p_amount: amount,
      p_expense_date: expenseDate,
      p_description: description,
      p_created_by: createdBy
    })

  if (error) {
      const errorMessage = error.message || error.details || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating expense journal entry:', {
        error,
        message: errorMessage,
        expenseId,
        expenseType,
        amount
      })
      throw new Error(`Failed to create expense journal entry: ${errorMessage}`)
  }

  return data
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Exception creating expense journal entry:', {
      error: err,
      message: errorMessage,
      expenseId,
      expenseType,
      amount
    })
    
    if (errorMessage.includes('function') || errorMessage.includes('does not exist')) {
      throw new Error(`Database function 'create_expense_journal_entry' does not exist. Please ensure accounting integration is properly set up.`)
    }
    
    throw new Error(`Failed to create expense journal entry: ${errorMessage}`)
  }
} 