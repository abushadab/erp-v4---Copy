import { createClient } from './base'

// Supplier types
export interface CreateSupplierData {
  name: string
  email?: string
  phone?: string
  address?: string
  status: 'active' | 'inactive'
}

export interface UpdateSupplierData {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  status: 'active' | 'inactive'
}

/**
 * Create a new supplier
 */
export async function createSupplier(data: CreateSupplierData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating supplier:', data)
  
  // Generate a unique ID
  const supplierId = `SUP${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
  
  const supplierData = {
    id: supplierId,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    status: data.status,
    join_date: new Date().toISOString().split('T')[0],
    total_purchases: 0,
    total_spent: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { data: insertResult, error } = await supabase
    .from('suppliers')
    .insert(supplierData)
    .select()
  
  if (error) {
    console.error('❌ Error creating supplier:', error)
    throw new Error(`Failed to create supplier: ${error.message}`)
  }
  
  console.log('✅ Supplier created successfully:', insertResult)
  return supplierId
}

/**
 * Update a supplier
 */
export async function updateSupplier(data: UpdateSupplierData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating supplier:', data)
  
  const updateData = {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    status: data.status,
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('suppliers')
    .update(updateData)
    .eq('id', data.id)
  
  if (error) {
    console.error('❌ Error updating supplier:', error)
    throw new Error(`Failed to update supplier: ${error.message}`)
  }
  
  console.log('✅ Supplier updated successfully')
} 