import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/types'

export type ProductWarehouseStock = Tables<'product_warehouse_stock'>
export type StockMovement = Tables<'stock_movements'>
export type Warehouse = Tables<'warehouses'>

export interface StockSummary {
  totalStock: number
  availableStock: number
  reservedStock: number
  warehouseStocks: Array<{
    warehouse: Warehouse
    currentStock: number
    availableStock: number
    reservedStock: number
  }>
}

export interface StockUpdateParams {
  productId: string
  warehouseId: string
  variationId?: string | null
  quantityChange: number
  movementType: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return'
  referenceId?: string | null
  reason?: string | null
  createdBy?: string | null
  notes?: string | null
}

export interface StockTransferParams {
  productId: string
  variationId?: string | null
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
  referenceId?: string | null
  reason?: string
  createdBy?: string | null
  notes?: string | null
}

/**
 * Get stock summary for a product across all warehouses
 */
export async function getProductStockSummary(
  productId: string,
  variationId?: string | null
): Promise<StockSummary> {
  const supabase = createClient()

  console.log('🔍 getProductStockSummary: Called with productId:', productId, 'variationId:', variationId)

  let query = supabase
    .from('product_warehouse_stock')
    .select(`
      *,
      warehouses:warehouse_id (*)
    `)
    .eq('product_id', productId)

  // Handle variation_id filtering correctly
  if (variationId) {
    // Get stock for specific variation
    query = query.eq('variation_id', variationId)
  } else {
    // When no variationId is specified, get all stock for the product
    // This handles both:
    // - Simple products: stock records with variation_id = null
    // - Variation products: all stock records for all variations
    console.log('🔍 getProductStockSummary: Getting all stock records for product (no variation filter)')
    // Don't add any variation_id filter - get all stock for this product
  }

  const { data: stockData, error } = await query

  console.log('🔍 getProductStockSummary: Query result:', { data: stockData, error })

  if (error) {
    throw new Error(`Failed to fetch stock summary: ${error.message}`)
  }

  const warehouseStocks = (stockData || []).map(stock => ({
    warehouse: stock.warehouses as Warehouse,
    currentStock: stock.current_stock,
    availableStock: stock.available_stock || 0,
    reservedStock: stock.reserved_stock
  }))

  const totalStock = warehouseStocks.reduce((sum, ws) => sum + ws.currentStock, 0)
  const availableStock = warehouseStocks.reduce((sum, ws) => sum + ws.availableStock, 0)
  const reservedStock = warehouseStocks.reduce((sum, ws) => sum + ws.reservedStock, 0)

  return {
    totalStock,
    availableStock,
    reservedStock,
    warehouseStocks
  }
}

/**
 * Get stock for a specific product in a specific warehouse
 */
export async function getWarehouseStock(
  productId: string,
  warehouseId: string,
  variationId?: string | null
): Promise<ProductWarehouseStock | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('product_warehouse_stock')
    .select('*')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .eq(variationId ? 'variation_id' : 'variation_id', variationId || null)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new Error(`Failed to fetch warehouse stock: ${error.message}`)
  }

  return data
}

/**
 * Update stock using the database function
 */
export async function updateWarehouseStock(params: StockUpdateParams): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('update_warehouse_stock', {
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_variation_id: params.variationId,
    p_quantity_change: params.quantityChange,
    p_movement_type: params.movementType,
    p_reference_id: params.referenceId,
    p_reason: params.reason,
    p_created_by: params.createdBy,
    p_notes: params.notes
  })

  if (error) {
    throw new Error(`Failed to update warehouse stock: ${error.message}`)
  }

  return data
}

/**
 * Transfer stock between warehouses
 */
export async function transferStockBetweenWarehouses(params: StockTransferParams): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('transfer_stock_between_warehouses', {
    p_product_id: params.productId,
    p_variation_id: params.variationId,
    p_from_warehouse_id: params.fromWarehouseId,
    p_to_warehouse_id: params.toWarehouseId,
    p_quantity: params.quantity,
    p_reference_id: params.referenceId,
    p_reason: params.reason || 'Warehouse Transfer',
    p_created_by: params.createdBy,
    p_notes: params.notes
  })

  if (error) {
    throw new Error(`Failed to transfer stock: ${error.message}`)
  }

  return data
}

/**
 * Get stock movements for a product (optionally filtered by warehouse)
 */
export async function getStockMovements(
  productId: string,
  warehouseId?: string,
  variationId?: string | null,
  limit: number = 50
): Promise<StockMovement[]> {
  const supabase = createClient()

  let query = supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId)
  }

  if (variationId) {
    query = query.eq('variation_id', variationId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch stock movements: ${error.message}`)
  }

  return data || []
}

/**
 * Get total stock across all warehouses using database function
 */
export async function getTotalProductStock(
  productId: string,
  variationId?: string | null
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_total_product_stock', {
    p_product_id: productId,
    p_variation_id: variationId
  })

  if (error) {
    throw new Error(`Failed to get total stock: ${error.message}`)
  }

  return data || 0
}

/**
 * Get total available stock across all warehouses using database function
 */
export async function getTotalAvailableStock(
  productId: string,
  variationId?: string | null
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_total_available_stock', {
    p_product_id: productId,
    p_variation_id: variationId
  })

  if (error) {
    throw new Error(`Failed to get total available stock: ${error.message}`)
  }

  return data || 0
}

/**
 * Reserve stock for an order (reduces available stock without changing current stock)
 */
export async function reserveStock(
  productId: string,
  warehouseId: string,
  quantity: number,
  variationId?: string | null,
  referenceId?: string,
  createdBy?: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current stock data
  const currentStock = await getWarehouseStock(productId, warehouseId, variationId)
  
  if (!currentStock) {
    throw new Error('Product not found in warehouse')
  }

  if (currentStock.available_stock === null || currentStock.available_stock < quantity) {
    throw new Error('Insufficient available stock for reservation')
  }

  // Update reserved stock
  const { error } = await supabase
    .from('product_warehouse_stock')
    .update({
      reserved_stock: currentStock.reserved_stock + quantity,
      updated_at: new Date().toISOString()
    })
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .eq(variationId ? 'variation_id' : 'variation_id', variationId || null)

  if (error) {
    throw new Error(`Failed to reserve stock: ${error.message}`)
  }

  return true
}

/**
 * Release reserved stock (increases available stock without changing current stock)
 */
export async function releaseReservedStock(
  productId: string,
  warehouseId: string,
  quantity: number,
  variationId?: string | null,
  referenceId?: string,
  createdBy?: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current stock data
  const currentStock = await getWarehouseStock(productId, warehouseId, variationId)
  
  if (!currentStock) {
    throw new Error('Product not found in warehouse')
  }

  if (currentStock.reserved_stock < quantity) {
    throw new Error('Cannot release more stock than is reserved')
  }

  // Update reserved stock
  const { error } = await supabase
    .from('product_warehouse_stock')
    .update({
      reserved_stock: currentStock.reserved_stock - quantity,
      updated_at: new Date().toISOString()
    })
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .eq(variationId ? 'variation_id' : 'variation_id', variationId || null)

  if (error) {
    throw new Error(`Failed to release reserved stock: ${error.message}`)
  }

  return true
} 