import { createClient } from './client'
import type { Database } from './types'
import { createExpenseJournalEntry } from './accounts-client'

export type ExpenseType = Database['public']['Tables']['expense_types']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row'] & {
  expense_type_name?: string
}
export type ExpenseTypeInsert = Database['public']['Tables']['expense_types']['Insert']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseTypeUpdate = Database['public']['Tables']['expense_types']['Update']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

// Global cache for expenses data to prevent duplicate API calls
const expensesCache = new Map<string, {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}>();

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for expenses data

/**
 * Clear expenses cache (useful after creating/updating/deleting expenses)
 */
export function clearExpensesCache(key?: string): void {
  if (key) {
    console.log('🗑️ Clearing expenses cache for:', key);
    expensesCache.delete(key);
  } else {
    console.log('🗑️ Clearing all expenses cache');
    expensesCache.clear();
  }
}

// Expense Types Functions
export async function getExpenseTypes() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getActiveExpenseTypes() {
  const cacheKey = 'active_expense_types';
  console.log('🔍 getActiveExpenseTypes called');
  
  const now = Date.now();
  const cached = expensesCache.get(cacheKey);
  
  // Return cached data if it's fresh
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log('📦 Using cached active expense types data');
    return cached.data;
  }
  
  // If there's already a request in progress, wait for it
  if (cached?.promise) {
    console.log('⏳ Request already in progress for active expense types - waiting for existing promise...');
    return await cached.promise;
  }
  
  // Create new request promise
  const requestPromise = (async () => {
    try {
      console.log('🔄 Fetching fresh active expense types data from API');
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true })
      
      if (error) throw error
      
      const result = data || [];
      
      // Update cache with result
      expensesCache.set(cacheKey, {
        data: result,
        timestamp: now,
        promise: undefined
      });
      
      console.log('✅ Active expense types data fetched and cached');
      return result;
    } catch (error) {
      // Remove the promise from cache on error so next call can retry
      const currentCached = expensesCache.get(cacheKey);
      if (currentCached) {
        expensesCache.set(cacheKey, {
          ...currentCached,
          promise: undefined
        });
      }
      
      console.error('❌ Error in getActiveExpenseTypes:', error);
      throw error;
    }
  })();
  
  // Store the promise in cache
  expensesCache.set(cacheKey, {
    data: cached?.data || [],
    timestamp: cached?.timestamp || 0,
    promise: requestPromise
  });
  
  return await requestPromise;
}

export async function createExpenseType(expenseType: ExpenseTypeInsert) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .insert(expenseType)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateExpenseType(id: string, updates: ExpenseTypeUpdate) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteExpenseType(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('expense_types')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Expenses Functions
export async function getExpenses() {
  const cacheKey = 'expenses_list';
  // console.log('🔍 getExpenses called');
  
  const now = Date.now();
  const cached = expensesCache.get(cacheKey);
  
  // Return cached data if it's fresh
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log('📦 Using cached expenses data');
    return cached.data;
  }
  
  // If there's already a request in progress, wait for it
  if (cached?.promise) {
    console.log('⏳ Request already in progress for expenses - waiting for existing promise...');
    return await cached.promise;
  }
  
  // Create new request promise
  const requestPromise = (async () => {
    try {
      // console.log('🔄 Fetching fresh expenses data from API');
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_types!inner(name)
        `)
        .order('expense_date', { ascending: false })
      
      if (error) throw error
      
      // Transform data to match frontend expectations
      const result = (data || []).map(expense => ({
        ...expense,
        expense_type_name: (expense.expense_types as any)?.name || 'Unknown'
      }));
      
      // Update cache with result
      expensesCache.set(cacheKey, {
        data: result,
        timestamp: now,
        promise: undefined
      });
      
        // console.log('✅ Expenses data fetched and cached');
      return result;
    } catch (error) {
      // Remove the promise from cache on error so next call can retry
      const currentCached = expensesCache.get(cacheKey);
      if (currentCached) {
        expensesCache.set(cacheKey, {
          ...currentCached,
          promise: undefined
        });
      }
      
      console.error('❌ Error in getExpenses:', error);
      throw error;
    }
  })();
  
  // Store the promise in cache
  expensesCache.set(cacheKey, {
    data: cached?.data || [],
    timestamp: cached?.timestamp || 0,
    promise: requestPromise
  });
  
  return await requestPromise;
}

export async function createExpense(expense: ExpenseInsert) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select(`
      *,
      expense_types!inner(name)
    `)
    .single()
  
  if (error) throw error
  
  const result = {
    ...data,
    expense_type_name: (data.expense_types as any)?.name || 'Unknown'
  }

  // 📊 ACCOUNTING INTEGRATION: Create journal entry for the expense
  try {
    console.log('💰 Creating journal entry for expense:', data.id)
    await createExpenseJournalEntry(
      data.id,
      result.expense_type_name,
      data.amount || 0,
      data.expense_date || new Date().toISOString(),
      data.description || 'Expense transaction',
      'system' // TODO: Replace with actual user ID
    )
    console.log('✅ Journal entry created for expense')
  } catch (journalError) {
    console.error('⚠️ Failed to create journal entry for expense:', journalError)
    // Don't throw error - expense was successful, accounting entry failed
  }
  
  // Clear cache since data has changed
  clearExpensesCache('expenses_list');
  
  return result
}

export async function updateExpense(id: string, updates: ExpenseUpdate) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      expense_types!inner(name)
    `)
    .single()
  
  if (error) throw error
  
  // Clear cache since data has changed
  clearExpensesCache('expenses_list');
  
  return {
    ...data,
    expense_type_name: (data.expense_types as any)?.name || 'Unknown'
  }
}

export async function deleteExpense(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  
  // Clear cache since data has changed
  clearExpensesCache('expenses_list');
} 