import { createClient } from './client'

/**
 * Initialize default chart of accounts with categories
 * This recreates the account structure from previous conversations
 */
export async function initializeChartOfAccounts(): Promise<void> {
  const supabase = createClient()

  try {
    console.log('🏦 Initializing chart of accounts...')

    // First, create account categories
    const categories = [
      {
        id: 'cat-assets',
        name: 'Assets',
        type: 'asset',
        description: 'Resources owned by the business',
        code: 'AST'
      },
      {
        id: 'cat-liabilities',
        name: 'Liabilities', 
        type: 'liability',
        description: 'Debts and obligations owed by the business',
        code: 'LIB'
      },
      {
        id: 'cat-equity',
        name: 'Equity',
        type: 'equity', 
        description: 'Owner\'s stake in the business',
        code: 'EQT'
      },
      {
        id: 'cat-revenue',
        name: 'Revenue',
        type: 'revenue',
        description: 'Income generated from business operations',
        code: 'REV'
      },
      {
        id: 'cat-expenses',
        name: 'Expenses',
        type: 'expense',
        description: 'Costs incurred in business operations',
        code: 'EXP'
      }
    ]

    console.log('📝 Creating account categories...')
    const { error: categoriesError } = await supabase
      .from('account_categories')
      .upsert(categories, { onConflict: 'id' })

    if (categoriesError) {
      console.error('Error creating categories:', categoriesError)
      throw categoriesError
    }

    // Create accounts for each category
    const accounts = [
      // ASSETS
      {
        id: 'acc-cash',
        account_number: '1001',
        account_name: 'Cash',
        account_code: 'CASH',
        category_id: 'cat-assets',
        description: 'Cash on hand and in bank accounts',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-accounts-receivable',
        account_number: '1100',
        account_name: 'Accounts Receivable',
        account_code: 'AR',
        category_id: 'cat-assets',
        description: 'Money owed by customers',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-inventory',
        account_number: '1200',
        account_name: 'Inventory',
        account_code: 'INV',
        category_id: 'cat-assets',
        description: 'Products and materials held for sale',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-equipment',
        account_number: '1500',
        account_name: 'Equipment',
        account_code: 'EQUIP',
        category_id: 'cat-assets',
        description: 'Business equipment and machinery',
        opening_balance: 0,
        is_active: true
      },

      // LIABILITIES
      {
        id: 'acc-accounts-payable',
        account_number: '2001',
        account_name: 'Accounts Payable',
        account_code: 'AP',
        category_id: 'cat-liabilities',
        description: 'Money owed to suppliers',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-taxes-payable',
        account_number: '2100',
        account_name: 'Taxes Payable',
        account_code: 'TAX',
        category_id: 'cat-liabilities',
        description: 'Taxes owed to government',
        opening_balance: 0,
        is_active: true
      },

      // EQUITY
      {
        id: 'acc-owners-equity',
        account_number: '3001',
        account_name: 'Owner\'s Equity',
        account_code: 'OE',
        category_id: 'cat-equity',
        description: 'Owner\'s investment in the business',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-retained-earnings',
        account_number: '3100',
        account_name: 'Retained Earnings',
        account_code: 'RE',
        category_id: 'cat-equity',
        description: 'Accumulated profits retained in business',
        opening_balance: 0,
        is_active: true
      },

      // REVENUE
      {
        id: 'acc-sales-revenue',
        account_number: '4001',
        account_name: 'Sales Revenue',
        account_code: 'SALES',
        category_id: 'cat-revenue',
        description: 'Revenue from product sales',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-service-revenue',
        account_number: '4100',
        account_name: 'Service Revenue',
        account_code: 'SERV',
        category_id: 'cat-revenue',
        description: 'Revenue from services provided',
        opening_balance: 0,
        is_active: true
      },

      // EXPENSES
      {
        id: 'acc-cogs',
        account_number: '5001',
        account_name: 'Cost of Goods Sold',
        account_code: 'COGS',
        category_id: 'cat-expenses',
        description: 'Direct costs of producing goods sold',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-rent-expense',
        account_number: '6001',
        account_name: 'Rent Expense',
        account_code: 'RENT',
        category_id: 'cat-expenses',
        description: 'Monthly rent payments',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-utilities-expense',
        account_number: '6100',
        account_name: 'Utilities Expense',
        account_code: 'UTIL',
        category_id: 'cat-expenses',
        description: 'Electricity, water, internet costs',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-salary-expense',
        account_number: '6200',
        account_name: 'Salary Expense',
        account_code: 'SAL',
        category_id: 'cat-expenses',
        description: 'Employee salary and wages',
        opening_balance: 0,
        is_active: true
      },
      {
        id: 'acc-office-supplies',
        account_number: '6300',
        account_name: 'Office Supplies Expense',
        account_code: 'OFFICE',
        category_id: 'cat-expenses',
        description: 'Office supplies and materials',
        opening_balance: 0,
        is_active: true
      }
    ]

    console.log('📊 Creating accounts...')
    const { error: accountsError } = await supabase
      .from('accounts')
      .upsert(accounts, { onConflict: 'id' })

    if (accountsError) {
      console.error('Error creating accounts:', accountsError)
      throw accountsError
    }

    console.log('✅ Chart of accounts initialized successfully!')
    console.log(`📈 Created ${categories.length} categories and ${accounts.length} accounts`)

  } catch (error) {
    console.error('Failed to initialize chart of accounts:', error)
    throw error
  }
}

