import * as React from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Edit, Box, MapPin, Loader2 } from "lucide-react"
import { DatabasePackaging, DatabasePackagingAttribute, getPackagingAttributes, getWarehouses } from "@/lib/supabase/queries"
import { getPackagingStockSummary, type PackagingStockSummary } from "@/lib/utils/multi-warehouse-packaging-stock"
import { getTotalPackagingStock } from "@/lib/supabase/queries"

interface PackagingVariation {
  id: string
  sku: string
  attributeValues: { [attributeId: string]: string }
  stock?: number
}

interface ViewPackagingModalProps {
  packaging: DatabasePackaging | null
  isOpen: boolean
  onClose: () => void
}

export function ViewPackagingModal({ packaging, isOpen, onClose }: ViewPackagingModalProps) {
  const [packagingAttributes, setPackagingAttributes] = React.useState<DatabasePackagingAttribute[]>([])
  const [warehouses, setWarehouses] = React.useState<any[]>([])
  const [stockSummary, setStockSummary] = React.useState<PackagingStockSummary | null>(null)
  const [totalStock, setTotalStock] = React.useState(0)
  const [isLoadingStock, setIsLoadingStock] = React.useState(false)
  const [variationsByWarehouse, setVariationsByWarehouse] = React.useState<{ [warehouseId: string]: any[] }>({})

  // Load packaging attributes and warehouse data when modal opens
  React.useEffect(() => {
    if (isOpen && packaging) {
      const loadData = async () => {
        try {
          setIsLoadingStock(true)
          
          // Load attributes and warehouses
          const [attributes, warehousesData] = await Promise.all([
            getPackagingAttributes(),
            getWarehouses()
          ])
          
          setPackagingAttributes(attributes)
          setWarehouses(warehousesData)

          // Load stock data
          if (packaging.type === 'simple') {
            // For simple packaging, get total stock across all warehouses
            const totalStockValue = await getTotalPackagingStock(packaging.id)
            setTotalStock(totalStockValue)
            
            // Get detailed stock summary
            const summary = await getPackagingStockSummary(packaging.id)
            setStockSummary(summary)
          } else if (packaging.type === 'variable' && packaging.variations) {
            // For variable packaging, sum stock for all variations
            let variableTotal = 0
            for (const variation of packaging.variations) {
              const variationStock = await getTotalPackagingStock(packaging.id, variation.id)
              variableTotal += variationStock
            }
            setTotalStock(variableTotal)
            
            // Get summary for the entire packaging (all variations)
            const summary = await getPackagingStockSummary(packaging.id)
            setStockSummary(summary)

            // Load variation stock data for variable packaging
            const variationsByWarehouse = await getVariationStockByWarehouse(warehousesData)
            setVariationsByWarehouse(variationsByWarehouse)
          }
        } catch (error) {
          console.error('Error loading packaging data:', error)
        } finally {
          setIsLoadingStock(false)
        }
      }
      loadData()
    }
  }, [isOpen, packaging])

  // Don't render the dialog content if no packaging selected
  if (!packaging) {
    return (
      <Dialog open={false} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        </DialogContent>
      </Dialog>
    )
  }

  // Get warehouse stock data for simple packaging
  const getWarehouseStockData = () => {
    if (!stockSummary || packaging.type !== 'simple') return []
    
    return stockSummary.warehouseStocks.map(warehouseStock => ({
      warehouse: warehouseStock.warehouse.name,
      location: warehouseStock.warehouse.location,
      stock: warehouseStock.currentStock
    }))
  }

  // Get variation stock by warehouse for variable packaging
  const getVariationStockByWarehouse = async (warehousesData: any[]) => {
    if (packaging?.type !== 'variable' || !packaging.variations || !warehousesData.length) return {}

    const variationsByWarehouse: { [warehouseId: string]: any[] } = {}
    
    // Initialize each warehouse with empty arrays
    warehousesData.forEach(warehouse => {
      variationsByWarehouse[warehouse.id] = []
    })
    
    // For each variation, get its stock across warehouses
    for (const variation of packaging.variations) {
      try {
        const variationStockSummary = await getPackagingStockSummary(packaging.id, variation.id)
        
        // Add this variation to each warehouse
        warehousesData.forEach(warehouse => {
          const warehouseStock = variationStockSummary.warehouseStocks.find(
            ws => ws.warehouse.id === warehouse.id
          )
          
          variationsByWarehouse[warehouse.id].push({
            ...variation,
            stock: warehouseStock?.currentStock || 0
          })
        })
      } catch (error) {
        console.error(`Error loading stock for variation ${variation.id}:`, error)
        // Add variation with 0 stock to all warehouses
        warehousesData.forEach(warehouse => {
          variationsByWarehouse[warehouse.id].push({
            ...variation,
            stock: 0
          })
        })
      }
    }
    
    return variationsByWarehouse
  }

  const warehouseStockData = getWarehouseStockData()

  const getAttributeValueName = (attributeId: string, valueId: string) => {
    const attribute = packagingAttributes.find(attr => attr.id === attributeId)
    const value = attribute?.values?.find(val => val.id === valueId)
    return value?.value || valueId
  }

  const getAttributeName = (attributeId: string) => {
    const attribute = packagingAttributes.find(attr => attr.id === attributeId)
    return attribute?.name || attributeId
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                {packaging.title}
              </DialogTitle>
              <Link href={`/packaging/edit/${packaging.id}`}>
                <Button onClick={onClose} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Packaging ID</span>
                  <p className="text-sm">{packaging.id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Type</span>
                  <div className="text-sm">
                    <Badge variant="outline">
                      {packaging.type === 'simple' ? 'Simple Packaging' : 'Variable Packaging'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <div className="text-sm">
                    <Badge 
                      variant={packaging.status === 'active' ? 'default' : 'secondary'}
                      className={packaging.status === 'inactive' ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}
                    >
                      {packaging.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Created</span>
                  <p className="text-sm">{new Date(packaging.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {packaging.description && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                  <p className="text-sm mt-1">{packaging.description}</p>
                </div>
              )}
              {packaging.type === 'simple' && packaging.sku && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">SKU</span>
                  <p className="text-sm mt-1 font-mono">{packaging.sku}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Across Warehouses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Stock Across Warehouses
              </CardTitle>
              <CardDescription>
                Current stock levels in different warehouse locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading stock data...</span>
                </div>
              ) : packaging.type === 'simple' ? (
                // Simple packaging - show warehouse table
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseStockData.map((warehouse) => (
                      <TableRow key={warehouse.warehouse}>
                        <TableCell className="font-medium">{warehouse.warehouse}</TableCell>
                        <TableCell className="text-muted-foreground">{warehouse.location}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={warehouse.stock > 0 ? "default" : "destructive"}
                            className={warehouse.stock === 0 ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}
                          >
                            {warehouse.stock} units
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {warehouseStockData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No stock found in any warehouse
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                // Variable packaging - show variations distributed across warehouses
                <div className="space-y-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Total Stock:</span>
                      <Badge 
                        variant={totalStock > 0 ? "default" : "destructive"}
                        className={totalStock === 0 ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}
                      >
                        {totalStock} units
                      </Badge>
                    </div>
                  </div>

                  {warehouses
                    .filter(w => w.status === 'active')
                    .map(warehouse => {
                      const warehouseVariations = variationsByWarehouse[warehouse.id] || []
                      const warehouseTotalStock = warehouseVariations.reduce((total: number, variation: any) => total + (variation.stock || 0), 0)

                      return (
                        <div key={warehouse.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-medium">{warehouse.name}</h4>
                              <p className="text-sm text-muted-foreground">{warehouse.location}</p>
                            </div>
                            <Badge variant={warehouseTotalStock > 0 ? "default" : "secondary"}>
                              {warehouseTotalStock} units total
                            </Badge>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Attributes</TableHead>
                                <TableHead>Stock</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {warehouseVariations.map((variation) => (
                                <TableRow key={`${warehouse.id}-${variation.id}`}>
                                  <TableCell className="font-medium font-mono text-sm">
                                    {variation.sku}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {variation.attribute_values?.map((attr: any) => (
                                        <div key={attr.attribute_id} className="text-sm">
                                          <span className="font-medium">{attr.attribute_name}:</span>{' '}
                                          <span className="text-muted-foreground">{attr.value_label}</span>
                                        </div>
                                      )) || (
                                        variation.attributeValues && Object.entries(variation.attributeValues).map(([attrId, valueId]) => (
                                          <div key={attrId} className="text-sm">
                                            <span className="font-medium">{getAttributeName(attrId)}:</span>{' '}
                                            <span className="text-muted-foreground">{getAttributeValueName(attrId, String(valueId))}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={variation.stock && variation.stock > 0 ? "default" : "destructive"}
                                      className={variation.stock === 0 ? "bg-red-100 text-red-800 hover:bg-red-200" : ""}
                                    >
                                      {variation.stock || 0} units
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 