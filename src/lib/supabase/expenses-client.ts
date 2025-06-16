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
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .select('*')
    .eq('status', 'active')
    .order('name', { ascending: true })
  
  if (error) throw error
  return data || []
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
  return (data || []).map(expense => ({
    ...expense,
    expense_type_name: (expense.expense_types as any)?.name || 'Unknown'
  }))
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
} 