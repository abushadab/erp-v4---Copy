import { useState, useMemo, useCallback } from 'react'
import { type Product, type ProductVariation, type Packaging, type PackagingVariation } from '@/lib/types'

// Discount type enum
export type DiscountType = 'percentage' | 'fixed'

// Base sale item interface
export interface SaleItem {
  productId: string
  variationId?: string
  quantity: number
  discount: number
  discountType: DiscountType
  packagingId: string
  packagingVariationId?: string
  isFreeGift: boolean
}

// Extended cart item with calculated values
export interface CartItem extends SaleItem {
  product: Product
  variation?: ProductVariation
  packaging: Packaging
  packagingVariation?: PackagingVariation
  originalTotal: number
  discountAmount: number
  total: number
}

// Cart calculations
export interface CartCalculations {
  subtotal: number
  totalDiscountAmount: number
  afterDiscount: number
  taxAmount: number
  grandTotal: number
}

// Hook parameters
export interface UseCartManagementParams {
  products: Product[]
  packaging: Packaging[]
}

// Hook return type
export interface UseCartManagementReturn {
  // Cart state
  cart: SaleItem[]
  cartItems: CartItem[]
  
  // Cart calculations
  calculations: CartCalculations
  
  // Discount and tax state
  totalDiscount: number
  totalDiscountType: DiscountType
  taxRate: number
  
  // Discount and tax setters
  setTotalDiscount: (discount: number) => void
  setTotalDiscountType: (type: DiscountType) => void
  setTaxRate: (rate: number) => void
  
  // Cart operations
  addToCart: (productId: string, packagingId: string, variationId?: string, packagingVariationId?: string) => void
  updateCartItemQuantity: (productId: string, quantity: number, variationId?: string, packagingId?: string, packagingVariationId?: string) => void
  removeFromCart: (productId: string, variationId?: string, packagingId?: string, packagingVariationId?: string) => void
  updateItemDiscount: (productId: string, discount: number, variationId?: string) => void
  updateItemDiscountType: (productId: string, discountType: DiscountType, variationId?: string) => void
  toggleFreeGift: (productId: string, variationId?: string, packagingId?: string, packagingVariationId?: string) => void
  clearCart: () => void
  
  // Utility functions
  getAvailableStock: (product: Product, variationId?: string) => number
  isCartEmpty: boolean
  totalItemsInCart: number
}

export function useCartManagement({ products, packaging }: UseCartManagementParams): UseCartManagementReturn {
  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([])
  
  // Discount and tax state
  const [totalDiscount, setTotalDiscount] = useState(0)
  const [totalDiscountType, setTotalDiscountType] = useState<DiscountType>('percentage')
  const [taxRate, setTaxRate] = useState(0)

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

  // Calculate totals and create calculations object
  const calculations = useMemo((): CartCalculations => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0)
    
    let totalDiscountAmount = 0
    if (totalDiscountType === 'percentage') {
      totalDiscountAmount = (subtotal * totalDiscount) / 100
    } else {
      totalDiscountAmount = totalDiscount
    }
    
    const afterDiscount = subtotal - totalDiscountAmount
    const taxAmount = (afterDiscount * taxRate) / 100
    const grandTotal = afterDiscount + taxAmount

    return {
      subtotal,
      totalDiscountAmount,
      afterDiscount,
      taxAmount,
      grandTotal
    }
  }, [cartItems, totalDiscount, totalDiscountType, taxRate])

  // Cart operations
  const addToCart = useCallback((productId: string, packagingId: string, variationId?: string, packagingVariationId?: string) => {
    const existingItemIndex = cart.findIndex(item => 
      item.productId === productId && 
      item.variationId === variationId &&
      item.packagingId === packagingId &&
      item.packagingVariationId === packagingVariationId
    )
    
    if (existingItemIndex >= 0) {
      updateCartItemQuantity(productId, cart[existingItemIndex].quantity + 1, variationId, packagingId, packagingVariationId)
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
  }, [cart])

  const updateCartItemQuantity = useCallback((productId: string, quantity: number, variationId?: string, packagingId?: string, packagingVariationId?: string) => {
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
  }, [])

  const removeFromCart = useCallback((productId: string, variationId?: string, packagingId?: string, packagingVariationId?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.productId === productId && 
        item.variationId === variationId &&
        item.packagingId === packagingId &&
        item.packagingVariationId === packagingVariationId)
    ))
  }, [])

  const updateItemDiscount = useCallback((productId: string, discount: number, variationId?: string) => {
    setCart(prev => prev.map(item => 
      item.productId === productId && item.variationId === variationId
        ? { ...item, discount }
        : item
    ))
  }, [])

  const updateItemDiscountType = useCallback((productId: string, discountType: DiscountType, variationId?: string) => {
    setCart(prev => prev.map(item => 
      item.productId === productId && item.variationId === variationId
        ? { ...item, discountType }
        : item
    ))
  }, [])

  const toggleFreeGift = useCallback((productId: string, variationId?: string, packagingId?: string, packagingVariationId?: string) => {
    setCart(prev => prev.map(item => 
      item.productId === productId && 
      item.variationId === variationId &&
      item.packagingId === packagingId &&
      item.packagingVariationId === packagingVariationId
        ? { ...item, isFreeGift: !item.isFreeGift, discount: 0 } // Reset discount when toggling free gift
        : item
    ))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setTotalDiscount(0)
    setTaxRate(0)
  }, [])

  // Utility functions
  const getAvailableStock = useCallback((product: Product, variationId?: string): number => {
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
  }, [])

  // Computed values
  const isCartEmpty = cart.length === 0
  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0)

  return {
    // Cart state
    cart,
    cartItems,
    
    // Cart calculations
    calculations,
    
    // Discount and tax state
    totalDiscount,
    totalDiscountType,
    taxRate,
    
    // Discount and tax setters
    setTotalDiscount,
    setTotalDiscountType,
    setTaxRate,
    
    // Cart operations
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    updateItemDiscount,
    updateItemDiscountType,
    toggleFreeGift,
    clearCart,
    
    // Utility functions
    getAvailableStock,
    isCartEmpty,
    totalItemsInCart
  }
}