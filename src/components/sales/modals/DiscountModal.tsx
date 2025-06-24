'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Percent, DollarSign } from 'lucide-react'

// Types
type DiscountType = 'percentage' | 'fixed'

interface CartItem {
  productId: string
  variationId?: string
  packagingId?: string
  packagingVariationId?: string
  product: {
    name: string
    price?: number
  }
  variation?: {
    price: number
    attributeValues: Record<string, string>
  }
  quantity: number
  originalTotal: number
  discount: number
  discountType: DiscountType
  discountAmount: number
  total: number
}

interface DiscountModalProps {
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
}

export default function DiscountModal({
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
}: DiscountModalProps) {
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

export { DiscountModal }