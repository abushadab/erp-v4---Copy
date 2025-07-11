'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { 
  getAccountsWithCategories,
  getAccountCategories,
  getFinancialSummary,
  type CreateAccountData
} from '@/lib/supabase/accounts-client'
import type { AccountWithCategory, AccountCategory } from '@/lib/supabase/types/accounting'
import { apiCache } from '@/lib/supabase/cache'

interface FinancialSummary {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

export interface UseAccountsDataReturn {
  // Data
  accounts: AccountWithCategory[]
  categories: AccountCategory[]
  financialSummary: FinancialSummary | null
  
  // Loading states
  loading: boolean
  refreshing: boolean
  
  // Methods
  loadData: (forceRefresh?: boolean) => Promise<void>
  refreshData: () => Promise<void>
}

export function useAccountsData(): UseAccountsDataReturn {
  // State for data
  const [accounts, setAccounts] = useState<AccountWithCategory[]>([])
  const [categories, setCategories] = useState<AccountCategory[]>([])
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Load data with enhanced caching and deduplication
  const loadData = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate calls if not force refresh
    if (!forceRefresh && (loading || refreshing)) {
      return
    }

    try {
      // Set appropriate loading state
      if (forceRefresh) {
        setRefreshing(true)
      } else if (!accounts.length) {
        setLoading(true)
      }
      
      const [accountsData, categoriesData, financialSummaryData] = await Promise.all([
        forceRefresh 
          ? getAccountsWithCategories() 
          : apiCache.get('accounts-with-categories', () => getAccountsWithCategories()),
        forceRefresh 
          ? getAccountCategories() 
          : apiCache.get('account-categories', () => getAccountCategories()),
        forceRefresh 
          ? getFinancialSummary() 
          : apiCache.get('financial-summary', () => getFinancialSummary())
      ])
      
      setAccounts(accountsData)
      setCategories(categoriesData)
      setFinancialSummary(financialSummaryData)
      
    } catch (error) {
      console.error('Error loading accounts data:', error)
      
      // Provide fallback data on error
      setAccounts([])
      setCategories([])
      setFinancialSummary(null)
      
      toast.error('Failed to load accounts data. Please refresh the page.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [loading, refreshing])

  // Refresh data function
  const refreshData = useCallback(async () => {
    await loadData(true)
    toast.success("Data refreshed successfully.")
  }, [loadData])

  // Load initial data on mount
  useEffect(() => {
    loadData(false)
  }, [])

  return {
    // Data
    accounts,
    categories,
    financialSummary,
    
    // Loading states
    loading,
    refreshing,
    
    // Methods
    loadData,
    refreshData
  }
} 