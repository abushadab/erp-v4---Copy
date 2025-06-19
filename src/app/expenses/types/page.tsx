"use client"

import React, { useState, useEffect } from 'react'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  DialogTitle
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { 
  Plus, 
  Trash2, 
  ArrowLeft,
  Edit,
  Search,
  Tags,
  CheckCircle,
  XCircle,
  List
} from "lucide-react"
import { toast } from "sonner"
import { getExpenseTypes, createExpenseType, updateExpenseType, deleteExpenseType, type ExpenseType } from '@/lib/supabase/expenses-client'
import Link from 'next/link'

export default function ManageExpenseTypesPage() {
  const [loading, setLoading] = useState(true)
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [expenseTypeToDelete, setExpenseTypeToDelete] = useState<ExpenseType | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getExpenseTypes()
      setExpenseTypes(data)
    } catch (error) {
      console.error('Error loading expense types:', error)
      toast.error('Failed to load expense types')
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenseTypes = expenseTypes.filter(expenseType =>
    expenseType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expenseType.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeExpenseTypes = expenseTypes.filter(type => type.status === 'active')
  const inactiveExpenseTypes = expenseTypes.filter(type => type.status === 'inactive')

  const handleEditExpenseType = (expenseType: ExpenseType) => {
    setSelectedExpenseType(expenseType)
    setFormData({
      name: expenseType.name,
      description: expenseType.description || '',
      status: expenseType.status as 'active' | 'inactive'
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteExpenseType = async (expenseTypeId: string) => {
    try {
      await deleteExpenseType(expenseTypeId)
      setExpenseTypes(prev => prev.filter(type => type.id !== expenseTypeId))
      toast.success("Expense type deleted successfully")
    } catch (error) {
      console.error('Error deleting expense type:', error)
      toast.error("Failed to delete expense type")
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'status' ? value as 'active' | 'inactive' : value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active'
    })
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error("Please enter an expense type name")
        return
      }

      // Check for duplicate name
      if (expenseTypes.some(type => type.name.toLowerCase() === formData.name.toLowerCase())) {
        toast.error("An expense type with this name already exists")
        return
      }

      // Create new expense type using Supabase
      const newExpenseTypeData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status as 'active' | 'inactive',
        created_by: 'Ahmed Rahman' // In real app, this would come from auth
      }

      const newExpenseType = await createExpenseType(newExpenseTypeData)
      setExpenseTypes(prev => [...prev, newExpenseType])
      toast.success("Expense type added successfully")
      setIsAddModalOpen(false)
      resetForm()
    } catch (error) {
      toast.error("Failed to add expense type. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExpenseType) return
    
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error("Please enter an expense type name")
        return
      }

      // Check for duplicate name (excluding current item)
      if (expenseTypes.some(type => 
        type.id !== selectedExpenseType.id && 
        type.name.toLowerCase() === formData.name.toLowerCase()
      )) {
        toast.error("An expense type with this name already exists")
        return
      }

      // Update expense type using Supabase
      const updates = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status as 'active' | 'inactive'
      }

      const updatedExpenseType = await updateExpenseType(selectedExpenseType.id, updates)

      setExpenseTypes(prev => prev.map(type => 
        type.id === selectedExpenseType.id ? updatedExpenseType : type
      ))
      toast.success("Expense type updated successfully")
      setIsEditModalOpen(false)
      resetForm()
      setSelectedExpenseType(null)
    } catch (error) {
      toast.error("Failed to update expense type. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Skeleton loading state
  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Search Skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Count Skeleton */}
        <div className="mb-4">
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expense Types</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage expense categories for your business
          </p>
          </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense Type
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="space-y-2 flex-1">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search expense types by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Expense Type Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredExpenseTypes.length} of {expenseTypes.length} expense types
        </p>
      </div>

      {/* Expense Types Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filteredExpenseTypes.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenseTypes.map((expenseType) => (
                    <TableRow key={expenseType.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{expenseType.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expenseType.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={expenseType.status === 'active' ? 'default' : 'secondary'}>
                        {expenseType.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(expenseType.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExpenseType(expenseType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpenseTypeToDelete(expenseType)
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
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                <Tags className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No expense types found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No types match your search criteria.' : 'Get started by creating your first expense type.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense Type
                  </Button>
                </div>
              )}
            </div>
          )}
          </CardContent>
        </Card>

      {/* Add Expense Type Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense Type</DialogTitle>
            <DialogDescription>
              Create a new expense type category
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter expense type name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-description">Description (Optional)</Label>
              <Textarea
                id="add-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  'Add Expense Type'
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

      {/* Edit Expense Type Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open)
        if (!open) {
          resetForm()
          setSelectedExpenseType(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense Type</DialogTitle>
            <DialogDescription>
              Update expense type information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter expense type name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  'Update Expense Type'
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

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Expense Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{expenseTypeToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
                <Button 
              variant="destructive"
                  onClick={() => {
                if (expenseTypeToDelete) {
                    handleDeleteExpenseType(expenseTypeToDelete.id)
                    setIsDeleteModalOpen(false)
                  setExpenseTypeToDelete(null)
                }
                  }}
              className="flex-1"
                >
                  Delete
                </Button>
                <Button 
                  variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setExpenseTypeToDelete(null)
              }}
              className="flex-1"
                >
                  Cancel
                </Button>
              </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 