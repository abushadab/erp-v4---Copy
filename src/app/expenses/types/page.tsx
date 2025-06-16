"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft
} from "lucide-react"
import { toast } from "sonner"
import { getExpenseTypes, createExpenseType, updateExpenseType, deleteExpenseType, type ExpenseType } from '@/lib/supabase/expenses-client'
import Link from 'next/link'

export default function ManageExpenseTypesPage() {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])

  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [expenseTypeToDelete, setExpenseTypeToDelete] = useState<ExpenseType | null>(null)
  const [loading, setLoading] = useState(true)
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

  const filteredExpenseTypes = expenseTypes

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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

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
        <div className="flex items-center gap-4 mb-4">
          <Link href="/expenses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Expenses
            </Button>
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expense Types</h1>
            <p className="text-muted-foreground">Create and manage expense categories for your business</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense Type
          </Button>
        </div>
      </motion.div>

      {/* Expense Types Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Expense Type Categories</CardTitle>
            <CardDescription>
              Manage your expense type categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenseTypes.map((expenseType) => (
                  <TableRow key={expenseType.id}>
                    <TableCell className="font-medium">{expenseType.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expenseType.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={expenseType.status === 'active' ? 'default' : 'secondary'}>
                        {expenseType.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(expenseType.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
          </CardContent>
        </Card>
      </motion.div>

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

      {/* Delete Expense Type Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Expense Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense type?
            </DialogDescription>
          </DialogHeader>
          {expenseTypeToDelete && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="mt-1 text-lg font-semibold">{expenseTypeToDelete.name}</div>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="default"
                  onClick={() => {
                    handleDeleteExpenseType(expenseTypeToDelete.id)
                    setIsDeleteModalOpen(false)
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