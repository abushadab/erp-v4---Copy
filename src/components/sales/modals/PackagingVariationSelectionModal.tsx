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
import { type Packaging, type PackagingVariation } from '@/lib/types'

interface PackagingVariationSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  packaging: Packaging | null
  onPackagingVariationSelect: (variation: PackagingVariation) => void
}

export default function PackagingVariationSelectionModal({
  isOpen,
  onClose,
  packaging,
  onPackagingVariationSelect
}: PackagingVariationSelectionModalProps) {
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

export { PackagingVariationSelectionModal }