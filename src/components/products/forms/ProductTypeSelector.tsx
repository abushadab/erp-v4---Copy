'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProductTypeSelectorProps {
  value: 'simple' | 'variation'
  onChange: (value: 'simple' | 'variation') => void
  disabled?: boolean
}

export function ProductTypeSelector({ value, onChange, disabled = false }: ProductTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Type</CardTitle>
        <CardDescription>
          Choose whether this is a simple product or a variation product with multiple options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={(value: 'simple' | 'variation') => onChange(value)}
          disabled={disabled}
          className="grid grid-cols-1 gap-4"
        >
          <div className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <RadioGroupItem value="simple" id="simple" />
            <div className="grid gap-1">
              <Label htmlFor="simple" className="font-medium">
                Simple Product
              </Label>
              <p className="text-sm text-muted-foreground">
                A single product with one SKU, price, and stock level
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <RadioGroupItem value="variation" id="variation" />
            <div className="grid gap-1">
              <Label htmlFor="variation" className="font-medium">
                Variation Product
              </Label>
              <p className="text-sm text-muted-foreground">
                A product with multiple variations (e.g., different sizes, colors)
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}