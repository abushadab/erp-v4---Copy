'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/lib/types'

interface ProductSummaryProps {
  product: Product | null
}

export function ProductSummary({ product }: ProductSummaryProps) {
  if (!product) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{product.name}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline" className="text-xs">
              {product.type}
            </Badge>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge 
              variant={product.status === 'active' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {product.status}
            </Badge>
          </div>
          
          {product.sku && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SKU:</span>
              <span className="font-medium">{product.sku}</span>
            </div>
          )}
          
          {product.price && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">${product.price}</span>
            </div>
          )}
          
          {product.category && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{product.category}</span>
            </div>
          )}
          
          {product.type === 'variation' && product.variations && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Variations:</span>
              <span className="font-medium">{product.variations.length}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}