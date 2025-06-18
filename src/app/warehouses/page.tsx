"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { 
  Plus, 
  MapPin, 
  User, 
  Phone,
  Home,
  AlertTriangle,
  CheckCircle,
  Warehouse,
  Eye,
  Loader2,
  Trash2,
  Play
} from "lucide-react"
import { getWarehouses, getProductsByWarehouse, type DatabaseWarehouse } from "@/lib/supabase/queries"
import { createWarehouse, deleteWarehouse, activateWarehouse, type CreateWarehouseData } from "@/lib/supabase/mutations"

// Global cache and request deduplication for warehouses
let warehousesCache: {
  data?: DatabaseWarehouse[]
  lastFetch?: number
  isLoading?: boolean
  loadingPromise?: Promise<DatabaseWarehouse[]>
} = {}

const CACHE_DURATION = 30 * 1000 // 30 seconds

// Request deduplication: ensure only one API call at a time
const getWarehousesData = async () => {
  const now = Date.now()
  
  // Return cached data if valid
  if (warehousesCache.data && warehousesCache.lastFetch && (now - warehousesCache.lastFetch) < CACHE_DURATION) {
    console.log('📋 Using cached warehouses data')
    return warehousesCache.data
  }
  
  // If already loading, return the existing promise
  if (warehousesCache.isLoading && warehousesCache.loadingPromise) {
    console.log('⏳ Warehouses data already loading, waiting for existing request...')
    return warehousesCache.loadingPromise
  }
  
  // Start fresh loading
  warehousesCache.isLoading = true
  warehousesCache.loadingPromise = getWarehouses().then((data) => {
    // Cache the result
    warehousesCache.data = data
    warehousesCache.lastFetch = now
    warehousesCache.isLoading = false
    warehousesCache.loadingPromise = undefined
    
    console.log('✅ Warehouses data loaded and cached')
    return data
  }).catch((error: Error | unknown) => {
    warehousesCache.isLoading = false
    warehousesCache.loadingPromise = undefined
    throw error
  })
  
  return warehousesCache.loadingPromise
}

