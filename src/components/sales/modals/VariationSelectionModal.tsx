'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Product, type ProductVariation } from '@/lib/types'

interface VariationSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onVariationSelect: (variation: ProductVariation) => void
}

export default function VariationSelectionModal({
  isOpen,
  onClose,
  product,
  onVariationSelect
}: VariationSelectionModalProps) {
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

export { VariationSelectionModal }