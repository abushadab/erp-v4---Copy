'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, ShoppingCart, Plus, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { type Product } from '@/lib/types'
import { type CartItem } from '@/hooks/sales/useCartManagement'

interface ProductGridProps {
  selectedWarehouse: string
  products: Product[]
  loadingProducts: boolean
  cart: CartItem[]
  onProductClick: (product: Product) => void
  getAvailableStock: (product: Product, variationId?: string) => number
}

export function ProductGrid({
  selectedWarehouse,
  products,
  loadingProducts,
  cart,
  onProductClick,
  getAvailableStock
}: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [gridColumns, setGridColumns] = useState(3)

  // Handle responsive grid
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setGridColumns(1)      // Mobile
      else if (width < 1024) setGridColumns(2) // Tablet
      else if (width < 1280) setGridColumns(2) // Small laptop
      else setGridColumns(3)                   // Desktop
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getGridColumns = () => {
    return `repeat(auto-fit, minmax(221px, 1fr))`
  }

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    let filteredList = products.filter(p => 
      p.status === 'active'
    )

    if (searchTerm) {
      filteredList = filteredList.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filteredList
  }, [searchTerm, products])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  if (!selectedWarehouse) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Product Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search products by name, SKU, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      {loadingProducts ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: getGridColumns() }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-full flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="bg-muted rounded-lg h-32 mb-3 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                  <div className="h-6 bg-muted rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4"
          style={{
            gridTemplateColumns: getGridColumns()
          }}
        >
          {filteredProducts.map((product) => {
            const cartItemsForProduct = cart.filter(item => item.productId === product.id)
            const totalInCart = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0)

            return (
              <motion.div key={product.id} variants={itemVariants}>
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex-1 flex flex-col">
                    {/* Product Image Placeholder */}
                    <div className="bg-muted rounded-lg h-32 mb-3 flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-medium text-sm overflow-hidden" title={product.name} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku || 'N/A'}
                      </p>
                      <div className="flex justify-between items-center">
                        {product.type === 'simple' ? (
                        <span className="font-bold text-lg">
                          ৳{(product.price || 0).toFixed(2)}
                        </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Multiple variations
                          </span>
                        )}
                        <Badge variant={product.type === 'variation' ? 'secondary' : 'default'}>
                          {product.type === 'variation' ? 'Variable' : 'Simple'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        {product.type === 'simple' ? (
                          <span className={getAvailableStock(product) > 0 ? 'text-green-600' : 'text-red-600'}>
                            Stock: {getAvailableStock(product)}
                            {selectedWarehouse && (product as any).warehouse_stock !== undefined && (
                              <span className="text-blue-600 ml-1">(Warehouse)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {product.product_variations?.length || 0} variations
                          </span>
                        )}
                        {totalInCart > 0 && (
                          <span className="text-blue-600 font-medium">
                            {totalInCart} in cart
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                      <Button
                        type="button"
                        className="w-full mt-3"
                      onClick={() => onProductClick(product)}
                      disabled={product.type === 'simple' && getAvailableStock(product) === 0}
                        size="sm"
                    >
                      {product.type === 'variation' ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          View Variations
                        </>
                      ) : (
                        <>
                        <Plus className="h-3 w-3 mr-1" />
                        Add to Cart
                        </>
                    )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {!loadingProducts && filteredProducts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No products found. Try adjusting your search or select a different warehouse.
        </div>
      )}
    </div>
  )
}