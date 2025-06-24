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
import { type Customer } from '@/lib/supabase/sales-client'
import { useAddSaleData } from '@/lib/hooks/useAddSaleData'

// Import modal components
import { 
  AddCustomerModal, 
  VariationSelectionModal,
  PackagingSelectionModal,
  PackagingVariationSelectionModal,
  DiscountModal
} from './modals'

// Import types
import { 
  type Warehouse, 
  type Product, 
  type ProductVariation,
  type Sale,
  type Packaging,
  type PackagingVariation
} from '@/lib/types'

// Import cart management hook
import { useCartManagement, type DiscountType, type SaleItem, type CartItem } from '@/hooks/sales/useCartManagement'

// Import real Supabase functions
import { getPackagingByWarehouse } from '@/lib/supabase/sales-client'

// Import sale submission hook
import { useSaleSubmission } from '@/hooks/sales/useSaleSubmission'

// Payment methods - now loaded from accounts marked as payment methods

// Discount type is now imported from the hook

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

type SaleFormData = z.infer<typeof saleSchema>

// SaleItem and CartItem interfaces are now imported from the hook





// All modal components moved to ./modals/ directory

// PackagingSelectionModal moved to ./modals/PackagingSelectionModal.tsx

// DiscountModal moved to ./modals/DiscountModal.tsx

interface AddSaleProps {
  editMode?: boolean
  existingSale?: Sale
  saleId?: string
}

export default function AddSale({ editMode, existingSale, saleId }: AddSaleProps) {
  // Use the optimized data hook instead of duplicated loading logic
  const {
    customers,
    warehouses,
    products,
    paymentMethodAccounts,
    loadingCustomers,
    loadingWarehouses,
    loadingProducts,
    loadingPaymentMethods,
    errors: dataErrors,
    loadProducts,
    clearCache
  } = useAddSaleData()

  // Use sale submission hook
  const {
    isSubmitting,
    showSuccess,
    saleResult,
    validationAttempted,
    validateForm,
    onSubmit,
    onSubmitError,
    handleCompleteSale,
    startNewSale,
    handleCustomerAdded,
    showAlert,
    setValidationAttempted
  } = useSaleSubmission({ customers, warehouses, clearCache })



  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  
  // Packaging data state
  const [packaging, setPackaging] = useState<Packaging[]>([])
  const [loadingPackaging, setLoadingPackaging] = useState(true)
  
  // Cart management using custom hook
  const cartManagement = useCartManagement({ products, packaging })

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
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  // Discount and tax state now managed by the cart hook
  const [gridColumns, setGridColumns] = useState(3)
  
  // Variation selection modal state
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null)
  
  // Packaging selection modal state
  const [showPackagingModal, setShowPackagingModal] = useState(false)
  const [selectedProductForPackaging, setSelectedProductForPackaging] = useState<Product | null>(null)
  const [selectedVariationForPackaging, setSelectedVariationForPackaging] = useState<ProductVariation | null>(null)
  
  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  

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

  // Cart items are now calculated by the hook

  // Extract values from cart management hook
  const {
    cart,
    cartItems,
    calculations: { subtotal, totalDiscountAmount, afterDiscount, taxAmount, grandTotal: cartTotal },
    totalDiscount,
    totalDiscountType,
    taxRate,
    setTotalDiscount,
    setTotalDiscountType,
    setTaxRate,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    updateItemDiscount,
    updateItemDiscountType,
    toggleFreeGift,
    clearCart,
    getAvailableStock,
    isCartEmpty,
    totalItemsInCart
  } = cartManagement

  // Handle Complete Sale button click
  const handleCompleteSaleClick = async () => {
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
    
    await handleCompleteSale(
      selectedWarehouse,
      selectedCustomer,
      selectedPaymentMethod,
      isCartEmpty,
      formData,
      cartItems,
      {
        subtotal,
        totalDiscountAmount,
        taxAmount,
        grandTotal: cartTotal
      }
    )
  }

  const handleCustomerAddedLocal = (newCustomer: Customer) => {
    handleCustomerAdded(newCustomer, setValue, setSelectedCustomer)
  }

  // addToCart function is now provided by the hook

  // updateQuantity function is now updateCartItemQuantity from the hook

  // updateItemDiscount function is now provided by the hook

  // updateItemDiscountType function is now provided by the hook

  // toggleFreeGift function is now provided by the hook

  // getAvailableStock function is now provided by the hook

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

  const startNewSaleLocal = () => {
    startNewSale(
      clearCart,
      reset,
      setSelectedWarehouse,
      setSelectedCustomer,
      setSelectedPaymentMethod,
      setSearchTerm
    )
  }

  const printReceipt = () => {
    const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
    const selectedPaymentMethodData = paymentMethodAccounts.find(account => account.id === selectedPaymentMethod)
    
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
              onClick={startNewSaleLocal}
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
                      <Select onValueChange={(value: string) => { field.onChange(value); setSelectedWarehouse(value) }} value={field.value}>
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
                    <Select onValueChange={(value: string) => { field.onChange(value); setSelectedCustomer(value) }} value={field.value}>
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
                    <Select onValueChange={(value: string) => { field.onChange(value); setSelectedPaymentMethod(value) }} value={field.value}>
                        <SelectTrigger className={`pl-10 ${validationAttempted && !selectedPaymentMethod ? 'border-red-300 focus:border-red-500' : ''}`}>
                          <SelectValue placeholder="Select payment method" className="truncate pr-2" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingPaymentMethods ? (
                          <SelectItem value="loading" disabled>Loading payment methods...</SelectItem>
                        ) : paymentMethodAccounts.length === 0 ? (
                          <SelectItem value="none" disabled>No payment methods available</SelectItem>
                        ) : (
                          paymentMethodAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <span className="truncate">{account.account_name}</span>
                            </SelectItem>
                          ))
                        )}
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
              <form onSubmit={handleSubmit((data) => onSubmit(data, cartItems, {
                subtotal,
                totalDiscountAmount,
                taxAmount,
                grandTotal: cartTotal
              }), onSubmitError)} className="flex flex-col h-full">
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
                                onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1, item.variationId, item.packagingId, item.packagingVariationId)}
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
                                onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1, item.variationId, item.packagingId, item.packagingVariationId)}
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
                        disabled={isCartEmpty || isSubmitting}
                        onClick={handleCompleteSaleClick}
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
        onCustomerAdded={handleCustomerAddedLocal}
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