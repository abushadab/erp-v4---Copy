/**
 * AddSale Component - Optimized Version
 * 
 * ✅ OPTIMIZATIONS APPLIED:
 * - Replaced duplicate data loading logic with useAddSaleData hook
 * - Prevents multiple API calls through centralized caching
 * - Uses singleton Supabase client to prevent unnecessary recreations
 * - Warehouse-specific product filtering with proper cache management
 * 
 * The component now uses a single, optimized data loading hook that:
 * 1. Caches data for 5 minutes to prevent duplicate requests
 * 2. Prevents concurrent requests to the same endpoint  
 * 3. Automatically handles warehouse-based product filtering
 * 4. Provides clear loading states and error handling
 */

'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Search, ShoppingCart, Plus, Minus, AlertCircle, CheckCircle, ArrowLeft, Receipt, Percent, DollarSign, User, UserPlus, Box, Eye, Building2, CreditCard, Gift } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { Switch } from '@/components/ui/switch'

// Import Supabase functions for customers and products
import { createCustomer, type Customer } from '@/lib/supabase/sales-client'
import { useAddSaleData } from '@/lib/hooks/useAddSaleData'

// Import types from mock data but use real Supabase functions for data
import { 
  type Warehouse, 
  type Product, 
  type ProductVariation,
  type Sale,
  type Packaging,
  type PackagingVariation
} from '@/lib/mock-data/erp-data'

// Import real Supabase functions
import { getPackagingByWarehouse, createSale } from '@/lib/supabase/sales-client'
import { invalidateSalesCache } from '@/lib/hooks/useSalesData'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Payment methods
const paymentMethods = [
  { value: 'cod', label: 'Cash on Delivery (COD)' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit/Debit Card' },
]

// Discount type enum
type DiscountType = 'percentage' | 'fixed'

// Form schema
const saleSchema = z.object({
  warehouseId: z.string().min(1, 'Please select a warehouse'),
  customerId: z.string().min(1, 'Please select a customer'),
  paymentMethod: z.string().min(1, 'Please select a payment method'),
  saleDate: z.string().min(1, 'Please select a date'),
  items: z.array(z.object({
    productId: z.string(),
    variationId: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    discount: z.number().min(0, 'Discount cannot be negative'),
    discountType: z.enum(['percentage', 'fixed']),
  })).min(1, 'At least one item is required'),
  totalDiscount: z.number().min(0, 'Total discount cannot be negative'),
  totalDiscountType: z.enum(['percentage', 'fixed']),
  taxRate: z.number().min(0).max(100, 'Tax rate cannot exceed 100%'),
})

// Customer form schema
const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
})

type SaleFormData = z.infer<typeof saleSchema>
type CustomerFormData = z.infer<typeof customerSchema>

interface SaleItem {
  productId: string
  variationId?: string
  quantity: number
  discount: number
  discountType: DiscountType
  packagingId: string
  packagingVariationId?: string
  isFreeGift: boolean
}

interface CartItem extends SaleItem {
  product: Product
  variation?: ProductVariation
  packaging: Packaging
  packagingVariation?: PackagingVariation
  originalTotal: number
  discountAmount: number
  total: number
}

interface SaleResult {
  success: boolean
  message: string
  saleId?: string
  revenue?: number
  profit?: number
  items?: CartItem[]
}



