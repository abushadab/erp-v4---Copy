'use client'

import { Package, GitBranch } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface ProductTypeSelectorProps {
  value: 'simple' | 'variation'
  onChange: (value: 'simple' | 'variation') => void
  disabled?: boolean
}

export function ProductTypeSelector({ value, onChange, disabled = false }: ProductTypeSelectorProps) {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-medium">Product Type</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose whether this is a simple product or a variation product with multiple options
        </p>
        <RadioGroup
          value={value}
          onValueChange={disabled ? undefined : onChange}
          className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
          suppressHydrationWarning
          disabled={disabled}
        >
          <Label htmlFor="simple-product" className={`block ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`} suppressHydrationWarning>
            <Card className={`p-4 border transition-all h-full ${value === 'simple' ? 'border-black' : ''} ${disabled ? 'opacity-60' : 'hover:border-black'}`} suppressHydrationWarning>
              <div className="flex items-start gap-4">
                <RadioGroupItem value="simple" id="simple-product" className="mt-1" suppressHydrationWarning/>
                <div className="grid gap-1.5">
                    <div className="font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Simple Product
                    </div>
                    <p className="text-sm text-muted-foreground">
                      A single product with one SKU, price, and stock level
                    </p>
                </div>
              </div>
            </Card>
          </Label>

          <Label htmlFor="variation-product" className={`block ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`} suppressHydrationWarning>
            <Card className={`p-4 border transition-all h-full ${value === 'variation' ? 'border-black' : ''} ${disabled ? 'opacity-60' : 'hover:border-black'}`} suppressHydrationWarning>
              <div className="flex items-start gap-4">
                <RadioGroupItem value="variation" id="variation-product" className="mt-1" suppressHydrationWarning/>
                <div className="grid gap-1.5">
                    <div className="font-semibold flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Variation Product
                    </div>
                    <p className="text-sm text-muted-foreground">
                      A product with multiple variations (e.g., different sizes, colors)
                    </p>
                </div>
              </div>
            </Card>
          </Label>
        </RadioGroup>
      </div>
    </Card>
  )
}