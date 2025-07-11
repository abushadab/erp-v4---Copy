"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { toast } from "sonner"
import { 
  Plus, 
  Search, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  CreditCard,
  Banknote,
  Loader2,
  RefreshCw,
  Edit3,
  Smartphone,
  Wallet
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { 
  getAccountsWithCategories,
  getAccountCategories,
  getFinancialSummary,
  createAccount,
  updateAccount,
  type CreateAccountData
} from "@/lib/supabase/accounts-client"
import { logAccountCreate, logAccountUpdate } from "@/lib/supabase/activity-logger"
import type { AccountWithCategory, AccountCategory } from "@/lib/supabase/types"

// Import our custom hooks
import { useAccountsData, useAccountForm, useAccountFiltering } from "@/hooks/accounts"

// Import our UI components
import { AccountsHeader } from "@/components/accounts/AccountsHeader"
import { FinancialSummaryCards } from "@/components/accounts/FinancialSummaryCards"
import { AccountCard } from "@/components/accounts/AccountCard"
import { AccountsLoadingSkeleton } from "@/components/accounts/AccountsLoadingSkeleton"
import { AccountModal } from "@/components/accounts/modals"

// Import shared constants and types
import { PAYMENT_METHOD_TYPE_OPTIONS } from "@/lib/constants/payment-methods"

interface FinancialSummary {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

// Global data cache and request deduplication to prevent multiple API calls
const dataCache = {
  accounts: null as AccountWithCategory[] | null,
  categories: null as AccountCategory[] | null,
  financialSummary: null as FinancialSummary | null,
  lastFetch: 0,
  isLoading: false,
  currentRequest: null as Promise<void> | null
}

// Function to clear cache (can be called from other pages)
const clearAccountsCache = () => {
  dataCache.accounts = null
  dataCache.categories = null
  dataCache.financialSummary = null
  dataCache.lastFetch = 0
  dataCache.currentRequest = null
  console.log('🗑️ Accounts cache cleared')
}

const CACHE_DURATION = 30000 // 30 seconds

// Global debugging utility for accounts cache
if (typeof window !== 'undefined') {
  (window as any).clearAccountsCache = () => {
    dataCache.accounts = null
    dataCache.categories = null
    dataCache.financialSummary = null
    dataCache.lastFetch = 0
    dataCache.isLoading = false
    dataCache.currentRequest = null
    console.log('🧹 Accounts cache cleared')
  }
  
  (window as any).debugAccountsCache = () => {
    console.log('🔍 Accounts Cache Debug:', {
      hasAccounts: !!dataCache.accounts,
      accountsCount: dataCache.accounts?.length || 0,
      hasCategories: !!dataCache.categories,
      categoriesCount: dataCache.categories?.length || 0,
      hasFinancialSummary: !!dataCache.financialSummary,
      lastFetch: new Date(dataCache.lastFetch).toISOString(),
      isLoading: dataCache.isLoading,
      hasCurrentRequest: !!dataCache.currentRequest,
      cacheAge: Date.now() - dataCache.lastFetch
    })
  }
  
  // Add session debugging
  (window as any).debugAccountsSession = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('🔍 Accounts Session Debug:', {
        hasSession: !!session,
        userId: session?.user?.id || 'None',
        userEmail: session?.user?.email || 'None',
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'None',
        error: error?.message || 'None'
      })
    } catch (err) {
      console.error('❌ Session debug error:', err)
    }
  }
}

