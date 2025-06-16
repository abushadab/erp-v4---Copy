"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { 
  ArrowLeft,
  MapPin, 
  User, 
  Phone,
  Home,
  Package,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  Building2,
  Loader2,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react"
import { getWarehouseById, type DatabaseWarehouse } from "@/lib/supabase/queries"
import { updateWarehouse, deleteWarehouse, type UpdateWarehouseData } from "@/lib/supabase/mutations"
import { createClient } from "@/lib/supabase/client"

interface WarehouseDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

interface WarehouseStockItem {
  id: string
  item_id: string
  item_name: string
  item_sku: string
  item_type: 'product' | 'package'
  category_name: string
  current_stock: number
  available_stock: number
  reserved_stock: number
  buying_price: number
  variation_id?: string
  variation_attributes?: Record<string, string>
  last_movement_at?: string
}

export default function WarehouseDetailsPage({ params }: WarehouseDetailsPageProps) {
  const resolvedParams = React.use(params)
  const [warehouse, setWarehouse] = React.useState<DatabaseWarehouse | null>(null)
  const [warehouseStockItems, setWarehouseStockItems] = React.useState<WarehouseStockItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [stockLoading, setStockLoading] = React.useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: '',
    location: '',
    address: '',
    manager: '',
    contact: '',
    capacity: ''
  })

  // Load warehouse and stock data
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        console.log(`🏗️ Loading warehouse data for: ${resolvedParams.id}`)
        
        const warehouseData = await getWarehouseById(resolvedParams.id)
        console.log('📦 Warehouse data from Supabase:', warehouseData)
        setWarehouse(warehouseData)

        if (warehouseData) {
          setStockLoading(true)
          console.log(`📊 Loading stock data for warehouse: ${resolvedParams.id}`)
          
          const stockData = await getWarehouseStockItems(resolvedParams.id)
          console.log('📈 Stock data from Supabase:', stockData)
          setWarehouseStockItems(stockData)
        }
      } catch (error) {
        console.error('❌ Error loading warehouse data:', error)
      } finally {
        setLoading(false)
        setStockLoading(false)
      }
    }

    loadData()
  }, [resolvedParams.id])

  // Function to get stock items for this warehouse
  const getWarehouseStockItems = async (warehouseId: string): Promise<WarehouseStockItem[]> => {
    const supabase = createClient()
    
    try {
      console.log('🔍 Loading stock data for warehouse:', warehouseId)
      
      // Try to query the product_warehouse_stock table
      const { data, error } = await supabase
        .from('product_warehouse_stock')
        .select(`
          *,
          products!inner(
            id,
            name,
            sku,
            category_id
          )
        `)
        .eq('warehouse_id', warehouseId)
        .order('current_stock', { ascending: false })

      if (error) {
        console.error('❌ Error in product_warehouse_stock query:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // If there's an error, try fallback
        console.log('🔄 Falling back to empty result...')
        return await getFallbackWarehouseProducts(warehouseId)
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} stock items for warehouse ${warehouseId}`)
      
      // Get category information separately for better performance
      const categoryIds = [...new Set(data?.map(item => item.products?.category_id).filter(Boolean))]
      let categories: any[] = []
      
      if (categoryIds.length > 0) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds)
        categories = categoryData || []
        console.log(`📂 Fetched ${categories.length} categories for stock items`)
      }

      const productStockItems = (data || []).map(item => {
        const category = categories.find(c => c.id === item.products?.category_id)
        return {
          id: item.id,
          item_id: item.product_id,
          item_name: item.products?.name || 'Unknown Product',
          item_sku: item.products?.sku || '',
          item_type: 'product' as const,
          category_name: category?.name || 'Uncategorized',
          current_stock: item.current_stock,
          available_stock: item.available_stock || (item.current_stock - item.reserved_stock),
          reserved_stock: item.reserved_stock,
          buying_price: item.buying_price || 0,
          variation_id: item.variation_id,
          variation_attributes: undefined, // Not needed for basic display
          last_movement_at: item.last_movement_at
        }
      })

      // Get packaging stock for this warehouse
      const { data: packagingData, error: packagingError } = await supabase
        .from('packaging_warehouse_stock')
        .select(`
          *,
          packaging!inner(
            id,
            title,
            sku,
            type,
            status
          )
        `)
        .eq('warehouse_id', warehouseId)
        .order('current_stock', { ascending: false })

      if (packagingError) {
        console.error('❌ Error fetching packaging warehouse stock:', packagingError)
      }

      const packagingStockItems = (packagingData || []).map(item => ({
        id: item.id,
        item_id: item.packaging_id,
        item_name: item.packaging?.title || 'Unknown Packaging',
        item_sku: item.packaging?.sku || '',
        item_type: 'package' as const,
        category_name: 'Packaging',
        current_stock: item.current_stock,
        available_stock: item.available_stock || (item.current_stock - item.reserved_stock),
        reserved_stock: item.reserved_stock,
        buying_price: item.buying_price || 0,
        variation_id: item.variation_id,
        variation_attributes: undefined,
        last_movement_at: item.last_movement_at
      }))

      console.log(`✅ Successfully fetched ${productStockItems.length} product and ${packagingStockItems.length} packaging stock items for warehouse ${warehouseId}`)
      
      // Combine product and packaging stock
      return [...productStockItems, ...packagingStockItems]
    } catch (error) {
      console.error('❌ Exception in getWarehouseStockItems:', error)
      console.log('🔄 Using fallback method...')
      return await getFallbackWarehouseProducts(warehouseId)
    }
  }

  // Fallback function to return empty array since legacy columns are removed
  const getFallbackWarehouseProducts = async (warehouseId: string): Promise<WarehouseStockItem[]> => {
    console.log(`📦 No stock data found for warehouse ${warehouseId}. The products table no longer has warehouse assignments.`)
    console.log('ℹ️  Please add stock using the multi-warehouse stock management system.')
    
    // Return empty array since we removed the legacy columns
    return []
  }

  // Set form data when warehouse is loaded
  React.useEffect(() => {
    if (warehouse) {
      setFormData({
        name: warehouse.name || '',
        location: warehouse.location || '',
        address: warehouse.address || '',
        manager: warehouse.manager || '',
        contact: warehouse.contact || '',
        capacity: warehouse.capacity ? warehouse.capacity.toString() : ''
      })
    }
  }, [warehouse])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!warehouse || !formData.name.trim() || !formData.location.trim()) {
      toast.error('Name and Location are required')
      return
    }

    try {
      setIsSubmitting(true)
      
      const updateData: UpdateWarehouseData = {
        id: warehouse.id,
        name: formData.name.trim(),
        location: formData.location.trim(),
        address: formData.address.trim() || undefined,
        manager: formData.manager.trim() || undefined,
        contact: formData.contact.trim() || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        status: warehouse.status || 'inactive'
      }

      await updateWarehouse(updateData)
      
      // Reload warehouse data
      const updatedWarehouse = await getWarehouseById(resolvedParams.id)
      setWarehouse(updatedWarehouse)
      
      toast.success('Warehouse updated successfully')
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating warehouse:', error)
      toast.error('Failed to update warehouse')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!warehouse) return

    try {
      setIsDeleting(true)
      await deleteWarehouse(warehouse.id)
      toast.success('Warehouse deleted successfully')
      // Redirect to warehouses page
      window.location.href = '/warehouses'
    } catch (error: any) {
      console.error('Error deleting warehouse:', error)
      toast.error(error.message || 'Failed to delete warehouse')
    } finally {
      setIsDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'inactive':
        return <AlertTriangle className="h-5 w-5 text-gray-600" />
      default:
        return <Warehouse className="h-5 w-5" />
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

  const getStockStatus = (stock: number = 0) => {
    if (stock === 0) return { color: 'text-red-600', label: 'Out of Stock' }
    if (stock <= 5) return { color: 'text-yellow-600', label: 'Low Stock' }
    return { color: 'text-green-600', label: 'In Stock' }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center space-x-4">
          <Link href="/warehouses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center space-x-4">
          <Link href="/warehouses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <Warehouse className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
          <h1 className="text-2xl font-bold mb-4">Warehouse Not Found</h1>
          <p className="text-muted-foreground text-center mb-4">
            The warehouse you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/warehouses">
            <Button>Go back to warehouses</Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalStock = warehouseStockItems.reduce((total: number, item: WarehouseStockItem) => total + item.current_stock, 0)
  const totalReserved = warehouseStockItems.reduce((total: number, item: WarehouseStockItem) => total + item.reserved_stock, 0)
  const totalAvailable = warehouseStockItems.reduce((total: number, item: WarehouseStockItem) => total + item.available_stock, 0)
  const utilization = warehouse.capacity && warehouse.capacity > 0 ? 
    (totalStock / warehouse.capacity) * 100 : 0
  const availableSpace = (warehouse.capacity || 0) - totalStock

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/warehouses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{warehouse.name}</h1>
            <p className="text-muted-foreground">
              Warehouse details and inventory information
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleEditSubmit}>
                <DialogHeader>
                  <DialogTitle>Edit Warehouse</DialogTitle>
                  <DialogDescription>
                    Update warehouse information
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right text-sm font-medium">Name *</Label>
                    <Input 
                      id="edit-name" 
                      placeholder="Warehouse name" 
                      className="col-span-3" 
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-location" className="text-right text-sm font-medium">Location *</Label>
                    <Input 
                      id="edit-location" 
                      placeholder="City, State" 
                      className="col-span-3" 
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-address" className="text-right text-sm font-medium">Address</Label>
                    <Input 
                      id="edit-address" 
                      placeholder="Full address" 
                      className="col-span-3" 
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-manager" className="text-right text-sm font-medium">Manager</Label>
                    <Input 
                      id="edit-manager" 
                      placeholder="Manager name" 
                      className="col-span-3" 
                      value={formData.manager}
                      onChange={(e) => handleInputChange('manager', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-contact" className="text-right text-sm font-medium">Contact</Label>
                    <Input 
                      id="edit-contact" 
                      placeholder="Phone number" 
                      className="col-span-3" 
                      value={formData.contact}
                      onChange={(e) => handleInputChange('contact', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-capacity" className="text-right text-sm font-medium">Capacity</Label>
                    <Input 
                      id="edit-capacity" 
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
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Warehouse
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {warehouse.status === 'inactive' && (
            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Warehouse
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Warehouse</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{warehouse.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Warehouse
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Warehouse Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Warehouse Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warehouse ID</label>
                  <p className="text-lg font-semibold">{warehouse.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(warehouse.status || 'active')}
                    <Badge variant={getStatusColor(warehouse.status || 'active') as any} className="text-sm">
                      {(warehouse.status || 'active').charAt(0).toUpperCase() + (warehouse.status || 'active').slice(1)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p>{warehouse.location}</p>
                  </div>
                </div>

                {warehouse.manager && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Manager</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p>{warehouse.manager}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {warehouse.contact && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{warehouse.contact}</p>
                    </div>
                  </div>
                )}

                {warehouse.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <p>{warehouse.address}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Items</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <p>
                      {warehouseStockItems.filter(item => item.item_type === 'product').length} products, {' '}
                      {warehouseStockItems.filter(item => item.item_type === 'package').length} packages
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Summary */}
        <div className="space-y-4">
          {warehouse.capacity && warehouse.capacity > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Capacity Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Capacity:</span>
                  <span className="font-medium">{warehouse.capacity.toLocaleString()} units</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Current Stock:</span>
                  <span className="font-medium">{totalStock.toLocaleString()} units</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Available Space:</span>
                  <span className="font-medium text-green-600">{availableSpace.toLocaleString()} units</span>
                </div>
                
                <div className="flex justify-between items-center text-lg font-bold border-t pt-3 mt-3">
                  <span>Utilization:</span>
                  <span className={utilization > 90 ? 'text-red-600' : utilization > 75 ? 'text-yellow-600' : 'text-green-600'}>
                    {utilization.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total items in stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalAvailable.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Ready for sale
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reserved Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalReserved.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Pending orders
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Products in Warehouse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items in Warehouse ({warehouseStockItems.length})
          </CardTitle>
          <CardDescription>
            Complete list of products and packaging with stock in this warehouse
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {stockLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : warehouseStockItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseStockItems.map((item: WarehouseStockItem) => {
                  const stockStatus = getStockStatus(item.current_stock)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.item_type === 'package' ? (
                            <Package className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Package className="h-4 w-4 text-blue-600" />
                          )}
                          <div>
                            {item.item_name}
                            {item.variation_attributes && (
                              <div className="text-xs text-muted-foreground">
                                {Object.entries(item.variation_attributes).map(([key, value]) => 
                                  `${key}: ${value}`
                                ).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.item_sku || '-'}</TableCell>
                      <TableCell>{item.category_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={stockStatus.color}>
                          {item.current_stock} units
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {item.available_stock} units
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {item.reserved_stock} units
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.current_stock > 0 ? "default" : "destructive"}
                          className={item.current_stock === 0 ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}
                        >
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground text-center">
                This warehouse doesn't have any products or packaging with stock yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 