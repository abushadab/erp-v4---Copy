"use client"

import * as React from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { AnimatedCard } from "@/components/animations/animated-card"
import { AnimatedButton } from "@/components/animations/animated-button"
import { Button } from "@/components/ui/button"
import { StaggerContainer, StaggerItem } from "@/components/animations/stagger-container"
import { PageWrapper } from "@/components/animations/page-wrapper"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  TrendingUp, 
  ShoppingCart,
  CreditCard,
  Receipt,
  Building2,
  CalendarDays,
  Package
} from "lucide-react"

// Import Supabase query functions
import { getPurchaseStats } from "@/lib/supabase/purchases"
import { getExpenses } from "@/lib/supabase/expenses-client"
import { getFinancialSummary } from "@/lib/supabase/accounts-client"
import { createClient } from "@/lib/supabase/client"

// Global cache and request deduplication
let globalCache: {
  data?: DashboardStats
  lastFetch?: number
  isLoading?: boolean
  loadingPromise?: Promise<DashboardStats>
} = {}

const CACHE_DURATION = 30 * 1000 // 30 seconds

// Request deduplication: ensure only one set of API calls at a time
const getDashboardData = async () => {
  const now = Date.now()
  
  // Return cached data if valid
  if (globalCache.data && globalCache.lastFetch && (now - globalCache.lastFetch) < CACHE_DURATION) {
    console.log('📋 Using cached dashboard data')
    return globalCache.data
  }
  
  // If already loading, return the existing promise
  if (globalCache.isLoading && globalCache.loadingPromise) {
    console.log('⏳ Dashboard data already loading, waiting for existing request...')
    return globalCache.loadingPromise
  }
  
  // Start fresh loading
  globalCache.isLoading = true
  globalCache.loadingPromise = Promise.all([
    getSalesStats().catch((err: Error | unknown) => {
      console.error('Sales stats error:', err)
      return null
    }),
    getPurchaseStats().catch((err: Error | unknown) => {
      console.error('Purchase stats error:', err) 
      return null
    }),
    getExpenseStats().catch((err: Error | unknown) => {
      console.error('Expense stats error:', err)
      return null
    }),
    getFinancialSummary().catch((err: Error | unknown) => {
      console.error('Financial summary error:', err)
      return null
    })
  ]).then(([salesData, purchasesData, expensesData, financialData]) => {
    const result: DashboardStats = {
      sales: salesData,
      purchases: purchasesData, 
      expenses: expensesData,
      financial: financialData
    }
    
    // Cache the result
    globalCache.data = result
    globalCache.lastFetch = now
    globalCache.isLoading = false
    globalCache.loadingPromise = undefined
    
    console.log('✅ Dashboard data loaded and cached')
    return result
  }).catch((error: Error | unknown) => {
    globalCache.isLoading = false
    globalCache.loadingPromise = undefined
    throw error
  })
  
  return globalCache.loadingPromise
}

// Create fixed sales stats function that only uses existing fields
const getSalesStats = async () => {
  const supabase = createClient()
  
  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('total_amount, profit, status, sale_date')

    if (error) throw error

    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0)
    const totalProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.profit || 0), 0)
    const completedSales = sales.filter(sale => sale.status === 'completed').length
    const totalSales = sales.length

    return {
      totalRevenue,
      totalProfit,
      completedSales,
      totalSales
    }
  } catch (error) {
    console.error('Error fetching sales stats:', error)
    throw error
  }
}

// Create a simple stats function for expenses
const getExpenseStats = async () => {
  const expenses = await getExpenses()
  const totalExpenses = expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0)
  
  // Group by type
  const expensesByType = expenses.reduce((acc: Record<string, number>, expense: any) => {
    const typeName = expense.expense_type_name || 'Unknown'
    if (!acc[typeName]) {
      acc[typeName] = 0
    }
    acc[typeName] += expense.amount || 0
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalExpenses,
    currentMonthTotal: totalExpenses, // For now, same as total
    totalTransactions: expenses.length,
    expensesByType
  }
}

