'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProductVariation } from '@/lib/types'
import type { 
  DatabaseAttribute, 
  DatabaseAttributeValue,
  DatabaseProductVariation 
} from '@/lib/hooks/useProductData'
import { getAttributeName, getAttributeValueName } from '@/lib/utils/productTransforms'

interface DeleteVariationModalProps {
  isOpen: boolean
  onClose: () => void
  variation: ProductVariation | null
  attributes: DatabaseAttribute[]
  onConfirmDelete: () => void
}

export function DeleteVariationModal({
  isOpen,
  onClose,
  variation,
  attributes,
  onConfirmDelete
}: DeleteVariationModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Variation</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this variation? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {variation && (
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">
                SKU: {variation.sku}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(variation.attributeValues || {}).map(([attrId, valueId]) => {
                  // valueId is guaranteed to be string by the attributeValues interface
                  if (typeof valueId !== 'string') {
                    console.warn(`Invalid valueId type for attribute ${attrId}:`, typeof valueId, valueId)
                    return null
                  }
                  return (
                    <Badge key={attrId} variant="secondary" className="text-xs">
                      {getAttributeName(attributes, attrId)}: {getAttributeValueName(attributes, attrId, valueId)}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmDelete}>
            Delete Variation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}