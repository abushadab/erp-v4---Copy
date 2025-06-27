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

interface ValidationState {
  isChecking: boolean
  isValid: boolean | null
  message: string
}

interface VariationForm {
  sku: string
  sellingPrice?: number
  attributeValues: { [attributeId: string]: string }
}

interface EditVariationModalProps {
  isOpen: boolean
  onClose: () => void
  variationForm: VariationForm
  onVariationFormChange: (form: VariationForm) => void
  skuValidation: ValidationState
  selectedAttributes: string[]
  attributes: DatabaseAttribute[]
  onUpdateVariation: () => void
  onReset: () => void
}

export function EditVariationModal({
  isOpen,
  onClose,
  variationForm,
  onVariationFormChange,
  skuValidation,
  selectedAttributes,
  attributes,
  onUpdateVariation,
  onReset
}: EditVariationModalProps) {
  const handleSkuChange = (value: string) => {
    onVariationFormChange({
      ...variationForm,
      sku: value
    })
  }

  const handlePriceChange = (value: string) => {
    onVariationFormChange({
      ...variationForm,
      sellingPrice: safeParsePrice(value)
    })
  }

  const handleAttributeValueChange = (attributeId: string, valueId: string) => {
    onVariationFormChange({
      ...variationForm,
      attributeValues: {
        ...variationForm.attributeValues,
        [attributeId]: valueId
      }
    })
  }

  const handleCancel = () => {
    onReset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Variation</DialogTitle>
          <DialogDescription>
            Update the variation details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modal-variation-sku">SKU *</Label>
              <div className="relative">
                <Input
                  id="modal-variation-sku"
                  value={variationForm.sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  placeholder="Enter variation SKU"
                  className={
                    skuValidation.isValid === false 
                      ? "border-red-500 focus-visible:ring-red-500" 
                      : skuValidation.isValid === true 
                        ? "border-green-500 focus-visible:ring-green-500" 
                        : ""
                  }
                />
                {skuValidation.isChecking && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {skuValidation.message && (
                <p className={`text-xs ${
                  skuValidation.isValid === false 
                    ? "text-red-600" 
                    : skuValidation.isValid === true 
                      ? "text-green-600" 
                      : "text-gray-600"
                }`}>
                  {skuValidation.message}
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
                value={variationForm.sellingPrice || ''}
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
                    value={variationForm.attributeValues[attributeId] || ''}
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
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={onUpdateVariation}>
            Update Variation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}