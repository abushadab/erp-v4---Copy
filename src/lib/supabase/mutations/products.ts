import { createClient, generateSequentialId, type Tables } from './base'

// Product types
export interface CreateProductData {
  name: string
  description: string
  category_id?: string
  status: 'active' | 'inactive'
  type: 'simple' | 'variation'
  sku?: string
  price?: number
  image_url?: string
  parent_sku?: string
}

export interface UpdateProductData {
  id: string
  name: string
  description: string
  category_id?: string
  status: 'active' | 'inactive'
  type: 'simple' | 'variation'
  sku?: string
  price?: number
  image_url?: string
  parent_sku?: string
}

export interface UpdateProductVariationData {
  id: string
  sku: string
  price: number
  attribute_values: { [attributeId: string]: string }
}

export interface CreateProductVariationData {
  product_id: string
  sku: string
  price: number
  attribute_values: { [attributeId: string]: string }
}

type ProductInsert = Tables['products']['Insert']
type ProductUpdate = Tables['products']['Update']
type ProductVariationInsert = Tables['product_variations']['Insert']
type ProductVariationUpdate = Tables['product_variations']['Update']

/**
 * Create a new product in the database
 */
export async function createProduct(data: CreateProductData): Promise<string> {
  const supabase = createClient()

  console.log('🏗️ Creating product with data:', data)

  // Generate sequential product ID
  const productId = await generateSequentialId('products', 'PROD')

  const insertData: ProductInsert = {
    id: productId,
    name: data.name,
    description: data.description,
    category_id: data.category_id || null,
    status: data.status,
    type: data.type,
    sku: data.sku,
    price: data.price,
    image_url: data.image_url,
    parent_sku: data.parent_sku
  }

  console.log('📝 Insert payload:', insertData)

  const { data: result, error } = await supabase
    .from('products')
    .insert(insertData)
    .select()

  console.log('✅ Insert result:', result)
  
  if (error) {
    console.error('❌ Error creating product:', error)
    throw new Error(`Failed to create product: ${error.message}`)
  }

  console.log('🎉 Product created successfully:', result)
  return productId
}

/**
 * Update a product in the database
 */
