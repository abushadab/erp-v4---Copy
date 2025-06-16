"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { Search, Filter, Plus, Eye, FileText, Calendar, Truck, CheckCircle, Clock, RotateCcw, Package, Box, X, ArrowUpDown, ChevronDown, ChevronRight, DollarSign, CreditCard, CalendarIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, subDays, subMonths } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getPurchases, getPurchaseStats, getPurchaseReturns, type PurchaseWithItems, type PurchaseReturn } from "@/lib/supabase/purchases"
import { toast } from "sonner"

// Enhanced purchase type with returns
interface PurchaseWithReturns extends PurchaseWithItems {
  returns?: PurchaseReturn[]
  return_status: 'none' | 'partial' | 'full'
  total_returned_amount: number
}

// Date range type
type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<PurchaseWithItems['status'] | 'all'>('all')
  const [returnFilter, setReturnFilter] = React.useState<'all' | 'no-returns' | 'with-returns' | 'fully-returned'>('all')
  const [dateFilter, setDateFilter] = React.useState('all')
  const [customDateRange, setCustomDateRange] = React.useState<DateRange | undefined>(undefined)
  const [pendingDateFilter, setPendingDateFilter] = React.useState('all')
  const [pendingCustomDateRange, setPendingCustomDateRange] = React.useState<DateRange | undefined>(undefined)
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const [purchases, setPurchases] = React.useState<PurchaseWithReturns[]>([])
  const [filteredPurchases, setFilteredPurchases] = React.useState<PurchaseWithReturns[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [sortField, setSortField] = React.useState<'purchase_date' | 'total_amount' | 'supplier_name'>('purchase_date')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')
  const [stats, setStats] = React.useState({
    totalPurchases: 0,
    totalAmount: 0,
    pendingPurchases: 0,
    receivedPurchases: 0,
    partiallyReceivedPurchases: 0,
    cancelledPurchases: 0,
    totalReturns: 0,
    totalReturnAmount: 0
  })

  // Load purchases and returns from Supabase
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [purchasesData, statsData, returnsData] = await Promise.all([
          getPurchases(),
          getPurchaseStats(),
          getPurchaseReturns()
        ])
        
        // Enhance purchases with return information
        const enhancedPurchases: PurchaseWithReturns[] = purchasesData.map(purchase => {
          const purchaseReturns = returnsData.filter(ret => ret.purchase_id === purchase.id)
          const totalReturnAmount = purchaseReturns.reduce((sum, ret) => sum + ret.total_amount, 0)
          
          let returnStatus: 'none' | 'partial' | 'full' = 'none'
          if (purchaseReturns.length > 0) {
            // Check if fully returned by comparing total amounts
            const returnPercentage = totalReturnAmount / purchase.total_amount
            returnStatus = returnPercentage >= 0.99 ? 'full' : 'partial'
          }
          
          return {
            ...purchase,
            returns: purchaseReturns,
            return_status: returnStatus,
            total_returned_amount: totalReturnAmount
          }
        })
        
        setPurchases(enhancedPurchases)
        
        // Enhanced stats with return information
        const totalReturns = returnsData.length
        const totalReturnAmount = returnsData.reduce((sum, ret) => sum + ret.total_amount, 0)
        
        setStats({
          ...statsData,
          totalReturns,
          totalReturnAmount
        })
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load purchases')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Helper functions for date presets
  const setDatePreset = (preset: string) => {
    setPendingDateFilter(preset)
    
    const now = new Date()
    let dateRange: DateRange | undefined = undefined
    
    switch (preset) {
      case 'today':
        dateRange = { from: now, to: now }
        break
      case 'yesterday':
        const yesterday = subDays(now, 1)
        dateRange = { from: yesterday, to: yesterday }
        break
      case 'week':
        // Get start of current week (Sunday)
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        
        // Get end of current week (Saturday)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        
        dateRange = { from: startOfWeek, to: endOfWeek }
        break
      case 'month':
        // Get start of current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // Get end of current month
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)
        
        dateRange = { from: startOfMonth, to: endOfMonth }
        break
      case 'quarter':
        // Get start of current year
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        
        // Get end of current year
        const endOfYear = new Date(now.getFullYear(), 11, 31)
        endOfYear.setHours(23, 59, 59, 999)
        
        dateRange = { from: startOfYear, to: endOfYear }
        break
      default:
        dateRange = undefined
    }
    
    setPendingCustomDateRange(dateRange)
  }

  // Reset all filters
  const resetAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setReturnFilter('all')
    setDateFilter('all')
    setCustomDateRange(undefined)
  }

  // Filter and sort purchases
  React.useEffect(() => {
    let filtered = purchases

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((purchase) =>
        purchase.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.created_by.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((purchase) => purchase.status === statusFilter)
    }

    // Return filter
    if (returnFilter !== 'all') {
      switch (returnFilter) {
        case 'no-returns':
          filtered = filtered.filter(p => p.return_status === 'none')
          break
        case 'with-returns':
          filtered = filtered.filter(p => p.return_status === 'partial')
          break
        case 'fully-returned':
          filtered = filtered.filter(p => p.return_status === 'full')
          break
      }
    }

    // Date filter
    if (dateFilter !== 'all' && customDateRange?.from) {
      filtered = filtered.filter((purchase) => {
        const purchaseDate = new Date(purchase.purchase_date)
        const fromDate = customDateRange.from!
        const toDate = customDateRange.to || customDateRange.from!
        
        // Set time to start/end of day for proper comparison
        const startOfDay = new Date(fromDate)
        startOfDay.setHours(0, 0, 0, 0)
        
        const endOfDay = new Date(toDate)
        endOfDay.setHours(23, 59, 59, 999)
        
        return purchaseDate >= startOfDay && purchaseDate <= endOfDay
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case 'purchase_date':
          aValue = new Date(a.purchase_date)
          bValue = new Date(b.purchase_date)
          break
        case 'total_amount':
          aValue = a.total_amount
          bValue = b.total_amount
          break
        case 'supplier_name':
          aValue = a.supplier_name.toLowerCase()
          bValue = b.supplier_name.toLowerCase()
          break
        default:
          return 0
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    setFilteredPurchases(filtered)
  }, [searchTerm, statusFilter, returnFilter, dateFilter, customDateRange, purchases, sortField, sortDirection])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleRowExpansion = (purchaseId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId)
    } else {
      newExpanded.add(purchaseId)
    }
    setExpandedRows(newExpanded)
  }

  const getStatusColor = (status: PurchaseWithItems['status']) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'partially_received':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      case 'partially_returned':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
      case 'returned':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  const getReturnStatusColor = (returnStatus: 'none' | 'partial' | 'full') => {
    switch (returnStatus) {
      case 'none':
        return 'bg-gray-100 text-gray-600'
      case 'partial':
        return 'bg-orange-100 text-orange-800'
      case 'full':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getItemsSummary = (purchase: PurchaseWithItems) => {
    const productCount = purchase.items.filter(item => item.item_type === 'product').length
    const packageCount = purchase.items.filter(item => item.item_type === 'package').length
    
    const parts = []
    if (productCount > 0) parts.push(`${productCount}P`)
    if (packageCount > 0) parts.push(`${packageCount}K`)
    
    return parts.join(', ') || '0'
  }

  const getProgressInfo = (purchase: PurchaseWithItems) => {
    const totalOrdered = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalReceived = purchase.items.reduce((sum, item) => sum + item.received_quantity, 0)
    const totalReturned = purchase.items.reduce((sum, item) => sum + item.returned_quantity, 0)
    
    return {
      totalOrdered,
      totalReceived,
      totalReturned,
      netReceived: totalReceived - totalReturned
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="mt-4 sm:mt-0">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Skeleton className="h-4 w-4" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-32" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-16 ml-auto" />
                          <Skeleton className="h-3 w-12 ml-auto" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground mt-2">
            Manage purchase orders and returns for products and packages
          </p>
        </div>
        <motion.div className="mt-4 sm:mt-0">
          <Link href="/purchases/add">
            <Button className="w-full sm:w-auto cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Create Purchase
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Enhanced Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPurchases}</div>
              <p className="text-xs text-muted-foreground">Purchase orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingPurchases}</div>
              <p className="text-xs text-muted-foreground">Awaiting delivery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partial</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.partiallyReceivedPurchases}</div>
              <p className="text-xs text-muted-foreground">Partially received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.receivedPurchases}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalReturns}</div>
            <p className="text-xs text-muted-foreground">Total returns</p>
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <X className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelledPurchases}</div>
              <p className="text-xs text-muted-foreground">Cancelled orders</p>
            </CardContent>
          </Card>
      </motion.div>

      {/* Enhanced Filters */}
      <motion.div 
        className="flex flex-col md:flex-row gap-4 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Search */}
        <div className="space-y-2 flex-1">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
              id="search"
            placeholder="Search purchases by ID, supplier, or staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        </div>

        {/* Date Filter with Popover */}
        <div className="space-y-2 flex-1">
          <Label htmlFor="date-filter">Date Range</Label>
          <Popover open={isDatePickerOpen} onOpenChange={(open) => {
            setIsDatePickerOpen(open)
            if (open) {
              // Initialize pending states with current applied states
              setPendingDateFilter(dateFilter)
              setPendingCustomDateRange(customDateRange)
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-left font-normal bg-white border border-gray-300 hover:bg-gray-50"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">
                    {dateFilter === 'all' && 'All time'}
                    {dateFilter === 'today' && format(new Date(), "MMM. do yyyy")}
                    {dateFilter === 'yesterday' && format(subDays(new Date(), 1), "MMM. do yyyy")}
                    {dateFilter === 'week' && `${format(subDays(new Date(), 7), "MMM. do yyyy")} → ${format(new Date(), "MMM. do yyyy")}`}
                    {dateFilter === 'month' && `${format(subMonths(new Date(), 1), "MMM. do yyyy")} → ${format(new Date(), "MMM. do yyyy")}`}
                    {dateFilter === 'quarter' && `${format(subMonths(new Date(), 3), "MMM. do yyyy")} → ${format(new Date(), "MMM. do yyyy")}`}
                    {dateFilter === 'custom' && customDateRange?.from && (
                      customDateRange?.to ? (
                        `${format(customDateRange.from, "MMM. do yyyy")} → ${format(customDateRange.to, "MMM. do yyyy")}`
                      ) : (
                        format(customDateRange.from, "MMM. do yyyy")
                      )
                    )}
                  </span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white shadow-lg border" align="start">
              <div className="flex">
                {/* Left Panel - Suggestions */}
                <div className="w-60 bg-gray-50 p-4 border-r">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Suggestions</h3>
                  <div className="space-y-1">
                    {/* Custom Range Indicator */}
                    {pendingDateFilter === 'custom' && pendingCustomDateRange?.from && (
                      <div className="w-full justify-between text-left px-3 py-2 bg-gray-200 rounded">
                        <span className="text-black font-medium">Custom range</span>
                        <span className="text-gray-500 text-xs block">
                          {pendingCustomDateRange?.to ? (
                            `${format(pendingCustomDateRange.from, "dd MMM")} - ${format(pendingCustomDateRange.to, "dd MMM yy")}`
                          ) : (
                            format(pendingCustomDateRange.from, "dd MMM yy")
                          )}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-between text-left hover:bg-gray-100 px-3 py-2 ${
                        pendingDateFilter === 'today' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => setDatePreset('today')}
                    >
                      <span className={`font-medium ${pendingDateFilter === 'today' ? 'text-black' : 'text-gray-700'}`}>Today</span>
                      <span className="text-gray-500 text-xs">{format(new Date(), "dd MMM yy")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-between text-left hover:bg-gray-100 px-3 py-2 ${
                        pendingDateFilter === 'yesterday' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => setDatePreset('yesterday')}
                    >
                      <span className={`font-medium ${pendingDateFilter === 'yesterday' ? 'text-black' : 'text-gray-700'}`}>Yesterday</span>
                      <span className="text-gray-500 text-xs">{format(subDays(new Date(), 1), "dd MMM yy")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-between text-left hover:bg-gray-100 px-3 py-2 ${
                        pendingDateFilter === 'week' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => setDatePreset('week')}
                    >
                      <span className={`${pendingDateFilter === 'week' ? 'text-black font-medium' : 'text-gray-700'}`}>This week</span>
                      <span className="text-gray-500 text-xs">
                        {format(subDays(new Date(), 7), "dd MMM")} - {format(new Date(), "dd MMM yy")}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-between text-left hover:bg-gray-100 px-3 py-2 ${
                        pendingDateFilter === 'month' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => setDatePreset('month')}
                    >
                      <span className={`${pendingDateFilter === 'month' ? 'text-black font-medium' : 'text-gray-700'}`}>This month</span>
                      <span className="text-gray-500 text-xs">
                        {format(subMonths(new Date(), 1), "dd MMM")} - {format(new Date(), "dd MMM yy")}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-between text-left hover:bg-gray-100 px-3 py-2 ${
                        pendingDateFilter === 'quarter' ? 'bg-gray-200' : ''
                      }`}
                      onClick={() => setDatePreset('quarter')}
                    >
                      <span className={`${pendingDateFilter === 'quarter' ? 'text-black font-medium' : 'text-gray-700'}`}>This year</span>
                      <span className="text-gray-500 text-xs">
                        {format(new Date(new Date().getFullYear(), 0, 1), "dd MMM yy")} - {format(new Date(), "dd MMM yy")}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Right Panel - Calendar */}
                <div className="w-[360px] p-4">
                  {/* Calendar */}
                  <div className="flex justify-center">
                    <CalendarComponent
                      mode="range"
                      defaultMonth={pendingCustomDateRange?.from}
                      selected={pendingCustomDateRange}
                      onSelect={(range) => {
                        setPendingCustomDateRange(range)
                        if (range?.from || range?.to) {
                          setPendingDateFilter('custom')
                        }
                      }}
                      numberOfMonths={1}
                      className="rounded-md border-0 w-full max-w-sm p-0"
                      classNames={{
                        months: "flex flex-col space-y-4",
                        month: "space-y-4 w-full",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 hover:bg-gray-100 rounded cursor-pointer flex items-center justify-center",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex w-full",
                        head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center",
                        row: "flex w-full mt-2",
                        cell: "h-9 w-9 text-center text-sm p-0 relative flex-1",
                        day: "h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded mx-auto cursor-pointer",
                        day_selected: "bg-gray-100 text-black hover:bg-gray-300 hover:text-black focus:bg-gray-300 focus:text-black",
                        day_today: "bg-gray-300 text-gray-900",
                        day_outside: "text-black",
                        day_disabled: "text-gray-400",
                        day_range_middle: "bg-gray-100 text-gray-900 hover:bg-gray-100",
                        day_hidden: "invisible",
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset pending to current applied state
                        setPendingDateFilter(dateFilter)
                        setPendingCustomDateRange(customDateRange)
                        setIsDatePickerOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-black hover:bg-gray-800 text-white"
                      onClick={() => {
                        // Apply pending state to actual filter state
                        setDateFilter(pendingDateFilter)
                        setCustomDateRange(pendingCustomDateRange)
                        setIsDatePickerOpen(false)
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Status Filter */}
        <div className="space-y-2 w-36">
          <Label htmlFor="status-filter">Status</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-left font-normal bg-white border border-gray-300 hover:bg-gray-50">
                <div className="flex items-center min-w-0 flex-1">
                  <Filter className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">
                    {statusFilter === 'all' ? 'All' : statusFilter.replace('_', ' ')}
                  </span>
                </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Statuses</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('pending')}>Pending</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('partially_received')}>Partially Received</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('received')}>Received</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('partially_returned')}>Partially Returned</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('returned')}>Returned</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Cancelled</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Returns Filter */}
        <div className="space-y-2 w-36">
          <Label htmlFor="returns-filter">Returns</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-left font-normal bg-white border border-gray-300 hover:bg-gray-50">
                <div className="flex items-center min-w-0 flex-1">
                  <RotateCcw className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">
                    {returnFilter === 'all' ? 'All' : returnFilter.replace('-', ' ')}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Returns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setReturnFilter('all')}>All Purchases</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReturnFilter('no-returns')}>No Returns</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReturnFilter('with-returns')}>With Returns</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReturnFilter('fully-returned')}>Fully Returned</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {/* Reset Button */}
        <div className="space-y-2 w-24">
          <Label>&nbsp;</Label>
          <Button
            onClick={resetAllFilters}
            className="w-full border-transparent bg-red-100 text-red-800 hover:bg-red-200"
          >
            Reset All
          </Button>
        </div>
      </motion.div>

      {/* Purchase Count */}
      <motion.div 
        className="mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <p className="text-sm text-muted-foreground">
          {filteredPurchases.length} of {stats.totalPurchases} purchases
        </p>
      </motion.div>

      {/* Purchases Table */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {filteredPurchases.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                                            <TableHead 
                        className="cursor-pointer hover:bg-gray-50" 
                        onClick={() => handleSort('purchase_date')}
                      >
                        Purchase ID / Date
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50" 
                        onClick={() => handleSort('supplier_name')}
                      >
                        Supplier
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 text-right"
                        onClick={() => handleSort('total_amount')}
                      >
                        Amount
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {filteredPurchases.map((purchase) => {
                  const progressInfo = getProgressInfo(purchase)
                      const isExpanded = expandedRows.has(purchase.id)
                  
                  return (
                        <React.Fragment key={purchase.id}>
                          <TableRow className="hover:bg-gray-50">
                            <TableCell>
                              {(purchase.returns && purchase.returns.length > 0) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 cursor-pointer"
                                  onClick={() => toggleRowExpansion(purchase.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                        <div>
                                <div className="font-medium">{purchase.id}</div>
                                <div className="text-sm text-muted-foreground">
                            {new Date(purchase.purchase_date).toLocaleDateString('en-BD')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{purchase.supplier_name}</div>
                                <div className="text-sm text-muted-foreground">{purchase.warehouse_name}</div>
                        </div>
                            </TableCell>
                                                         <TableCell>
                               <div className="space-y-1">
                                 <Badge variant="secondary" className={getStatusColor(purchase.status)}>
                            {purchase.status.replace('_', ' ')}
                          </Badge>
                               </div>
                             </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{getItemsSummary(purchase)} items</div>
                                <div className="text-muted-foreground">
                                  {progressInfo.totalReceived}/{progressInfo.totalOrdered} received
                                  {progressInfo.totalReturned > 0 && (
                                    <span className="text-orange-600"> • {progressInfo.totalReturned} returned</span>
                          )}
                        </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">{formatCurrency(purchase.total_amount)}</div>
                              {purchase.total_returned_amount > 0 && (
                                <div className="text-sm text-orange-600">
                                  -{formatCurrency(purchase.total_returned_amount)}
                                </div>
                              )}
                            </TableCell>
                                                         <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {['received', 'partially_received', 'partially_returned'].includes(purchase.status) && (
                                  <Link href={`/purchases/${purchase.id}/process-return`}>
                                    <Button variant="outline" size="sm" className="cursor-pointer">
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                )}
                                <Link href={`/purchases/${purchase.id}`}>
                                  <Button size="sm" className="cursor-pointer">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                                                     {/* Expandable Returns Section */}
                           {isExpanded && purchase.returns && purchase.returns.length > 0 && (
                             <TableRow>
                               <TableCell colSpan={7} className="bg-gray-50 p-0">
                                <div className="p-4">
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4" />
                                    Returns ({purchase.returns.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {purchase.returns.map((returnItem) => (
                                      <div key={returnItem.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3">
                                            <div>
                                              <div className="font-medium text-sm">{returnItem.return_number}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {new Date(returnItem.return_date).toLocaleDateString('en-BD')}
                              </div>
                            </div>
                                            <div className="flex-1">
                                              <div className="text-sm">{returnItem.reason}</div>
                                              {returnItem.notes && (
                                                <div className="text-xs text-muted-foreground">{returnItem.notes}</div>
                          )}
                        </div>
                      </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <div className="text-right">
                                            <div className="font-medium text-sm">{formatCurrency(returnItem.total_amount)}</div>
                                            <Badge 
                                              variant="outline" 
                                              className={`text-xs ${
                                                returnItem.refund_status === 'completed' 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : returnItem.refund_status === 'processing'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                              }`}
                                            >
                                              {returnItem.refund_status}
                                            </Badge>
                        </div>
                        </div>
                      </div>
                                    ))}
                                  </div>
                      </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No purchases found</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchTerm || statusFilter !== 'all' || returnFilter !== 'all'
                    ? 'Try adjusting your search or filters.' 
                    : 'Get started by creating your first purchase order.'}
                </p>
                <Link href="/purchases/add">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Purchase
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 