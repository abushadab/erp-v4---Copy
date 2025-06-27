'use client'

import React from 'react'
import { Edit, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ProductVariation } from '@/lib/types'
import type { DatabaseAttribute } from '@/lib/hooks/useProductData'
import { getAttributeName, getAttributeValueName } from '@/lib/utils/productTransforms'

interface VariationsTableProps {
  variations: ProductVariation[]
  attributes: DatabaseAttribute[]
  onAddVariation: () => void
  onEditVariation: (index: number) => void
  onDeleteVariation: (index: number) => void
  canAddVariations: boolean
}

export function VariationsTable({
  variations,
  attributes,
  onAddVariation,
  onEditVariation,
  onDeleteVariation,
  canAddVariations
}: VariationsTableProps) {
  if (!canAddVariations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variations</CardTitle>
          <CardDescription>
            Select at least one attribute to start creating variations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Please select product attributes first to create variations
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Product Variations</CardTitle>
            <CardDescription>
              Manage different variations of this product
            </CardDescription>
          </div>
          <Button onClick={onAddVariation} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Variation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {variations.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              No variations created yet. Add your first variation to get started.
            </p>
            <Button onClick={onAddVariation} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create First Variation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {variations.length} variation{variations.length !== 1 ? 's' : ''} created
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Attributes</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.map((variation, index) => (
                    <TableRow key={variation.id || `temp-${index}`}>
                      <TableCell>
                        <span className="font-medium">{variation.sku}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variation.attributeValues || {}).map(([attrId, valueId]) => (
                            <Badge key={attrId} variant="secondary" className="text-xs">
                              {getAttributeName(attributes, attrId)}: {getAttributeValueName(attributes, attrId, valueId)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {variation.price ? `$${variation.price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditVariation(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteVariation(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}