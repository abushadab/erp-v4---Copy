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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShoppingCart, Plus, Minus, AlertCircle, ArrowLeft, Percent, DollarSign, Box, Gift } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

// Import ProductGrid, CartSidebar, SaleForm, and SaleSuccessPage components
import { ProductGrid, CartSidebar, SaleForm, SaleSuccessPage } from './add-sale'

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
  
  // Variation selection modal state
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null)
  
  // Packaging selection modal state
  const [showPackagingModal, setShowPackagingModal] = useState(false)
  const [selectedProductForPackaging, setSelectedProductForPackaging] = useState<Product | null>(null)
  const [selectedVariationForPackaging, setSelectedVariationForPackaging] = useState<ProductVariation | null>(null)
  
  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  


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
      setSelectedPaymentMethod
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



  // Show success page if sale completed
  if (showSuccess) {
    return (
      <SaleSuccessPage
        saleResult={saleResult}
        calculations={{
          subtotal,
          totalDiscountAmount,
          afterDiscount,
          taxAmount,
          grandTotal: cartTotal
        }}
        totalDiscount={totalDiscount}
        totalDiscountType={totalDiscountType}
        taxRate={taxRate}
        selectedCustomer={selectedCustomer}
        selectedPaymentMethod={selectedPaymentMethod}
        customers={customers}
        paymentMethodAccounts={paymentMethodAccounts}
        onStartNewSale={startNewSaleLocal}
        onPrintReceipt={printReceipt}
      />
    )
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
            {/* Sale Form */}
            <SaleForm
              control={control}
              errors={errors}
              watch={watch}
              warehouses={warehouses}
              customers={customers}
              paymentMethodAccounts={paymentMethodAccounts}
              loadingPaymentMethods={loadingPaymentMethods}
              selectedWarehouse={selectedWarehouse}
              selectedCustomer={selectedCustomer}
              selectedPaymentMethod={selectedPaymentMethod}
              validationAttempted={validationAttempted}
              onWarehouseChange={setSelectedWarehouse}
              onCustomerChange={setSelectedCustomer}
              onPaymentMethodChange={setSelectedPaymentMethod}
              onShowAddCustomerModal={() => setShowAddCustomerModal(true)}
            />

            {/* Product Grid */}
            <ProductGrid
              selectedWarehouse={selectedWarehouse}
              products={products}
              loadingProducts={loadingProducts}
              cart={cart}
              onProductClick={handleProductClick}
              getAvailableStock={getAvailableStock}
            />
          </div>
        </div>

        {/* Right Sidebar - Cart Summary (Desktop Only) */}
        <CartSidebar
          cartItems={cartItems}
          isCartEmpty={isCartEmpty}
          selectedWarehouse={selectedWarehouse}
          calculations={{
            subtotal,
            totalDiscountAmount,
            afterDiscount,
            taxAmount,
            grandTotal: cartTotal
          }}
          totalDiscount={totalDiscount}
          totalDiscountType={totalDiscountType}
          taxRate={taxRate}
          form={{ handleSubmit, control, formState: { errors }, setValue, watch, reset }}
          onSubmit={(data) => onSubmit(data, cartItems, {
            subtotal,
            totalDiscountAmount,
            taxAmount,
            grandTotal: cartTotal
          })}
          onSubmitError={onSubmitError}
          updateCartItemQuantity={updateCartItemQuantity}
          toggleFreeGift={toggleFreeGift}
          getAvailableStock={getAvailableStock}
          onShowDiscountModal={() => setShowDiscountModal(true)}
          onCompleteSale={handleCompleteSaleClick}
          isSubmitting={isSubmitting}
        />
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