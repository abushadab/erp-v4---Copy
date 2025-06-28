'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { 
  DatabaseAttribute, 
  DatabaseAttributeValue,
  DatabaseProductVariation 
} from '@/lib/hooks/useProductData'
import { safeParsePrice } from '@/lib/utils/productTransforms'

// Interface for the variation data that gets submitted
interface VariationSubmitData {
  sku: string
  price?: number
  attributeValues: { [attributeId: string]: string }
}

// Interface for variations (both existing and editing)
interface Variation {
  id: string
  sku: string
  price: number
  attributeValues: { [attributeId: string]: string }
}

interface EditVariationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attributes: DatabaseAttribute[]
  selectedAttributes: string[]
  existingVariations: Variation[]
  editingIndex: number
  variation?: Variation
  onSubmit: (variationData: VariationSubmitData) => void
}
interface EditVariationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attributes: DatabaseAttribute[]
  selectedAttributes: string[]
  existingVariations: ExistingVariation[]
  editingIndex: number
  variation?: EditingVariation
  onSubmit: (variationData: VariationSubmitData) => void
}

export function EditVariationModal({
  open,
  onOpenChange,
  attributes,
  selectedAttributes,
  existingVariations,
  editingIndex,
  variation,
  onSubmit
}: EditVariationModalProps) {
  // Local form state
  const [sku, setSku] = React.useState('')
  const [price, setPrice] = React.useState<number | undefined>(undefined)
  const [attributeValues, setAttributeValues] = React.useState<{ [attributeId: string]: string }>({})
  
  // Validation state
  const [skuError, setSkuError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  // Initialize form with variation data when modal opens or variation changes
  React.useEffect(() => {
    if (open && variation) {
      setSku(variation.sku || '')
      setPrice(variation.price)
      setAttributeValues(variation.attributeValues || {})
      setSkuError(null)
      setFormError(null)
    } else if (open) {
      // Reset form if no variation is provided
      setSku('')
      setPrice(undefined)
      setAttributeValues({})
      setSkuError(null)
      setFormError(null)
    }
  }, [open, variation])

  const handleSkuChange = (value: string) => {
    setSku(value)
    
    // Validate SKU uniqueness (exclude current variation)
    if (value.trim()) {
      const isDuplicate = existingVariations.some((existingVariation, index) => {
        // Skip the variation we're currently editing
        if (index === editingIndex) return false
        return existingVariation.sku.toLowerCase() === value.toLowerCase()
      })
      
      if (isDuplicate) {
        setSkuError('This SKU already exists')
      } else {
        setSkuError(null)
      }
    } else {
      setSkuError(null)
    }
  }

  const handlePriceChange = (value: string) => {
    if (!value) {
      setPrice(undefined)
      return
    }

    const parsedPrice = parseFloat(value)
    if (!isNaN(parsedPrice) && parsedPrice >= 0) {
      setPrice(parsedPrice)
    }
  }
  const handleAttributeValueChange = (attributeId: string, valueId: string) => {
    setAttributeValues(prev => ({
      ...prev,
      [attributeId]: valueId
    }))
  }

  const handleSubmit = () => {
    // Validate form
    if (!sku.trim()) {
      setFormError('SKU is required')
      return
    }

    if (skuError) {
      setFormError('Please fix the SKU error before continuing')
      return
    }

    // Check if all selected attributes have values
    for (const attributeId of selectedAttributes) {
      if (!attributeValues[attributeId]) {
        const attribute = attributes.find(attr => attr.id === attributeId)
        setFormError(`Please select a value for ${attribute?.name || 'attribute'}`)
        return
      }
    }

    // Check for duplicate attribute combination (exclude current variation)
    const isDuplicateCombination = existingVariations.some((existingVariation, index) => {
      // Skip the variation we're currently editing
      if (index === editingIndex) return false
      
      return selectedAttributes.every(attrId => 
        existingVariation.attributeValues[attrId] === attributeValues[attrId]
      )
    })

    if (isDuplicateCombination) {
      setFormError('This combination of attributes already exists')
      return
    }

    // Submit the variation
    onSubmit({
      sku: sku.trim(),
      price,
      attributeValues
    })

    // Close modal
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Variation</DialogTitle>
          <DialogDescription>
            Update the variation details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Form Error */}
          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-variation-sku">SKU *</Label>
              <Input
                id="edit-variation-sku"
                value={sku}
                onChange={(e) => handleSkuChange(e.target.value)}
                placeholder="Enter variation SKU"
                className={skuError ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {skuError && (
                <p className="text-xs text-red-600">
                  {skuError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-variation-selling-price">Selling Price</Label>
              <Input
                id="edit-variation-selling-price"
                type="number"
                step="0.01"
                min="0"
                value={price || ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedAttributes.map((attributeId) => {
              const attribute = attributes.find(attr => attr.id === attributeId)
              return (
                <div key={attributeId} className="space-y-2">
                  <Label>{attribute?.name} *</Label>
                  <Select
                    value={attributeValues[attributeId] || ''}
                    onValueChange={(value) => handleAttributeValueChange(attributeId, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${attribute?.name}`} />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {attribute?.values?.map((value) => (
                        <SelectItem key={value.id} value={value.id}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            suppressHydrationWarning
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            suppressHydrationWarning
          >
            Update Variation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}