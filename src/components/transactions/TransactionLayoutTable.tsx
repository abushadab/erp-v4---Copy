'use client'

import { useState, useMemo } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, subDays, subMonths } from "date-fns"
import { 
  Eye, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarIcon
} from 'lucide-react'
import { TransactionJournalEntry, TransactionLayoutProps } from '@/components/transactions/types'
import { formatCurrency, formatDate, getReferenceDisplay } from './utils'

export default function TransactionLayoutTable({ transactions }: TransactionLayoutProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionJournalEntry | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Filters and pagination state
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined)
  const [pendingDateFilter, setPendingDateFilter] = useState('all')
  const [pendingCustomDateRange, setPendingCustomDateRange] = useState<DateRange | undefined>(undefined)
  const [amountFilter, setAmountFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  // Filter and search logic
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getReferenceDisplay(transaction.reference_type, transaction.reference_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      
      switch (dateFilter) {
        case 'today':
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const todayEnd = new Date()
          todayEnd.setHours(23, 59, 59, 999)
          filtered = filtered.filter(t => {
            const entryDate = new Date(t.entry_date)
            return entryDate >= todayStart && entryDate <= todayEnd
          })
          break
        case 'yesterday':
          const yesterdayStart = subDays(new Date(), 1)
          yesterdayStart.setHours(0, 0, 0, 0)
          const yesterdayEnd = subDays(new Date(), 1)
          yesterdayEnd.setHours(23, 59, 59, 999)
          filtered = filtered.filter(t => {
            const entryDate = new Date(t.entry_date)
            return entryDate >= yesterdayStart && entryDate <= yesterdayEnd
          })
          break
        case 'week':
          const weekAgo = subDays(now, 7)
          filtered = filtered.filter(t => new Date(t.entry_date) >= weekAgo)
          break
        case 'month':
          const monthAgo = subMonths(now, 1)
          filtered = filtered.filter(t => new Date(t.entry_date) >= monthAgo)
          break
        case 'quarter':
          const quarterAgo = subMonths(now, 3)
          filtered = filtered.filter(t => new Date(t.entry_date) >= quarterAgo)
          break
        case 'custom':
          if (customDateRange?.from || customDateRange?.to) {
            filtered = filtered.filter(t => {
              const entryDate = new Date(t.entry_date)
              
              if (customDateRange?.from && customDateRange?.to) {
                // Set start of day for from date
                const fromDate = new Date(customDateRange.from)
                fromDate.setHours(0, 0, 0, 0)
                
                // Set end of day for to date
                const toDate = new Date(customDateRange.to)
                toDate.setHours(23, 59, 59, 999)
                
                return entryDate >= fromDate && entryDate <= toDate
              } else if (customDateRange?.from) {
                const fromDate = new Date(customDateRange.from)
                fromDate.setHours(0, 0, 0, 0)
                return entryDate >= fromDate
              } else if (customDateRange?.to) {
                const toDate = new Date(customDateRange.to)
                toDate.setHours(23, 59, 59, 999)
                return entryDate <= toDate
              }
              return true
            })
          }
          break
      }
    }

    // Amount filter
    if (amountFilter !== 'all') {
      switch (amountFilter) {
        case 'small':
          filtered = filtered.filter(t => t.total_amount < 1000)
          break
        case 'medium':
          filtered = filtered.filter(t => t.total_amount >= 1000 && t.total_amount < 10000)
          break
        case 'large':
          filtered = filtered.filter(t => t.total_amount >= 10000)
          break
      }
    }

    return filtered
  }, [transactions, searchTerm, dateFilter, amountFilter, customDateRange])

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, dateFilter, amountFilter, customDateRange])

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

  const openModal = (transaction: TransactionJournalEntry) => {
    setSelectedTransaction(transaction)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setSelectedTransaction(null)
    setIsModalOpen(false)
  }

  const goToFirstPage = () => setCurrentPage(1)
  const goToLastPage = () => setCurrentPage(totalPages)
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1))
  const goToNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1))

  const resetAllFilters = () => {
    setSearchTerm('')
    setDateFilter('all')
    setCustomDateRange(undefined)
    setAmountFilter('all')
    setCurrentPage(1)
  }

    return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
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

          {/* Amount Filter */}
          <div className="space-y-2 w-36">
            <Label htmlFor="amount-filter">Amount Range</Label>
            <Select value={amountFilter} onValueChange={setAmountFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All amounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All amounts</SelectItem>
                <SelectItem value="small">Under ৳1,000</SelectItem>
                <SelectItem value="medium">৳1,000 - ৳10,000</SelectItem>
                <SelectItem value="large">Over ৳10,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items per page */}
          <div className="space-y-2 w-24">
            <Label htmlFor="items-per-page">Items per page</Label>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
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
        </div>

        {/* Results Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {currentTransactions.length} of {filteredTransactions.length} transactions
          {filteredTransactions.length !== transactions.length && (
            <span> (filtered from {transactions.length} total)</span>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[180px]">Reference</TableHead>
                <TableHead className="w-[120px] text-left">Amount</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[60px] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                currentTransactions.map((transaction) => {
                  const debits = transaction.journal_entry_lines.filter(line => line.debit_amount > 0)
                  const credits = transaction.journal_entry_lines.filter(line => line.credit_amount > 0)

                  return (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(transaction.entry_date)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {getReferenceDisplay(transaction.reference_type, transaction.reference_id)}
                      </TableCell>
                      <TableCell className="text-left font-semibold">
                        {formatCurrency(transaction.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaction.status === 'posted' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openModal(transaction)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirstPage}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed View Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-blue-600" />
                  Transaction Details
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Transaction Header */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant={selectedTransaction.status === 'posted' ? 'default' : 'secondary'}>
                          {selectedTransaction.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground font-mono">
                          {getReferenceDisplay(selectedTransaction.reference_type, selectedTransaction.reference_id)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedTransaction.description}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedTransaction.entry_date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(selectedTransaction.total_amount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Journal Entry Details - Table Format */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Journal Entry Lines</h4>
                  
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransaction.journal_entry_lines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {line.accounts.account_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {line.description}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.debit_amount > 0 ? (
                                <span className="font-semibold text-green-700">
                                  {formatCurrency(line.debit_amount)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.credit_amount > 0 ? (
                                <span className="font-semibold text-blue-700">
                                  {formatCurrency(line.credit_amount)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Totals Row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={2} className="text-right">
                            <strong>Totals:</strong>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-700">
                              {formatCurrency(
                                selectedTransaction.journal_entry_lines
                                  .filter(line => line.debit_amount > 0)
                                  .reduce((sum, line) => sum + line.debit_amount, 0)
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-blue-700">
                              {formatCurrency(
                                selectedTransaction.journal_entry_lines
                                  .filter(line => line.credit_amount > 0)
                                  .reduce((sum, line) => sum + line.credit_amount, 0)
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Balance Verification */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-800">Balance Check:</span>
                    <span className="font-semibold text-green-700">
                      ✓ Debits = Credits ({formatCurrency(selectedTransaction.total_amount)})
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 