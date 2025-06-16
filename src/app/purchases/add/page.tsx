"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ShoppingCart, Calendar, Package, Box, Search, X, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "sonner"

// Supabase imports
import { 
  getSuppliers, 
  getWarehouses, 
  createPurchase,
  type DatabaseSupplier, 
  type DatabaseWarehouse,
  type CreatePurchaseData,
  type CreatePurchaseItemData
} from "@/lib/supabase/purchases"
import { 
  getProducts, 
  getPackaging, 
  getPackagingVariations,
  type DatabaseProduct, 
  type DatabasePackaging,
  type DatabaseProductVariation,
  type DatabasePackagingVariation
} from "@/lib/supabase/queries"

interface PurchaseItem {
  itemId: string
  itemType: 'product' | 'package'
  itemName: string
  quantity: number
  purchasePrice: number
  total: number
  variationId?: string
}

interface SelectedItem {
  id: string
  type: 'product' | 'package'
  name: string
  sku?: string
  variationId?: string
  variationName?: string
}

interface PurchaseForm {
  supplierId: string
  warehouse: string
  date: string
  items: PurchaseItem[]
}

// Type guard to check if the item is a Packaging
const isPackaging = (item: DatabasePackaging | DatabaseProduct): item is DatabasePackaging => {
  return 'title' in item
}

