'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Box, Eye, Plus } from 'lucide-react'
import { type Product, type Packaging, type PackagingVariation } from '@/lib/types'
import { PackagingVariationSelectionModal } from './PackagingVariationSelectionModal'

interface PackagingSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  selectedWarehouse: string
  packaging: Packaging[]
  loadingPackaging: boolean
  onPackagingSelect: (packaging: Packaging, packagingVariation?: PackagingVariation) => void
}

export default function PackagingSelectionModal({
  isOpen,
  onClose,
  product,
  selectedWarehouse,
  packaging,
  loadingPackaging,
  onPackagingSelect
}: PackagingSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showPackagingVariationModal, setShowPackagingVariationModal] = useState(false)
  const [selectedPackagingForVariation, setSelectedPackagingForVariation] = useState<Packaging | null>(null)

  // Filter packaging based on search
  const filteredPackaging = useMemo(() => {
    if (searchTerm) {
      return packaging.filter((pkg: Packaging) =>
        pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pkg.sku && pkg.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        pkg.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return packaging
  }, [searchTerm, packaging])

  const handlePackagingClick = (packaging: Packaging) => {
    if (packaging.type === 'variable' && packaging.variations && packaging.variations.length > 0) {
      setSelectedPackagingForVariation(packaging)
      setShowPackagingVariationModal(true)
    } else if (packaging.type === 'simple') {
      onPackagingSelect(packaging)
      onClose()
    }
  }

  const handlePackagingVariationSelect = (variation: PackagingVariation) => {
    if (selectedPackagingForVariation) {
      onPackagingSelect(selectedPackagingForVariation, variation)
      onClose()
    }
  }

  if (!product) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              Select Packaging for {product.name}
            </DialogTitle>
            <DialogDescription>
              Choose packaging for this product before adding to cart
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search packaging by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Packaging Grid */}
            <div className="max-h-[50vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                {filteredPackaging.map((packaging) => (
                  <div 
                    key={packaging.id}
                    onClick={() => handlePackagingClick(packaging)}
                    className="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-300"
                  >
                    <div className="space-y-3">
                      {/* Packaging Info */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm leading-tight" title={packaging.title}>
                          {packaging.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          SKU: {packaging.sku || 'N/A'}
                        </p>
                        <div className="flex justify-between items-center">
                          {packaging.type === 'simple' ? (
                            <span className="font-bold text-sm">
                              ৳{(packaging.price || 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Multiple variations
                            </span>
                          )}
                          <Badge variant={packaging.type === 'variable' ? 'secondary' : 'default'}>
                            {packaging.type === 'variable' ? 'Variable' : 'Simple'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          {packaging.type === 'simple' ? (
                            <span className={(packaging.stock || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                              Stock: {packaging.stock || 0}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {packaging.variations?.length || 0} variations
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={packaging.description}>
                          {packaging.description}
                        </p>
                      </div>

                      {/* Action */}
                      <Button
                        type="button"
                        className="w-full"
                        disabled={packaging.type === 'simple' && (packaging.stock || 0) === 0}
                        size="sm"
                      >
                        {packaging.type === 'variable' ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            View Variations
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Select Packaging
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredPackaging.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No packaging found. Try adjusting your search.
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Packaging Variation Selection Modal */}
      <PackagingVariationSelectionModal
        isOpen={showPackagingVariationModal}
        onClose={() => setShowPackagingVariationModal(false)}
        packaging={selectedPackagingForVariation}
        onPackagingVariationSelect={handlePackagingVariationSelect}
      />
    </>
  )
}

export { PackagingSelectionModal }