// Add Customer Modal Component
const AddCustomerModal = ({ 
  isOpen, 
  onClose, 
  onCustomerAdded 
}: { 
  isOpen: boolean
  onClose: () => void
  onCustomerAdded: (customer: Customer) => void
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { control: customerControl, handleSubmit: handleCustomerSubmit, formState: { errors: customerErrors }, reset: resetCustomer } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    }
  })

  const onSubmitCustomer = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    
    try {
      // Create new customer using Supabase
      const newCustomer = await createCustomer({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: null,
        address: data.address || null,
        status: 'active',
        total_orders: 0,
        total_spent: 0,
        join_date: new Date().toISOString().split('T')[0]
      })
      
      // Call parent callback
      onCustomerAdded(newCustomer)
      
      // Reset form and close modal
      resetCustomer()
      onClose()
      toast.success('Customer added successfully!')
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Failed to add customer. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter customer details to add them to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCustomerSubmit(onSubmitCustomer)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Name *</Label>
            <Controller
              name="name"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerName"
                  {...field}
                  placeholder="Enter customer name"
                />
              )}
            />
            {customerErrors.name && (
              <p className="text-sm text-red-500">{customerErrors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email *</Label>
            <Controller
              name="email"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerEmail"
                  {...field}
                  type="email"
                  placeholder="Enter email address"
                />
              )}
            />
            {customerErrors.email && (
              <p className="text-sm text-red-500">{customerErrors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone *</Label>
            <Controller
              name="phone"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerPhone"
                  {...field}
                  placeholder="Enter phone number"
                />
              )}
            />
            {customerErrors.phone && (
              <p className="text-sm text-red-500">{customerErrors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address *</Label>
            <Controller
              name="address"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerAddress"
                  {...field}
                  placeholder="Enter address"
                />
              )}
            />
            {customerErrors.address && (
              <p className="text-sm text-red-500">{customerErrors.address.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Variation Selection Modal Component
const VariationSelectionModal = ({
  isOpen,
  onClose,
  product,
  onVariationSelect
}: {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onVariationSelect: (variation: ProductVariation) => void
}) => {
  if (!product || product.type !== 'variation') return null
  
  console.log('🔍 VariationSelectionModal - Product:', product)
  console.log('🔍 VariationSelectionModal - Variations:', product.variations)

  // Helper function to format variation attributes using the actual database attribute data
  const formatVariationAttributes = (variation: any) => {
    // Check if variation has the raw database attribute_values structure
    if (variation.attribute_values && Array.isArray(variation.attribute_values)) {
      return variation.attribute_values
        .map((attr: any) => `${attr.attribute_name}: ${attr.value_label}`)
        .join(', ')
    }
    
    // Fallback to the transformed attributeValues structure (legacy)
    if (variation.attributeValues && typeof variation.attributeValues === 'object') {
      return Object.entries(variation.attributeValues)
        .map(([attrId, valueId]) => `${attrId}: ${valueId}`)
        .join(', ')
    }
    
    return variation.sku || ''
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Product Variation</DialogTitle>
          <DialogDescription>
            Select a variation for {product.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 p-4">
            {product.variations?.map((variation) => (
              <div 
                key={variation.id}
                onClick={() => {
                  if (variation.stock > 0) {
                    onVariationSelect(variation)
                    onClose()
                  }
                }}
                className={`border rounded-lg p-4 transition-all ${
                  variation.stock > 0 
                    ? 'cursor-pointer hover:shadow-md hover:border-blue-300' 
                    : 'cursor-not-allowed opacity-60 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{variation.sku}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatVariationAttributes(variation) || 'Standard'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Price: ৳{variation.price.toFixed(2)}</span>
                      <span>Stock: {variation.stock}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Badge 
                      variant={variation.stock > 0 ? "default" : "destructive"}
                      className={variation.stock === 0 ? "bg-red-100 text-red-800" : ""}
                    >
                      {variation.stock > 0 ? 'Available' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Packaging Variation Selection Modal Component
const PackagingVariationSelectionModal = ({
  isOpen,
  onClose,
  packaging,
  onPackagingVariationSelect
}: {
  isOpen: boolean
  onClose: () => void
  packaging: Packaging | null
  onPackagingVariationSelect: (variation: PackagingVariation) => void
}) => {
  if (!packaging || packaging.type !== 'variable') return null

  // Helper function to format packaging variation attributes using actual database attribute data
  const formatPackagingVariationAttributes = (variation: any) => {
    // Check if variation has the raw database attribute_values structure
    if (variation.attribute_values && Array.isArray(variation.attribute_values)) {
      return variation.attribute_values
        .map((attr: any) => `${attr.attribute_name}: ${attr.value_label}`)
        .join(', ')
    }
    
    // Fallback to the transformed attributeValues structure (legacy/mock data)
    if (variation.attributeValues && typeof variation.attributeValues === 'object') {
      return Object.entries(variation.attributeValues)
        .map(([attrId, valueId]) => {
          // Map packaging attribute IDs to display names
          const attrName = getPackagingAttributeName(attrId)
          const valueName = getPackagingAttributeValueDisplay(attrId, valueId as string)
          return `${attrName}: ${valueName}`
        })
        .join(', ')
    }
    
    return variation.sku || ''
  }

  // Helper functions for packaging attribute display
  const getPackagingAttributeName = (attributeId: string) => {
    switch (attributeId) {
      case 'PATTR001': return 'Size'
      case 'PATTR002': return 'Material'
      case 'PATTR003': return 'Color'
      default: return attributeId
    }
  }

  const getPackagingAttributeValueDisplay = (attributeId: string, valueId: string) => {
    // For PATTR001 (Size)
    if (attributeId === 'PATTR001') {
      switch (valueId) {
        case 'SIZE_SMALL': return 'Small'
        case 'SIZE_MEDIUM': return 'Medium'
        case 'SIZE_LARGE': return 'Large'
        default: return valueId
      }
    }
    // For PATTR002 (Material)
    if (attributeId === 'PATTR002') {
      switch (valueId) {
        case 'MAT_CARDBOARD': return 'Cardboard'
        case 'MAT_CORRUGATED': return 'Corrugated'
        case 'MAT_PLASTIC': return 'Plastic'
        default: return valueId
      }
    }
    // For PATTR003 (Color)
    if (attributeId === 'PATTR003') {
      switch (valueId) {
        case 'COLOR_BLUE': return 'Blue'
        case 'COLOR_RED': return 'Red'
        case 'COLOR_WHITE': return 'White'
        case 'COLOR_BLACK': return 'Black'
        default: return valueId
      }
    }
    return valueId
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Packaging Variation</DialogTitle>
          <DialogDescription>
            Select a variation for {packaging.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 p-4">
            {packaging.variations?.map((variation) => (
              <div 
                key={variation.id}
                onClick={() => {
                  if ((variation.stock || 0) > 0) {
                    onPackagingVariationSelect(variation)
                    onClose()
                  }
                }}
                className={`border rounded-lg p-4 transition-all ${
                  (variation.stock || 0) > 0 
                    ? 'cursor-pointer hover:shadow-md hover:border-blue-300' 
                    : 'cursor-not-allowed opacity-60 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{variation.sku}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatPackagingVariationAttributes(variation) || 'Standard'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Price: ৳{(variation.price || 0).toFixed(2)}</span>
                      <span>Stock: {variation.stock || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Badge 
                      variant={(variation.stock || 0) > 0 ? "default" : "destructive"}
                      className={(variation.stock || 0) === 0 ? "bg-red-100 text-red-800" : ""}
                    >
                      {(variation.stock || 0) > 0 ? 'Available' : 'Out of Stock'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Packaging Selection Modal Component
const PackagingSelectionModal = ({
  isOpen,
  onClose,
  product,
  selectedWarehouse,
  packaging,
  loadingPackaging,
  onPackagingSelect
}: {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  selectedWarehouse: string
  packaging: Packaging[]
  loadingPackaging: boolean
  onPackagingSelect: (packaging: Packaging, packagingVariation?: PackagingVariation) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showPackagingVariationModal, setShowPackagingVariationModal] = useState(false)
  const [selectedPackagingForVariation, setSelectedPackagingForVariation] = useState<Packaging | null>(null)

  // Filter packaging based on search
  const filteredPackaging = useMemo(() => {
    if (searchTerm) {
      return packaging.filter((pkg: Packaging) =>
        pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pkg.sku && pkg.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        pkg.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return packaging
  }, [searchTerm, packaging])

  const handlePackagingClick = (packaging: Packaging) => {
    if (packaging.type === 'variable' && packaging.variations && packaging.variations.length > 0) {
      setSelectedPackagingForVariation(packaging)
      setShowPackagingVariationModal(true)
    } else if (packaging.type === 'simple') {
      onPackagingSelect(packaging)
      onClose()
    }
  }

  const handlePackagingVariationSelect = (variation: PackagingVariation) => {
    if (selectedPackagingForVariation) {
      onPackagingSelect(selectedPackagingForVariation, variation)
      onClose()
    }
  }

  if (!product) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              Select Packaging for {product.name}
            </DialogTitle>
            <DialogDescription>
              Choose packaging for this product before adding to cart
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search packaging by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Packaging Grid */}
            <div className="max-h-[50vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                {filteredPackaging.map((packaging) => (
                  <div 
                    key={packaging.id}
                    onClick={() => handlePackagingClick(packaging)}
                    className="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-300"
                  >
                    <div className="space-y-3">
                      {/* Packaging Info */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm leading-tight" title={packaging.title}>
                          {packaging.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          SKU: {packaging.sku || 'N/A'}
                        </p>
                        <div className="flex justify-between items-center">
                          {packaging.type === 'simple' ? (
                            <span className="font-bold text-sm">
                              ৳{(packaging.price || 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Multiple variations
                            </span>
                          )}
                          <Badge variant={packaging.type === 'variable' ? 'secondary' : 'default'}>
                            {packaging.type === 'variable' ? 'Variable' : 'Simple'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          {packaging.type === 'simple' ? (
                            <span className={(packaging.stock || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                              Stock: {packaging.stock || 0}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {packaging.variations?.length || 0} variations
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={packaging.description}>
                          {packaging.description}
                        </p>
                      </div>

                      {/* Action */}
                      <Button
                        type="button"
                        className="w-full"
                        disabled={packaging.type === 'simple' && (packaging.stock || 0) === 0}
                        size="sm"
                      >
                        {packaging.type === 'variable' ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            View Variations
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Select Packaging
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredPackaging.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No packaging found. Try adjusting your search.
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Packaging Variation Selection Modal */}
      <PackagingVariationSelectionModal
        isOpen={showPackagingVariationModal}
        onClose={() => setShowPackagingVariationModal(false)}
        packaging={selectedPackagingForVariation}
        onPackagingVariationSelect={handlePackagingVariationSelect}
      />
    </>
  )
}

// Discount Modal Component
const DiscountModal = ({
  isOpen,
  onClose,
  cartItems,
  updateItemDiscount,
  updateItemDiscountType,
  totalDiscount,
  setTotalDiscount,
  totalDiscountType,
  setTotalDiscountType,
  taxRate,
  setTaxRate,
  subtotal,
  totalDiscountAmount,
  afterDiscount,
  taxAmount
}: {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  updateItemDiscount: (productId: string, discount: number, variationId?: string) => void
  updateItemDiscountType: (productId: string, discountType: DiscountType, variationId?: string) => void
  totalDiscount: number
  setTotalDiscount: (value: number) => void
  totalDiscountType: DiscountType
  setTotalDiscountType: (value: DiscountType) => void
  taxRate: number
  setTaxRate: (value: number) => void
  subtotal: number
  totalDiscountAmount: number
  afterDiscount: number
  taxAmount: number
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Discounts & Tax
          </DialogTitle>
          <DialogDescription>
            Manage item discounts, total discount, and tax settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          {/* Item Discounts */}
          {cartItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Item Discounts</h3>
              {cartItems.map((item) => (
                <div 
                  key={`${item.productId}-${item.variationId || 'simple'}-${item.packagingId}-${item.packagingVariationId || 'simple'}`}
                  className="border rounded-lg p-3 space-y-3"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">
                      {item.product.name}
                    </h4>
                    {item.variation && (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(item.variation.attributeValues).map(([attrId, valueId]) => {
                          const attrName = attrId === 'ATTR001' ? 'Size' : attrId === 'ATTR002' ? 'Color' : attrId
                          const valueName = attrId === 'ATTR001' 
                            ? { 'SIZE_S': 'Small', 'SIZE_M': 'Medium', 'SIZE_L': 'Large', 'SIZE_XL': 'Extra Large' }[valueId] || valueId
                            : attrId === 'ATTR002'
                            ? { 'COLOR_BLACK': 'Black', 'COLOR_WHITE': 'White', 'COLOR_BLUE': 'Blue', 'COLOR_RED': 'Red', 'COLOR_GREEN': 'Green' }[valueId] || valueId
                            : valueId
                          return `${attrName}: ${valueName}`
                        }).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      ৳{(item.variation ? item.variation.price : item.product.price || 0).toFixed(2)} × {item.quantity} = ৳{item.originalTotal.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex border rounded overflow-hidden">
                      <Button
                        type="button"
                        variant={item.discountType === 'percentage' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => updateItemDiscountType(item.productId, 'percentage', item.variationId)}
                        className="h-8 px-2 text-xs rounded-none border-r flex-1"
                      >
                        <Percent className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant={item.discountType === 'fixed' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => updateItemDiscountType(item.productId, 'fixed', item.variationId)}
                        className="h-8 px-2 text-xs rounded-none flex-1"
                      >
                        <DollarSign className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Input
                      type="number"
                      min="0"
                      max={item.discountType === 'percentage' ? '100' : item.originalTotal.toString()}
                      value={item.discount}
                      onChange={(e) => updateItemDiscount(item.productId, parseFloat(e.target.value) || 0, item.variationId)}
                      className="h-8 text-xs"
                      placeholder={item.discountType === 'percentage' ? '0%' : '৳0'}
                    />
                  </div>
                  
                  {item.discount > 0 && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      Discount: -৳{item.discountAmount.toFixed(2)} | Final: ৳{item.total.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Total Discount */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium text-sm">Total Discount</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex border rounded overflow-hidden">
                <Button
                  type="button"
                  variant={totalDiscountType === 'percentage' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTotalDiscountType('percentage')}
                  className="h-8 px-2 text-xs rounded-none border-r flex-1"
                >
                  <Percent className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant={totalDiscountType === 'fixed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTotalDiscountType('fixed')}
                  className="h-8 px-2 text-xs rounded-none flex-1"
                >
                  <DollarSign className="h-3 w-3" />
                </Button>
              </div>
              
              <Input
                type="number"
                min="0"
                max={totalDiscountType === 'percentage' ? '100' : subtotal.toString()}
                value={totalDiscount}
                onChange={(e) => setTotalDiscount(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs"
                placeholder={totalDiscountType === 'percentage' ? 'Total %' : '৳ Total'}
              />
            </div>
          </div>

          {/* Tax */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium text-sm">Tax Rate</h3>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs flex-1"
                placeholder="Tax %"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 border-t pt-4 bg-muted/30 p-3 rounded">
            <div className="flex justify-between text-xs">
              <span>Items Total:</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            
            {totalDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>
                  Total Discount ({totalDiscountType === 'percentage' 
                    ? `${totalDiscount}%` 
                    : `৳${totalDiscount.toFixed(2)}`
                  }):
                </span>
                <span>-৳{totalDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-xs">
              <span>After Discount:</span>
              <span>৳{afterDiscount.toFixed(2)}</span>
            </div>
            
            {taxRate > 0 && (
              <div className="flex justify-between text-xs text-blue-600">
                <span>Tax ({taxRate}%):</span>
                <span>+৳{taxAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Final Total:</span>
              <span>৳{(afterDiscount + taxAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AddSaleProps {
  editMode?: boolean
  existingSale?: Sale
  saleId?: string
}

export default function AddSale({ editMode, existingSale, saleId }: AddSaleProps) {
  const { user } = useCurrentUser()
  // Use the optimized data hook instead of duplicated loading logic
  const {
    customers,
    warehouses,
    products,
    loadingCustomers,
    loadingWarehouses,
    loadingProducts,
    errors: dataErrors,
    loadProducts,
    clearCache
  } = useAddSaleData()

  // Real sales function using Supabase
  const addSale = async (saleData: SaleFormData, cartItems: CartItem[], totals: {
    subtotal: number;
    totalDiscountAmount: number;
    taxAmount: number;
    grandTotal: number;
  }): Promise<SaleResult> => {
    try {
      console.log('🔄 Creating sale with data:', { saleData, cartItems, totals })

      // Check stock availability first
      for (const cartItem of cartItems) {
        const availableStock = cartItem.variation ? cartItem.variation.stock : cartItem.product.stock || 0

        if (cartItem.quantity > availableStock) {
          const itemName = cartItem.variation 
            ? `${cartItem.product.name} (${cartItem.variation.sku})`
            : cartItem.product.name
          return {
            success: false,
            message: `Insufficient stock for ${itemName}. Available: ${availableStock}`
          }
        }
      }

      // Get customer and warehouse details for required fields
      const customer = customers.find((c: any) => c.id === saleData.customerId)
      const warehouse = warehouses.find((w: any) => w.id === saleData.warehouseId)

      // Prepare sale record
      const saleRecord = {
        customer_id: saleData.customerId,
        customer_name: customer?.name || 'Unknown Customer',
        warehouse_id: saleData.warehouseId,
        warehouse_name: warehouse?.name || 'Unknown Warehouse',
        sale_date: saleData.saleDate,
        salesperson: user?.name || 'System User',
        subtotal: totals.subtotal,
        after_discount: totals.subtotal - totals.totalDiscountAmount,
        total_discount: totals.totalDiscountAmount,
        total_discount_type: saleData.totalDiscountType,
        tax_rate: saleData.taxRate,
        tax_amount: totals.taxAmount,
        total_amount: totals.grandTotal,
        status: 'completed'
      }

      // Check for duplicate cart items
      console.log('🛒 Cart items before processing:', cartItems.map(item => ({
        productId: item.productId,
        variationId: item.variationId,
        packagingId: item.packagingId,
        packagingVariationId: item.packagingVariationId,
        quantity: item.quantity
      })))

      // Remove potential duplicates (safeguard)
      const uniqueCartItems = cartItems.filter((item, index, self) => 
        index === self.findIndex(t => (
          t.productId === item.productId &&
          t.variationId === item.variationId &&
          t.packagingId === item.packagingId &&
          t.packagingVariationId === item.packagingVariationId
        ))
      )

      if (uniqueCartItems.length !== cartItems.length) {
        console.warn('⚠️ Removed duplicate cart items:', cartItems.length - uniqueCartItems.length)
      }

      // Prepare sale items (now including packaging fields)
      // Note: We don't include 'id' field - let the database auto-generate it
      const saleItems = uniqueCartItems.map((item, index) => ({
        product_id: item.productId,
        product_name: item.product.name,
        variation_id: item.variationId || null,
        packaging_id: item.packagingId,
        packaging_name: item.packaging.title,
        packaging_variation_id: item.packagingVariationId || null,
        quantity: item.quantity,
        price: item.variation?.price || item.product.price || 0,
        discount: item.discountAmount,
        total: item.total,
        tax: 0 // TODO: Add per-item tax calculation if needed
      }))

      console.log('📝 Sale record to create:', saleRecord)
      console.log('📦 Sale items to create:', saleItems)
      console.log('📊 Number of sale items:', saleItems.length)

      // Create the sale using Supabase
      const newSale = await createSale(saleRecord, saleItems)

      console.log('✅ Sale created successfully:', newSale)

      // Invalidate sales cache so the sales page shows fresh data
      invalidateSalesCache()

      // Calculate profit
      const totalExpense = cartItems.reduce((sum, item) => 
        sum + ((item.variation ? item.variation.buyingPrice : item.product.buyingPrice || 0) * item.quantity), 0)
      const profit = totals.grandTotal - totalExpense

      return {
        success: true,
        message: `Sale #${newSale.id} completed successfully! Revenue: ৳${totals.grandTotal.toFixed(2)}, Profit: ৳${profit.toFixed(2)}`,
        saleId: newSale.id,
        revenue: totals.grandTotal,
        profit: profit,
        items: cartItems
      }
    } catch (error) {
      console.error('❌ Error creating sale:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Unknown error occurred'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase errors which might be objects
        const supabaseError = error as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint
        } else {
          errorMessage = JSON.stringify(error)
        }
      }
      
      return {
        success: false,
        message: `Failed to complete sale: ${errorMessage}`
      }
    }
  }



  const [cart, setCart] = useState<SaleItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')

  // Handle warehouse selection and load warehouse-specific products
  useEffect(() => {
    // Only load products when warehouse is actually selected
    // Initial products are loaded by the hook
    if (selectedWarehouse) {
      loadProducts(selectedWarehouse)
    }
  }, [selectedWarehouse, loadProducts])

  // Load packaging data when warehouse changes
  useEffect(() => {
    const loadPackagingData = async () => {
      if (!selectedWarehouse) {
        setPackaging([])
        setLoadingPackaging(false)
        return
      }

      setLoadingPackaging(true)
      try {
        const packagingData = await getPackagingByWarehouse(selectedWarehouse)
        setPackaging(packagingData)
      } catch (error) {
        console.error('Error loading packaging:', error)
        setPackaging([])
      } finally {
        setLoadingPackaging(false)
      }
    }

    loadPackagingData()
  }, [selectedWarehouse])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saleResult, setSaleResult] = useState<SaleResult>({ success: false, message: '' })
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [totalDiscount, setTotalDiscount] = useState(0)
  const [totalDiscountType, setTotalDiscountType] = useState<DiscountType>('percentage')
  const [taxRate, setTaxRate] = useState(0)
  const [gridColumns, setGridColumns] = useState(3)
  
  // Variation selection modal state
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null)
  
  // Packaging selection modal state
  const [showPackagingModal, setShowPackagingModal] = useState(false)
  const [selectedProductForPackaging, setSelectedProductForPackaging] = useState<Product | null>(null)
  const [selectedVariationForPackaging, setSelectedVariationForPackaging] = useState<ProductVariation | null>(null)
  
  // Packaging data state
  const [packaging, setPackaging] = useState<Packaging[]>([])
  const [loadingPackaging, setLoadingPackaging] = useState(true)
  
  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  
  // Validation attempt state
  const [validationAttempted, setValidationAttempted] = useState(false)

  // Helper function to get attribute value display
  const getAttributeValueDisplay = (attributeId: string, valueId: string) => {
    // For ATTR001 (Size)
    if (attributeId === 'ATTR001') {
      switch (valueId) {
        case 'SIZE_S': return 'Small'
        case 'SIZE_M': return 'Medium'
        case 'SIZE_L': return 'Large'
        case 'SIZE_XL': return 'Extra Large'
        default: return valueId
      }
    }
    // For ATTR002 (Color)
    if (attributeId === 'ATTR002') {
      switch (valueId) {
        case 'COLOR_BLACK': return 'Black'
        case 'COLOR_WHITE': return 'White'
        case 'COLOR_BLUE': return 'Blue'
        case 'COLOR_RED': return 'Red'
        case 'COLOR_GREEN': return 'Green'
        default: return valueId
      }
    }
    return valueId
  }

  // Helper function to get attribute name
  const getAttributeName = (attributeId: string) => {
    switch (attributeId) {
      case 'ATTR001': return 'Size'
      case 'ATTR002': return 'Color'
      default: return attributeId
    }
  }

  // Helper function to format variation attributes
  const formatVariationAttributes = (variation: ProductVariation) => {
    if (!variation.attributeValues) return ''
    
    return Object.entries(variation.attributeValues)
      .map(([attrId, valueId]) => 
        `${getAttributeName(attrId)}: ${getAttributeValueDisplay(attrId, valueId)}`
      )
      .join(', ')
  }

  const { control, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      warehouseId: '',
      customerId: '',
      paymentMethod: '',
      saleDate: new Date().toISOString().split('T')[0], // Default to today, but user can change via DatePicker
      items: [],
      totalDiscount: 0,
      totalDiscountType: 'percentage',
      taxRate: 0,
    }
  })

  // Handle responsive grid
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setGridColumns(1)      // Mobile
      else if (width < 1024) setGridColumns(2) // Tablet
      else if (width < 1280) setGridColumns(2) // Small laptop
      else setGridColumns(3)                   // Desktop
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getGridColumns = () => {
    return `repeat(auto-fit, minmax(221px, 1fr))`
  }

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    let filteredList = products.filter(p => 
      p.status === 'active'
    )

    if (searchTerm) {
      filteredList = filteredList.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filteredList
  }, [searchTerm, products])

  // Calculate cart items with product details
  const cartItems = useMemo(() => {
    const items: CartItem[] = []
    
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) return
      
      const variation = item.variationId ? product.variations?.find((v: any) => v.id === item.variationId) : undefined
      const foundPackaging = packaging.find((p: Packaging) => p.id === item.packagingId)
      if (!foundPackaging) return // Skip if packaging not found
      const packagingVariation = item.packagingVariationId ? foundPackaging.variations?.find((v: any) => v.id === item.packagingVariationId) : undefined
      
      // Debug: Log price calculation details
      console.log('🔍 Cart price calculation:', {
        productId: item.productId,
        variationId: item.variationId,
        hasVariation: !!variation,
        variationPrice: variation?.price,
        productPrice: product.price,
        productType: product.type,
        isFreeGift: item.isFreeGift,
        productVariations: product.variations?.map((v: ProductVariation) => ({ id: v.id, price: v.price }))
      })
      
      // If marked as free gift, set price to 0
      const price = item.isFreeGift ? 0 : (variation ? Number(variation.price) : Number(product.price || 0))
      const originalTotal = price * item.quantity
      
      let discountAmount = 0
      if (item.discountType === 'percentage') {
        discountAmount = (originalTotal * item.discount) / 100
      } else {
        discountAmount = item.discount
      }
      
      const total = originalTotal - discountAmount
      
      items.push({
        ...item,
        product,
        variation,
        packaging: foundPackaging,
        packagingVariation,
        originalTotal,
        discountAmount,
        total
      })
    })
    
    return items
  }, [cart, products, packaging])

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0)
  
  let totalDiscountAmount = 0
  if (totalDiscountType === 'percentage') {
    totalDiscountAmount = (subtotal * totalDiscount) / 100
  } else {
    totalDiscountAmount = totalDiscount
  }
  
  const afterDiscount = subtotal - totalDiscountAmount
  const taxAmount = (afterDiscount * taxRate) / 100
  const cartTotal = afterDiscount + taxAmount

  // Show alert with auto-hide
  const showAlert = (type: 'success' | 'error', message: string) => {
    if (type === 'error') {
      toast.error(message)
    } else {
      toast.success(message)
    }
  }
  
  // Manual validation check
  const validateForm = () => {
    setValidationAttempted(true)
    
    if (!selectedWarehouse) {
      showAlert('error', 'Please select a warehouse')
      return false
    }
    
    if (!selectedCustomer) {
      showAlert('error', 'Please select a customer')
      return false
    }
    
    if (!selectedPaymentMethod) {
      showAlert('error', 'Please select a payment method')
      return false
    }
    
    if (cart.length === 0) {
      showAlert('error', 'Please add at least one item to the cart')
      return false
    }
    
    return true
  }
  
  // Handle Complete Sale button click
  const handleCompleteSale = async () => {
    if (!validateForm()) {
      return
    }
    
    // If validation passes, submit the form using the selected date from the form
    const formData = {
      warehouseId: selectedWarehouse,
      customerId: selectedCustomer,
      paymentMethod: selectedPaymentMethod,
      saleDate: watch('saleDate'), // Use the user-selected date from the form
      items: cart,
      totalDiscount,
      totalDiscountType,
      taxRate
    }
    
    await onSubmit(formData)
  }

  const handleCustomerAdded = (newCustomer: Customer) => {
    // Clear cache to force refresh of customers data
    clearCache()
    setValue('customerId', newCustomer.id)
    setSelectedCustomer(newCustomer.id)
    showAlert('success', `Customer ${newCustomer.name} added successfully!`)
  }

  const addToCart = (productId: string, packagingId: string, variationId?: string, packagingVariationId?: string) => {
    const existingItemIndex = cart.findIndex(item => 
      item.productId === productId && 
      item.variationId === variationId &&
      item.packagingId === packagingId &&
      item.packagingVariationId === packagingVariationId
    )
    
    if (existingItemIndex >= 0) {
      updateQuantity(productId, cart[existingItemIndex].quantity + 1, variationId, packagingId, packagingVariationId)
    } else {
      setCart(prev => [...prev, {
        productId,
        variationId,
        quantity: 1,
        discount: 0,
        discountType: 'percentage',
        packagingId,
        packagingVariationId,
        isFreeGift: false
      }])
    }
  }

  const updateQuantity = (productId: string, quantity: number, variationId?: string, packagingId?: string, packagingVariationId?: string) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => 
        !(item.productId === productId && 
          item.variationId === variationId &&
          item.packagingId === packagingId &&
          item.packagingVariationId === packagingVariationId)
      ))
    } else {
      setCart(prev => prev.map(item => 
        item.productId === productId && 
        item.variationId === variationId &&
        item.packagingId === packagingId &&
        item.packagingVariationId === packagingVariationId
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const updateItemDiscount = (productId: string, discount: number, variationId?: string) => {
    setCart(prev => prev.map(item => 
      item.productId === productId && item.variationId === variationId
        ? { ...item, discount }
        : item
    ))
  }

  const updateItemDiscountType = (productId: string, discountType: DiscountType, variationId?: string) => {
    setCart(prev => prev.map(item => 
      item.productId === productId && item.variationId === variationId
        ? { ...item, discountType }
        : item
    ))
  }

  const toggleFreeGift = (productId: string, variationId?: string, packagingId?: string, packagingVariationId?: string) => {
    setCart(prev => prev.map(item => 
      item.productId === productId && 
      item.variationId === variationId &&
      item.packagingId === packagingId &&
      item.packagingVariationId === packagingVariationId
        ? { ...item, isFreeGift: !item.isFreeGift, discount: 0 } // Reset discount when toggling free gift
        : item
    ))
  }

  const getAvailableStock = (product: Product, variationId?: string): number => {
    // If warehouse stock is available (from product_warehouse_stock), use that
    if ((product as any).warehouse_stock !== undefined) {
      return (product as any).warehouse_stock || 0
    }
    
    // Otherwise, use the regular stock calculation
    if (product.type === 'variation' && variationId) {
      const variation = product.variations?.find(v => v.id === variationId)
      return variation ? variation.stock : 0
    } else if (product.type === 'simple') {
      return product.stock || 0
    }
    return 0
  }

  const handleProductClick = (product: Product) => {
    if (product.type === 'variation' && product.variations && product.variations.length > 0) {
      // For variable products, open variation modal first
      setSelectedProductForVariation(product)
      setShowVariationModal(true)
    } else if (product.type === 'simple') {
      // For simple products, open packaging modal directly
      setSelectedProductForPackaging(product)
      setSelectedVariationForPackaging(null)
      setShowPackagingModal(true)
    }
  }

  const handleVariationSelect = (variation: ProductVariation) => {
    const product = selectedProductForVariation
    if (product) {
      // After variation selection, open packaging modal
      setSelectedProductForPackaging(product)
      setSelectedVariationForPackaging(variation)
      setShowPackagingModal(true)
    }
  }

  const handlePackagingSelect = (packaging: Packaging, packagingVariation?: PackagingVariation) => {
    const product = selectedProductForPackaging
    const variation = selectedVariationForPackaging
    
    if (product) {
      // Add to cart with selected product, variation (if any), and packaging
      addToCart(
        product.id, 
        packaging.id, 
        variation?.id, 
        packagingVariation?.id
      )
      
      // Clear all selections
      setSelectedProductForPackaging(null)
      setSelectedVariationForPackaging(null)
    }
  }

  const onSubmit = async (data: SaleFormData) => {
    try {
      setIsSubmitting(true)
      
      // Check for basic validation before processing
      if (!data.warehouseId) {
        showAlert('error', 'Please select a warehouse')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setIsSubmitting(false)
      return
    }

      if (!data.customerId) {
        showAlert('error', 'Please select a customer')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setIsSubmitting(false)
        return
      }
      
      if (!data.paymentMethod) {
        showAlert('error', 'Please select a payment method')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setIsSubmitting(false)
        return
      }
      
      if (cart.length === 0) {
        showAlert('error', 'Please add at least one item to the cart')
        setIsSubmitting(false)
        return
      }
      
      // Prepare data with cart items
      const saleData = {
        ...data,
        items: cart,
        totalDiscount,
        totalDiscountType,
        taxRate
      }

      const result = await addSale(saleData, cartItems, {
        subtotal,
        totalDiscountAmount,
        taxAmount,
        grandTotal: cartTotal
      })
      
        setSaleResult(result)
      
      if (result.success) {
        setShowSuccess(true)
      } else {
        showAlert('error', result.message)
      }
    } catch (error) {
      showAlert('error', 'An error occurred while processing the sale')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmitError = (formErrors: any) => {
    // Show toast notification for validation errors
    if (formErrors.warehouseId) {
      showAlert('error', 'Please select a warehouse')
    } else if (formErrors.customerId) {
      showAlert('error', 'Please select a customer')
    } else if (formErrors.paymentMethod) {
      showAlert('error', 'Please select a payment method')
    } else if (formErrors.saleDate) {
      showAlert('error', 'Please select a sale date')
    } else if (formErrors.items) {
      showAlert('error', 'Please add at least one item to the cart')
    } else {
      showAlert('error', 'Please fill in all required fields')
    }
    
    // Scroll to top to show the alert
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const startNewSale = () => {
    setShowSuccess(false)
    setSaleResult({ success: false, message: '' })
    setCart([])
    setSearchTerm('')
    setTotalDiscount(0)
    setTaxRate(0)
    reset()
    setSelectedWarehouse('')
    setSelectedCustomer('')
    setSelectedPaymentMethod('')
  }

  const printReceipt = () => {
    const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
    const selectedPaymentMethodData = paymentMethods.find(m => m.value === selectedPaymentMethod)
    
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt</title>
        <style>
          @page { size: 70mm auto; margin: 0; }
          @media print { body { margin: 0; padding: 0; width: 70mm !important; } .no-print { display: none !important; } }
          body { font-family: 'Courier New', monospace; font-size: 9px; line-height: 1.1; margin: 0; padding: 3mm; width: 70mm; color: #000; background: #fff; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 4px; }
          .company-name { font-size: 12px; font-weight: bold; margin-bottom: 2px; letter-spacing: 1px; }
          .company-info { font-size: 8px; margin-bottom: 1px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">ERP STORE</div>
          <div class="company-info">123 Business St, Dhaka</div>
          <div class="company-info">Phone: +880 1234-567890</div>
        </div>
          <div>Date: ${new Date().toLocaleDateString()}</div>
        <div>Total: ৳${(saleResult.revenue || 0).toFixed(2)}</div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (printWindow) {
        printWindow.document.write(receiptContent)
        printWindow.document.close()
        printWindow.focus()
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  // Success Page Component
  const SuccessPage = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="max-w-2xl w-full mx-4">
        <CardContent className="text-center p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Sale Completed Successfully!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your transaction has been processed and recorded.
            </p>
          </motion.div>

          {saleResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-muted rounded-lg p-6 mb-6 text-left"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-lg">Sale Summary</span>
              </div>
              
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">৳{(subtotal || 0).toFixed(2)}</span>
                  </div>
                  
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Discount ({totalDiscountType === 'percentage' 
                        ? `${totalDiscount}%` 
                        : `৳${totalDiscount.toFixed(2)}`
                      }):</span>
                      <span className="font-medium text-green-600">-৳{(totalDiscountAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax ({taxRate}%):</span>
                      <span className="font-medium text-blue-600">+৳{(taxAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-3">
                    <span>Total:</span>
                    <span className="text-green-600">৳{(saleResult.revenue || 0).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            <Button
              onClick={startNewSale}
              size="lg"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Sale
            </Button>
            
            <Button
              variant="outline"
              onClick={() => printReceipt()}
              className="w-full"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )

  // Show success page if sale completed
  if (showSuccess) {
    return <SuccessPage />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-8 w-8" />
            {editMode && existingSale ? `Edit Sale #${existingSale.id}` : 'New Sale'}
          </h1>
          <p className="text-muted-foreground">
            {editMode && existingSale 
              ? `Modify sale details and products • Customer: ${existingSale.customerName}`
              : 'Select a warehouse, add products to cart, and process the sale'
            }
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="space-y-6 p-1">
            {/* Warehouse and Customer Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Controller
                  name="warehouseId"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4 z-10 pointer-events-none" />
                      <Select onValueChange={(value) => { field.onChange(value); setSelectedWarehouse(value) }} value={field.value}>
                        <SelectTrigger className={`pl-10 ${validationAttempted && !selectedWarehouse ? 'border-red-300 focus:border-red-500' : ''}`}>
                          <SelectValue placeholder="Select warehouse" className="truncate pr-2" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                  <div className="flex items-center w-full">
                                    <span className="truncate">
                              {warehouse.name} - {warehouse.location}
                                    </span>
                                  </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    </div>
                  )}
                />
                {errors.warehouseId && (
                  <p className="text-sm text-red-500">{errors.warehouseId.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-0">
                  <Label htmlFor="customer">Customer *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="h-6 px-2 text-xs"
                    style={{ position: 'relative', top: '-4px' }}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4 z-10 pointer-events-none" />
                    <Select onValueChange={(value) => { field.onChange(value); setSelectedCustomer(value) }} value={field.value}>
                        <SelectTrigger className={`pl-10 ${validationAttempted && !selectedCustomer ? 'border-red-300 focus:border-red-500' : ''}`}>
                          <SelectValue placeholder="Select customer" className="truncate pr-2" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers
                          .filter(c => c.status === 'active')
                          .map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                                <span className="truncate">{customer.name}</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    </div>
                  )}
                />
                {errors.customerId && (
                  <p className="text-sm text-red-500">{errors.customerId.message}</p>
                )}
              </div>
            </div>

            {/* Sale Date and Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="saleDate">Sale Date *</Label>
                <Controller
                  name="saleDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      date={field.value ? new Date(field.value) : undefined}
                      onDateChange={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const formattedDate = `${year}-${month}-${day}`
                          field.onChange(formattedDate)
                        } else {
                          field.onChange('')
                        }
                      }}
                      placeholder="Select sale date"
                    />
                  )}
                />
                {errors.saleDate && (
                  <p className="text-sm text-red-500">{errors.saleDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4 z-10 pointer-events-none" />
                    <Select onValueChange={(value) => { field.onChange(value); setSelectedPaymentMethod(value) }} value={field.value}>
                        <SelectTrigger className={`pl-10 ${validationAttempted && !selectedPaymentMethod ? 'border-red-300 focus:border-red-500' : ''}`}>
                          <SelectValue placeholder="Select payment method" className="truncate pr-2" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                                <span className="truncate">{method.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  )}
                />
                {errors.paymentMethod && (
                  <p className="text-sm text-red-500">{errors.paymentMethod.message}</p>
                )}
              </div>
            </div>

            {/* Product Search */}
            {selectedWarehouse && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search products by name, SKU, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Products Grid */}
                {loadingProducts ? (
                  <div className="grid gap-4" style={{ gridTemplateColumns: getGridColumns() }}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="h-full flex flex-col">
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <div className="bg-muted rounded-lg h-32 mb-3 animate-pulse"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded animate-pulse"></div>
                            <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                            <div className="h-6 bg-muted rounded animate-pulse"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: getGridColumns()
                  }}
                >
                  {filteredProducts.map((product) => {
                    const cartItemsForProduct = cart.filter(item => item.productId === product.id)
                    const totalInCart = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0)

                    return (
                      <motion.div key={product.id} variants={itemVariants}>
                        <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 flex-1 flex flex-col">
                            {/* Product Image Placeholder */}
                            <div className="bg-muted rounded-lg h-32 mb-3 flex items-center justify-center">
                              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 space-y-2">
                              <h3 className="font-medium text-sm overflow-hidden" title={product.name} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {product.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                SKU: {product.sku || 'N/A'}
                              </p>
                              <div className="flex justify-between items-center">
                                {product.type === 'simple' ? (
                                <span className="font-bold text-lg">
                                  ৳{(product.price || 0).toFixed(2)}
                                </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    Multiple variations
                                  </span>
                                )}
                                <Badge variant={product.type === 'variation' ? 'secondary' : 'default'}>
                                  {product.type === 'variation' ? 'Variable' : 'Simple'}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                {product.type === 'simple' ? (
                                  <span className={getAvailableStock(product) > 0 ? 'text-green-600' : 'text-red-600'}>
                                    Stock: {getAvailableStock(product)}
                                    {selectedWarehouse && (product as any).warehouse_stock !== undefined && (
                                      <span className="text-blue-600 ml-1">(Warehouse)</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {product.product_variations?.length || 0} variations
                                  </span>
                                )}
                                {totalInCart > 0 && (
                                  <span className="text-blue-600 font-medium">
                                    {totalInCart} in cart
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Add to Cart Button */}
                              <Button
                                type="button"
                                className="w-full mt-3"
                              onClick={() => handleProductClick(product)}
                              disabled={product.type === 'simple' && getAvailableStock(product) === 0}
                                size="sm"
                            >
                              {product.type === 'variation' ? (
                                <>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Variations
                                </>
                              ) : (
                                <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add to Cart
                                </>
                            )}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </motion.div>
                )}

                {!loadingProducts && filteredProducts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No products found. Try adjusting your search or select a different warehouse.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Cart Summary (Desktop Only) */}
        <div className="hidden lg:block w-96 flex-shrink-0">
          <Card className="h-[calc(100vh-8rem)] sticky top-6">
            <CardHeader className="flex-shrink-0 pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart Summary
              </CardTitle>
              <CardDescription>
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-[calc(100%-6rem)] pt-3 pl-6 pr-6">
              <form onSubmit={handleSubmit(onSubmit, onSubmitError)} className="flex flex-col h-full">
                {/* Cart Items */}
                {cartItems.length > 0 ? (
                  <>
                    <div className="flex-1 space-y-3 overflow-auto mb-4 min-h-0">
                      {cartItems.map((item) => (
                        <motion.div
                          key={`${item.productId}-${item.variationId || 'simple'}-${item.packagingId}-${item.packagingVariationId || 'simple'}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <h4 className="font-medium text-sm leading-tight">
                                {item.product.name}
                              </h4>
                              {item.variation && (
                              <p className="text-xs text-muted-foreground">
                                  {formatVariationAttributes(item.variation)}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {item.isFreeGift 
                                  ? 'FREE each' 
                                  : `৳${(item.variation ? item.variation.price : item.product.price || 0).toFixed(2)} each`
                                }
                              </p>
                              {/* Packaging Information */}
                              <p className="text-xs text-blue-600">
                                📦 {item.packaging.title}
                                {item.packagingVariation && ` (${item.packagingVariation.sku})`}
                              </p>
                              {item.discount > 0 && (
                                <p className="text-xs text-green-600">
                                  {item.discountType === 'percentage' 
                                    ? `${item.discount}% discount applied`
                                    : `৳${item.discount.toFixed(2)} discount applied`
                                  }
                                </p>
                              )}
                              {/* Free Gift Toggle */}
                              <div className="flex items-center gap-2 mt-1">
                                <Switch
                                  checked={item.isFreeGift}
                                  onCheckedChange={() => toggleFreeGift(item.productId, item.variationId, item.packagingId, item.packagingVariationId)}
                                  disabled={isSubmitting}
                                  className="scale-75"
                                />
                                <span className="text-xs text-muted-foreground">Free Gift</span>
                                {item.isFreeGift && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1 py-0">
                                    <Gift className="h-3 w-3 mr-1" />
                                    FREE
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={item.product.type === 'variation' ? 'secondary' : 'default'} className="text-xs">
                                {item.product.type === 'variation' ? 'VAR' : 'SIMPLE'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variationId, item.packagingId, item.packagingVariationId)}
                                disabled={isSubmitting}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-medium text-sm min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variationId, item.packagingId, item.packagingVariationId)}
                                disabled={item.quantity >= getAvailableStock(item.product, item.variationId) || isSubmitting}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              {item.discount > 0 && !item.isFreeGift && (
                                <div className="text-xs text-muted-foreground line-through">
                                  ৳{(item.originalTotal || 0).toFixed(2)}
                                </div>
                              )}
                              <span className={`font-bold text-sm ${item.isFreeGift ? 'text-green-600' : ''}`}>
                                {item.isFreeGift ? 'FREE' : `৳${(item.total || 0).toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Cart Total & Checkout */}
                    <div className="flex-shrink-0 border-t pt-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>৳{(subtotal || 0).toFixed(2)}</span>
                        </div>
                        
                        {/* Add Discount Trigger */}
                        <div className="flex justify-start">
                          <button
                              type="button"
                            onClick={() => setShowDiscountModal(true)}
                            className="text-sm text-black hover:text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
                            style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                            >
                              <Percent className="h-3 w-3" />
                            Add Discount & Tax
                          </button>
                        </div>
                        
                        {totalDiscount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>
                              Discount ({totalDiscountType === 'percentage' 
                                ? `${totalDiscount}%` 
                                : `৳${totalDiscount.toFixed(2)}`
                              }):
                            </span>
                            <span>-৳{(totalDiscountAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span>After Discount:</span>
                          <span>৳{(afterDiscount || 0).toFixed(2)}</span>
                        </div>
                        
                        {taxRate > 0 && (
                          <div className="flex justify-between text-sm text-blue-600">
                            <span>Tax ({taxRate}%):</span>
                            <span>+৳{(taxAmount || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-xl font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>৳{(cartTotal || 0).toFixed(2)}</span>
                      </div>
                      
                      <Button
                        type="button"
                        size="lg"
                        className="w-full"
                        disabled={cartItems.length === 0 || isSubmitting}
                        onClick={handleCompleteSale}
                      >
                        {isSubmitting ? 'Processing...' : 'Complete Sale'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">Cart is empty</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedWarehouse 
                        ? "Add products from the catalog to get started"
                        : "Select a warehouse to view products"
                      }
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* Variation Selection Modal */}
      <VariationSelectionModal
        isOpen={showVariationModal}
        onClose={() => setShowVariationModal(false)}
        product={selectedProductForVariation}
        onVariationSelect={handleVariationSelect}
      />

      {/* Packaging Selection Modal */}
      <PackagingSelectionModal
        isOpen={showPackagingModal}
        onClose={() => setShowPackagingModal(false)}
        product={selectedProductForPackaging}
        selectedWarehouse={selectedWarehouse}
        packaging={packaging}
        loadingPackaging={loadingPackaging}
        onPackagingSelect={handlePackagingSelect}
      />

      {/* Discount Modal */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        cartItems={cartItems}
        updateItemDiscount={updateItemDiscount}
        updateItemDiscountType={updateItemDiscountType}
        totalDiscount={totalDiscount}
        setTotalDiscount={setTotalDiscount}
        totalDiscountType={totalDiscountType}
        setTotalDiscountType={setTotalDiscountType}
        taxRate={taxRate}
        setTaxRate={setTaxRate}
        subtotal={subtotal}
        totalDiscountAmount={totalDiscountAmount}
        afterDiscount={afterDiscount}
        taxAmount={taxAmount}
      />
    </div>
  )
} 