// Types
interface DashboardStats {
  sales: {
    totalRevenue: number
    totalProfit: number
    totalSales: number
    completedSales: number
  } | null
  purchases: {
    totalPurchases: number
    totalAmount: number
    pendingPurchases: number
    receivedPurchases: number
  } | null
  expenses: {
    totalExpenses: number
    currentMonthTotal: number
    totalTransactions: number
    expensesByType: Record<string, number>
  } | null
  financial: {
    totalAssets: number
    totalLiabilities: number
    totalRevenue: number
    totalExpenses: number
    netIncome: number
  } | null
}

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState<DashboardStats>({
    sales: null,
    purchases: null,
    expenses: null,
    financial: null
  })
  const [timePeriod, setTimePeriod] = React.useState<'today' | 'week' | 'month'>('month')
  const [refreshing, setRefreshing] = React.useState(false)
  
  // Add ref to prevent duplicate calls
  const loadingRef = React.useRef(false)
  const dataLoadedRef = React.useRef(false)
  const mountedRef = React.useRef(false)

  // Clear cache function
  const clearCache = () => {
    globalCache = {}
    console.log('🗑️ Cache cleared')
  }

  // Refresh data
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    clearCache() // Clear cache to force fresh data
    dataLoadedRef.current = false // Reset to allow fresh load
    loadingRef.current = false // Reset loading flag
    
    try {
      loadingRef.current = true
      setLoading(true)
      console.log('🔄 Refreshing dashboard data...')

      const dashboardData = await getDashboardData()

      if (mountedRef.current) {
        setStats(dashboardData)
        dataLoadedRef.current = true
        console.log('✅ Dashboard data refreshed successfully')
      }
    } catch (error) {
      console.error('Dashboard data refresh failed:', error)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
      setRefreshing(false)
    }
  }, [])

  // Load data on mount - with duplicate prevention and proper cleanup
  React.useEffect(() => {
    mountedRef.current = true
    
    const loadData = async () => {
      // Prevent duplicate calls
      if (loadingRef.current || dataLoadedRef.current) {
        console.log('🔄 Dashboard data loading already in progress or completed, skipping...')
        return
      }

      try {
        loadingRef.current = true
        setLoading(true)
        console.log('🔄 Loading dashboard data...')

        // Use the new deduplicating function
        const dashboardData = await getDashboardData()

        // Only update state if component is still mounted
        if (mountedRef.current) {
          setStats(dashboardData)
          dataLoadedRef.current = true
          console.log('✅ Dashboard data loaded successfully')
        }
      } catch (error) {
        console.error('Dashboard data loading failed:', error)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
        loadingRef.current = false
      }
    }
    
    loadData()

    return () => {
      mountedRef.current = false
    }
  }, []) // Empty dependency array

  // Calculate metrics based on time period
  const getMetricsForPeriod = () => {
    if (!stats.sales || !stats.purchases || !stats.expenses || !stats.financial) return null

    // For now, we'll show all-time data since we don't have date filtering in the queries yet
    // This can be enhanced later with date-based filtering
    return {
      revenue: stats.sales.totalRevenue,
      profit: stats.sales.totalProfit,
      expenses: stats.expenses.totalExpenses,
      netIncome: stats.financial.netIncome,
      salesCount: stats.sales.totalSales,
      purchasesCount: stats.purchases.totalPurchases,
      expensesCount: stats.expenses.totalTransactions
    }
  }

  const metrics = getMetricsForPeriod()

  const LoadingSkeleton = () => (
    <PageWrapper>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Your business overview
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" disabled className="w-32">
              <CalendarDays className="mr-2 h-4 w-4" />
              Loading...
            </Button>
            <Button variant="outline" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 rounded-lg" style={{ boxShadow: '0 2px 8px #00000005', backgroundColor: '#ffffff' }}>
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </div>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 rounded-lg" style={{ boxShadow: '0 2px 8px #00000005', backgroundColor: '#ffffff' }}>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="p-6 rounded-lg" style={{ boxShadow: '0 2px 8px #00000005', backgroundColor: '#ffffff' }}>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    </PageWrapper>
  )

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <PageWrapper>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <StaggerContainer>
          <StaggerItem>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                  Your business overview for {timePeriod === 'today' ? 'today' : timePeriod === 'week' ? 'this week' : 'this month'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={timePeriod} onValueChange={(value: 'today' | 'week' | 'month') => setTimePeriod(value)}>
                  <SelectTrigger className="w-32">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                <AnimatedButton 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  ) : (
                <Plus className="mr-2 h-4 w-4" />
                  )}
                  Refresh
              </AnimatedButton>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Key Metrics Cards */}
        <StaggerContainer delay={0.05}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ৳{metrics ? metrics.revenue.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                    From {stats.sales?.totalSales || 0} sales
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>

            {/* Total Profit */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ৳{metrics ? metrics.netIncome.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                    Revenue - Expenses
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>

            {/* Total Purchases */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Purchases</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ৳{stats.purchases ? stats.purchases.totalAmount.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Package className="inline h-3 w-3 text-blue-500 mr-1" />
                    {stats.purchases?.totalPurchases || 0} purchase orders
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>

            {/* Total Expenses */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ৳{stats.expenses ? stats.expenses.totalExpenses.toLocaleString() : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <CreditCard className="inline h-3 w-3 text-red-500 mr-1" />
                    {stats.expenses?.totalTransactions || 0} transactions
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>
          </div>
        </StaggerContainer>

        {/* Financial Summary */}
          <StaggerContainer delay={0.1}>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Assets */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Total Assets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ৳{stats.financial ? stats.financial.totalAssets.toLocaleString() : '0'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Resources owned by the business
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>

            {/* Liabilities */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Total Liabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    ৳{stats.financial ? stats.financial.totalLiabilities.toLocaleString() : '0'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Debts and obligations
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>

            {/* Net Worth */}
                        <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Net Worth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    ৳{stats.financial ? (stats.financial.totalAssets - stats.financial.totalLiabilities).toLocaleString() : '0'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Assets minus liabilities
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>
          </div>
        </StaggerContainer>

        {/* Module Status */}
        <StaggerContainer delay={0.15}>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Sales Overview */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader>
                  <CardTitle>Sales Overview</CardTitle>
                  <CardDescription>Sales performance summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Sales</span>
                    <Badge variant="default">{stats.sales?.totalSales || 0}</Badge>
                             </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <Badge variant="default">{stats.sales?.completedSales || 0}</Badge>
                              </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">৳{stats.sales ? stats.sales.totalRevenue.toLocaleString() : '0'}</span>
                            </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Profit</span>
                    <span className="font-medium text-green-600">৳{stats.sales ? stats.sales.totalProfit.toLocaleString() : '0'}</span>
                          </div>
                </CardContent>
              </AnimatedCard>
                        </StaggerItem>

            {/* Purchases Overview */}
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader>
                  <CardTitle>Purchases Overview</CardTitle>
                  <CardDescription>Purchase orders summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Orders</span>
                    <Badge variant="default">{stats.purchases?.totalPurchases || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <Badge variant="outline">{stats.purchases?.pendingPurchases || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Received</span>
                    <Badge variant="default">{stats.purchases?.receivedPurchases || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="font-medium">৳{stats.purchases ? stats.purchases.totalAmount.toLocaleString() : '0'}</span>
                  </div>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>
          </div>
          </StaggerContainer>

        {/* Expense Breakdown */}
        {stats.expenses?.expensesByType && Object.keys(stats.expenses.expensesByType).length > 0 && (
          <StaggerContainer delay={0.2}>
            <StaggerItem>
              <AnimatedCard noHover={true}>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                  <CardDescription>Expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.expenses.expensesByType).map(([type, amount]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{type}</span>
                        <span className="font-medium">৳{amount.toLocaleString()}</span>
                          </div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>
          </StaggerContainer>
        )}
      </div>
    </PageWrapper>
  )
} 