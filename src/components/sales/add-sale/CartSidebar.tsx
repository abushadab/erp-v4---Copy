'use client'

import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { motion } from 'framer-motion'
import { ShoppingCart, Plus, Minus, Percent, Gift } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

import { type CartItem, type DiscountType, type CartCalculations } from '@/hooks/sales/useCartManagement'
import { type ProductVariation } from '@/lib/types'

export interface CartSidebarProps {
  // Cart data
  cartItems: CartItem[]
  isCartEmpty: boolean
  selectedWarehouse: string
  
  // Calculations
  calculations: CartCalculations
  totalDiscount: number
  totalDiscountType: DiscountType
  taxRate: number
  
  // Form handling
  form: UseFormReturn<any>
  onSubmit: (data: any) => void
  onSubmitError: (errors: any) => void
  
  // Cart actions
  updateCartItemQuantity: (productId: string, quantity: number, variationId?: string, packagingId?: string, packagingVariationId?: string) => void
  toggleFreeGift: (productId: string, variationId?: string, packagingId?: string, packagingVariationId?: string) => void
  getAvailableStock: (product: any, variationId?: string) => number
  
  // Modal and discount actions
  onShowDiscountModal: () => void
  onCompleteSale: () => void
  
  // Loading and submission state
  isSubmitting: boolean
}

export function CartSidebar({
  cartItems,
  isCartEmpty,
  selectedWarehouse,
  calculations,
  totalDiscount,
  totalDiscountType,
  taxRate,
  form,
  onSubmit,
  onSubmitError,
  updateCartItemQuantity,
  toggleFreeGift,
  getAvailableStock,
  onShowDiscountModal,
  onCompleteSale,
  isSubmitting
}: CartSidebarProps) {
  const { subtotal, totalDiscountAmount, afterDiscount, taxAmount, grandTotal: cartTotal } = calculations

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

  return (
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
          <form onSubmit={form.handleSubmit(onSubmit, onSubmitError)} className="flex flex-col h-full">
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
                        onClick={onShowDiscountModal}
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
                    onClick={onCompleteSale}
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
  )
}