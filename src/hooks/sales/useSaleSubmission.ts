'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createSale } from '@/lib/supabase/sales-client'
import { invalidateSalesCache } from '@/lib/hooks/useSalesData'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { type CartItem } from '@/hooks/sales/useCartManagement'

// Types
interface SaleFormData {
  warehouseId: string
  customerId: string
  paymentMethod: string
  saleDate: string
  items: any[]
  totalDiscount: number
  totalDiscountType: 'percentage' | 'fixed'
  taxRate: number
}

interface SaleResult {
  success: boolean
  message: string
  saleId?: string
  revenue?: number
  profit?: number
  items?: CartItem[]
}

interface SaleTotals {
  subtotal: number
  totalDiscountAmount: number
  taxAmount: number
  grandTotal: number
}

interface Customer {
  id: string
  name: string
}

interface Warehouse {
  id: string
  name: string
}

interface UseSaleSubmissionProps {
  customers: Customer[]
  warehouses: Warehouse[]
  clearCache: () => void
}

export function useSaleSubmission({ 
  customers, 
  warehouses, 
  clearCache 
}: UseSaleSubmissionProps) {
  const { user } = useCurrentUser()
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [saleResult, setSaleResult] = useState<SaleResult>({ success: false, message: '' })
  
  // Validation state
  const [validationAttempted, setValidationAttempted] = useState(false)

  // Show alert with auto-hide
  const showAlert = (type: 'success' | 'error', message: string) => {
    if (type === 'error') {
      toast.error(message)
    } else {
      toast.success(message)
    }
  }

  // Real sales function using Supabase
  const addSale = async (
    saleData: SaleFormData, 
    cartItems: CartItem[], 
    totals: SaleTotals
  ): Promise<SaleResult> => {
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

  // Manual validation check
  const validateForm = (
    selectedWarehouse: string,
    selectedCustomer: string,
    selectedPaymentMethod: string,
    isCartEmpty: boolean
  ) => {
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
    
    if (isCartEmpty) {
      showAlert('error', 'Please add at least one item to the cart')
      return false
    }
    
    return true
  }

  // Form submission handler
  const onSubmit = async (data: SaleFormData, cartItems: CartItem[], totals: SaleTotals) => {
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
      
      if (!cartItems || cartItems.length === 0) {
        showAlert('error', 'Please add at least one item to the cart')
        setIsSubmitting(false)
        return
      }

      const result = await addSale(data, cartItems, totals)
      
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

  // Form submit error handler
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

  // Handle Complete Sale button click with validation
  const handleCompleteSale = async (
    selectedWarehouse: string,
    selectedCustomer: string,
    selectedPaymentMethod: string,
    isCartEmpty: boolean,
    formData: SaleFormData,
    cartItems: CartItem[],
    totals: SaleTotals
  ) => {
    if (!validateForm(selectedWarehouse, selectedCustomer, selectedPaymentMethod, isCartEmpty)) {
      return
    }
    
    await onSubmit(formData, cartItems, totals)
  }

  // Reset form and start new sale
  const startNewSale = (
    clearCart: () => void,
    resetForm: () => void,
    setSelectedWarehouse: (value: string) => void,
    setSelectedCustomer: (value: string) => void,
    setSelectedPaymentMethod: (value: string) => void,
    setSearchTerm: (value: string) => void
  ) => {
    setShowSuccess(false)
    setSaleResult({ success: false, message: '' })
    clearCart()
    setSearchTerm('')
    resetForm()
    setSelectedWarehouse('')
    setSelectedCustomer('')
    setSelectedPaymentMethod('')
  }

  // Handle customer added successfully
  const handleCustomerAdded = (
    newCustomer: Customer,
    setValue: (field: string, value: any) => void,
    setSelectedCustomer: (value: string) => void
  ) => {
    // Clear cache to force refresh of customers data
    clearCache()
    setValue('customerId', newCustomer.id)
    setSelectedCustomer(newCustomer.id)
    showAlert('success', `Customer ${newCustomer.name} added successfully!`)
  }

  return {
    // State
    isSubmitting,
    showSuccess,
    saleResult,
    validationAttempted,
    
    // Functions
    validateForm,
    onSubmit,
    onSubmitError,
    handleCompleteSale,
    startNewSale,
    handleCustomerAdded,
    showAlert,
    
    // Setters for external control
    setValidationAttempted,
    setShowSuccess,
    setSaleResult
  }
}