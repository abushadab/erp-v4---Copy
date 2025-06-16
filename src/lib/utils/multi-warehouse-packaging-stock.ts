import { createClient } from '@/lib/supabase/client'
import type { Warehouse } from '@/lib/utils/multi-warehouse-stock'

export interface PackagingWarehouseStock {
  id: string
  packaging_id: string
  warehouse_id: string
  variation_id?: string | null
  current_stock: number
  reserved_stock: number
  available_stock: number
  buying_price?: number | null
  bought_quantity?: number | null
  last_movement_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface PackagingStockSummary {
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

export interface PackagingStockUpdateParams {
  packagingId: string
  warehouseId: string
  variationId?: string | null
  quantityChange: number
  movementType: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return'
  referenceId?: string | null
  reason?: string | null
  createdBy?: string | null
  notes?: string | null
}

export interface PackagingStockTransferParams {
  packagingId: string
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
 * Get stock summary for packaging across all warehouses
 */
export async function getPackagingStockSummary(
  packagingId: string,
  variationId?: string | null
): Promise<PackagingStockSummary> {
  const supabase = createClient()

  console.log('🔍 getPackagingStockSummary: Called with packagingId:', packagingId, 'variationId:', variationId)

  let query = supabase
    .from('packaging_warehouse_stock')
    .select(`
      *,
      warehouses:warehouse_id (*)
    `)
    .eq('packaging_id', packagingId)

  // Handle variation_id filtering correctly
  if (variationId) {
    // Get stock for specific variation
    query = query.eq('variation_id', variationId)
  } else {
    // When no variationId is specified, get all stock for the packaging
    // This handles both:
    // - Simple packaging: stock records with variation_id = null
    // - Variable packaging: all stock records for all variations
    console.log('🔍 getPackagingStockSummary: Getting all stock records for packaging (no variation filter)')
    // Don't add any variation_id filter - get all stock for this packaging
  }

  const { data: stockData, error } = await query

  console.log('🔍 getPackagingStockSummary: Query result:', { data: stockData, error })

  if (error) {
    throw new Error(`Failed to fetch packaging stock summary: ${error.message}`)
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
 * Get stock for a specific packaging in a specific warehouse
 */
export async function getPackagingWarehouseStock(
  packagingId: string,
  warehouseId: string,
  variationId?: string | null
): Promise<PackagingWarehouseStock | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('packaging_warehouse_stock')
    .select('*')
    .eq('packaging_id', packagingId)
    .eq('warehouse_id', warehouseId)
    .eq(variationId ? 'variation_id' : 'variation_id', variationId || null)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new Error(`Failed to fetch packaging warehouse stock: ${error.message}`)
  }

  return data
}

/**
 * Update packaging stock using the database function
 */
export async function updatePackagingWarehouseStock(params: PackagingStockUpdateParams): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('update_packaging_warehouse_stock', {
    p_packaging_id: params.packagingId,
    p_warehouse_id: params.warehouseId,
    p_quantity_change: params.quantityChange,
    p_variation_id: params.variationId,
    p_movement_type: params.movementType,
    p_reference_id: params.referenceId,
    p_reason: params.reason,
    p_created_by: params.createdBy,
    p_notes: params.notes
  })

  if (error) {
    throw new Error(`Failed to update packaging warehouse stock: ${error.message}`)
  }

  return data
}

/**
 * Transfer packaging stock between warehouses
 */
export async function transferPackagingStockBetweenWarehouses(params: PackagingStockTransferParams): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('transfer_packaging_stock_between_warehouses', {
    p_packaging_id: params.packagingId,
    p_from_warehouse_id: params.fromWarehouseId,
    p_to_warehouse_id: params.toWarehouseId,
    p_quantity: params.quantity,
    p_variation_id: params.variationId,
    p_reference_id: params.referenceId,
    p_reason: params.reason || 'Warehouse Transfer',
    p_created_by: params.createdBy,
    p_notes: params.notes
  })

  if (error) {
    throw new Error(`Failed to transfer packaging stock: ${error.message}`)
  }

  return data
}

/**
 * Get total packaging stock across all warehouses using database function
 */
export async function getTotalPackagingStockDB(
  packagingId: string,
  variationId?: string | null
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_total_packaging_stock', {
    p_packaging_id: packagingId,
    p_variation_id: variationId
  })

  if (error) {
    throw new Error(`Failed to get total packaging stock: ${error.message}`)
  }

  return data || 0
}

/**
 * Get total available packaging stock across all warehouses using database function
 */
export async function getTotalAvailablePackagingStock(
  packagingId: string,
  variationId?: string | null
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_total_available_packaging_stock', {
    p_packaging_id: packagingId,
    p_variation_id: variationId
  })

  if (error) {
    throw new Error(`Failed to get total available packaging stock: ${error.message}`)
  }

  return data || 0
}

/**
 * Reserve packaging stock for an order (reduces available stock without changing current stock)
 */
export async function reservePackagingStock(
  packagingId: string,
  warehouseId: string,
  quantity: number,
  variationId?: string | null,
  referenceId?: string,
  createdBy?: string
): Promise<boolean> {
  const supabase = createClient()

  // Get current stock data
  const currentStock = await getPackagingWarehouseStock(packagingId, warehouseId, variationId)
  
  if (!currentStock) {
    throw new Error('Packaging not found in warehouse')
  }

  if (currentStock.available_stock === null || currentStock.available_stock < quantity) {
    throw new Error('Insufficient available packaging stock for reservation')
  }

  // Update reserved stock
  const { error } = await supabase
    .from('packaging_warehouse_stock')
    .update({
      reserved_stock: currentStock.reserved_stock + quantity,
      updated_at: new Date().toISOString()
    })
    .eq('packaging_id', packagingId)
    .eq('warehouse_id', warehouseId)
    .eq(variationId ? 'variation_id' : 'variation_id', variationId || null)

  if (error) {
    throw new Error(`Failed to reserve packaging stock: ${error.message}`)
  }

  return true
} 