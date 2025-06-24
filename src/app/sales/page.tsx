"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Calendar,
  CalendarIcon,
  User,
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Users,
  MoreHorizontal,
  RotateCcw,
  Printer,
  CreditCard
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, subDays, subMonths } from "date-fns"
import SalePaymentModal from "@/components/SalePaymentModal"
import { type SaleWithItems } from "@/lib/supabase/sales-client"
import { useSalesData } from "@/lib/hooks/useSalesData"
import { toast } from "sonner"

export default function SalesPage() {
  // Use the optimized hook for data fetching
  const { sales, isLoading, error, refetch } = useSalesData()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(['completed', 'returned', 'partially returned'])
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false)
  const [selectedSale, setSelectedSale] = React.useState<SaleWithItems | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  // Date filter states
  type DateRange = {
    from: Date | undefined
    to?: Date | undefined
  }

  const [dateFilter, setDateFilter] = React.useState('all')
  const [customDateRange, setCustomDateRange] = React.useState<DateRange | undefined>(undefined)
  const [pendingDateFilter, setPendingDateFilter] = React.useState('all')
  const [pendingCustomDateRange, setPendingCustomDateRange] = React.useState<DateRange | undefined>(undefined)
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const [isDateDialogOpen, setIsDateDialogOpen] = React.useState(false)

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
        dateRange = { from: subDays(now, 7), to: now }
        break
      case 'month':
        dateRange = { from: subMonths(now, 1), to: now }
        break
      case 'quarter':
        dateRange = { from: subMonths(now, 3), to: now }
        break
      default:
        dateRange = undefined
    }

    setPendingCustomDateRange(dateRange)
  }
  
  // Handle payment modal
  const handleMakePayment = (sale: SaleWithItems) => {
    setSelectedSale(sale)
    setPaymentModalOpen(true)
  }
  
  const handlePaymentCreated = () => {
    // Refresh the sales data
    refetch()
  }
  
  const handlePrint = (sale: SaleWithItems) => {
    // TODO: Implement print functionality
    toast.info('Print functionality coming soon!')
  }

  // Show error toast if there's an error
  React.useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.salesperson.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatuses.includes(sale.status || '')

    // Date filtering
    let matchesDate = true
    if (dateFilter !== 'all') {
      const saleDate = sale.sale_date ? new Date(sale.sale_date) : null
      if (!saleDate) {
        matchesDate = false
      } else {
        let range: DateRange | undefined
        switch (dateFilter) {
          case 'today':
            const today = new Date()
            range = { from: today, to: today }
            break
          case 'yesterday':
            const yesterday = subDays(new Date(), 1)
            range = { from: yesterday, to: yesterday }
            break
          case 'week':
            range = { from: subDays(new Date(), 7), to: new Date() }
            break
          case 'month':
            range = { from: subMonths(new Date(), 1), to: new Date() }
            break
          case 'quarter':
            range = { from: subMonths(new Date(), 3), to: new Date() }
            break
          case 'custom':
            range = customDateRange
            break
          default:
            range = undefined
        }
        if (range?.from && range?.to) {
          matchesDate = saleDate >= range.from && saleDate <= range.to
        } else if (range?.from) {
          matchesDate = saleDate >= range.from
        }
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  // Pagination calculations
  const totalItems = filteredSales.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSales = filteredSales.slice(startIndex, endIndex)

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatuses])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'returned':
        return <XCircle className="h-4 w-4 text-gray-600" />
      case 'partially returned':
        return <Clock className="h-4 w-4 text-orange-600" />
      default:
        return <ShoppingCart className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      case 'returned':
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
      case 'partially returned':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 px-4 sm:px-6 lg:px-8 py-6" suppressHydrationWarning>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Table Skeleton */}
        <Card>
                  {/* Mobile Card Skeletons for small and medium screens */}
        <div className="block lg:hidden">
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} style={{ backgroundColor: '#f4f8f9' }} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    
                    <div>
                      <Skeleton className="h-3 w-10 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    
                    <div>
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-4 w-18" />
                    </div>
                    
                    <div>
                      <Skeleton className="h-3 w-10 mb-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    
                    <div className="col-span-2">
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    
                    <div className="col-span-2">
                      <Skeleton className="h-3 w-20 mb-1" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Table Skeleton for large screens and up */}
          <div className="hidden lg:block overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 px-4 sm:px-6 lg:px-8 py-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Track and manage your sales transactions
          </p>
        </div>
        <Link href="/sales/new">
          <Button size="sm" suppressHydrationWarning>
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-muted-foreground">
              All time sales count
            </p>
          </CardContent>
        </Card>
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total sales revenue
            </p>
          </CardContent>
        </Card>
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Sales</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales.filter(sale => sale.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(sales.map(sale => sale.customer_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="space-y-2 col-span-1 md:col-span-6">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2 col-span-1 md:col-span-6">
          <Label htmlFor="date-filter">Date Range</Label>
          
          {/* Desktop/Tablet: Use Popover */}
          <div className="hidden sm:block">
            <Popover open={isDatePickerOpen} onOpenChange={(open) => {
              setIsDatePickerOpen(open)
              if (open) {
                setPendingDateFilter(dateFilter)
                setPendingCustomDateRange(customDateRange)
              }
            }}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-left font-normal bg-white">
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
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-full p-0 bg-white shadow-lg border" align="start" sideOffset={4}>
                <div className="flex max-w-full" style={{ justifyContent: 'space-between' }}>
                  {/* Suggestions */}
                  <div className="w-60 bg-gray-50 p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Suggestions</h3>
                    <div className="space-y-1">
                      {pendingDateFilter === 'custom' && pendingCustomDateRange?.from && (
                        <div className="w-full justify-between text-left px-3 py-2 bg-gray-200 rounded">
                          <span className="text-black font-medium text-sm">Custom range</span>
                          <span className="text-gray-500 text-xs block">
                            {pendingCustomDateRange?.to ? (
                              `${format(pendingCustomDateRange.from, "dd MMM")} - ${format(pendingCustomDateRange.to, "dd MMM yy")}`
                            ) : (
                              format(pendingCustomDateRange.from, "dd MMM yy")
                            )}
                          </span>
                        </div>
                      )}
                      {/* Preset buttons */}
                      {['today','yesterday','week','month','quarter'].map(preset => (
                        <Button
                          key={preset}
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start text-left hover:bg-gray-100 px-3 py-2 h-auto text-sm ${pendingDateFilter === preset ? 'bg-gray-200' : ''}`}
                          onClick={() => setDatePreset(preset)}
                        >
                          <span className={`${pendingDateFilter === preset ? 'text-black font-medium' : 'text-gray-700'}`}>{preset.charAt(0).toUpperCase()+preset.slice(1)}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Calendar */}
                  <div className="flex-1 min-w-0 p-4 overflow-hidden">
                    <div className="w-full">
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
                        className="rounded-md border-0 w-full p-0 text-sm"
                      />
                    </div>
                    {/* Buttons */}
                    <div className="flex justify-between mt-4 gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-sm" onClick={() => {
                        setPendingDateFilter(dateFilter)
                        setPendingCustomDateRange(customDateRange)
                        setIsDatePickerOpen(false)
                      }}>Cancel</Button>
                      <Button size="sm" className="bg-black hover:bg-gray-800 text-white flex-1 text-sm" onClick={() => {
                        setDateFilter(pendingDateFilter)
                        setCustomDateRange(pendingCustomDateRange)
                        setIsDatePickerOpen(false)
                      }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Mobile: Use fullscreen Dialog */}
          <div className="block sm:hidden">
            <Dialog open={isDateDialogOpen} onOpenChange={(open) => {
              setIsDateDialogOpen(open)
              if (open) {
                setPendingDateFilter(dateFilter)
                setPendingCustomDateRange(customDateRange)
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between text-left font-normal bg-white"
                  suppressHydrationWarning
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">
                      {dateFilter === 'all' && 'All time'}
                      {dateFilter === 'today' && format(new Date(), "MMM. do")}
                      {dateFilter === 'yesterday' && format(subDays(new Date(), 1), "MMM. do")}
                      {dateFilter === 'week' && `Last 7 days`}
                      {dateFilter === 'month' && `Last 30 days`}
                      {dateFilter === 'quarter' && `Last 90 days`}
                      {dateFilter === 'custom' && customDateRange?.from && (
                        customDateRange?.to ? (
                          `${format(customDateRange.from, "MMM. do")} → ${format(customDateRange.to, "MMM. do")}`
                        ) : (
                          format(customDateRange.from, "MMM. do")
                        )
                      )}
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0 gap-0 bg-white max-w-full w-full h-full m-0 rounded-none" suppressHydrationWarning>
                <div className="flex flex-col h-full w-full">
                  {/* Header */}
                  <DialogHeader className="p-4 border-b bg-gray-50">
                    <DialogTitle className="text-lg font-semibold text-center">Select Date Range</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 text-center">
                      Choose a date range to filter your sales data
                    </DialogDescription>
                  </DialogHeader>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    {/* Suggestions Section - Top */}
                    <div className="p-4 bg-gray-50 border-b">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Selection</h3>
                      <div className="space-y-2">
                        {pendingDateFilter === 'custom' && pendingCustomDateRange?.from && (
                          <div className="px-3 py-2 bg-gray-200 rounded text-center mb-3">
                            <span className="text-black font-medium text-sm">Custom range</span>
                            <span className="text-gray-500 text-xs block">
                              {pendingCustomDateRange?.to ? (
                                `${format(pendingCustomDateRange.from, "dd MMM")} - ${format(pendingCustomDateRange.to, "dd MMM yy")}`
                              ) : (
                                format(pendingCustomDateRange.from, "dd MMM yy")
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {['today','yesterday','week','month','quarter'].map(preset => (
                            <Button
                              key={preset}
                              variant="ghost"
                              size="sm"
                              className={`justify-center text-center hover:bg-gray-100 px-4 py-2 h-auto text-sm rounded-full ${pendingDateFilter === preset ? 'bg-gray-200' : ''}`}
                              onClick={() => setDatePreset(preset)}
                            >
                              <span className={`${pendingDateFilter === preset ? 'text-black font-medium' : 'text-gray-700'}`}>
                                {preset.charAt(0).toUpperCase()+preset.slice(1)}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Calendar Section - Middle */}
                    <div className="p-4 flex-1 flex justify-center items-start">
                      <div className="w-full">
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
                          className="rounded-md border-0 w-full p-0"
                          classNames={{
                            months: "flex flex-col space-y-4 w-full",
                            month: "space-y-4 w-full",
                            caption: "flex justify-center pt-1 relative items-center w-full",
                            caption_label: "text-lg font-medium",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-8 w-8 bg-transparent p-0 hover:bg-gray-100 rounded cursor-pointer flex items-center justify-center",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex w-full",
                            head_cell: "text-gray-500 rounded-md font-normal text-base flex-1 text-center py-2",
                            row: "flex w-full mt-2",
                            cell: "text-center text-base p-0 relative flex-1",
                            day: "h-12 w-full p-0 font-normal hover:bg-gray-100 rounded mx-auto cursor-pointer flex items-center justify-center text-base",
                            day_selected: "bg-gray-900 text-white hover:bg-gray-800 hover:text-white",
                            day_today: "bg-gray-200 text-gray-900",
                            day_outside: "text-gray-400",
                            day_disabled: "text-gray-300",
                            day_range_middle: "bg-gray-100 text-gray-900 hover:bg-gray-200",
                            day_hidden: "invisible",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer with Cancel/Apply buttons - Bottom */}
                  <div className="p-4 border-t bg-white">
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => {
                          setPendingDateFilter(dateFilter)
                          setPendingCustomDateRange(customDateRange)
                          setIsDateDialogOpen(false)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="bg-black hover:bg-gray-800 text-white flex-1" 
                        onClick={() => {
                          setDateFilter(pendingDateFilter)
                          setCustomDateRange(pendingCustomDateRange)
                          setIsDateDialogOpen(false)
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Filter and Rows per page - side by side on small screens */}
        <div className="col-span-1 md:col-span-6 grid grid-cols-2 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-left font-normal bg-white">
                  <div className="flex items-center min-w-0 flex-1">
                    <Filter className="mr-2 h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">Status</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['completed','returned','partially returned'].map(stat => (
                  <DropdownMenuCheckboxItem
                    key={stat}
                    checked={selectedStatuses.includes(stat)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStatuses([...selectedStatuses, stat])
                      } else {
                        setSelectedStatuses(selectedStatuses.filter(s => s !== stat))
                      }
                    }}
                  >
                    {stat.charAt(0).toUpperCase()+stat.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Rows per page */}
          <div className="space-y-2">
            <Label>Rows</Label>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(parseInt(value))
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-full" suppressHydrationWarning>
                <SelectValue />
              </SelectTrigger>
              <SelectContent suppressHydrationWarning>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <Card suppressHydrationWarning>
        {/* Mobile Card Layout for small and medium screens */}
        <div className="block lg:hidden">
          <div className="space-y-4 p-4">
            {currentSales.length > 0 ? (
              currentSales.map((sale) => (
                <Card key={sale.id} className="p-4" style={{ backgroundColor: '#f4f8f9' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-sm text-muted-foreground">Sale ID</div>
                      <div className="font-bold">{sale.id}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          style={{ backgroundColor: 'black', color: 'white' }}
                          className="hover:bg-gray-800"
                          suppressHydrationWarning
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" suppressHydrationWarning>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/sales/${sale.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Sale
                          </Link>
                        </DropdownMenuItem>
                        {sale.status === 'completed' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/returns?saleId=${sale.id}`}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Return
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handlePrint(sale)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMakePayment(sale)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Make Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Customer</div>
                      <div className="flex items-center space-x-1">
                        <UserCheck className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{sale.customer_name}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1">Date</div>
                      <div>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1">Amount</div>
                      <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1">Items</div>
                      <div className="flex items-center space-x-1">
                        <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                        <span>{sale.sale_items?.length || 0}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-2 md:col-span-3">
                      <div className="text-muted-foreground mb-1">Status</div>
                      <Badge className={`flex items-center gap-1 w-fit ${getStatusColor(sale.status || '')}`}>
                        {sale.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-700" />
                        ) : (
                          getStatusIcon(sale.status || '')
                        )}
                        {sale.status}
                      </Badge>
                    </div>
                    
                    <div className="col-span-2 md:col-span-3">
                      <div className="text-muted-foreground mb-1">Salesperson</div>
                      <div className="truncate">{sale.salesperson}</div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No sales found
              </div>
            )}
          </div>
        </div>

        {/* Table Layout for large screens and up */}
        <div className="hidden lg:block overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Sale ID</TableHead>
                <TableHead className="min-w-[150px]">Customer</TableHead>
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[80px]">Items</TableHead>
                <TableHead className="min-w-[120px]">Amount</TableHead>
                <TableHead className="min-w-[140px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Salesperson</TableHead>
                <TableHead className="text-right min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSales.length > 0 ? (
                currentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span>{sale.customer_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span>{sale.sale_items?.length || 0} items</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center gap-1 w-fit ${getStatusColor(sale.status || '')}`}>
                        {sale.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-700" />
                        ) : (
                          getStatusIcon(sale.status || '')
                        )}
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sale.salesperson}</TableCell>
                    <TableCell className="text-right">
                                          <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-white hover:bg-gray-800"
                          style={{ backgroundColor: 'black' }}
                          suppressHydrationWarning
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" suppressHydrationWarning>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/sales/${sale.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Sale
                          </Link>
                        </DropdownMenuItem>
                        {sale.status === 'completed' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/returns?saleId=${sale.id}`}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Return
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handlePrint(sale)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMakePayment(sale)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Make Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No sales found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground order-2 md:order-1">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{' '}
            {totalItems} sales
          </div>
          <div className="flex items-center space-x-2 order-1 md:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              suppressHydrationWarning
              className="px-2 md:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:inline ml-1">Previous</span>
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                  // On mobile and tablet, show fewer pages
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    return page === currentPage || page === 1 || page === totalPages;
                  }
                  return showPage;
                })
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-1 md:px-2 text-muted-foreground text-sm">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0 text-sm"
                      suppressHydrationWarning
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              suppressHydrationWarning
              className="px-2 md:px-3"
            >
              <span className="hidden md:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Payment Modal */}
      {selectedSale && (
        <SalePaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedSale(null)
          }}
          saleId={selectedSale.id}
          customerName={selectedSale.customer_name}
          totalAmount={selectedSale.total_amount}
          amountPaid={(selectedSale as any).amount_paid || 0}
          sale={selectedSale}
          onPaymentCreated={handlePaymentCreated}
        />
      )}
    </div>
  )
}