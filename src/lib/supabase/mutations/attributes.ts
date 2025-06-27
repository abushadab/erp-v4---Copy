import { createClient, generateSequentialId } from './base'

// Attribute types
export interface CreateAttributeData {
  name: string
  type: string
  required: boolean
}

export interface UpdateAttributeData {
  id: string
  name: string
  type: string
  required: boolean
}

export interface CreateAttributeValueData {
  attribute_id: string
  value: string
  label: string
  sort_order?: number
}

/**
 * Create a new attribute
 */
export async function createAttribute(attributeData: CreateAttributeData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating attribute:', attributeData)
  
  const attributeId = await generateSequentialId('attributes', 'ATTR')
  
  const insertData = {
    id: attributeId,
    name: attributeData.name,
    type: attributeData.type,
    required: attributeData.required,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('attributes')
    .insert(insertData)
  
  if (error) {
    console.error('❌ Error creating attribute:', error)
    throw new Error(`Failed to create attribute: ${error.message}`)
  }
  
  console.log('✅ Attribute created successfully')
  return attributeId
}

/**
 * Update an attribute
 */
export async function updateAttribute(attributeData: UpdateAttributeData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating attribute:', attributeData)
  
  const updateData = {
    name: attributeData.name,
    type: attributeData.type,
    required: attributeData.required,
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('attributes')
    .update(updateData)
    .eq('id', attributeData.id)
  
  if (error) {
    console.error('❌ Error updating attribute:', error)
    throw new Error(`Failed to update attribute: ${error.message}`)
  }
  
  console.log('✅ Attribute updated successfully')
}

/**
 * Delete an attribute
 */
export async function deleteAttribute(attributeId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting attribute:', attributeId)
  
  // Check if attribute is being used by products
  const { data: productAttributes, error: productError } = await supabase
    .from('product_attributes')
    .select('product_id')
    .eq('attribute_id', attributeId)
    .limit(1)
  
  if (productError) {
    console.error('❌ Error checking product attributes:', productError)
    throw new Error(`Failed to check product attributes: ${productError.message}`)
  }
  
  if (productAttributes && productAttributes.length > 0) {
    throw new Error('Cannot delete attribute that is being used by products. Please remove the attribute from all products first.')
  }
  
  const { error } = await supabase
    .from('attributes')
    .delete()
    .eq('id', attributeId)
  
  if (error) {
    console.error('❌ Error deleting attribute:', error)
    throw new Error(`Failed to delete attribute: ${error.message}`)
  }
  
  console.log('✅ Attribute deleted successfully')
}

/**
 * Create attribute values
 */
export async function createAttributeValues(values: CreateAttributeValueData[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🏗️ Creating attribute values:', values)
  
  // Generate unique IDs for each value to prevent collisions
  const insertData = await Promise.all(values.map(async (value, index) => ({
    id: `VAL${Date.now() + index}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    attribute_id: value.attribute_id,
    value: value.value,
    label: value.label,
    sort_order: value.sort_order || 0,
    created_at: new Date().toISOString()
  })))
  
  const { error } = await supabase
    .from('attribute_values')
    .insert(insertData)
  
  if (error) {
    console.error('❌ Error creating attribute values:', error)
    throw new Error(`Failed to create attribute values: ${error.message}`)
  }
  
  console.log('✅ Attribute values created successfully')
}

/**
 * Update attribute values for an attribute with improved transaction safety
 */
export async function updateAttributeValues(attributeId: string, values: CreateAttributeValueData[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating attribute values for attribute:', attributeId)
  
  // Store existing values before deletion for rollback purposes
  const { data: existingValues, error: fetchError } = await supabase
    .from('attribute_values')
    .select('*')
    .eq('attribute_id', attributeId)
  
  if (fetchError) {
    console.error('❌ Error fetching existing attribute values:', fetchError)
    throw new Error(`Failed to fetch existing attribute values: ${fetchError.message}`)
  }
  
  // Delete existing values
  const { error: deleteError } = await supabase
    .from('attribute_values')
    .delete()
    .eq('attribute_id', attributeId)
  
  if (deleteError) {
    console.error('❌ Error deleting attribute values:', deleteError)
    throw new Error(`Failed to delete attribute values: ${deleteError.message}`)
  }
  
  // Insert new values with collision-resistant IDs
  if (values.length > 0) {
    const insertData = await Promise.all(values.map(async (value, index) => ({
      id: `VAL${Date.now() + index}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      attribute_id: attributeId,
      value: value.value,
      label: value.label,
      sort_order: value.sort_order || 0,
      created_at: new Date().toISOString()
    })))
    
    const { error: insertError } = await supabase
      .from('attribute_values')
      .insert(insertData)
    
    if (insertError) {
      console.error('❌ Error inserting attribute values:', insertError)
      
      // Attempt to restore original values if insert fails
      if (existingValues && existingValues.length > 0) {
        console.log('🔄 Attempting to restore original attribute values...')
        const { error: restoreError } = await supabase
          .from('attribute_values')
          .insert(existingValues)
        
        if (restoreError) {
          console.error('💥 CRITICAL: Failed to restore original values:', restoreError)
          throw new Error(`Failed to insert attribute values and restore failed: ${insertError.message}. Original data may be lost.`)
        }
        
        console.log('✅ Original attribute values restored after insert failure')
      }
      
      throw new Error(`Failed to insert attribute values: ${insertError.message}`)
    }
  }
  
  console.log('✅ Attribute values updated successfully')
} 