import { createClient } from './server'
import { Database } from './types'

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
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getActiveExpenseTypes() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .select('*')
    .eq('status', 'active')
    .order('name', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function getExpenseTypeById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createExpenseType(expenseType: ExpenseTypeInsert) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expense_types')
    .insert(expenseType)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateExpenseType(id: string, updates: ExpenseTypeUpdate) {
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('expense_types')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Expenses Functions
export async function getExpenses() {
  const supabase = await createClient()
  
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

export async function getExpenseById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_types!inner(name)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  
  return {
    ...data,
    expense_type_name: (data.expense_types as any)?.name || 'Unknown'
  }
}

export async function getExpensesByType(expenseTypeId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_types!inner(name)
    `)
    .eq('expense_type_id', expenseTypeId)
    .order('expense_date', { ascending: false })
  
  if (error) throw error
  
  return (data || []).map(expense => ({
    ...expense,
    expense_type_name: (expense.expense_types as any)?.name || 'Unknown'
  }))
}

export async function getExpensesByDateRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      expense_types!inner(name)
    `)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })
  
  if (error) throw error
  
  return (data || []).map(expense => ({
    ...expense,
    expense_type_name: (expense.expense_types as any)?.name || 'Unknown'
  }))
}

export async function createExpense(expense: ExpenseInsert) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
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

export async function updateExpense(id: string, updates: ExpenseUpdate) {
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Analytics Functions
export async function getTotalExpenses() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
  
  if (error) throw error
  
  return (data || []).reduce((total, expense) => total + Number(expense.amount), 0)
}

export async function getTotalExpensesByType(expenseTypeId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('expense_type_id', expenseTypeId)
  
  if (error) throw error
  
  return (data || []).reduce((total, expense) => total + Number(expense.amount), 0)
}

export async function getExpenseStats() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      amount,
      expense_date,
      expense_type_id,
      expense_types!inner(name)
    `)
  
  if (error) throw error
  
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  const currentMonthExpenses = (data || []).filter(expense => 
    expense.expense_date.startsWith(currentMonth)
  )
  
  const totalExpenses = (data || []).reduce((sum, expense) => sum + Number(expense.amount), 0)
  const currentMonthTotal = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  
  // Group by expense type
  const byType = (data || []).reduce((acc, expense) => {
    const typeName = (expense.expense_types as any)?.name || 'Unknown'
    if (!acc[typeName]) {
      acc[typeName] = 0
    }
    acc[typeName] += Number(expense.amount)
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalExpenses,
    currentMonthTotal,
    expensesByType: byType,
    totalTransactions: data?.length || 0
  }
} 