export async function updateProduct(data: UpdateProductData): Promise<void> {
  const supabase = createClient()

  console.log('🔄 Updating product with data:', data)

  const updateData: ProductUpdate = {
    name: data.name,
    description: data.description,
    category_id: data.category_id || null,
    status: data.status,
    sku: data.sku,
    price: data.price,
    image_url: data.image_url,
    parent_sku: data.parent_sku,
    updated_at: new Date().toISOString()
  }

  console.log('📝 Update payload:', updateData)

  const { data: result, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', data.id)
    .select()

  console.log('✅ Update result:', result)
  
  if (error) {
    console.error('❌ Error updating product:', error)
    throw new Error(`Failed to update product: ${error.message}`)
  }

  console.log('🎉 Product updated successfully:', result)
}

/**
 * Update product attributes with improved transaction safety
 */
export async function updateProductAttributes(productId: string, attributeIds: string[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating product attributes:', { productId, attributeIds })
  
  // Store existing attributes before deletion for rollback purposes
  const { data: existingAttributes, error: fetchError } = await supabase
    .from('product_attributes')
    .select('*')
    .eq('product_id', productId)
  
  if (fetchError) {
    console.error('❌ Error fetching existing product attributes:', fetchError)
    throw new Error(`Failed to fetch existing product attributes: ${fetchError.message}`)
  }
  
  // Delete existing attributes
  const { error: deleteError } = await supabase
    .from('product_attributes')
    .delete()
    .eq('product_id', productId)
  
  if (deleteError) {
    console.error('❌ Error deleting product attributes:', deleteError)
    throw new Error(`Failed to delete product attributes: ${deleteError.message}`)
  }
  
  // Insert new attributes
  if (attributeIds.length > 0) {
    const attributeData = attributeIds.map(attributeId => ({
      product_id: productId,
      attribute_id: attributeId
    }))
    
    const { error: insertError } = await supabase
      .from('product_attributes')
      .insert(attributeData)
    
    if (insertError) {
      console.error('❌ Error inserting product attributes:', insertError)
      
      // Attempt to restore original attributes if insert fails
      if (existingAttributes && existingAttributes.length > 0) {
        console.log('🔄 Attempting to restore original product attributes...')
        const { error: restoreError } = await supabase
          .from('product_attributes')
          .insert(existingAttributes)
        
        if (restoreError) {
          console.error('💥 CRITICAL: Failed to restore original attributes:', restoreError)
          throw new Error(`Failed to insert product attributes and restore failed: ${insertError.message}. Original data may be lost.`)
        }
        
        console.log('✅ Original product attributes restored after insert failure')
      }
      
      throw new Error(`Failed to insert product attributes: ${insertError.message}`)
    }
  }
  
  console.log('✅ Product attributes updated successfully')
}

/**
 * Create a new product variation with collision-resistant ID generation
 */
export async function createProductVariation(data: CreateProductVariationData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating product variation:', data)
  
  // Generate a collision-resistant ID for the variation
  const variationId = await generateSequentialId('product_variations', 'VAR')
  
  const variationData: ProductVariationInsert = {
    id: variationId,
    product_id: data.product_id,
    sku: data.sku,
    price: data.price,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error: variationError } = await supabase
    .from('product_variations')
    .insert(variationData)
  
  if (variationError) {
    console.error('❌ Error creating product variation:', variationError)
    throw new Error(`Failed to create product variation: ${variationError.message}`)
  }
  
  // Insert variation attributes
  const attributeData = Object.entries(data.attribute_values).map(([attributeId, valueId]) => ({
    variation_id: variationId,
    attribute_id: attributeId,
    attribute_value_id: valueId
  }))
  
  if (attributeData.length > 0) {
    const { error: attributeError } = await supabase
      .from('product_variation_attributes')
      .insert(attributeData)
    
    if (attributeError) {
      console.error('❌ Error creating product variation attributes:', attributeError)
      // Clean up the variation if attributes creation failed
      await supabase.from('product_variations').delete().eq('id', variationId)
      throw new Error(`Failed to create product variation attributes: ${attributeError.message}`)
    }
  }
  
  console.log('✅ Product variation created successfully')
  return variationId
}

/**
 * Update a product variation with improved transaction safety
 */
export async function updateProductVariation(data: UpdateProductVariationData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating product variation:', data)
  
  const updateData: ProductVariationUpdate = {
    sku: data.sku,
    price: data.price,
    updated_at: new Date().toISOString()
  }
  
  const { error: variationError } = await supabase
    .from('product_variations')
    .update(updateData)
    .eq('id', data.id)
  
  if (variationError) {
    console.error('❌ Error updating product variation:', variationError)
    throw new Error(`Failed to update product variation: ${variationError.message}`)
  }
  
  // Store existing attributes before deletion for rollback purposes
  const { data: existingAttributes, error: fetchError } = await supabase
    .from('product_variation_attributes')
    .select('*')
    .eq('variation_id', data.id)
  
  if (fetchError) {
    console.error('❌ Error fetching existing variation attributes:', fetchError)
    throw new Error(`Failed to fetch existing variation attributes: ${fetchError.message}`)
  }
  
  // Update variation attributes
  // Delete existing attributes for this variation
  const { error: deleteError } = await supabase
    .from('product_variation_attributes')
    .delete()
    .eq('variation_id', data.id)
  
  if (deleteError) {
    console.error('❌ Error deleting product variation attributes:', deleteError)
    throw new Error(`Failed to delete product variation attributes: ${deleteError.message}`)
  }
  
  // Insert new attributes
  const attributeData = Object.entries(data.attribute_values).map(([attributeId, valueId]) => ({
    variation_id: data.id,
    attribute_id: attributeId,
    attribute_value_id: valueId
  }))
  
  if (attributeData.length > 0) {
    const { error: attributeError } = await supabase
      .from('product_variation_attributes')
      .insert(attributeData)
    
    if (attributeError) {
      console.error('❌ Error updating product variation attributes:', attributeError)
      
      // Attempt to restore original attributes if insert fails
      if (existingAttributes && existingAttributes.length > 0) {
        console.log('🔄 Attempting to restore original variation attributes...')
        const { error: restoreError } = await supabase
          .from('product_variation_attributes')
          .insert(existingAttributes)
        
        if (restoreError) {
          console.error('💥 CRITICAL: Failed to restore original attributes:', restoreError)
          throw new Error(`Failed to update variation attributes and restore failed: ${attributeError.message}. Original data may be lost.`)
        }
        
        console.log('✅ Original variation attributes restored after update failure')
      }
      
      throw new Error(`Failed to update product variation attributes: ${attributeError.message}`)
    }
  }
  
  console.log('✅ Product variation updated successfully')
}

/**
 * Delete a product variation
 */
export async function deleteProductVariation(variationId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting product variation:', variationId)
  
  const { error } = await supabase
    .from('product_variations')
    .delete()
    .eq('id', variationId)
  
  if (error) {
    console.error('❌ Error deleting product variation:', error)
    throw new Error(`Failed to delete product variation: ${error.message}`)
  }
  
  console.log('✅ Product variation deleted successfully')
}

/**
 * Create a complete product with variations and attributes
 * Improved with transaction-like behavior and rollback capabilities
 */
export async function createCompleteProduct(
  productData: CreateProductData,
  variations?: CreateProductVariationData[],
  attributeIds?: string[]
): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating complete product:', { productData, variations, attributeIds })
  
  let productId: string | null = null
  const createdVariationIds: string[] = []
  
  try {
    // Create the main product
    productId = await createProduct(productData)
    
    // Add attributes if provided
    if (attributeIds && attributeIds.length > 0) {
      await updateProductAttributes(productId, attributeIds)
    }
    
    // Create variations if provided
    if (variations && variations.length > 0) {
      for (const variation of variations) {
        const variationId = await createProductVariation({
          ...variation,
          product_id: productId
        })
        createdVariationIds.push(variationId)
      }
    }
    
    console.log('✅ Complete product created successfully')
    return productId
  } catch (error) {
    console.error('❌ Error creating complete product, attempting rollback:', error)
    
    // Rollback: Clean up created variations
    if (createdVariationIds.length > 0) {
      console.log('🔄 Rolling back created variations...')
      for (const variationId of createdVariationIds) {
        try {
          await deleteProductVariation(variationId)
        } catch (rollbackError) {
          console.error('💥 Failed to rollback variation:', variationId, rollbackError)
        }
      }
    }
    
    // Rollback: Clean up created product if it exists
    if (productId) {
      console.log('🔄 Rolling back created product...')
      try {
        await supabase.from('products').delete().eq('id', productId)
      } catch (rollbackError) {
        console.error('💥 Failed to rollback product:', productId, rollbackError)
      }
    }
    
    throw error
  }
}

/**
 * Update a complete product with variations and attributes
 */
export async function updateCompleteProduct(
  productData: UpdateProductData,
  variations?: UpdateProductVariationData[],
  newVariations?: CreateProductVariationData[],
  attributeIds?: string[]
): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating complete product:', { productData, variations, newVariations, attributeIds })
  
  try {
    // Update the main product
    await updateProduct(productData)
    
    // Update attributes if provided
    if (attributeIds) {
      await updateProductAttributes(productData.id, attributeIds)
    }
    
    // Update existing variations if provided
    if (variations && variations.length > 0) {
      for (const variation of variations) {
        await updateProductVariation(variation)
      }
    }
    
    // Create new variations if provided
    if (newVariations && newVariations.length > 0) {
      for (const variation of newVariations) {
        await createProductVariation({
          ...variation,
          product_id: productData.id
        })
      }
    }
    
    console.log('✅ Complete product updated successfully')
  } catch (error) {
    console.error('❌ Error updating complete product:', error)
    throw error
  }
} 