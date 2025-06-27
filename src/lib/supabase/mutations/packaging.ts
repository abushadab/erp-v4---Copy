import { createClient, generateSequentialId } from './base'

// Packaging types
export interface CreatePackagingData {
  title: string
  description?: string
  type: 'simple' | 'variable'
  status: 'active' | 'inactive'
  sku?: string
  selectedAttributes?: string[]
  variations?: CreatePackagingVariationData[]
}

export interface UpdatePackagingData {
  id: string
  title: string
  description?: string
  status: 'active' | 'inactive'
  sku?: string
  selectedAttributes?: string[]
  variations?: UpdatePackagingVariationData[]
  newVariations?: CreatePackagingVariationData[]
}

export interface CreatePackagingVariationData {
  sku: string
  attributeValues: { [attributeId: string]: string }
}

export interface UpdatePackagingVariationData {
  id: string
  sku: string
  attributeValues: { [attributeId: string]: string }
}

export interface CreatePackagingAttributeData {
  name: string
  values: string[]
}

export interface UpdatePackagingAttributeData {
  id: string
  name: string
  values: string[]
}

export interface CreatePackagingAttributeValueData {
  attribute_id: string
  value: string
  label: string
  slug: string
  sort_order?: number
}

/**
 * Create a new packaging
 */
export async function createPackaging(data: CreatePackagingData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating packaging:', data)
  
  // Generate sequential packaging ID
  const packagingId = await generateSequentialId('packaging', 'PKG')
  
  const packagingData = {
    id: packagingId,
    title: data.title,
    description: data.description || null,
    type: data.type,
    status: data.status,
    sku: data.sku || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error: packagingError } = await supabase
    .from('packaging')
    .insert(packagingData)
  
  if (packagingError) {
    console.error('❌ Error creating packaging:', packagingError)
    throw new Error(`Failed to create packaging: ${packagingError.message}`)
  }
  
  // Add attributes if provided
  if (data.selectedAttributes && data.selectedAttributes.length > 0) {
    await updatePackagingAttributes(packagingId, data.selectedAttributes)
  }
  
  // Create variations if provided
  if (data.variations && data.variations.length > 0) {
    for (const variation of data.variations) {
      await createPackagingVariation({
        ...variation,
        packaging_id: packagingId
      })
    }
  }
  
  console.log('✅ Packaging created successfully')
  return packagingId
}

/**
 * Update packaging
 */
export async function updatePackaging(data: UpdatePackagingData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating packaging:', data)
  
  const updateData = {
    title: data.title,
    description: data.description || null,
    status: data.status,
    sku: data.sku || null,
    updated_at: new Date().toISOString()
  }
  
  const { error: packagingError } = await supabase
    .from('packaging')
    .update(updateData)
    .eq('id', data.id)
  
  if (packagingError) {
    console.error('❌ Error updating packaging:', packagingError)
    throw new Error(`Failed to update packaging: ${packagingError.message}`)
  }
  
  // Update attributes if provided
  if (data.selectedAttributes) {
    await updatePackagingAttributes(data.id, data.selectedAttributes)
  }
  
  console.log('✅ Packaging updated successfully')
}

/**
 * Delete packaging
 */
export async function deletePackaging(packagingId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting packaging:', packagingId)
  
  const { error } = await supabase
    .from('packaging')
    .delete()
    .eq('id', packagingId)
  
  if (error) {
    console.error('❌ Error deleting packaging:', error)
    throw new Error(`Failed to delete packaging: ${error.message}`)
  }
  
  console.log('✅ Packaging deleted successfully')
}

/**
 * Update packaging attributes
 */
