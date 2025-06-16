import * as React from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Edit, Package, MapPin, Loader2 } from "lucide-react"
import { type Product } from "@/lib/mock-data/erp-data"
import { getProductStockSummary } from "@/lib/utils/multi-warehouse-stock"
import { getAttributes, type DatabaseAttribute } from "@/lib/supabase/queries"

interface ViewProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function ViewProductModal({ product, isOpen, onClose }: ViewProductModalProps) {
  const [warehouseStocks, setWarehouseStocks] = React.useState<Array<{
    warehouse: string
    location: string
    stock: number
  }>>([])
  const [totalStock, setTotalStock] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [attributes, setAttributes] = React.useState<DatabaseAttribute[]>([])

  // Fetch real warehouse stock data and attributes when modal opens
  React.useEffect(() => {
    if (!product || !isOpen) return

    console.log('🚀 ViewProductModal: Modal opened for product:', product)

    const fetchData = async () => {
      try {
        setIsLoading(true)
        console.log('🔍 ViewProductModal: Fetching data for product ID:', product.id)
        
        // Fetch both stock and attributes in parallel
        const [stockSummary, attributesData] = await Promise.all([
          getProductStockSummary(product.id),
          getAttributes()
        ])
        
        console.log('📊 ViewProductModal: Stock summary result:', stockSummary)
        console.log('🎨 ViewProductModal: Attributes loaded:', attributesData.length)
        
        const stockData = stockSummary.warehouseStocks.map(ws => ({
          warehouse: ws.warehouse.name,
          location: ws.warehouse.location || 'Location not specified',
          stock: ws.currentStock
        }))
        
        console.log('🏭 ViewProductModal: Processed warehouse stocks:', stockData)
        console.log('📦 ViewProductModal: Total stock:', stockSummary.totalStock)
        
        setWarehouseStocks(stockData)
        setTotalStock(stockSummary.totalStock)
        setAttributes(attributesData)
      } catch (error) {
        console.error('❌ ViewProductModal: Error fetching data:', error)
        setWarehouseStocks([])
        setTotalStock(0)
        setAttributes([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [product, isOpen])

  if (!product) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAttributeName = (attributeId: string) => {
    const attribute = attributes.find((attr: DatabaseAttribute) => attr.id === attributeId)
    return attribute?.name || attributeId
  }

  const getAttributeValueName = (attributeId: string, valueId: string) => {
    const attribute = attributes.find((attr: DatabaseAttribute) => attr.id === attributeId)
    const value = attribute?.values?.find((val: any) => val.id === valueId)
    return value?.label || value?.value || valueId
  }

  const getVariationStock = (variationId: string): number => {
    // For variations, we need to aggregate stock across all warehouses for this specific variation
    // This will be calculated from the warehouse stock data we fetched
    // For now, return the stock from the variation object
    const variation = product?.variations?.find(v => v.id === variationId)
    return variation?.stock || 0
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Details
          </DialogTitle>
          <DialogDescription>
            View comprehensive information about this product including stock levels, variations, and warehouse distribution.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Basic Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Product Name</label>
                  <p className="text-lg font-semibold">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">SKU</label>
                  <p className="text-lg">{product.sku || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Category</label>
                  <p className="text-lg">{product.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-lg capitalize">
                    {product.type === 'simple' ? 'Simple Product' : 'Variable Product'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div>{getStatusBadge(product.status)}</div>
                </div>
                {product.type === 'simple' && product.price && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Price</label>
                    <p className="text-lg font-semibold">৳{product.price.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {product.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-800">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Stock Across Warehouses
              </CardTitle>
              <CardDescription>
                Current stock levels in different warehouse locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading warehouse stock...</span>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-600">Total Stock:</label>
                    <p className="text-2xl font-bold text-green-600">{totalStock} units</p>
                  </div>
                  
                  {warehouseStocks.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseStocks.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.warehouse}</TableCell>
                            <TableCell className="text-gray-600">{item.location}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.stock} units
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No stock data available for this product
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Variations (for variable products) */}
          {product.type === 'variation' && product.variations && product.variations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Variations</CardTitle>
                <CardDescription>
                  Different variations of this product with their individual details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variations.map((variation) => (
                      <TableRow key={variation.id}>
                        <TableCell className="font-medium">{variation.sku}</TableCell>
                        <TableCell>
                          {variation.attributeValues ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(variation.attributeValues).map(([attrId, valueId]) => (
                                <Badge key={`${attrId}-${valueId}`} variant="outline" className="text-xs">
                                  {getAttributeName(attrId)}: {getAttributeValueName(attrId, valueId)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            'No attributes'
                          )}
                        </TableCell>
                        <TableCell>৳{variation.price?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-right">{getVariationStock(variation.id)} units</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Link href={`/products/edit/${product.id}`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 