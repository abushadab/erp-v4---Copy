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
  // Ref to track if initial load has been triggered
  const initialLoadTriggered = React.useRef(false)
  
  // Data state
  const [accounts, setAccounts] = React.useState<AccountWithCategory[]>([])
  const [categories, setCategories] = React.useState<AccountCategory[]>([])

  const [financialSummary, setFinancialSummary] = React.useState<FinancialSummary | null>(null)
  
  // Loading states
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = React.useState<string>('asset')
  const [searchTerms, setSearchTerms] = React.useState<Record<string, string>>({
    asset: '',
    liability: '',
    equity: '',
    revenue: '',
    expense: ''
  })
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = React.useState(false)
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<AccountWithCategory | null>(null)


  // Form states
  const [newAccount, setNewAccount] = React.useState<Partial<CreateAccountData>>({})
  const [editAccount, setEditAccount] = React.useState<Partial<CreateAccountData>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false)
  const [useAsPaymentMethod, setUseAsPaymentMethod] = React.useState(false)
  const [editUseAsPaymentMethod, setEditUseAsPaymentMethod] = React.useState(false)
  const [paymentMethodType, setPaymentMethodType] = React.useState('')
  const [editPaymentMethodType, setEditPaymentMethodType] = React.useState('')
  const [bankAccountNumber, setBankAccountNumber] = React.useState('')
  const [editBankAccountNumber, setEditBankAccountNumber] = React.useState('')

  // Payment method type options (perfect for Bangladesh)
  const paymentMethodTypeOptions = [
    { value: 'bank', label: 'Bank Account', description: 'Traditional bank accounts', icon: Building },
    { value: 'mfs', label: 'Mobile Financial Service', description: 'Bkash, Nagad, Rocket, etc.', icon: Smartphone },
    { value: 'cash', label: 'Cash/Liquid', description: 'Physical cash or petty cash', icon: Banknote },
    { value: 'card', label: 'Card Account', description: 'Credit/Debit card accounts', icon: CreditCard }
  ]
  
  // Data loading function with enhanced request deduplication
  const loadAccountsData = async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadAccountsData called with forceRefresh:', forceRefresh)
    
    // If force refresh, clear any existing request and skip cache check
    if (forceRefresh) {
      console.log('🔄 Force refresh requested - clearing current request and cache')
      dataCache.currentRequest = null
      // Don't return early - proceed to fetch fresh data
    } else {
      // Check cache first - only use cache if data exists and is fresh
      if (dataCache.accounts && 
          dataCache.categories && 
          dataCache.financialSummary && 
          (now - dataCache.lastFetch) < CACHE_DURATION) {
        console.log('📦 Using cached data')
        setAccounts(dataCache.accounts)
        setCategories(dataCache.categories)
        setFinancialSummary(dataCache.financialSummary)
        setLoading(false)
        return
      }

      // If there's already a request in progress, wait for it with timeout
      if (dataCache.currentRequest) {
        console.log('⏳ Request already in progress, waiting for existing promise...')
        try {
          // Wait for existing promise with 10-second timeout (matches client-level timeout)
          await Promise.race([
            dataCache.currentRequest,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout waiting for existing request')), 10000)
            )
          ])
          
          // After the request completes, update state with cached data
          if (dataCache.accounts && dataCache.categories && dataCache.financialSummary) {
            console.log('📦 Using data from completed request')
            setAccounts(dataCache.accounts)
            setCategories(dataCache.categories)
            setFinancialSummary(dataCache.financialSummary)
            setLoading(false)
          }
        } catch (error) {
          console.error('⚠️ Error or timeout in concurrent request:', error)
          // Clear stuck promise and proceed with fresh request
          dataCache.currentRequest = null
        }
        
        // If we successfully used cached data, return
        if (dataCache.accounts && dataCache.categories && dataCache.financialSummary) {
          return
        }
      }
    }

    // Create a new request promise with simplified error handling
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh data from API')
        setLoading(true)
        
        // Fetch data (timeout protection is now handled in accounts-client.ts)
        const [accountsData, categoriesData, summaryData] = await Promise.all([
          getAccountsWithCategories(),
          getAccountCategories(),
          getFinancialSummary()
        ])
        
        console.log('✅ Data fetched successfully')
        
        // Update cache
        dataCache.accounts = accountsData
        dataCache.categories = categoriesData
        dataCache.financialSummary = summaryData
        dataCache.lastFetch = now
        
        // Update state
        setAccounts(accountsData)
        setCategories(categoriesData)
        setFinancialSummary(summaryData)
        
      } catch (error) {
        console.error('❌ Error loading accounts data:', error)
        
        // Fallback to cached data if available
        if (dataCache.accounts && dataCache.categories && dataCache.financialSummary) {
          console.log('🔄 Using stale cached data as fallback')
          setAccounts(dataCache.accounts)
          setCategories(dataCache.categories)
          setFinancialSummary(dataCache.financialSummary)
        } else {
          // Set empty data as fallback
          setAccounts([])
          setCategories([])
          setFinancialSummary(null)
          toast.error("Failed to load accounts data. Please try refreshing.")
        }
        
      } finally {
        console.log('🏁 Request completed, setting loading to false')
        setLoading(false)
        setRefreshing(false)
        dataCache.currentRequest = null
      }
    })()

    // Store the request promise so other calls can wait for it
    dataCache.currentRequest = requestPromise
    
    // Wait for the request to complete
    await requestPromise
  }

  // Load initial data only once
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering data fetch')
      initialLoadTriggered.current = true
      loadAccountsData(false)
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, []) // Empty dependency array to run only once on mount

  const refreshData = async () => {
    setRefreshing(true)
    await loadAccountsData(true) // Force refresh
    toast.success("Data refreshed successfully.")
  }

  const handleAddAccount = async () => {
    if (!newAccount.account_number || !newAccount.account_name || !newAccount.category_id) {
      toast.error("Please fill in all required fields.")
      return
    }

    try {
      setIsSubmitting(true)
      
      // Create the account with payment method flag and type
      // Note: bank_account_number will be added to database schema later
      const accountData = {
        ...newAccount,
        is_payment_method: useAsPaymentMethod,
        payment_method_type: useAsPaymentMethod ? paymentMethodType : null
      } as CreateAccountData
      
      const createdAccount = await createAccount(accountData)
      
      // Log the activity
      await logAccountCreate(
        createdAccount.id,
        createdAccount.account_name,
        {
          account_number: createdAccount.account_number,
          account_code: createdAccount.account_code,
          category_id: createdAccount.category_id,
          description: createdAccount.description,
          is_payment_method: useAsPaymentMethod,
          payment_method_type: useAsPaymentMethod ? paymentMethodType : null
        }
      )
      
      // Clear all cached data and force refresh
      console.log('🗑️ Clearing cache after account creation')
      dataCache.accounts = null
      dataCache.categories = null
      dataCache.financialSummary = null
      dataCache.lastFetch = 0
      dataCache.currentRequest = null
      
      // Also clear the accounts client cache
      if (typeof window !== 'undefined' && (window as any).clearAccountsClientCache) {
        (window as any).clearAccountsClientCache()
      }
      
      // Force reload with fresh data
      console.log('🔄 Force reloading data after creation')
      await loadAccountsData(true)
      console.log('✅ Data reloaded after creation')
      
      setIsAddAccountDialogOpen(false)
      setNewAccount({})
      setUseAsPaymentMethod(false)
      toast.success("Account created successfully.")
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error("Failed to create account. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle opening edit modal
  const handleEditAccount = (account: AccountWithCategory) => {
    setEditingAccount(account)
    setEditAccount({
      account_name: account.account_name,
      account_code: account.account_code || '',
      category_id: account.category_id,
      description: account.description || ''
    })
    // Set the payment method checkbox and type to current values
    setEditUseAsPaymentMethod(account.is_payment_method || false)
    setEditPaymentMethodType(account.payment_method_type || '')
    // Note: bank_account_number is not yet in database schema, so we reset it to empty
    setEditBankAccountNumber('')
    setIsEditAccountDialogOpen(true)
  }

  // Handle updating account
  const handleUpdateAccount = async () => {
    if (!editingAccount || !editAccount.account_name || !editAccount.category_id) {
      toast.error("Please fill in all required fields.")
      return
    }

    try {
      setIsEditSubmitting(true)
      
      // Store old values for logging
      const oldData = {
        account_name: editingAccount.account_name,
        account_code: editingAccount.account_code,
        category_id: editingAccount.category_id,
        description: editingAccount.description,
        is_payment_method: editingAccount.is_payment_method,
        payment_method_type: editingAccount.payment_method_type
      }
      
      // Update the account with payment method flag and type
      // Note: bank_account_number will be added to database schema later
      const updateData = {
        ...editAccount,
        is_payment_method: editUseAsPaymentMethod,
        payment_method_type: editUseAsPaymentMethod ? editPaymentMethodType : null
      } as CreateAccountData
      
      const updatedAccount = await updateAccount(editingAccount.id, updateData)
      
      // Log the activity
      await logAccountUpdate(
        updatedAccount.id,
        updatedAccount.account_name,
        oldData,
        {
          account_name: updatedAccount.account_name,
          account_code: updatedAccount.account_code,
          category_id: updatedAccount.category_id,
          description: updatedAccount.description,
          is_payment_method: editUseAsPaymentMethod,
          payment_method_type: editUseAsPaymentMethod ? editPaymentMethodType : null
        }
      )
      
      // Clear all cached data and force refresh
      console.log('🗑️ Clearing cache after account update')
      dataCache.accounts = null
      dataCache.categories = null
      dataCache.financialSummary = null
      dataCache.lastFetch = 0
      dataCache.currentRequest = null
      
      // Also clear the accounts client cache
      if (typeof window !== 'undefined' && (window as any).clearAccountsClientCache) {
        (window as any).clearAccountsClientCache()
      }
      
      // Force reload with fresh data
      console.log('🔄 Force reloading data after update')
      await loadAccountsData(true)
      console.log('✅ Data reloaded after update')
      
      setIsEditAccountDialogOpen(false)
      setEditingAccount(null)
      setEditAccount({})
      setEditUseAsPaymentMethod(false)
      setEditPaymentMethodType('')
      setEditBankAccountNumber('')
      toast.success("Account updated successfully.")
    } catch (error) {
      console.error('Error updating account:', error)
      toast.error("Failed to update account. Please try again.")
    } finally {
      setIsEditSubmitting(false)
    }
  }



  // Memoized filtered accounts for the active tab
  const filteredAccounts = React.useMemo(() => {
    const currentSearchTerm = searchTerms[activeTab] || ''
    return accounts.filter(account => {
      const matchesSearch = account.account_name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
                           account.account_number.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
                           (account.description || '').toLowerCase().includes(currentSearchTerm.toLowerCase())
      const matchesType = account.account_categories?.type === activeTab
      return matchesSearch && matchesType && account.is_active
    })
  }, [accounts, searchTerms, activeTab])

  // Helper function to update search term for specific tab
  const updateSearchTerm = React.useCallback((tabType: string, value: string) => {
    setSearchTerms(prev => ({ ...prev, [tabType]: value }))
  }, [])

  const getAccountTypeIcon = React.useCallback((type: string) => {
    switch (type) {
      case 'asset':
        return <Building className="h-4 w-4 text-green-600" />
      case 'liability':
        return <CreditCard className="h-4 w-4 text-red-600" />
      case 'equity':
        return <DollarSign className="h-4 w-4 text-blue-600" />
      case 'revenue':
        return <TrendingUp className="h-4 w-4 text-purple-600" />
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-orange-600" />
      default:
        return <Banknote className="h-4 w-4" />
    }
  }, [])

  const getAccountTypeColor = React.useCallback((type: string) => {
    switch (type) {
      case 'asset':
        return 'bg-green-100 text-green-800'
      case 'liability':
        return 'bg-red-100 text-red-800'
      case 'equity':
        return 'bg-blue-100 text-blue-800'
      case 'revenue':
        return 'bg-purple-100 text-purple-800'
      case 'expense':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getDisplayBalance = React.useCallback((balance: number, accountType: string) => {
    // For revenue and liability accounts, show absolute value (positive) to users
    // For asset and expense accounts, show actual balance
    if (accountType === 'revenue' || accountType === 'liability') {
      return Math.abs(balance).toFixed(2)
    }
    return balance.toFixed(2)
  }, [])

  const getBalanceColor = React.useCallback((balance: number, accountType: string) => {
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

  // Helper function to check if selected category is an asset
  const isSelectedCategoryAsset = React.useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.type === 'asset'
  }, [categories])

  if (loading) {
    return (
      <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Loading Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <Skeleton className="h-6 sm:h-8 w-32 sm:w-40" />
            <Skeleton className="h-3 sm:h-4 w-48 sm:w-60 mt-2" />
          </div>
          <div className="flex flex-row space-x-2">
            <Skeleton className="h-9 flex-1 sm:w-20 sm:flex-initial" />
            <Skeleton className="h-9 flex-1 sm:w-32 sm:flex-initial" />
          </div>
        </div>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-16 sm:w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Content */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 sm:h-6 w-28 sm:w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loading tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 sm:w-24 flex-shrink-0" />
              ))}
            </div>
            
            {/* Loading search */}
            <Skeleton className="h-10 w-full" />
            
            {/* Loading cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#f4f8f9] rounded-lg p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your chart of accounts and track financial transactions
          </p>
        </div>
        <div className="flex flex-row space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={refreshing} className="flex-1 sm:w-auto sm:flex-initial">
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Dialog open={isAddAccountDialogOpen} onOpenChange={(open) => {
            setIsAddAccountDialogOpen(open)
            if (!open) {
              setNewAccount({})
              setUseAsPaymentMethod(false)
              setPaymentMethodType('')
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:w-auto sm:flex-initial">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
                <DialogDescription>
                  Create a new account in your chart of accounts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="account-number" className="font-medium">
                      Account Number *
                    </Label>
                    <Input
                      id="account-number"
                      placeholder="e.g., 1004"
                      value={newAccount.account_number || ''}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, account_number: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account-code" className="font-medium">
                      Account Code
                    </Label>
                    <Input
                      id="account-code"
                      placeholder="e.g., CASH-01"
                      value={newAccount.account_code || ''}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, account_code: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account-name" className="font-medium">
                    Account Name *
                  </Label>
                  <Input
                    id="account-name"
                    placeholder="e.g., Petty Cash"
                    value={newAccount.account_name || ''}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, account_name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category" className="font-medium">
                    Category *
                  </Label>
                  <Select
                    value={newAccount.category_id || ''}
                    onValueChange={(value) => {
                      setNewAccount(prev => ({ ...prev, category_id: value }))
                      // Reset toggle if category is not asset
                      if (!isSelectedCategoryAsset(value)) {
                        setUseAsPaymentMethod(false)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            {getAccountTypeIcon(category.type)}
                            <span>{category.name} ({category.type})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isSelectedCategoryAsset(newAccount.category_id || '') && (
                  <div className="grid gap-2">
                    <Label htmlFor="use-as-payment-method" className="font-medium">
                      Use as Payment Method
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use-as-payment-method"
                        checked={useAsPaymentMethod}
                                              onCheckedChange={(checked) => {
                        setUseAsPaymentMethod(checked)
                        if (!checked) {
                          setPaymentMethodType('')
                          setBankAccountNumber('')
                        }
                      }}
                        suppressHydrationWarning
                      />
                      <Label htmlFor="use-as-payment-method" className="text-sm text-gray-600 cursor-pointer">
                        Enable this account for payment transactions
                      </Label>
                    </div>
                  </div>
                )}

                {isSelectedCategoryAsset(newAccount.category_id || '') && useAsPaymentMethod && (
                  <div className="grid gap-2">
                    <Label htmlFor="paymentMethodType" className="font-medium">
                      Type *
                    </Label>
                    <Select
                      value={paymentMethodType}
                      onValueChange={(value) => {
                        setPaymentMethodType(value)
                        // Reset bank account number if not bank type
                        if (value !== 'bank') {
                          setBankAccountNumber('')
                        }
                      }}
                    >
                      <SelectTrigger suppressHydrationWarning>
                        <SelectValue placeholder="Select payment method type" />
                      </SelectTrigger>
                      <SelectContent suppressHydrationWarning>
                        {paymentMethodTypeOptions.map((option) => {
                          const IconComponent = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center space-x-3">
                                <IconComponent className="h-4 w-4 text-gray-600" />
                                <div className="flex flex-col" style={{ alignItems: 'flex-start' }}>
                                  <span className="font-medium">{option.label}</span>
                                  <span className="text-xs text-gray-500">{option.description}</span>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isSelectedCategoryAsset(newAccount.category_id || '') && useAsPaymentMethod && paymentMethodType === 'bank' && (
                  <div className="grid gap-2">
                    <Label htmlFor="bankAccountNumber" className="font-medium">
                      Bank Account Number *
                    </Label>
                    <Input
                      id="bankAccountNumber"
                      placeholder="e.g., 123456789012"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="description" className="font-medium">
                    Description
                  </Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={newAccount.description || ''}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => {
                  setIsAddAccountDialogOpen(false)
                  setNewAccount({})
                  setUseAsPaymentMethod(false)
                  setPaymentMethodType('')
                  setBankAccountNumber('')
                }} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleAddAccount} disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* Financial Summary */}
      {financialSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">৳{financialSummary.totalAssets.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-red-600">৳{financialSummary.totalLiabilities.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">৳{financialSummary.totalEquity.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className={`text-xl sm:text-2xl font-bold ${financialSummary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳{financialSummary.netIncome.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
      )}

            {/* Chart of Accounts with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Chart of Accounts</CardTitle>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 sm:px-6">
            <TabsList className="flex flex-wrap justify-start bg-transparent p-0 h-auto gap-1 w-full">
              <TabsTrigger 
                value="asset" 
                className="flex items-center space-x-1 cursor-pointer bg-transparent data-[state=active]:bg-black data-[state=active]:text-white text-xs px-2 py-1.5 flex-shrink-0"
              >
                <Building className="h-3 w-3" />
                <span>Assets</span>
                <span className="ml-1 h-5 w-5 flex items-center justify-center bg-white text-black text-xs font-medium rounded-full border">
                  {accounts.filter(a => a.account_categories?.type === 'asset' && a.is_active).length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="liability" 
                className="flex items-center space-x-1 cursor-pointer bg-transparent data-[state=active]:bg-black data-[state=active]:text-white text-xs px-2 py-1.5 flex-shrink-0"
              >
                <CreditCard className="h-3 w-3" />
                <span>Liabilities</span>
                <span className="ml-1 h-5 w-5 flex items-center justify-center bg-white text-black text-xs font-medium rounded-full border">
                  {accounts.filter(a => a.account_categories?.type === 'liability' && a.is_active).length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="equity" 
                className="flex items-center space-x-1 cursor-pointer bg-transparent data-[state=active]:bg-black data-[state=active]:text-white text-xs px-2 py-1.5 flex-shrink-0"
              >
                <DollarSign className="h-3 w-3" />
                <span>Equity</span>
                <span className="ml-1 h-5 w-5 flex items-center justify-center bg-white text-black text-xs font-medium rounded-full border">
                  {accounts.filter(a => a.account_categories?.type === 'equity' && a.is_active).length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="revenue" 
                className="flex items-center space-x-1 cursor-pointer bg-transparent data-[state=active]:bg-black data-[state=active]:text-white text-xs px-2 py-1.5 flex-shrink-0"
              >
                <TrendingUp className="h-3 w-3" />
                <span>Revenue</span>
                <span className="ml-1 h-5 w-5 flex items-center justify-center bg-white text-black text-xs font-medium rounded-full border">
                  {accounts.filter(a => a.account_categories?.type === 'revenue' && a.is_active).length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="expense" 
                className="flex items-center space-x-1 cursor-pointer bg-transparent data-[state=active]:bg-black data-[state=active]:text-white text-xs px-2 py-1.5 flex-shrink-0"
              >
                <TrendingDown className="h-3 w-3" />
                <span>Expenses</span>
                <span className="ml-1 h-5 w-5 flex items-center justify-center bg-white text-black text-xs font-medium rounded-full border">
                  {accounts.filter(a => a.account_categories?.type === 'expense' && a.is_active).length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {['asset', 'liability', 'equity', 'revenue', 'expense'].map((tabType) => (
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
                  {filteredAccounts.map((account) => (
                    <div key={account.id} className="group relative bg-[#f4f8f9] rounded-lg p-3 sm:p-4 hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                      {/* Header with account number and status */}
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <p className="text-gray-600 text-xs font-mono">
                          #{account.account_number}
                        </p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditAccount(account)
                            }}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors duration-200 group cursor-pointer"
                            title="Edit account"
                            suppressHydrationWarning
                          >
                            <Edit3 className="h-3 w-3 text-gray-500 group-hover:text-gray-700" />
                          </button>
                          <div className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
                            (account.balance || 0) > 0 
                              ? 'bg-black text-white border border-black' 
                              : 'bg-gray-200/50 text-gray-700 border border-gray-300/50'
                          }`}>
                            {(account.balance || 0) > 0 ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>

                      {/* Account name with icon */}
                      <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                        <div className="text-black text-sm flex-shrink-0">
                          {getAccountTypeIcon(account.account_categories?.type || '')}
                        </div>
                        <h3 className="text-black text-base sm:text-lg font-semibold truncate">
                          {account.account_name}
                        </h3>
                        {account.is_payment_method && (
                          <div className="flex-shrink-0" title={`Payment Method: ${account.payment_method_type ? paymentMethodTypeOptions.find(opt => opt.value === account.payment_method_type)?.label || account.payment_method_type : 'Unspecified'}`}>
                            <CreditCard className="h-3 w-3 text-blue-600" />
                          </div>
                        )}
                      </div>

                      {/* Description (if exists) */}
                      {account.description && (
                        <p className="text-gray-600 text-xs mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-1">
                          {account.description}
                        </p>
                      )}

                      {/* Balance section */}
                      <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-xs font-medium">
                          Balance
                        </p>
                        <p className={`text-lg sm:text-xl font-bold ${
                          account.account_categories?.type === 'asset' 
                            ? 'text-emerald-700' 
                            : account.account_categories?.type === 'revenue' 
                            ? 'text-purple-700' 
                            : account.account_categories?.type === 'expense'
                            ? 'text-red-700'
                            : account.account_categories?.type === 'liability'
                            ? 'text-red-700'
                            : account.account_categories?.type === 'equity'
                            ? 'text-blue-700'
                            : 'text-slate-800'
                        }`}>
                          ৳{getDisplayBalance(account.balance || 0, account.account_categories?.type || '')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No {tabType} accounts found{searchTerms[tabType] ? ' matching your search' : ''}.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Edit Account Dialog */}
      <Dialog open={isEditAccountDialogOpen} onOpenChange={(open) => {
        setIsEditAccountDialogOpen(open)
        if (!open) {
          setEditingAccount(null)
          setEditAccount({})
          setEditUseAsPaymentMethod(false)
          setEditPaymentMethodType('')
          setEditBankAccountNumber('')
        }
      }}>
        <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the account information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-account-code">Account Code</Label>
                <Input
                  id="edit-account-code"
                  value={editAccount.account_code || ''}
                  onChange={(e) => setEditAccount({ ...editAccount, account_code: e.target.value })}
                  placeholder="e.g., CASH-01"
                  suppressHydrationWarning
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-account-name">Account Name *</Label>
                <Input
                  id="edit-account-name"
                  value={editAccount.account_name || ''}
                  onChange={(e) => setEditAccount({ ...editAccount, account_name: e.target.value })}
                  placeholder="e.g., Cash in Hand"
                  suppressHydrationWarning
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Account Category *</Label>
              <Select 
                value={editAccount.category_id || ''} 
                onValueChange={(value) => {
                  setEditAccount({ ...editAccount, category_id: value })
                  // Reset toggle if category is not asset
                  if (!isSelectedCategoryAsset(value)) {
                    setEditUseAsPaymentMethod(false)
                  }
                }}
              >
                <SelectTrigger suppressHydrationWarning>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent suppressHydrationWarning>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        {getAccountTypeIcon(category.type)}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSelectedCategoryAsset(editAccount.category_id || '') && (
              <div className="grid gap-2">
                <Label htmlFor="edit-use-as-payment-method" className="font-medium">
                  Use as Payment Method
                </Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-use-as-payment-method"
                    checked={editUseAsPaymentMethod}
                    onCheckedChange={(checked) => {
                      setEditUseAsPaymentMethod(checked)
                      if (!checked) {
                        setEditPaymentMethodType('')
                        setEditBankAccountNumber('')
                      }
                    }}
                    suppressHydrationWarning
                  />
                  <Label htmlFor="edit-use-as-payment-method" className="text-sm text-gray-600 cursor-pointer">
                    Enable this account for payment transactions
                  </Label>
                </div>
              </div>
            )}

            {isSelectedCategoryAsset(editAccount.category_id || '') && editUseAsPaymentMethod && (
              <div className="grid gap-2">
                <Label htmlFor="editPaymentMethodType" className="font-medium">
                  Type *
                </Label>
                <Select
                  value={editPaymentMethodType}
                  onValueChange={(value) => {
                    setEditPaymentMethodType(value)
                    // Reset bank account number if not bank type
                    if (value !== 'bank') {
                      setEditBankAccountNumber('')
                    }
                  }}
                >
                  <SelectTrigger suppressHydrationWarning>
                    <SelectValue placeholder="Select payment method type" />
                  </SelectTrigger>
                  <SelectContent suppressHydrationWarning>
                    {paymentMethodTypeOptions.map((option) => {
                      const IconComponent = option.icon
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-3">
                            <IconComponent className="h-4 w-4 text-gray-600" />
                            <div className="flex flex-col" style={{ alignItems: 'flex-start' }}>
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-gray-500">{option.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isSelectedCategoryAsset(editAccount.category_id || '') && editUseAsPaymentMethod && editPaymentMethodType === 'bank' && (
              <div className="grid gap-2">
                <Label htmlFor="editBankAccountNumber" className="font-medium">
                  Bank Account Number *
                </Label>
                <Input
                  id="editBankAccountNumber"
                  placeholder="e.g., 123456789012"
                  value={editBankAccountNumber}
                  onChange={(e) => setEditBankAccountNumber(e.target.value)}
                  suppressHydrationWarning
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editAccount.description || ''}
                onChange={(e) => setEditAccount({ ...editAccount, description: e.target.value })}
                placeholder="Optional description"
                suppressHydrationWarning
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditAccountDialogOpen(false)
                setEditingAccount(null)
                setEditAccount({})
                setEditUseAsPaymentMethod(false)
                setEditPaymentMethodType('')
                setEditBankAccountNumber('')
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateAccount} disabled={isEditSubmitting} className="w-full sm:w-auto">
              {isEditSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          
    </div>
  )
} 

// Clear cache to ensure fresh data shows the new Bangladeshi MFS accounts
if (typeof window !== 'undefined') {
  setTimeout(() => {
    (window as any).clearAccountsCache?.();
  }, 100);
} 