export async function updatePackagingAttributes(packagingId: string, attributeIds: string[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating packaging attributes:', { packagingId, attributeIds })
  
  // Delete existing attributes
  const { error: deleteError } = await supabase
    .from('packaging_packaging_attributes')
    .delete()
    .eq('packaging_id', packagingId)
  
  if (deleteError) {
    console.error('❌ Error deleting packaging attributes:', deleteError)
    throw new Error(`Failed to delete packaging attributes: ${deleteError.message}`)
  }
  
  // Insert new attributes
  if (attributeIds.length > 0) {
    const attributeData = attributeIds.map(attributeId => ({
      packaging_id: packagingId,
      attribute_id: attributeId
    }))
    
    const { error: insertError } = await supabase
      .from('packaging_packaging_attributes')
      .insert(attributeData)
    
    if (insertError) {
      console.error('❌ Error inserting packaging attributes:', insertError)
      throw new Error(`Failed to insert packaging attributes: ${insertError.message}`)
    }
  }
  
  console.log('✅ Packaging attributes updated successfully')
}

/**
 * Create packaging variation with collision-resistant ID generation
 */
export async function createPackagingVariation(data: CreatePackagingVariationData & { packaging_id: string }): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating packaging variation:', data)
  
  const variationId = await generateSequentialId('packaging_variations', 'PVAR')
  
  const variationData = {
    id: variationId,
    packaging_id: data.packaging_id,
    sku: data.sku,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error: variationError } = await supabase
    .from('packaging_variations')
    .insert(variationData)
  
  if (variationError) {
    console.error('❌ Error creating packaging variation:', variationError)
    throw new Error(`Failed to create packaging variation: ${variationError.message}`)
  }
  
  // Insert variation attributes
  const attributeData = Object.entries(data.attributeValues).map(([attributeId, valueId]) => ({
    variation_id: variationId,
    attribute_id: attributeId,
    attribute_value_id: valueId
  }))
  
  if (attributeData.length > 0) {
    const { error: attributeError } = await supabase
      .from('packaging_variation_attributes')
      .insert(attributeData)
    
    if (attributeError) {
      console.error('❌ Error creating packaging variation attributes:', attributeError)
      // Clean up the variation if attributes creation failed
      await supabase.from('packaging_variations').delete().eq('id', variationId)
      throw new Error(`Failed to create packaging variation attributes: ${attributeError.message}`)
    }
  }
  
  console.log('✅ Packaging variation created successfully')
  return variationId
}

/**
 * Update packaging variation with improved transaction safety
 */
export async function updatePackagingVariation(data: UpdatePackagingVariationData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating packaging variation:', data)
  
  const updateData = {
    sku: data.sku,
    updated_at: new Date().toISOString()
  }
  
  const { error: variationError } = await supabase
    .from('packaging_variations')
    .update(updateData)
    .eq('id', data.id)
  
  if (variationError) {
    console.error('❌ Error updating packaging variation:', variationError)
    throw new Error(`Failed to update packaging variation: ${variationError.message}`)
  }
  
  // Store existing attributes before deletion for rollback purposes
  const { data: existingAttributes, error: fetchError } = await supabase
    .from('packaging_variation_attributes')
    .select('*')
    .eq('variation_id', data.id)
  
  if (fetchError) {
    console.error('❌ Error fetching existing packaging variation attributes:', fetchError)
    throw new Error(`Failed to fetch existing packaging variation attributes: ${fetchError.message}`)
  }
  
  // Update variation attributes
  // Delete existing attributes for this variation
  const { error: deleteError } = await supabase
    .from('packaging_variation_attributes')
    .delete()
    .eq('variation_id', data.id)
  
  if (deleteError) {
    console.error('❌ Error deleting packaging variation attributes:', deleteError)
    throw new Error(`Failed to delete packaging variation attributes: ${deleteError.message}`)
  }
  
  // Insert new attributes
  const attributeData = Object.entries(data.attributeValues).map(([attributeId, valueId]) => ({
    variation_id: data.id,
    attribute_id: attributeId,
    attribute_value_id: valueId
  }))
  
  if (attributeData.length > 0) {
    const { error: attributeError } = await supabase
      .from('packaging_variation_attributes')
      .insert(attributeData)
    
    if (attributeError) {
      console.error('❌ Error updating packaging variation attributes:', attributeError)
      
      // Attempt to restore original attributes if insert fails
      if (existingAttributes && existingAttributes.length > 0) {
        console.log('🔄 Attempting to restore original packaging variation attributes...')
        const { error: restoreError } = await supabase
          .from('packaging_variation_attributes')
          .insert(existingAttributes)
        
        if (restoreError) {
          console.error('💥 CRITICAL: Failed to restore original attributes:', restoreError)
          throw new Error(`Failed to update packaging variation attributes and restore failed: ${attributeError.message}. Original data may be lost.`)
        }
        
        console.log('✅ Original packaging variation attributes restored after update failure')
      }
      
      throw new Error(`Failed to update packaging variation attributes: ${attributeError.message}`)
    }
  }
  
  console.log('✅ Packaging variation updated successfully')
}