export default function CreatePurchasePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [dataLoading, setDataLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isVariationModalOpen, setIsVariationModalOpen] = React.useState(false)
  const [selectedPackageForVariation, setSelectedPackageForVariation] = React.useState<DatabasePackaging | DatabaseProduct | null>(null)
  const [activeTab, setActiveTab] = React.useState('products')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedItems, setSelectedItems] = React.useState<SelectedItem[]>([])
  
  // Supabase data states
  const [suppliers, setSuppliers] = React.useState<DatabaseSupplier[]>([])
  const [warehouses, setWarehouses] = React.useState<DatabaseWarehouse[]>([])
  const [products, setProducts] = React.useState<DatabaseProduct[]>([])
  const [packages, setPackages] = React.useState<DatabasePackaging[]>([])
  const [productVariations, setProductVariations] = React.useState<DatabaseProductVariation[]>([])
  const [packageVariations, setPackageVariations] = React.useState<DatabasePackagingVariation[]>([])
  
  const [form, setForm] = React.useState<PurchaseForm>({
    supplierId: '',
    warehouse: '',
    date: new Date().toISOString().split('T')[0],
    items: []
  })

  // Deduplication cache and initial load tracker
  const initialLoadTriggered = React.useRef(false)
  const CACHE_DURATION = 30000 // 30 seconds
  
  const dataCache = React.useRef<{
    suppliers: DatabaseSupplier[]
    warehouses: DatabaseWarehouse[]
    products: DatabaseProduct[]
    packages: DatabasePackaging[]
    lastFetch: number
    currentRequest: Promise<void> | null
  }>({
    suppliers: [],
    warehouses: [],
    products: [],
    packages: [],
    lastFetch: 0,
    currentRequest: null
  })

  // Load data from Supabase with deduplication
  const loadData = async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadData called with forceRefresh:', forceRefresh)
    
    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        dataCache.current.suppliers.length > 0 && 
        dataCache.current.warehouses.length > 0 && 
        (now - dataCache.current.lastFetch) < CACHE_DURATION) {
      console.log('📦 Using cached data')
      setSuppliers(dataCache.current.suppliers)
      setWarehouses(dataCache.current.warehouses)
      setProducts(dataCache.current.products)
      setPackages(dataCache.current.packages)
      setDataLoading(false)
      return
    }

    // If there's already a request in progress, wait for it
    if (dataCache.current.currentRequest) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        await dataCache.current.currentRequest
        // After the request completes, update state with cached data
        if (dataCache.current.suppliers.length > 0) {
          console.log('📦 Using data from completed request')
          setSuppliers(dataCache.current.suppliers)
          setWarehouses(dataCache.current.warehouses)
          setProducts(dataCache.current.products)
          setPackages(dataCache.current.packages)
          setDataLoading(false)
        }
      } catch (error) {
        console.error('⚠️ Error in concurrent request:', error)
      }
      return
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh data from API')
        setDataLoading(true)
        
        const [suppliersData, warehousesData, productsData, packagesData] = await Promise.all([
          getSuppliers(),
          getWarehouses(),
          getProducts(),
          getPackaging()
        ])
        
        const activeProducts = productsData.filter(p => p.status === 'active')
        const activePackages = packagesData.filter(p => p.status === 'active')
        
        console.log('✅ Data fetched successfully')
        
        // Update cache
        dataCache.current.suppliers = suppliersData
        dataCache.current.warehouses = warehousesData
        dataCache.current.products = activeProducts
        dataCache.current.packages = activePackages
        dataCache.current.lastFetch = now
        
        // Update state
        setSuppliers(suppliersData)
        setWarehouses(warehousesData)
        setProducts(activeProducts)
        setPackages(activePackages)
      } catch (error) {
        console.error('❌ Error loading data:', error)
        toast.error('Failed to load data. Please refresh the page.')
        setSuppliers([])
        setWarehouses([])
        setProducts([])
        setPackages([])
      } finally {
        console.log('🏁 Request completed, setting loading to false')
        setDataLoading(false)
        dataCache.current.currentRequest = null
      }
    })()

    // Store the request promise so other calls can wait for it
    dataCache.current.currentRequest = requestPromise
    
    // Wait for the request to complete
    await requestPromise
  }

  // Load initial data only once
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering data fetch')
      initialLoadTriggered.current = true
      loadData(false)
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, []) // Empty dependency array to run only once on mount

  const selectedSupplier = suppliers.find(s => s.id === form.supplierId)
  const totalAmount = form.items.reduce((sum, item) => sum + item.total, 0)

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter packages based on search term
  const filteredPackages = packages.filter(packaging => 
    packaging.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    packaging.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    packaging.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const validateForm = () => {
    if (!form.supplierId) {
      toast.error('Please select a supplier')
      return false
    }
    if (!form.warehouse) {
      toast.error('Please select a warehouse')
      return false
    }
    if (!form.date) {
      toast.error('Please select a date')
      return false
    }
    if (form.items.length === 0) {
      toast.error('Please add at least one item')
      return false
    }

    // Validate all items have quantity and price
    for (const item of form.items) {
      if (item.quantity <= 0) {
        toast.error(`Please enter a valid quantity for ${item.itemName}`)
        return false
      }
      if (item.purchasePrice <= 0) {
        toast.error(`Please enter a valid purchase price for ${item.itemName}`)
        return false
      }
    }

    return true
  }

  const handleProductSelection = (product: DatabaseProduct) => {
    const isSelected = selectedItems.some(selected => 
      selected.id === product.id && selected.type === 'product'
    )

    if (isSelected) {
      setSelectedItems(prev => prev.filter(selected => 
        !(selected.id === product.id && selected.type === 'product')
      ))
    } else {
      const newItem: SelectedItem = {
        id: product.id,
        type: 'product',
        name: product.name,
        sku: product.sku,
      }
      setSelectedItems(prev => [...prev, newItem])
    }
  }

  const handlePackageSelection = (packaging: DatabasePackaging) => {
    if (packaging.type === 'variable') {
      setSelectedPackageForVariation(packaging)
      setIsVariationModalOpen(true)
    } else {
      const isSelected = selectedItems.some(selected => 
        selected.id === packaging.id && selected.type === 'package'
      )

      if (isSelected) {
        setSelectedItems(prev => prev.filter(selected => 
          !(selected.id === packaging.id && selected.type === 'package')
        ))
      } else {
        const newItem: SelectedItem = {
          id: packaging.id,
          type: 'package',
          name: packaging.title,
          sku: packaging.sku,
        }
        setSelectedItems(prev => [...prev, newItem])
      }
    }
  }

  const handleVariationSelection = async (variation: DatabasePackagingVariation) => {
    const packaging = selectedPackageForVariation as DatabasePackaging
    // Create a display name from attribute values
    const variationName = variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku
    const newItem: SelectedItem = {
      id: packaging.id,
      type: 'package',
      name: `${packaging.title} (${variationName})`,
      sku: packaging.sku,
      variationId: variation.id,
      variationName: variationName,
    }
    setSelectedItems(prev => [...prev, newItem])
    setIsVariationModalOpen(false)
    setSelectedPackageForVariation(null)
  }

  const handleProductVariationSelection = async (variation: DatabaseProductVariation) => {
    const product = selectedPackageForVariation as DatabaseProduct
    // Create a display name from attribute values
    const variationName = variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku
    const newItem: SelectedItem = {
      id: product.id,
      type: 'product',
      name: `${product.name} (${variationName})`,
      sku: product.sku,
      variationId: variation.id,
      variationName: variationName,
    }
    setSelectedItems(prev => [...prev, newItem])
    setIsVariationModalOpen(false)
    setSelectedPackageForVariation(null)
  }

  const loadVariations = async (item: DatabaseProduct | DatabasePackaging) => {
    try {
      if (isPackaging(item)) {
        const variations = await getPackagingVariations(item.id)
        setPackageVariations(variations)
      } else {
        // For products, use the variations from the product object if available
        if (item.variations) {
          setProductVariations(item.variations)
        }
      }
    } catch (error) {
      console.error('Error loading variations:', error)
      toast.error('Failed to load variations')
    }
  }

  const addSelectedItemsToPurchase = () => {
    const newItems: PurchaseItem[] = selectedItems.map(selected => ({
      itemId: selected.id,
      itemType: selected.type,
      itemName: selected.name,
      quantity: 1,
      purchasePrice: 0,
      total: 0,
      variationId: selected.variationId,
    }))

    setForm(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }))

    setSelectedItems([])
    setIsModalOpen(false)
    toast.success(`Added ${newItems.length} item${newItems.length !== 1 ? 's' : ''} to purchase`)
  }

  const updateItemQuantity = (index: number, quantity: string) => {
    const qty = parseInt(quantity) || 0
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { ...item, quantity: qty, total: qty * item.purchasePrice }
          : item
      )
    }))
  }

  const updateItemPrice = (index: number, price: string) => {
    const purchasePrice = parseFloat(price) || 0
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { ...item, purchasePrice, total: item.quantity * purchasePrice }
          : item
      )
    }))
  }

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      const selectedSupplier = suppliers.find(s => s.id === form.supplierId)
      const selectedWarehouse = warehouses.find(w => w.id === form.warehouse)
      
      if (!selectedSupplier || !selectedWarehouse) {
        throw new Error('Invalid supplier or warehouse selection')
      }

      const purchaseData: CreatePurchaseData = {
        supplier_id: form.supplierId,
        supplier_name: selectedSupplier.name,
        warehouse_id: form.warehouse,
        warehouse_name: selectedWarehouse.name,
        purchase_date: form.date,
        created_by: 'admin' // In a real app, this would come from authenticated user
      }

      const items: CreatePurchaseItemData[] = form.items.map(item => ({
        item_id: item.itemId,
        item_type: item.itemType,
        item_name: item.itemName,
        variation_id: item.variationId,
        quantity: item.quantity,
        purchase_price: item.purchasePrice,
        total: item.total
      }))

      const createdPurchase = await createPurchase(purchaseData, items)
      
      toast.success('Purchase order created successfully!')
      router.push(`/purchases/${createdPurchase.id}`)
      
    } catch (error) {
      console.error('Error creating purchase:', error)
      toast.error('Failed to create purchase order. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getItemTypeIcon = (itemType: 'product' | 'package') => {
    return itemType === 'package' ? (
      <Package className="h-4 w-4 text-purple-600" />
    ) : (
      <Box className="h-4 w-4 text-blue-600" />
    )
  }

  const getItemTypeBadge = (itemType: 'product' | 'package') => {
    return itemType === 'package' ? (
      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">Package</Badge>
    ) : (
      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Product</Badge>
    )
  }

  const isItemSelected = (item: DatabaseProduct | DatabasePackaging, type: 'product' | 'package', variationId?: string) => {
    return selectedItems.some(selected => 
      selected.id === item.id && 
      selected.type === type &&
      selected.variationId === variationId
    )
  }

  const handleProductSelectionWithVariations = async (product: DatabaseProduct) => {
    if (product.type === 'variation') {
      setSelectedPackageForVariation(product)
      await loadVariations(product)
      setIsVariationModalOpen(true)
    } else {
      handleProductSelection(product)
    }
  }

  const getSelectionSummary = () => {
    const productCount = selectedItems.filter(item => item.type === 'product').length
    const packageCount = selectedItems.filter(item => item.type === 'package').length
    
    const parts = []
    if (productCount > 0) parts.push(`${productCount} product${productCount !== 1 ? 's' : ''}`)
    if (packageCount > 0) parts.push(`${packageCount} package${packageCount !== 1 ? 's' : ''}`)
    
    return parts.join(', ')
  }

  const getItemNameById = (id: string, type: 'product' | 'package') => {
    if (type === 'product') {
      const product = products.find(p => p.id === id)
      return product ? product.name : 'Unknown Product'
    } else {
      const packaging = packages.find(p => p.id === id)
      return packaging ? packaging.title : 'Unknown Package'
    }
  }

  if (dataLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading purchase data...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="container mx-auto px-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Link href="/purchases">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Purchase Order</h1>
          <p className="text-muted-foreground mt-2">
            Add a new purchase order for products and packages from a supplier
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Purchase Details */}
          <motion.div 
            className="lg:col-span-2 space-y-8" 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Information</CardTitle>
                <CardDescription>
                  Enter the basic details for this purchase order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select 
                      value={form.supplierId} 
                      onValueChange={(value) => setForm({ ...form, supplierId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.filter(s => s.status === 'active').map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse *</Label>
                    <Select 
                      value={form.warehouse} 
                      onValueChange={(value) => setForm({ ...form, warehouse: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.filter(w => w.status === 'active').map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} - {warehouse.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Purchase Date *</Label>
                    <DatePicker
                      date={form.date ? new Date(form.date) : undefined}
                      onDateChange={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const formattedDate = `${year}-${month}-${day}`
                          setForm({ ...form, date: formattedDate })
                        } else {
                          setForm({ ...form, date: '' })
                        }
                      }}
                      placeholder="Select purchase date"
                    />
                  </div>
                  <div></div>
                </div>
              </CardContent>
            </Card>

            {/* Items Section */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Items</CardTitle>
                <CardDescription>
                  Choose products and packages for this purchase order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {form.items.length === 0 ? 'No items added yet' : `${form.items.length} item(s) added`}
                  </p>
                  <Button 
                    type="button" 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Choose Product or Package
                    </Button>
                </div>

                {/* Items List */}
                {form.items.length > 0 && (
                  <div className="space-y-4">
                    {form.items.map((item, index) => {
                      // Extract base name and variation details
                      const getItemDisplayInfo = (itemName: string) => {
                        if (itemName.includes(' (') && itemName.includes(')')) {
                          const lastParenIndex = itemName.lastIndexOf(' (')
                          const baseName = itemName.substring(0, lastParenIndex)
                          const variation = itemName.substring(lastParenIndex + 2, itemName.length - 1)
                          return { baseName, variation }
                        }
                        return { baseName: itemName, variation: null }
                      }

                      const { baseName, variation } = getItemDisplayInfo(item.itemName)

                      return (
                        <div key={`${item.itemId}-${item.itemType}-${item.variationId || 'simple'}-${index}`} 
                             className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-4">
                            {/* Item Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  {getItemTypeIcon(item.itemType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 mb-1">{baseName}</h4>
                                  <div className="flex items-center gap-2 mb-3">
                                    {getItemTypeBadge(item.itemType)}
                                    {variation && (
                                      <Badge variant="outline" className="text-xs">
                                        {variation}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                  </div>

                            {/* Quantity & Price Controls */}
                            <div className="flex items-center gap-4">
                              {/* Quantity */}
                              <div className="text-center">
                                <Label htmlFor={`qty-${index}`} className="text-xs text-muted-foreground block mb-1">
                                  Quantity
                                </Label>
                    <Input
                                  id={`qty-${index}`}
                      type="number"
                      min="1"
                                  value={item.quantity || ''}
                                  onChange={(e) => updateItemQuantity(index, e.target.value)}
                                  placeholder="1"
                                  className="w-20 h-9 text-center"
                    />
                  </div>

                              {/* Unit Price */}
                              <div className="text-center">
                                <Label htmlFor={`price-${index}`} className="text-xs text-muted-foreground block mb-1">
                                  Unit Price (BDT)
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                    <Input
                                    id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                                    value={item.purchasePrice || ''}
                                    onChange={(e) => updateItemPrice(index, e.target.value)}
                      placeholder="0.00"
                                    className="w-28 h-9 pl-8 text-center"
                    />
                                </div>
                  </div>

                              {/* Total */}
                              <div className="text-center min-w-[80px]">
                                <div className="text-xs text-muted-foreground mb-1">Total</div>
                                <div className="font-semibold text-lg text-gray-900">
                                  {formatCurrency(item.total)}
                  </div>
                </div>

                              {/* Remove Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Summary Card */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>
                            <span className="font-medium text-gray-900">{form.items.length}</span> Items
                          </span>
                          <span>
                            <span className="font-medium text-gray-900">{form.items.reduce((sum, item) => sum + item.quantity, 0)}</span> Total Quantity
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Grand Total</div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(totalAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary Sidebar */}
          <motion.div className="space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            {/* Purchase Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSupplier && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Supplier Details:</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Name:</strong> {selectedSupplier.name}</p>
                      <p><strong>Email:</strong> {selectedSupplier.email}</p>
                      <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span>{form.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Products:</span>
                    <span>{form.items.filter(item => item.itemType === 'product').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Packages:</span>
                    <span>{form.items.filter(item => item.itemType === 'package').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Quantity:</span>
                    <span>{form.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || form.items.length === 0}
                  >
                    {isLoading ? (
                      <motion.div
                        className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <ShoppingCart className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Creating...' : 'Create Purchase Order'}
                  </Button>
                  
                  <Link href="/purchases">
                    <Button variant="outline" className="w-full" disabled={isLoading}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </form>

      {/* Item Selection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose Products or Packages</DialogTitle>
            <DialogDescription>
              Select products and packages to add to your purchase order
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Packages
                </TabsTrigger>
              </TabsList>

              {/* Search Bar */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <TabsContent value="products" className="flex-1 overflow-hidden mt-4">
                <div className="h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {filteredProducts.map((product) => (
                      <div 
                        key={product.id} 
                        onClick={() => handleProductSelectionWithVariations(product)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          isItemSelected(product, 'product') 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Box className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{product.name}</h4>
                              {product.sku && (
                                <Badge variant="outline" className="text-xs">SKU: {product.sku}</Badge>
                              )}
                              {product.type === 'variation' && (
                                <>
                                  <Badge variant="default" className="text-xs">Variable</Badge>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                            )}
                            {product.type === 'simple' && (
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Price: {formatCurrency(product.price || 0)}</span>
                                <span>Stock: {(product as any).stock || 0}</span>
                              </div>
                            )}
                            {product.type === 'variation' && (
                              <p className="text-sm text-muted-foreground">
                                {product.variations?.length || 0} variations available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground py-8">No products found</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="packages" className="flex-1 overflow-hidden mt-4">
                <div className="h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {filteredPackages.map((packaging) => (
                      <div 
                        key={packaging.id} 
                        onClick={() => handlePackageSelection(packaging)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          isItemSelected(packaging, 'package') 
                            ? 'ring-2 ring-purple-500 bg-purple-50' 
                            : 'hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{packaging.title}</h4>
                              {packaging.sku && (
                                <Badge variant="outline" className="text-xs">SKU: {packaging.sku}</Badge>
                              )}
                              <Badge variant={packaging.type === 'variable' ? 'default' : 'secondary'} className="text-xs">
                                {packaging.type === 'variable' ? 'Variable' : 'Simple'}
                              </Badge>
                              {packaging.type === 'variable' && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {packaging.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{packaging.description}</p>
                            )}
                            {packaging.type === 'simple' && (
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Package Item</span>
                                <span>Stock: {(packaging as any).stock || 0}</span>
                              </div>
                            )}
                            {packaging.type === 'variable' && (
                              <p className="text-sm text-muted-foreground">
                                {packaging.variations?.length || 0} variations available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredPackages.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground py-8">No packages found</div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {selectedItems.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-2">
                {(() => {
                  const summary = getSelectionSummary()
                  return (
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {summary}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            
            {selectedItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No items selected
              </p>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={addSelectedItemsToPurchase}
                disabled={selectedItems.length === 0}
              >
                Add Selected Items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Variation Selection Modal */}
      <Dialog open={isVariationModalOpen} onOpenChange={setIsVariationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose {selectedPackageForVariation && isPackaging(selectedPackageForVariation) ? 'Package' : 'Product'} Variations</DialogTitle>
            <DialogDescription>
              Select variations for {selectedPackageForVariation && isPackaging(selectedPackageForVariation) ? selectedPackageForVariation.title : selectedPackageForVariation ? (selectedPackageForVariation as DatabaseProduct).name : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3 p-4">
              {/* Handle Package Variations */}
              {selectedPackageForVariation && isPackaging(selectedPackageForVariation) && selectedPackageForVariation.variations?.map((variation) => (
                <div 
                  key={variation.id}
                  onClick={() => handleVariationSelection(variation)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    isItemSelected(selectedPackageForVariation, 'package', variation.id)
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{variation.sku}</span>
                        <Badge variant="outline" className="text-xs">
                                                     {variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Price: {formatCurrency(variation.price || 0)}</span>
                        <span>Stock: {variation.stock}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Handle Product Variations */}
              {selectedPackageForVariation && !isPackaging(selectedPackageForVariation) && selectedPackageForVariation.variations?.map((variation: DatabaseProductVariation) => (
                <div 
                  key={variation.id}
                  onClick={() => handleProductVariationSelection(variation)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    isItemSelected(selectedPackageForVariation as DatabaseProduct, 'product', variation.id)
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{variation.sku}</span>
                        <Badge variant="outline" className="text-xs">
                                                  {variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Price: {formatCurrency(variation.price || 0)}</span>
                        <span>Stock: {variation.stock}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variation Modal Footer */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {(() => {
              const variationItems = selectedItems.filter(item => 
                item.id === selectedPackageForVariation?.id && 
                (item.type === 'package' || item.type === 'product') && 
                item.variationId
              )
              
              return (
                <div className="text-sm text-muted-foreground space-y-2">
                  {variationItems.length > 0 ? (
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {variationItems.length} variation(s) selected:
                      </div>
                      {variationItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs">
                          {item.type === 'product' ? (
                            <Box className="h-3 w-3 text-blue-600" />
                          ) : (
                            <Package className="h-3 w-3 text-purple-600" />
                          )}
                          <span>{item.variationName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>No variations selected</span>
                  )}
                </div>
              )
            })()}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsVariationModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
} 