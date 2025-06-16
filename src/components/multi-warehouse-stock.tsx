'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Package, Transfer, Plus, Minus, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'

import { 
  getProductStockSummary, 
  updateWarehouseStock, 
  transferStockBetweenWarehouses,
  getStockMovements,
  type StockSummary,
  type StockMovement,
  type Warehouse,
  type StockUpdateParams,
  type StockTransferParams
} from '@/lib/utils/multi-warehouse-stock'

interface MultiWarehouseStockProps {
  productId: string
  variationId?: string | null
  productName: string
  availableWarehouses: Warehouse[]
  onStockUpdate?: () => void
}

interface StockMovementModalProps {
  productId: string
  variationId?: string | null
  productName: string
  warehouses: Warehouse[]
  onSuccess?: () => void
}

interface StockTransferModalProps {
  productId: string
  variationId?: string | null
  productName: string
  warehouses: Warehouse[]
  stockSummary: StockSummary
  onSuccess?: () => void
}

function StockMovementModal({ productId, variationId, productName, warehouses, onSuccess }: StockMovementModalProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({
    warehouseId: '',
    quantity: '',
    movementType: 'adjustment' as StockUpdateParams['movementType'],
    reason: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.warehouseId || !form.quantity) return

    setLoading(true)
    try {
      await updateWarehouseStock({
        productId,
        warehouseId: form.warehouseId,
        variationId,
        quantityChange: parseInt(form.quantity),
        movementType: form.movementType,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
        createdBy: 'system' // You can replace this with actual user ID
      })

      toast.success('Stock updated successfully')
      setOpen(false)
      setForm({
        warehouseId: '',
        quantity: '',
        movementType: 'adjustment',
        reason: '',
        notes: ''
      })
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock - {productName}</DialogTitle>
          <DialogDescription>
            Add or remove stock for this product in a specific warehouse.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select 
              value={form.warehouseId} 
              onValueChange={(value) => setForm({ ...form, warehouseId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="movementType">Movement Type</Label>
            <Select 
              value={form.movementType} 
              onValueChange={(value: StockUpdateParams['movementType']) => setForm({ ...form, movementType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                <SelectItem value="purchase">Purchase Receipt</SelectItem>
                <SelectItem value="return">Product Return</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity Change</Label>
            <Input
              id="quantity"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="Enter positive number to add, negative to remove"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Optional reason for stock movement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional additional notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StockTransferModal({ productId, variationId, productName, warehouses, stockSummary, onSuccess }: StockTransferModalProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: '',
    reason: 'Warehouse Transfer',
    notes: ''
  })

  const fromWarehouseStock = stockSummary.warehouseStocks.find(
    ws => ws.warehouse.id === form.fromWarehouseId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fromWarehouseId || !form.toWarehouseId || !form.quantity) return

    if (form.fromWarehouseId === form.toWarehouseId) {
      toast.error('Source and destination warehouses must be different')
      return
    }

    setLoading(true)
    try {
      await transferStockBetweenWarehouses({
        productId,
        variationId,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        quantity: parseInt(form.quantity),
        reason: form.reason,
        notes: form.notes || undefined,
        createdBy: 'system' // You can replace this with actual user ID
      })

      toast.success('Stock transferred successfully')
      setOpen(false)
      setForm({
        fromWarehouseId: '',
        toWarehouseId: '',
        quantity: '',
        reason: 'Warehouse Transfer',
        notes: ''
      })
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to transfer stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Transfer Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Stock - {productName}</DialogTitle>
          <DialogDescription>
            Transfer stock between warehouses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromWarehouse">From Warehouse</Label>
              <Select 
                value={form.fromWarehouseId} 
                onValueChange={(value) => setForm({ ...form, fromWarehouseId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {stockSummary.warehouseStocks
                    .filter(ws => ws.availableStock > 0)
                    .map(({ warehouse }) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromWarehouseStock && (
                <p className="text-sm text-muted-foreground">
                  Available: {fromWarehouseStock.availableStock}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="toWarehouse">To Warehouse</Label>
              <Select 
                value={form.toWarehouseId} 
                onValueChange={(value) => setForm({ ...form, toWarehouseId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter(w => w.id !== form.fromWarehouseId)
                    .map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Transfer</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={fromWarehouseStock?.availableStock || 0}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="Enter quantity"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for transfer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional additional notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transfer Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MultiWarehouseStock({ 
  productId, 
  variationId, 
  productName, 
  availableWarehouses,
  onStockUpdate 
}: MultiWarehouseStockProps) {
  const [stockSummary, setStockSummary] = React.useState<StockSummary | null>(null)
  const [stockMovements, setStockMovements] = React.useState<StockMovement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadStockData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [summary, movements] = await Promise.all([
        getProductStockSummary(productId, variationId),
        getStockMovements(productId, undefined, variationId, 20)
      ])
      
      setStockSummary(summary)
      setStockMovements(movements)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data')
    } finally {
      setLoading(false)
    }
  }, [productId, variationId])

  React.useEffect(() => {
    loadStockData()
  }, [loadStockData])

  const handleStockUpdate = () => {
    loadStockData()
    onStockUpdate?.()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading stock information...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!stockSummary) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No stock information available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stock Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Multi-Warehouse Stock
              </CardTitle>
              <CardDescription>
                Stock levels across all warehouses for {productName}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <StockMovementModal
                productId={productId}
                variationId={variationId}
                productName={productName}
                warehouses={availableWarehouses}
                onSuccess={handleStockUpdate}
              />
              {stockSummary.warehouseStocks.length > 1 && (
                <StockTransferModal
                  productId={productId}
                  variationId={variationId}
                  productName={productName}
                  warehouses={availableWarehouses}
                  stockSummary={stockSummary}
                  onSuccess={handleStockUpdate}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Total Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stockSummary.totalStock}</div>
              <div className="text-sm text-muted-foreground">Total Stock</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stockSummary.availableStock}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stockSummary.reservedStock}</div>
              <div className="text-sm text-muted-foreground">Reserved</div>
            </div>
          </div>

          {/* Warehouse Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium">Warehouse Breakdown</h4>
            {stockSummary.warehouseStocks.map(({ warehouse, currentStock, availableStock, reservedStock }) => (
              <div key={warehouse.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{warehouse.name}</div>
                    <div className="text-sm text-muted-foreground">{warehouse.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{currentStock}</div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">{availableStock}</div>
                    <div className="text-muted-foreground">Available</div>
                  </div>
                  {reservedStock > 0 && (
                    <div className="text-center">
                      <div className="font-medium text-orange-600">{reservedStock}</div>
                      <div className="text-muted-foreground">Reserved</div>
                    </div>
                  )}
                  <Badge variant={currentStock > 0 ? 'default' : 'secondary'}>
                    {currentStock > 0 ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
          <CardDescription>
            Latest stock movements for this product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockMovements.length > 0 ? (
            <div className="space-y-3">
              {stockMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      movement.direction === 'in' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{movement.movement_type}</span>
                        <Badge variant={movement.direction === 'in' ? 'default' : 'destructive'}>
                          {movement.direction === 'in' ? '+' : '-'}{movement.quantity}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {movement.reason && `${movement.reason} • `}
                        {new Date(movement.created_at || '').toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{movement.previous_stock} → {movement.new_stock}</div>
                    {movement.warehouse_id && (
                      <div className="text-muted-foreground">
                        {availableWarehouses.find(w => w.id === movement.warehouse_id)?.name || 'Unknown Warehouse'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No stock movements recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 