import { createClient } from '../client'
import type { Database } from '../types/index'

// Re-export for convenience
export { createClient }
export type { Database }

// Common database table types
export type Tables = Database['public']['Tables']

// Common utility function for generating sequential IDs
export async function generateSequentialId(
  tableName: string,
  prefix: string
): Promise<string> {
  const supabase = createClient()
  
  const { data: existingRecords, error: countError } = await supabase
    .from(tableName as any)
    .select('id')
    .like('id', `${prefix}_%`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (countError) {
    console.error(`Error getting ${tableName} count:`, countError)
    throw new Error(`Failed to generate ${tableName} ID: ${countError.message}`)
  }

  // Extract the highest number from existing records
  let nextNumber = 1
  if (existingRecords && existingRecords.length > 0) {
    const lastRecord = existingRecords[0]
    // Escape special regex characters to prevent ReDoS attacks
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = lastRecord.id.match(new RegExp(`^${escapedPrefix}_(\\d+)$`))
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    } else {
      // If there are non-sequential IDs, count all records and add 1
      const { count } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact', head: true })
      
      nextNumber = (count || 0) + 1
    }
  }

  return `${prefix}_${nextNumber}`
}

// Common utility for SKU validation
export async function checkSkuExists(sku: string, excludeProductId?: string): Promise<boolean> {
  const supabase = createClient()
  
  let query = supabase
    .from('products')
    .select('id')
    .eq('sku', sku)
  
  if (excludeProductId) {
    query = query.neq('id', excludeProductId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error checking SKU:', error)
    throw new Error(`Failed to check SKU: ${error.message}`)
  }
  
  return data && data.length > 0
}

export async function checkPackagingSkuExists(sku: string, excludePackagingId?: string): Promise<boolean> {
  const supabase = createClient()
  
  // Check main packaging table
  let packagingQuery = supabase
    .from('packaging')
    .select('id')
    .eq('sku', sku)
  
  if (excludePackagingId) {
    packagingQuery = packagingQuery.neq('id', excludePackagingId)
  }
  
  const { data: packagingData, error: packagingError } = await packagingQuery
  
  if (packagingError) {
    console.error('Error checking packaging SKU:', packagingError)
    throw new Error(`Failed to check packaging SKU: ${packagingError.message}`)
  }
  
  if (packagingData && packagingData.length > 0) {
    return true
  }
  
  // Check packaging variations table
  const { data: variationData, error: variationError } = await supabase
    .from('packaging_variations')
    .select('id')
    .eq('sku', sku)
  
  if (variationError) {
    console.error('Error checking packaging variation SKU:', variationError)
    throw new Error(`Failed to check packaging variation SKU: ${variationError.message}`)
  }
  
  return variationData && variationData.length > 0
} 