// Promise-based cache for account setup check to prevent duplicate concurrent requests
let accountSetupCache: { 
  result: boolean | null; 
  timestamp: number; 
  promise: Promise<boolean> | null 
} = {
  result: null,
  timestamp: 0,
  promise: null
}

/**
 * Check if chart of accounts exists
 * Optimized to use a single RPC call to reduce API requests and prevent concurrent duplicate calls
 */
export async function checkChartOfAccountsExists(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached result if recent (within 30 seconds)
  if (accountSetupCache.result !== null && (now - accountSetupCache.timestamp) < 30000) {
    console.log('📦 Using cached account setup result:', accountSetupCache.result)
    return accountSetupCache.result
  }
  
  // If there's already a request in progress, wait for it
  if (accountSetupCache.promise) {
    console.log('⏳ Account setup check already in progress, waiting...')
    return await accountSetupCache.promise
  }
  const supabase = createClient()
  
  // Create the promise and store it in cache to prevent duplicate requests
  const checkPromise = (async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking account setup with optimized query...')
      
      // Try using the RPC function first
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('check_accounts_setup')
      
      if (!rpcError && rpcResult !== null) {
        console.log('✅ RPC account setup check successful:', rpcResult)
        
        accountSetupCache = {
          result: rpcResult,
          timestamp: now,
          promise: null
        }
        
        return rpcResult
      }
      
      console.log('⚠️ RPC not available, falling back to parallel queries:', rpcError)
      
      // Fallback to parallel queries if RPC is not available
      const [categoriesResult, accountsResult] = await Promise.all([
        supabase.from('account_categories').select('id').limit(1),
        supabase.from('accounts').select('id').limit(1)
      ])
      
      const hasData = (categoriesResult.data && categoriesResult.data.length > 0) && 
                     (accountsResult.data && accountsResult.data.length > 0)
      
      accountSetupCache = {
        result: hasData,
        timestamp: now,
        promise: null
      }
      
      return hasData
      
    } catch (error) {
      console.error('❌ Error checking account setup:', error)
      
      // Cache negative result for shorter time (10 seconds) to allow quick retry
      accountSetupCache = {
        result: false,
        timestamp: now - 20000, // Make it expire quickly for retry
        promise: null
      }
      
      return false
    }
  })()
  
  // Store the promise in cache
  accountSetupCache.promise = checkPromise
  
  // Return the promise result
  return await checkPromise
} 