"use client"

import * as React from "react"
import { Search, Plus, Edit, Building, Mail, Phone, MapPin, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSuppliers, type DatabaseSupplier } from "@/lib/supabase/purchases"
import { createSupplier, updateSupplier, type CreateSupplierData, type UpdateSupplierData } from "@/lib/supabase/mutations"
import { toast } from "sonner"

interface SupplierForm {
  name: string
  email: string
  phone: string
  address: string
  status: 'active' | 'inactive'
}

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all')
  const [suppliers, setSuppliers] = React.useState<DatabaseSupplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = React.useState<DatabaseSupplier[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [editingSupplier, setEditingSupplier] = React.useState<DatabaseSupplier | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  
  // Form states
  const [addForm, setAddForm] = React.useState<SupplierForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active'
  })
  const [editForm, setEditForm] = React.useState<SupplierForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active'
  })

  // Load suppliers from Supabase
  React.useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setIsLoading(true)
        const data = await getSuppliers()
        setSuppliers(data)
      } catch (error) {
        console.error('Error loading suppliers:', error)
        toast.error('Failed to load suppliers')
      } finally {
        setIsLoading(false)
      }
    }

    loadSuppliers()
  }, [])

  // Filter suppliers based on search term and status
  React.useEffect(() => {
    let filtered = suppliers

    if (searchTerm) {
      filtered = filtered.filter((supplier) =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((supplier) => supplier.status === statusFilter)
    }

    setFilteredSuppliers(filtered)
  }, [searchTerm, statusFilter, suppliers])

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '৳ 0'
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const validateForm = (form: SupplierForm) => {
    const newErrors: string[] = []

    if (!form.name.trim()) newErrors.push('Supplier name is required')
    if (form.email && !isValidEmail(form.email)) newErrors.push('Please enter a valid email address')
    if (!form.status) newErrors.push('Status is required')

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const resetAddForm = () => {
    setAddForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      status: 'active'
    })
    setErrors([])
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(addForm)) return

    setIsSubmitting(true)
    
    try {
      const supplierData: CreateSupplierData = {
        name: addForm.name,
        email: addForm.email || undefined,
        phone: addForm.phone || undefined,
        address: addForm.address || undefined,
        status: addForm.status
      }

      await createSupplier(supplierData)
      
      toast.success('Supplier created successfully!')
      
      // Reload suppliers
      const updatedSuppliers = await getSuppliers()
      setSuppliers(updatedSuppliers)
      
      // Close modal and reset form
      setIsAddModalOpen(false)
      resetAddForm()
      
    } catch (error) {
      console.error('Error creating supplier:', error)
      toast.error('Failed to create supplier. Please try again.')
      setErrors(['Failed to create supplier. Please try again.'])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingSupplier || !validateForm(editForm)) return

    setIsSubmitting(true)
    
    try {
      const supplierData: UpdateSupplierData = {
        id: editingSupplier.id,
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        status: editForm.status
      }

      await updateSupplier(supplierData)
      
      toast.success('Supplier updated successfully!')
      
      // Reload suppliers
      const updatedSuppliers = await getSuppliers()
      setSuppliers(updatedSuppliers)
      
      // Close modal
      setIsEditModalOpen(false)
      setEditingSupplier(null)
      
    } catch (error) {
      console.error('Error updating supplier:', error)
      toast.error('Failed to update supplier. Please try again.')
      setErrors(['Failed to update supplier. Please try again.'])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (supplier: DatabaseSupplier) => {
    setEditingSupplier(supplier)
    setEditForm({
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      status: supplier.status
    })
    setErrors([])
    setIsEditModalOpen(true)
  }

  const getSupplierStats = () => {
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length
    const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length
    
    return {
      total: suppliers.length,
      active: activeSuppliers,
      inactive: inactiveSuppliers
    }
  }

  const getLatestJoinDate = () => {
    if (suppliers.length === 0) return '-'
    const validDates = suppliers
      .filter(s => s.join_date)
      .map(s => new Date(s.join_date))
      .sort((a, b) => b.getTime() - a.getTime())
    
    if (validDates.length === 0) return '-'
    return validDates[0].toLocaleDateString('en-BD')
  }

  const stats = getSupplierStats()

  // Skeleton loading screen
  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Filters Skeleton */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 w-full sm:w-80" />
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>

        {/* Table Skeleton */}
        <div className="rounded-md border">
          <div className="p-4">
            <Skeleton className="h-4 w-48 mb-4" />
          </div>
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your supplier database and relationships
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto cursor-pointer" onClick={resetAddForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>
                  Register a new supplier for purchase orders
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Supplier Name *</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="add-name"
                        type="text"
                        value={addForm.name}
                        onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter supplier company name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-status">Status *</Label>
                    <Select 
                      value={addForm.status} 
                      onValueChange={(value: 'active' | 'inactive') => setAddForm(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-email">Contact Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="add-email"
                        type="email"
                        value={addForm.email}
                        onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="supplier@example.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="add-phone">Contact Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="add-phone"
                        type="tel"
                        value={addForm.phone}
                        onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+88017XXXXXXXX"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="add-address"
                      value={addForm.address}
                      onChange={(e) => setAddForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter complete business address including city, postal code"
                      className="pl-10 min-h-[80px]"
                    />
                  </div>
                </div>

                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Supplier'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count and Table */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
              {filteredSuppliers.length} of {suppliers.length} suppliers
        </p>
      </div>

      <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {suppliers.length === 0 ? 'No suppliers found. Add your first supplier!' : 'No suppliers match your search criteria.'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            {supplier.address && (
                              <div className="text-sm text-muted-foreground">{supplier.address}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {supplier.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                {supplier.email}
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                {supplier.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(supplier.status)}`}>
                            {supplier.status || 'inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {supplier.join_date ? new Date(supplier.join_date).toLocaleDateString('en-BD') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier information and status
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Supplier Name *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="edit-name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter supplier company name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value: 'active' | 'inactive') => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="supplier@example.com"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+88017XXXXXXXX"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter complete business address including city, postal code"
                  className="pl-10 min-h-[80px]"
                />
              </div>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Supplier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 