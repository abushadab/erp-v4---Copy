'use client'

import { useState, useCallback } from 'react'
import type { AccountWithCategory } from '@/lib/supabase/types/accounting'

export interface UseAccountFilteringReturn {
  // State
  activeTab: string
  setActiveTab: (tab: string) => void
  searchTerms: Record<string, string>
  
  // Actions
  updateSearchTerm: (tabType: string, term: string) => void
  getFilteredAccounts: (accounts: AccountWithCategory[], tabType: string) => AccountWithCategory[]
  
  // Helpers
  getAccountTypeIcon: (type: string) => string
  getAccountTypeColor: (type: string) => string
  getDisplayBalance: (balance: number, accountType: string) => string
  getBalanceColor: (balance: number, accountType: string) => string
}

export function useAccountFiltering(): UseAccountFilteringReturn {
  // Tab and search state
  const [activeTab, setActiveTab] = useState<string>('asset')
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({
    asset: '',
    liability: '',
    equity: '',
    revenue: '',
    expense: ''
  })

  // Update search term for specific tab
  const updateSearchTerm = useCallback((tabType: string, term: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [tabType]: term
    }))
  }, [])

  // Filter accounts by type and search term
  const getFilteredAccounts = useCallback((accounts: AccountWithCategory[], tabType: string): AccountWithCategory[] => {
    const searchTerm = searchTerms[tabType]?.toLowerCase() || ''
    
    return accounts.filter(account => {
      // Filter by account type
      const matchesType = account.account_categories?.type === tabType && account.is_active
      
      // Filter by search term if provided
      if (!searchTerm) return matchesType
      
      const matchesSearch = 
        account.account_name.toLowerCase().includes(searchTerm) ||
        account.account_number.toLowerCase().includes(searchTerm) ||
        (account.account_code || '').toLowerCase().includes(searchTerm) ||
        (account.description || '').toLowerCase().includes(searchTerm)
      
      return matchesType && matchesSearch
    })
  }, [searchTerms])

  // Helper functions for UI rendering - simplified for non-JSX context
  const getAccountTypeIcon = useCallback((type: string) => {
    // Return the icon class name instead of JSX to avoid React import issues
    const iconClasses: Record<string, string> = {
      asset: 'h-4 w-4 text-green-600',
      liability: 'h-4 w-4 text-red-600', 
      equity: 'h-4 w-4 text-blue-600',
      revenue: 'h-4 w-4 text-purple-600',
      expense: 'h-4 w-4 text-orange-600'
    }
    return iconClasses[type] || 'h-4 w-4'
  }, [])

  const getAccountTypeColor = useCallback((type: string) => {
    const colorMap: Record<string, string> = {
      asset: 'bg-green-100 text-green-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-blue-100 text-blue-800',
      revenue: 'bg-purple-100 text-purple-800',
      expense: 'bg-orange-100 text-orange-800'
    }
    return colorMap[type] || 'bg-gray-100 text-gray-800'
  }, [])

  const getDisplayBalance = useCallback((balance: number, accountType: string) => {
    // For revenue and liability accounts, show absolute value (positive) to users
    // For asset and expense accounts, show actual balance
    if (accountType === 'revenue' || accountType === 'liability') {
      return Math.abs(balance).toFixed(2)
    }
    return balance.toFixed(2)
  }, [])

  const getBalanceColor = useCallback((balance: number, accountType: string) => {
    // Revenue should always appear positive (green) to users
    if (accountType === 'revenue') {
      return balance !== 0 ? 'text-green-600' : 'text-gray-600'
    }
    
    // Liabilities should appear neutral or positive when they have balance
    if (accountType === 'liability') {
      return balance !== 0 ? 'text-orange-600' : 'text-gray-600'
    }
    
    // Assets and expenses: positive = green, negative = red
    return balance >= 0 ? 'text-green-600' : 'text-red-600'
  }, [])

  return {
    // State
    activeTab,
    setActiveTab,
    searchTerms,
    
    // Actions
    updateSearchTerm,
    getFilteredAccounts,
    
    // Helpers
    getAccountTypeIcon,
    getAccountTypeColor,
    getDisplayBalance,
    getBalanceColor
  }
} 