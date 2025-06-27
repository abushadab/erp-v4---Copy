'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { DatabaseAttribute } from '@/lib/hooks/useProductData'

interface VariationProductFieldsProps {
  attributes: DatabaseAttribute[]
  selectedAttributes: string[]
  onAttributeToggle: (attributeId: string) => void
  onCreateAttribute: () => void
  hasVariations: boolean
}

export function VariationProductFields({
  attributes,
  selectedAttributes,
  onAttributeToggle,
  onCreateAttribute,
  hasVariations
}: VariationProductFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Attributes</CardTitle>
        <CardDescription>
          Select the attributes that define variations of this product (e.g., Size, Color)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attributes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              No attributes available. Create your first attribute to get started.
            </p>
            <Button onClick={onCreateAttribute} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Attribute
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {attributes.map((attribute) => (
                <div key={attribute.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={attribute.id}
                      checked={selectedAttributes.includes(attribute.id)}
                      onCheckedChange={() => onAttributeToggle(attribute.id)}
                      disabled={hasVariations} // Disable if variations already exist
                    />
                    <div>
                      <Label htmlFor={attribute.id} className="font-medium">
                        {attribute.name}
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {attribute.values?.slice(0, 3).map((value) => (
                          <Badge key={value.id} variant="outline" className="text-xs">
                            {value.label || value.value}
                          </Badge>
                        ))}
                        {attribute.values && attribute.values.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{attribute.values.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={attribute.required ? 'default' : 'secondary'} className="text-xs">
                    {attribute.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateAttribute}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Attribute
              </Button>
              
              {selectedAttributes.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedAttributes.length} attribute{selectedAttributes.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {hasVariations && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Attributes cannot be changed once variations are created. 
                  Delete all variations first to modify attributes.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}