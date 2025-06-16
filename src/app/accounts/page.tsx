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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"

import { toast } from "sonner"
import { 
  Plus, 
  Search, 
  Filter, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  CreditCard,
  Banknote,
  Loader2,
  RefreshCw
} from "lucide-react"
import { 
  getAccountsWithCategories,
  getAccountCategories,
  getFinancialSummary,
  createAccount,
  type CreateAccountData
} from "@/lib/supabase/accounts-client"
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
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(['asset', 'liability', 'equity', 'revenue', 'expense'])
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = React.useState(false)


  // Form states
  const [newAccount, setNewAccount] = React.useState<Partial<CreateAccountData>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Data loading function with enhanced request deduplication
  const loadAccountsData = async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadAccountsData called with forceRefresh:', forceRefresh)
    
    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        dataCache.accounts && 
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

    // If there's already a request in progress, wait for it
    if (dataCache.currentRequest) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        await dataCache.currentRequest
        // After the request completes, update state with cached data
        if (dataCache.accounts && dataCache.categories && dataCache.financialSummary) {
          console.log('📦 Using data from completed request')
          setAccounts(dataCache.accounts)
          setCategories(dataCache.categories)
          setFinancialSummary(dataCache.financialSummary)
          setLoading(false)
        }
      } catch (error) {
        console.error('⚠️ Error in concurrent request:', error)
      }
      return
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh data from API')
        setLoading(true)
        
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
        toast.error("Failed to load accounts data. Please try again.")
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
      await createAccount(newAccount as CreateAccountData)
      
      // Invalidate cache and refresh
      dataCache.lastFetch = 0
      await loadAccountsData(true)
      
      setIsAddAccountDialogOpen(false)
      setNewAccount({})
      toast.success("Account created successfully.")
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error("Failed to create account. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }



  // Memoized filtered accounts to prevent unnecessary recalculations
  const filteredAccounts = React.useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch = account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           account.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (account.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = selectedTypes.includes(account.account_categories?.type || '')
      return matchesSearch && matchesType && account.is_active
    })
  }, [accounts, searchTerm, selectedTypes])

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

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Loading Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Loading Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Content */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your chart of accounts and track financial transactions
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
                <DialogDescription>
                  Create a new account in your chart of accounts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="account-number" className="text-right">
                    Account Number *
                  </Label>
                  <Input
                    id="account-number"
                    placeholder="e.g., 1004"
                    className="col-span-3"
                    value={newAccount.account_number || ''}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, account_number: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="account-name" className="text-right">
                    Account Name *
                  </Label>
                  <Input
                    id="account-name"
                    placeholder="e.g., Petty Cash"
                    className="col-span-3"
                    value={newAccount.account_name || ''}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, account_name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category *
                  </Label>
                  <Select
                    value={newAccount.category_id || ''}
                    onValueChange={(value) => setNewAccount(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger className="col-span-3">
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    className="col-span-3"
                    value={newAccount.description || ''}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddAccountDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAccount} disabled={isSubmitting}>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold text-green-600">৳{financialSummary.totalAssets.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold text-red-600">৳{financialSummary.totalLiabilities.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold text-blue-600">৳{financialSummary.totalEquity.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className={`text-2xl font-bold ${financialSummary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳{financialSummary.netIncome.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
      )}

      {/* Chart of Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Chart of Accounts ({filteredAccounts.length})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Account Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTypes(prev => [...prev, type])
                      } else {
                        setSelectedTypes(prev => prev.filter(t => t !== type))
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      {getAccountTypeIcon(type)}
                      <span className="capitalize">{type}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {filteredAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center space-x-3">
                {getAccountTypeIcon(account.account_categories?.type || '')}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{account.account_number} - {account.account_name}</p>
                    <Badge variant="outline" className={getAccountTypeColor(account.account_categories?.type || '')}>
                      {account.account_categories?.type}
                    </Badge>
                  </div>
                  {account.description && (
                  <p className="text-sm text-muted-foreground">{account.description}</p>
                  )}
                    </div>
                    </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${(account.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{(account.balance || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Current Balance</p>
                    </div>
                  </div>
          ))}
          {filteredAccounts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No accounts found matching your filters.</p>
            </div>
          )}
                </CardContent>
              </Card>

          
    </div>
  )
} 