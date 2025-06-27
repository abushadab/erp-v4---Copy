import { createClient, generateSequentialId } from './base'
import { invalidateWarehousesCache } from '../queries'

// Warehouse types
export interface CreateWarehouseData {
  name: string
  location?: string
  address?: string
  manager?: string
  contact?: string
  capacity?: number
  status?: 'active' | 'inactive' // Optional since we always start as inactive
}

export interface UpdateWarehouseData extends CreateWarehouseData {
  id: string
}

/**
 * Create a new warehouse in the database
 */
export async function createWarehouse(data: CreateWarehouseData): Promise<string> {
  const supabase = createClient()

  console.log('🏗️ Creating warehouse with data:', data)

  // Generate sequential warehouse ID
  const warehouseId = await generateSequentialId('warehouses', 'WH')

  const warehouseData = {
    id: warehouseId,
    name: data.name,
    location: data.location || null,
    address: data.address || null,
    manager: data.manager || null,
    contact: data.contact || null,
    capacity: data.capacity || null,
    status: 'inactive', // Always start as inactive
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  console.log('📝 Insert payload:', warehouseData)

  const { data: result, error } = await supabase
    .from('warehouses')
    .insert(warehouseData)
    .select()

  console.log('✅ Insert result:', result)
  
  if (error) {
    console.error('❌ Error creating warehouse:', error)
    throw new Error(`Failed to create warehouse: ${error.message}`)
  }

  // Invalidate cache
  invalidateWarehousesCache()

  console.log('🎉 Warehouse created successfully:', result)
  return warehouseId
}

/**
 * Delete a warehouse from the database
 */
export async function deleteWarehouse(warehouseId: string): Promise<void> {
  const supabase = createClient()

  console.log('🗑️ Deleting warehouse:', warehouseId)

  // Check if the warehouse has any stock or is being used
  const { data: stockData, error: stockError } = await supabase
    .from('product_warehouse_stock')
    .select('id')
    .eq('warehouse_id', warehouseId)
    .limit(1)

  if (stockError) {
    console.error('❌ Error checking warehouse stock:', stockError)
    throw new Error(`Failed to check warehouse stock: ${stockError.message}`)
  }

  if (stockData && stockData.length > 0) {
    throw new Error('Cannot delete warehouse that contains stock. Please transfer stock to another warehouse first.')
  }

  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', warehouseId)

  if (error) {
    console.error('❌ Error deleting warehouse:', error)
    throw new Error(`Failed to delete warehouse: ${error.message}`)
  }

  // Invalidate cache
  invalidateWarehousesCache()

  console.log('✅ Warehouse deleted successfully')
}

/**
 * Activate a warehouse
 */
export async function activateWarehouse(warehouseId: string): Promise<void> {
  const supabase = createClient()

  console.log('✅ Activating warehouse:', warehouseId)

  const { error } = await supabase
    .from('warehouses')
    .update({ 
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', warehouseId)

  if (error) {
    console.error('❌ Error activating warehouse:', error)
    throw new Error(`Failed to activate warehouse: ${error.message}`)
  }

  // Invalidate cache
  invalidateWarehousesCache()

  console.log('✅ Warehouse activated successfully')
}

/**
 * Update a warehouse in the database
 */
export async function updateWarehouse(data: UpdateWarehouseData): Promise<void> {
  const supabase = createClient()

  console.log('🔄 Updating warehouse with data:', data)

  const updateData = {
    name: data.name,
    location: data.location || null,
    address: data.address || null,
    manager: data.manager || null,
    contact: data.contact || null,
    capacity: data.capacity || null,
    status: data.status || 'inactive',
    updated_at: new Date().toISOString()
  }

  console.log('📝 Update payload:', updateData)

  const { data: result, error } = await supabase
    .from('warehouses')
    .update(updateData)
    .eq('id', data.id)
    .select()

  console.log('✅ Update result:', result)
  
  if (error) {
    console.error('❌ Error updating warehouse:', error)
    throw new Error(`Failed to update warehouse: ${error.message}`)
  }

  // Invalidate cache
  invalidateWarehousesCache()

  console.log('🎉 Warehouse updated successfully:', result)
} 