// Clear cache function
const clearWarehousesCache = () => {
  warehousesCache = {}
  console.log('🗑️ Warehouses cache cleared')
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = React.useState<DatabaseWarehouse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null)
  const [isActivating, setIsActivating] = React.useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean
    type: 'delete' | 'activate'
    warehouseId?: string
    warehouseName?: string
  }>({ open: false, type: 'delete' })
  const [formData, setFormData] = React.useState({
    name: '',
    location: '',
    address: '',
    manager: '',
    contact: '',
    capacity: ''
  })

  // Add refs to prevent duplicate calls
  const loadingRef = React.useRef(false)
  const dataLoadedRef = React.useRef(false)

  // Load warehouses on component mount with duplicate prevention
  React.useEffect(() => {
    if (!dataLoadedRef.current && !loadingRef.current) {
      loadWarehouses()
    }
  }, [])

  const loadWarehouses = async () => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('🔄 Warehouses data loading already in progress, skipping...')
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      const data = await getWarehousesData()
      setWarehouses(data)
      dataLoadedRef.current = true
    } catch (error) {
      console.error('Error loading warehouses:', error)
      toast.error('Failed to load warehouses')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.location.trim()) {
      toast.error('Name and Location are required')
      return
    }

    try {
      setIsSubmitting(true)
      
      const warehouseData: CreateWarehouseData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        address: formData.address.trim() || undefined,
        manager: formData.manager.trim() || undefined,
        contact: formData.contact.trim() || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined
        // Status will be set to 'inactive' automatically in the createWarehouse function
      }

      await createWarehouse(warehouseData)
      
      toast.success('Warehouse created successfully')
      setIsAddDialogOpen(false)
      setFormData({
        name: '',
        location: '',
        address: '',
        manager: '',
        contact: '',
        capacity: ''
      })
      
      // Clear cache and reload warehouses
      clearWarehousesCache()
      dataLoadedRef.current = false // Reset to allow fresh load
      await loadWarehouses()
    } catch (error) {
      console.error('Error creating warehouse:', error)
      toast.error('Failed to create warehouse')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteWarehouse = async (warehouseId: string) => {
    try {
      setIsDeleting(warehouseId)
      await deleteWarehouse(warehouseId)
      toast.success('Warehouse deleted successfully')
      clearWarehousesCache()
      dataLoadedRef.current = false // Reset to allow fresh load
      await loadWarehouses()
    } catch (error: any) {
      console.error('Error deleting warehouse:', error)
      toast.error(error.message || 'Failed to delete warehouse')
    } finally {
      setIsDeleting(null)
      setConfirmDialog({ open: false, type: 'delete' })
    }
  }

  const handleActivateWarehouse = async (warehouseId: string) => {
    try {
      setIsActivating(warehouseId)
      await activateWarehouse(warehouseId)
      toast.success('Warehouse activated successfully')
      clearWarehousesCache()
      dataLoadedRef.current = false // Reset to allow fresh load
      await loadWarehouses()
    } catch (error: any) {
      console.error('Error activating warehouse:', error)
      toast.error(error.message || 'Failed to activate warehouse')
    } finally {
      setIsActivating(null)
      setConfirmDialog({ open: false, type: 'activate' })
    }
  }

  const openConfirmDialog = (type: 'delete' | 'activate', warehouseId: string, warehouseName: string) => {
    setConfirmDialog({
      open: true,
      type,
      warehouseId,
      warehouseName
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
      default:
        return <Warehouse className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Warehouse Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-6 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Manager Info Skeleton */}
                <div className="flex items-center space-x-2 text-sm">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                
                {/* Contact Skeleton */}
                <div className="flex items-center space-x-2 text-sm">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>

                {/* Address Skeleton */}
                <div className="flex items-center space-x-2 text-sm">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-40" />
                </div>

                {/* Action Buttons Skeleton */}
                <div className="pt-2">
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-muted-foreground">
            Manage your warehouse locations and inventory distribution
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Warehouse</DialogTitle>
                <DialogDescription>
                  Enter warehouse information to add to your network
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right text-sm font-medium">Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="Warehouse name" 
                    className="col-span-3" 
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right text-sm font-medium">Location *</Label>
                  <Input 
                    id="location" 
                    placeholder="City, State" 
                    className="col-span-3" 
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    required 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right text-sm font-medium">Address</Label>
                  <Input 
                    id="address" 
                    placeholder="Full address" 
                    className="col-span-3" 
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="manager" className="text-right text-sm font-medium">Manager</Label>
                  <Input 
                    id="manager" 
                    placeholder="Manager name" 
                    className="col-span-3" 
                    value={formData.manager}
                    onChange={(e) => handleInputChange('manager', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact" className="text-right text-sm font-medium">Contact</Label>
                  <Input 
                    id="contact" 
                    placeholder="Phone number" 
                    className="col-span-3" 
                    value={formData.contact}
                    onChange={(e) => handleInputChange('contact', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right text-sm font-medium">Capacity</Label>
                  <Input 
                    id="capacity" 
                    type="number" 
                    placeholder="0" 
                    className="col-span-3" 
                    min="0" 
                    value={formData.capacity}
                    onChange={(e) => handleInputChange('capacity', e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Warehouse
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warehouse Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((warehouse) => {
          return (
            <Card key={warehouse.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{warehouse.location}</span>
                      {getStatusIcon(warehouse.status || 'active')}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(warehouse.status || 'active') as any}>
                    {warehouse.status || 'active'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Manager Info */}
                {warehouse.manager && (
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{warehouse.manager}</span>
                  </div>
                )}
                
                {warehouse.contact && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{warehouse.contact}</span>
                  </div>
                )}

                {/* Address */}
                {warehouse.address && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>{warehouse.address}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2">
                  {warehouse.status === 'inactive' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <Link href={`/warehouses/${warehouse.id}`}>
                        <Button variant="outline" size="sm" className="w-full" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full"
                        title="Activate Warehouse"
                        onClick={() => openConfirmDialog('activate', warehouse.id, warehouse.name)}
                        disabled={isActivating === warehouse.id}
                      >
                        {isActivating === warehouse.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        className="w-full bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
                        title="Delete Warehouse"
                        onClick={() => openConfirmDialog('delete', warehouse.id, warehouse.name)}
                        disabled={isDeleting === warehouse.id}
                      >
                        {isDeleting === warehouse.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Link href={`/warehouses/${warehouse.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {warehouses.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12">
          <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No warehouses found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Get started by adding your first warehouse location
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'delete' ? 'Delete Warehouse' : 'Activate Warehouse'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'delete' 
                ? `Are you sure you want to delete "${confirmDialog.warehouseName}"? This action cannot be undone.`
                : `Are you sure you want to activate "${confirmDialog.warehouseName}"? This will make the warehouse available for use.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button 
              variant={confirmDialog.type === 'delete' ? undefined : 'default'}
              className={confirmDialog.type === 'delete' ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' : ''}
              onClick={() => {
                if (confirmDialog.type === 'delete' && confirmDialog.warehouseId) {
                  handleDeleteWarehouse(confirmDialog.warehouseId)
                } else if (confirmDialog.type === 'activate' && confirmDialog.warehouseId) {
                  handleActivateWarehouse(confirmDialog.warehouseId)
                }
              }}
              disabled={isDeleting !== null || isActivating !== null}
            >
              {(confirmDialog.type === 'delete' ? isDeleting : isActivating) === confirmDialog.warehouseId && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {confirmDialog.type === 'delete' ? 'Delete' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 