/**
 * Delete packaging variation
 */
export async function deletePackagingVariation(variationId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting packaging variation:', variationId)
  
  const { error } = await supabase
    .from('packaging_variations')
    .delete()
    .eq('id', variationId)
  
  if (error) {
    console.error('❌ Error deleting packaging variation:', error)
    throw new Error(`Failed to delete packaging variation: ${error.message}`)
  }
  
  console.log('✅ Packaging variation deleted successfully')
}

/**
 * Create packaging attribute with collision-resistant ID generation
 */
export async function createPackagingAttribute(attributeData: CreatePackagingAttributeData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating packaging attribute:', attributeData)
  
  const attributeId = await generateSequentialId('packaging_attributes', 'PATTR')
  
  const insertData = {
    id: attributeId,
    name: attributeData.name,
    slug: attributeData.name.toLowerCase().replace(/\s+/g, '-'),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error: attributeError } = await supabase
    .from('packaging_attributes')
    .insert(insertData)
  
  if (attributeError) {
    console.error('❌ Error creating packaging attribute:', attributeError)
    throw new Error(`Failed to create packaging attribute: ${attributeError.message}`)
  }
  
  // Create attribute values
  if (attributeData.values && attributeData.values.length > 0) {
    await updatePackagingAttributeValues(attributeId, attributeData.values)
  }
  
  console.log('✅ Packaging attribute created successfully')
  return attributeId
}

/**
 * Update packaging attribute values with improved transaction safety
 */
export async function updatePackagingAttributeValues(attributeId: string, values: string[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating packaging attribute values:', { attributeId, values })
  
  // Store existing values before deletion for rollback purposes
  const { data: existingValues, error: fetchError } = await supabase
    .from('packaging_attribute_values')
    .select('*')
    .eq('attribute_id', attributeId)
  
  if (fetchError) {
    console.error('❌ Error fetching existing packaging attribute values:', fetchError)
    throw new Error(`Failed to fetch existing packaging attribute values: ${fetchError.message}`)
  }
  
  // Delete existing values
  const { error: deleteError } = await supabase
    .from('packaging_attribute_values')
    .delete()
    .eq('attribute_id', attributeId)
  
  if (deleteError) {
    console.error('❌ Error deleting packaging attribute values:', deleteError)
    throw new Error(`Failed to delete packaging attribute values: ${deleteError.message}`)
  }
  
  // Insert new values with collision-resistant IDs
  if (values.length > 0) {
    const insertData = values.map((value, index) => ({
      id: `PVAL${Date.now() + index}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      attribute_id: attributeId,
      value: value,
      label: value,
      slug: value.toLowerCase().replace(/\s+/g, '-'),
      sort_order: index,
      created_at: new Date().toISOString()
    }))
    
    const { error: insertError } = await supabase
      .from('packaging_attribute_values')
      .insert(insertData)
    
    if (insertError) {
      console.error('❌ Error inserting packaging attribute values:', insertError)
      
      // Attempt to restore original values if insert fails
      if (existingValues && existingValues.length > 0) {
        console.log('🔄 Attempting to restore original packaging attribute values...')
        const { error: restoreError } = await supabase
          .from('packaging_attribute_values')
          .insert(existingValues)
        
        if (restoreError) {
          console.error('💥 CRITICAL: Failed to restore original values:', restoreError)
          throw new Error(`Failed to insert packaging attribute values and restore failed: ${insertError.message}. Original data may be lost.`)
        }
        
        console.log('✅ Original packaging attribute values restored after insert failure')
      }
      
      throw new Error(`Failed to insert packaging attribute values: ${insertError.message}`)
    }
  }
  
  console.log('✅ Packaging attribute values updated successfully')
} 