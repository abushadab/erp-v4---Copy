"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Receipt,
  TrendingUp,
  Calendar as CalendarIconTable,
  DollarSign,
  Save
} from "lucide-react"
import { toast } from "sonner"
import { getExpenses, getActiveExpenseTypes, createExpense, updateExpense, deleteExpense, type Expense, type ExpenseType } from '@/lib/supabase/expenses-client'
import { cn } from "@/lib/utils"
import Link from 'next/link'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: undefined,
    to: undefined
  })
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    expenseTypeId: '',
    amount: '',
    description: ''
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [expensesData, expenseTypesData] = await Promise.all([
        getExpenses(),
        getActiveExpenseTypes()
      ])
      setExpenses(expensesData)
      setExpenseTypes(expenseTypesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    // Text search filter
    const matchesSearch = expense.expense_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.amount.toString().includes(searchTerm)
    
    // Date range filter
    let matchesDateRange = true
    if (dateRange.from || dateRange.to) {
      const expenseDate = new Date(expense.expense_date)
      if (dateRange.from && expenseDate < dateRange.from) {
        matchesDateRange = false
      }
      if (dateRange.to && expenseDate > dateRange.to) {
        matchesDateRange = false
      }
    }
    
    return matchesSearch && matchesDateRange
  })

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsViewModalOpen(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormData({
      expenseTypeId: expense.expense_type_id,
      amount: expense.amount.toString(),
      description: expense.description || ''
    })
    setSelectedDate(new Date(expense.expense_date))
    setIsEditModalOpen(true)
  }

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId)
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId))
      toast.success("Expense deleted successfully")
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error("Failed to delete expense")
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      expenseTypeId: '',
      amount: '',
      description: ''
    })
    setSelectedDate(new Date())
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.expenseTypeId) {
        toast.error("Please select an expense type")
        return
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error("Please enter a valid amount")
        return
      }

      if (!selectedDate) {
        toast.error("Please select a date")
        return
      }

      // Find selected expense type
      const selectedExpenseType = expenseTypes.find((type: ExpenseType) => type.id === formData.expenseTypeId)
      
      if (!selectedExpenseType) {
        toast.error("Invalid expense type selected")
        return
      }

      // Create new expense using Supabase
      const newExpenseData = {
        expense_type_id: formData.expenseTypeId,
        amount: parseFloat(formData.amount),
        expense_date: format(selectedDate, 'yyyy-MM-dd'),
        description: formData.description || null,
        created_by: 'Ahmed Rahman', // In real app, this would come from auth
      }

      const newExpense = await createExpense(newExpenseData)
      setExpenses(prev => [...prev, newExpense])
      toast.success("Expense added successfully")
      setIsAddModalOpen(false)
      resetForm()
    } catch (error) {
      toast.error("Failed to add expense. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExpense) return
    
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.expenseTypeId) {
        toast.error("Please select an expense type")
        return
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        toast.error("Please enter a valid amount")
        return
      }

      if (!selectedDate) {
        toast.error("Please select a date")
        return
      }

      // Update expense using Supabase
      const updates = {
        expense_type_id: formData.expenseTypeId,
        amount: parseFloat(formData.amount),
        expense_date: format(selectedDate, 'yyyy-MM-dd'),
        description: formData.description || null,
      }

      const updatedExpense = await updateExpense(selectedExpense.id, updates)
      setExpenses(prev => prev.map(expense => 
        expense.id === selectedExpense.id ? updatedExpense : expense
      ))
      toast.success("Expense updated successfully")
      setIsEditModalOpen(false)
      resetForm()
      setSelectedExpense(null)
    } catch (error) {
      toast.error("Failed to update expense. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyInput = (amount: string) => {
    if (!amount) return ''
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount)) return amount
    
    return new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numericAmount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Manage and track your business expenses</p>
          </div>
          <div className="flex gap-2">
            <Link href="/expenses/types">
              <Button variant="outline">
                Expense Types
              </Button>
            </Link>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {currentMonth}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground">
              Expense entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Entry</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <CalendarIconTable className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(expenses.map(e => e.expense_type_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Active types
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Date Range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(range) => setDateRange({ 
                from: range?.from, 
                to: range?.to 
              })}
              numberOfMonths={2}
            />
            <div className="p-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ from: undefined, to: undefined })}
                className="w-full"
              >
                Clear dates
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </motion.div>

      {/* Expenses Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>
              A list of all your business expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {expense.expense_type_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>{formatDate(expense.expense_date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewExpense(expense)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpenseToDelete(expense)
                            setIsDeleteModalOpen(true)
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* View Expense Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              View expense information
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    <Badge variant="secondary">{selectedExpense.expense_type_name}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <div className="mt-1 text-lg font-semibold">
                    {formatCurrency(selectedExpense.amount)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <div className="mt-1">{formatDate(selectedExpense.expense_date)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created By</label>
                  <div className="mt-1">{selectedExpense.created_by}</div>
                </div>
              </div>

              {selectedExpense.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <div className="mt-1 p-2 bg-muted rounded-md">
                    {selectedExpense.description}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <div className="mt-1 text-sm">
                  {selectedExpense.created_at ? new Date(selectedExpense.created_at).toLocaleString() : '-'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new business expense
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Expense Type */}
            <div className="space-y-2">
              <Label htmlFor="expenseType">
                Expense Type <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.expenseTypeId} 
                onValueChange={(value) => handleInputChange('expenseTypeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expense type">
                    {formData.expenseTypeId && (
                      expenseTypes.find((type: ExpenseType) => type.id === formData.expenseTypeId)?.name
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type: ExpenseType) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div>
                        <div className="font-medium">{type.name}</div>
                        {type.description && (
                          <div className="text-sm text-muted-foreground">
                            {type.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (BDT) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ৳
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Amount: {formatCurrencyInput(formData.amount)} BDT
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter expense description..."
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Add Expense
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open)
        if (!open) {
          resetForm()
          setSelectedExpense(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update expense information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Expense Type */}
            <div className="space-y-2">
              <Label htmlFor="edit-expenseType">
                Expense Type <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.expenseTypeId} 
                onValueChange={(value) => handleInputChange('expenseTypeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expense type">
                    {formData.expenseTypeId && (
                      expenseTypes.find((type: ExpenseType) => type.id === formData.expenseTypeId)?.name
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type: ExpenseType) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div>
                        <div className="font-medium">{type.name}</div>
                        {type.description && (
                          <div className="text-sm text-muted-foreground">
                            {type.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="edit-amount">
                Amount (BDT) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ৳
                </span>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Amount: {formatCurrencyInput(formData.amount)} BDT
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter expense description..."
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Expense
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense?
            </DialogDescription>
          </DialogHeader>
          {expenseToDelete && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    <Badge variant="secondary">{expenseToDelete.expense_type_name}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <div className="mt-1 text-lg font-semibold">
                    {formatCurrency(expenseToDelete.amount)}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <div className="mt-1">{formatDate(expenseToDelete.expense_date)}</div>
              </div>
              {expenseToDelete.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                    {expenseToDelete.description}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="default"
                  onClick={() => {
                    handleDeleteExpense(expenseToDelete.id)
                    setIsDeleteModalOpen(false)
                    toast.success("Expense deleted successfully")
                  }}
                >
                  Delete
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 