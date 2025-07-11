'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { safeParsePrice } from '@/lib/utils/productTransforms'

interface ValidationState {
  isChecking: boolean
  isValid: boolean | null
  message: string
  isError?: boolean
}

interface ProductForm {
  sku?: string
  sellingPrice?: number
}

interface SimpleProductFieldsProps {
  form: ProductForm
  onFormChange: (form: ProductForm) => void
  skuValidation: ValidationState
  onSkuChange: (sku: string) => void
}

export function SimpleProductFields({
  form,
  onFormChange,
  skuValidation,
  onSkuChange
}: SimpleProductFieldsProps) {
  const handleSkuChange = (value: string) => {
    onFormChange({ ...form, sku: value })
    onSkuChange(value)
  }

  const handlePriceChange = (value: string) => {
    onFormChange({
      ...form,
      sellingPrice: safeParsePrice(value)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Details</CardTitle>
        <CardDescription>
          SKU and pricing information. Stock quantity is managed through Purchase system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <div className="relative">
              <Input
                id="sku"
                value={form.sku || ''}
                onChange={(e) => handleSkuChange(e.target.value)}
                placeholder="Enter SKU"
                className={
                  skuValidation.isError
                    ? "border-orange-500 focus-visible:ring-orange-500"  // Network/server error
                    : skuValidation.isValid === false 
                      ? "border-red-500 focus-visible:ring-red-500"     // SKU invalid/exists
                      : skuValidation.isValid === true 
                        ? "border-green-500 focus-visible:ring-green-500" // SKU valid
                        : ""                                              // Default/unchecked
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
                skuValidation.isError
                  ? "text-orange-600"   // Network/server error - different color
                  : skuValidation.isValid === false 
                    ? "text-red-600"    // SKU invalid/exists
                    : skuValidation.isValid === true 
                      ? "text-green-600" // SKU valid
                      : "text-gray-600"  // Default
              }`}>
                {skuValidation.message}
              </p>
            )}
          </div>

          {/* Optional: Add selling price field if needed in the future */}
          {form.sellingPrice !== undefined && (
            <div className="space-y-2">
              <Label htmlFor="selling-price">Selling Price</Label>
              <Input
                id="selling-price"
                type="number"
                step="0.01"
                min="0"
                value={form.sellingPrice || ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}