export default function AccountsPage() {
  // Use our custom hooks for clean separation of concerns
  const { 
    accounts, 
    categories, 
    financialSummary, 
    loading, 
    refreshing, 
    refreshData,
    loadData 
  } = useAccountsData()

  const {
    isAddAccountDialogOpen,
    setIsAddAccountDialogOpen,
    newAccount,
    setNewAccount,
    useAsPaymentMethod,
    setUseAsPaymentMethod,
    paymentMethodType,
    setPaymentMethodType,
    bankAccountNumber,
    setBankAccountNumber,
    isSubmitting,
    isEditAccountDialogOpen,
    setIsEditAccountDialogOpen,
    editingAccount,
    editAccount,
    setEditAccount,
    editUseAsPaymentMethod,
    setEditUseAsPaymentMethod,
    editPaymentMethodType,
    setEditPaymentMethodType,
    editBankAccountNumber,
    setEditBankAccountNumber,
    isEditSubmitting,
    handleAddAccount,
    handleEditAccount,
    handleUpdateAccount,
    resetForms,
    isSelectedCategoryAsset
  } = useAccountForm(categories, loadData, loadData)

  const {
    activeTab,
    setActiveTab,
    searchTerms,
    updateSearchTerm,
    getFilteredAccounts,
    getDisplayBalance,
  } = useAccountFiltering()

  // Group props for Add modal
  const addModalFormState = {
    account: newAccount,
    useAsPaymentMethod,
    paymentMethodType,
    bankAccountNumber
  }

  const addModalHandlers = {
    setAccount: setNewAccount,
    setUseAsPaymentMethod,
    setPaymentMethodType,
    setBankAccountNumber
  }

  // Group props for Edit modal
  const editModalFormState = {
    account: editAccount,
    useAsPaymentMethod: editUseAsPaymentMethod,
    paymentMethodType: editPaymentMethodType,
    bankAccountNumber: editBankAccountNumber
  }

  const editModalHandlers = {
    setAccount: setEditAccount,
    setUseAsPaymentMethod: setEditUseAsPaymentMethod,
    setPaymentMethodType: setEditPaymentMethodType,
    setBankAccountNumber: setEditBankAccountNumber
  }

  // Show loading skeleton while data is being fetched
  if (loading) {
    return <AccountsLoadingSkeleton />
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header Component */}
      <AccountsHeader 
        refreshing={refreshing}
        onRefresh={refreshData}
        onAddAccount={() => setIsAddAccountDialogOpen(true)}
      />

      {/* Financial Summary Component */}
      {financialSummary && (
        <FinancialSummaryCards financialSummary={financialSummary} />
      )}

      {/* Chart of Accounts with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Chart of Accounts</CardTitle>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 sm:px-6">
            <TabsList className="flex flex-wrap justify-start bg-transparent p-0 h-auto gap-1 w-full">
              {['asset', 'liability', 'equity', 'revenue', 'expense'].map((tabType) => {
                const count = accounts.filter((a: AccountWithCategory) => a.account_categories?.type === tabType && a.is_active).length
                const iconMap = {
                  asset: Building,
                  liability: CreditCard,
                  equity: DollarSign,
                  revenue: TrendingUp,
                  expense: TrendingDown
                }
                const IconComponent = iconMap[tabType as keyof typeof iconMap]

                return (
                  <TabsTrigger 
                    key={tabType}
                    value={tabType} 
                    className="flex items-center space-x-1 cursor-pointer bg-transparent data-[state=active]:bg-black data-[state=active]:text-white text-xs px-2 py-1.5 flex-shrink-0"
                  >
                    <IconComponent className="h-3 w-3" />
                    <span className="capitalize">{tabType}s</span>
                    <span className="ml-1 h-5 w-5 flex items-center justify-center bg-white text-black text-xs font-medium rounded-full border">
                      {count}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {['asset', 'liability', 'equity', 'revenue', 'expense'].map((tabType) => {
            const filteredAccounts = getFilteredAccounts(accounts, tabType)

            return (
              <TabsContent key={tabType} value={tabType} className="mt-0">
                <CardContent className="pt-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${tabType} accounts...`}
                      value={searchTerms[tabType] || ''}
                      onChange={(e) => updateSearchTerm(tabType, e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredAccounts.map((account: AccountWithCategory) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onEdit={handleEditAccount}
                        getDisplayBalance={getDisplayBalance}
                        paymentMethodTypeOptions={PAYMENT_METHOD_TYPE_OPTIONS}
                      />
                    ))}
                    {filteredAccounts.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        <p>No {tabType} accounts found{searchTerms[tabType] ? ' matching your search' : ''}.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </TabsContent>
            )
          })}
        </Tabs>
      </Card>

      {/* Add Account Modal */}
      <AccountModal
        mode="add"
        isOpen={isAddAccountDialogOpen}
        onOpenChange={setIsAddAccountDialogOpen}
        categories={categories}
        formState={addModalFormState}
        handlers={addModalHandlers}
        isSubmitting={isSubmitting}
        onSubmit={handleAddAccount}
        onReset={resetForms}
        isSelectedCategoryAsset={isSelectedCategoryAsset}
      />

      {/* Edit Account Modal */}
      <AccountModal
        mode="edit"
        isOpen={isEditAccountDialogOpen}
        onOpenChange={setIsEditAccountDialogOpen}
        categories={categories}
        formState={editModalFormState}
        handlers={editModalHandlers}
        isSubmitting={isEditSubmitting}
        onSubmit={handleUpdateAccount}
        onReset={resetForms}
        isSelectedCategoryAsset={isSelectedCategoryAsset}
      />
    </div>
  )
} 

// Clear cache to ensure fresh data shows the new Bangladeshi MFS accounts
if (typeof window !== 'undefined') {
  setTimeout(() => {
    (window as any).clearAccountsCache?.();
  }, 100);
} 