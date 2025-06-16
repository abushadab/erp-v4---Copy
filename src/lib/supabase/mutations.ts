import { createClient } from './client'
import type { Database } from './types'

type Tables = Database['public']['Tables']
type ProductInsert = Tables['products']['Insert']
type ProductUpdate = Tables['products']['Update']
type ProductVariationInsert = Tables['product_variations']['Insert']
type ProductVariationUpdate = Tables['product_variations']['Update']

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

/**
 * Create a new product in the database
 */
export async function createProduct(data: CreateProductData): Promise<string> {
  const supabase = createClient()

  console.log('🏗️ Creating product with data:', data)

  // Generate sequential product ID
  const { data: existingProducts, error: countError } = await supabase
    .from('products')
    .select('id')
    .like('id', 'PROD_%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (countError) {
    console.error('Error getting product count:', countError)
    throw new Error(`Failed to generate product ID: ${countError.message}`)
  }

  // Extract the highest number from existing products
  let nextNumber = 1
  if (existingProducts && existingProducts.length > 0) {
    const lastProduct = existingProducts[0]
    const match = lastProduct.id.match(/^PROD_(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    } else {
      // If there are non-sequential IDs, count all products and add 1
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
      
      nextNumber = (count || 0) + 1
    }
  }

  const productId = `PROD_${nextNumber}`

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
  const { data: existingWarehouses, error: countError } = await supabase
    .from('warehouses')
    .select('id')
    .like('id', 'WH_%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (countError) {
    console.error('Error getting warehouse count:', countError)
    throw new Error(`Failed to generate warehouse ID: ${countError.message}`)
  }

  // Extract the highest number from existing warehouses
  let nextNumber = 1
  if (existingWarehouses && existingWarehouses.length > 0) {
    const lastWarehouse = existingWarehouses[0]
    const match = lastWarehouse.id.match(/^WH_(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    } else {
      // If there are non-sequential IDs, count all warehouses and add 1
      const { count } = await supabase
        .from('warehouses')
        .select('*', { count: 'exact', head: true })
      
      nextNumber = (count || 0) + 1
    }
  }

  const warehouseId = `WH_${nextNumber}`

  const insertData = {
    id: warehouseId,
    name: data.name,
    location: data.location,
    address: data.address,
    manager: data.manager,
    contact: data.contact,
    capacity: data.capacity || 0,
    current_stock: 0, // Start with 0 stock
    status: 'inactive' as const // Always start as inactive
  }

  console.log('📝 Insert payload:', insertData)

  const { data: result, error } = await supabase
    .from('warehouses')
    .insert(insertData)
    .select()

  console.log('✅ Insert result:', result)
  
  if (error) {
    console.error('❌ Error creating warehouse:', error)
    throw new Error(`Failed to create warehouse: ${error.message}`)
  }

  console.log('🎉 Warehouse created successfully:', result)
  return warehouseId
}

/**
 * Delete a warehouse from the database
 */
export async function deleteWarehouse(warehouseId: string): Promise<void> {
  const supabase = createClient()

  console.log('🗑️ Deleting warehouse:', warehouseId)

  // First check if warehouse has any products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('warehouse_id', warehouseId)
    .limit(1)

  if (productsError) {
    console.error('❌ Error checking warehouse products:', productsError)
    throw new Error(`Failed to check warehouse products: ${productsError.message}`)
  }

  if (products && products.length > 0) {
    throw new Error('Cannot delete warehouse that contains products. Please move or delete all products first.')
  }

  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', warehouseId)

  if (error) {
    console.error('❌ Error deleting warehouse:', error)
    throw new Error(`Failed to delete warehouse: ${error.message}`)
  }

  console.log('🎉 Warehouse deleted successfully')
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

  console.log('🎉 Warehouse activated successfully')
}

/**
 * Update a warehouse in the database
 */
export async function updateWarehouse(data: UpdateWarehouseData): Promise<void> {
  const supabase = createClient()

  console.log('🔄 Updating warehouse with data:', data)

  const updateData = {
    name: data.name,
    location: data.location,
    address: data.address,
    manager: data.manager,
    contact: data.contact,
    capacity: data.capacity,
    status: data.status,
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

  console.log('🎉 Warehouse updated successfully:', result)
}

/**
 * Update product attributes (for variation products)
 */
export async function updateProductAttributes(productId: string, attributeIds: string[]): Promise<void> {
  const supabase = createClient()

  // Delete existing attributes
  const { error: deleteError } = await supabase
    .from('product_attributes')
    .delete()
    .eq('product_id', productId)

  if (deleteError) {
    console.error('Error deleting product attributes:', deleteError)
    throw new Error(`Failed to delete product attributes: ${deleteError.message}`)
  }

  // Insert new attributes
  if (attributeIds.length > 0) {
    const { error: insertError } = await supabase
      .from('product_attributes')
      .insert(
        attributeIds.map(attributeId => ({
          product_id: productId,
          attribute_id: attributeId
        }))
      )

    if (insertError) {
      console.error('Error inserting product attributes:', insertError)
      throw new Error(`Failed to insert product attributes: ${insertError.message}`)
    }
  }
}

/**
 * Create a new product variation
 */
export async function createProductVariation(data: CreateProductVariationData): Promise<string> {
  const supabase = createClient()

  // Generate sequential variation ID
  const { data: existingVariations, error: countError } = await supabase
    .from('product_variations')
    .select('id')
    .like('id', 'VAR_%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (countError) {
    console.error('Error getting variation count:', countError)
    throw new Error(`Failed to generate variation ID: ${countError.message}`)
  }

  // Extract the highest number from existing variations
  let nextNumber = 1
  if (existingVariations && existingVariations.length > 0) {
    const lastVariation = existingVariations[0]
    const match = lastVariation.id.match(/^VAR_(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    } else {
      // If there are non-sequential IDs, count all variations and add 1
      const { count } = await supabase
        .from('product_variations')
        .select('*', { count: 'exact', head: true })
      
      nextNumber = (count || 0) + 1
    }
  }

  const variationId = `VAR_${nextNumber}`

  const variationData: ProductVariationInsert = {
    id: variationId,
    product_id: data.product_id,
    sku: data.sku,
    price: data.price
  }

  const { error: variationError } = await supabase
    .from('product_variations')
    .insert(variationData)

  if (variationError) {
    console.error('Error creating product variation:', variationError)
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
      console.error('Error creating variation attributes:', attributeError)
      throw new Error(`Failed to create variation attributes: ${attributeError.message}`)
    }
  }

  return variationId
}

/**
 * Update an existing product variation
 */
export async function updateProductVariation(data: UpdateProductVariationData): Promise<void> {
  const supabase = createClient()

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
    console.error('Error updating product variation:', variationError)
    throw new Error(`Failed to update product variation: ${variationError.message}`)
  }

  // Update variation attributes
  // Delete existing attributes for this variation
  const { error: deleteError } = await supabase
    .from('product_variation_attributes')
    .delete()
    .eq('variation_id', data.id)

  if (deleteError) {
    console.error('Error deleting variation attributes:', deleteError)
    throw new Error(`Failed to delete variation attributes: ${deleteError.message}`)
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
      console.error('Error updating variation attributes:', attributeError)
      throw new Error(`Failed to update variation attributes: ${attributeError.message}`)
    }
  }
}

/**
 * Delete a product variation
 */
export async function deleteProductVariation(variationId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('product_variations')
    .delete()
    .eq('id', variationId)

  if (error) {
    console.error('Error deleting product variation:', error)
    throw new Error(`Failed to delete product variation: ${error.message}`)
  }
}

/**
 * Create a complete product with variations and attributes
 */
export async function createCompleteProduct(
  productData: CreateProductData,
  variations?: CreateProductVariationData[],
  attributeIds?: string[]
): Promise<string> {
  const supabase = createClient()

  console.log('🏗️ Creating complete product...')

  try {
    // Create the product first
    const productId = await createProduct(productData)

    // If it's a variation product, add attributes and variations
    if (productData.type === 'variation' && attributeIds && attributeIds.length > 0) {
      // Add product attributes
      await updateProductAttributes(productId, attributeIds)

      // Create variations
      if (variations && variations.length > 0) {
        for (const variation of variations) {
          await createProductVariation({
            ...variation,
            product_id: productId
          })
        }
      }
    }

    console.log('✅ Complete product created successfully')
    return productId
  } catch (error) {
    console.error('❌ Error creating complete product:', error)
    throw error
  }
}

/**
 * Update a complete product with variations
 */
export async function updateCompleteProduct(
  productData: UpdateProductData,
  variations?: UpdateProductVariationData[],
  newVariations?: CreateProductVariationData[],
  attributeIds?: string[]
): Promise<void> {
  try {
    // Update basic product data
    await updateProduct(productData)

    // Update attributes if provided (for variation products)
    if (attributeIds !== undefined) {
      await updateProductAttributes(productData.id, attributeIds)
    }

    // Update existing variations
    if (variations && variations.length > 0) {
      for (const variation of variations) {
        await updateProductVariation(variation)
      }
    }

    // Create new variations
    if (newVariations && newVariations.length > 0) {
      for (const newVariation of newVariations) {
        await createProductVariation(newVariation)
      }
    }
  } catch (error) {
    console.error('Error updating complete product:', error)
    throw error
  }
}

// Category operations
export interface CreateCategoryData {
  name: string
  slug: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
}

export interface UpdateCategoryData {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
}

export async function createCategory(categoryData: CreateCategoryData): Promise<void> {
  const supabase = createClient()
  
  console.log('🏗️ Creating category:', categoryData)
  
  // Generate a unique ID
  const categoryId = `CAT${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
  
  const { error } = await supabase
    .from('categories')
    .insert([{
      id: categoryId,
      ...categoryData
    }])
  
  if (error) {
    console.error('❌ Error creating category:', error)
    throw new Error(`Failed to create category: ${error.message}`)
  }
  
  console.log('✅ Category created successfully')
}

export async function updateCategory(categoryData: UpdateCategoryData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating category:', categoryData)
  
  const { error } = await supabase
    .from('categories')
    .update({
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      parent_id: categoryData.parent_id,
      status: categoryData.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', categoryData.id)
  
  if (error) {
    console.error('❌ Error updating category:', error)
    throw new Error(`Failed to update category: ${error.message}`)
  }
  
  console.log('✅ Category updated successfully')
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting category:', categoryId)
  
  // First check if category has children
  const { data: children, error: checkError } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', categoryId)
  
  if (checkError) {
    console.error('❌ Error checking category children:', checkError)
    throw new Error(`Failed to check category children: ${checkError.message}`)
  }
  
  if (children && children.length > 0) {
    throw new Error('Cannot delete category that has subcategories')
  }
  
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
  
  if (error) {
    console.error('❌ Error deleting category:', error)
    throw new Error(`Failed to delete category: ${error.message}`)
  }
  
  console.log('✅ Category deleted successfully')
}

// Attribute operations
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

export async function createAttribute(attributeData: CreateAttributeData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating attribute:', attributeData)
  
  // Generate a unique ID
  const attributeId = `ATTR${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
  
  const { data, error } = await supabase
    .from('attributes')
    .insert([{
      id: attributeId,
      ...attributeData
    }])
    .select('id')
    .single()
  
  if (error) {
    console.error('❌ Error creating attribute:', error)
    throw new Error(`Failed to create attribute: ${error.message}`)
  }
  
  console.log('✅ Attribute created successfully')
  return data.id
}

export async function updateAttribute(attributeData: UpdateAttributeData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating attribute:', attributeData)
  
  const { error } = await supabase
    .from('attributes')
    .update({
      name: attributeData.name,
      type: attributeData.type,
      required: attributeData.required,
      updated_at: new Date().toISOString()
    })
    .eq('id', attributeData.id)
  
  if (error) {
    console.error('❌ Error updating attribute:', error)
    throw new Error(`Failed to update attribute: ${error.message}`)
  }
  
  console.log('✅ Attribute updated successfully')
}

export async function deleteAttribute(attributeId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting attribute:', attributeId)
  
  // Delete attribute values first
  const { error: valuesError } = await supabase
    .from('attribute_values')
    .delete()
    .eq('attribute_id', attributeId)
  
  if (valuesError) {
    console.error('❌ Error deleting attribute values:', valuesError)
    throw new Error(`Failed to delete attribute values: ${valuesError.message}`)
  }
  
  // Then delete the attribute
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

export async function createAttributeValues(values: CreateAttributeValueData[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🏗️ Creating attribute values:', values)
  
  // Add IDs to the values
  const valuesWithIds = values.map((value, index) => ({
    id: `${value.value}_${Date.now()}_${index}`,
    ...value
  }))
  
  const { error } = await supabase
    .from('attribute_values')
    .insert(valuesWithIds)
  
  if (error) {
    console.error('❌ Error creating attribute values:', error)
    throw new Error(`Failed to create attribute values: ${error.message}`)
  }
  
  console.log('✅ Attribute values created successfully')
}

export async function updateAttributeValues(attributeId: string, values: CreateAttributeValueData[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating attribute values for attribute:', attributeId)
  
  // Delete existing values
  const { error: deleteError } = await supabase
    .from('attribute_values')
    .delete()
    .eq('attribute_id', attributeId)
  
  if (deleteError) {
    console.error('❌ Error deleting old attribute values:', deleteError)
    throw new Error(`Failed to delete old attribute values: ${deleteError.message}`)
  }
  
  // Insert new values
  if (values.length > 0) {
    // Add IDs to the values
    const valuesWithIds = values.map((value, index) => ({
      id: `${value.value}_${Date.now()}_${index}`,
      ...value
    }))
    
    const { error: insertError } = await supabase
      .from('attribute_values')
      .insert(valuesWithIds)
    
    if (insertError) {
      console.error('❌ Error inserting new attribute values:', insertError)
      throw new Error(`Failed to insert new attribute values: ${insertError.message}`)
    }
  }
  
  console.log('✅ Attribute values updated successfully')
}

// SKU validation
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
    console.error('❌ Error checking SKU:', error)
    throw new Error(`Failed to check SKU: ${error.message}`)
  }
  
  return data && data.length > 0
}

// Packaging SKU validation
export async function checkPackagingSkuExists(sku: string, excludePackagingId?: string): Promise<boolean> {
  const supabase = createClient()
  
  console.log('🔍 Checking packaging SKU exists:', sku, 'excluding:', excludePackagingId)
  
  // Check in both packaging and packaging_variations tables
  const packagingQuery = supabase
    .from('packaging')
    .select('id')
    .eq('sku', sku)
  
  if (excludePackagingId) {
    packagingQuery.neq('id', excludePackagingId)
  }
  
  const variationsQuery = supabase
    .from('packaging_variations')
    .select('id, packaging_id')
    .eq('sku', sku)
  
  if (excludePackagingId) {
    variationsQuery.neq('packaging_id', excludePackagingId)
  }
  
  const [packagingResult, variationsResult] = await Promise.all([
    packagingQuery,
    variationsQuery
  ])
  
  if (packagingResult.error) {
    console.error('❌ Error checking packaging SKU:', packagingResult.error)
    throw new Error(`Failed to check packaging SKU: ${packagingResult.error.message}`)
  }
  
  if (variationsResult.error) {
    console.error('❌ Error checking packaging variations SKU:', variationsResult.error)
    throw new Error(`Failed to check packaging variations SKU: ${variationsResult.error.message}`)
  }
  
  const exists = (packagingResult.data && packagingResult.data.length > 0) || 
                 (variationsResult.data && variationsResult.data.length > 0)
  
  console.log('✅ SKU exists check result:', exists)
  return exists
}

// Packaging attribute operations
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

export async function createPackagingAttribute(attributeData: CreatePackagingAttributeData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating packaging attribute:', attributeData)
  
  // Generate a unique ID
  const attributeId = `PATTR${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
  const slug = attributeData.name.toLowerCase().replace(/\s+/g, '-')
  
  const { data, error } = await supabase
    .from('packaging_attributes')
    .insert([{
      id: attributeId,
      name: attributeData.name,
      slug: slug,
      status: 'active'
    }])
    .select('id')
    .single()
  
  if (error) {
    console.error('❌ Error creating packaging attribute:', error)
    throw new Error(`Failed to create packaging attribute: ${error.message}`)
  }
  
  // Create attribute values
  if (attributeData.values.length > 0) {
    const values = attributeData.values
      .filter(val => val.trim())
      .map((val, index) => ({
        id: `${attributeId}_${val.toUpperCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`,
        attribute_id: attributeId,
        value: val,
        label: val,
        slug: val.toLowerCase().replace(/\s+/g, '-'),
        sort_order: index
      }))

    const { error: valuesError } = await supabase
      .from('packaging_attribute_values')
      .insert(values)

    if (valuesError) {
      console.error('❌ Error creating packaging attribute values:', valuesError)
      // Clean up the attribute if values creation failed
      await supabase.from('packaging_attributes').delete().eq('id', attributeId)
      throw new Error(`Failed to create packaging attribute values: ${valuesError.message}`)
    }
  }
  
  console.log('✅ Packaging attribute created successfully')
  return data.id
}

export async function updatePackagingAttribute(attributeData: UpdatePackagingAttributeData): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating packaging attribute:', attributeData)
  
  const slug = attributeData.name.toLowerCase().replace(/\s+/g, '-')
  
  const { error } = await supabase
    .from('packaging_attributes')
    .update({
      name: attributeData.name,
      slug: slug,
      updated_at: new Date().toISOString()
    })
    .eq('id', attributeData.id)
  
  if (error) {
    console.error('❌ Error updating packaging attribute:', error)
    throw new Error(`Failed to update packaging attribute: ${error.message}`)
  }
  
  // Update attribute values
  await updatePackagingAttributeValues(attributeData.id, attributeData.values)
  
  console.log('✅ Packaging attribute updated successfully')
}

export async function deletePackagingAttribute(attributeId: string): Promise<void> {
  const supabase = createClient()
  
  console.log('🗑️ Deleting packaging attribute:', attributeId)
  
  // Delete attribute values first
  const { error: valuesError } = await supabase
    .from('packaging_attribute_values')
    .delete()
    .eq('attribute_id', attributeId)
  
  if (valuesError) {
    console.error('❌ Error deleting packaging attribute values:', valuesError)
    throw new Error(`Failed to delete packaging attribute values: ${valuesError.message}`)
  }
  
  // Then delete the attribute
  const { error } = await supabase
    .from('packaging_attributes')
    .delete()
    .eq('id', attributeId)
  
  if (error) {
    console.error('❌ Error deleting packaging attribute:', error)
    throw new Error(`Failed to delete packaging attribute: ${error.message}`)
  }
  
  console.log('✅ Packaging attribute deleted successfully')
}

export async function updatePackagingAttributeValues(attributeId: string, values: string[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating packaging attribute values for attribute:', attributeId)
  
  // Delete existing values
  const { error: deleteError } = await supabase
    .from('packaging_attribute_values')
    .delete()
    .eq('attribute_id', attributeId)
  
  if (deleteError) {
    console.error('❌ Error deleting old packaging attribute values:', deleteError)
    throw new Error(`Failed to delete old packaging attribute values: ${deleteError.message}`)
  }
  
  // Insert new values
  if (values.length > 0) {
    const validValues = values.filter(val => val.trim())
    const valuesWithIds = validValues.map((value, index) => ({
      id: `${attributeId}_${value.toUpperCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`,
      attribute_id: attributeId,
      value: value,
      label: value,
      slug: value.toLowerCase().replace(/\s+/g, '-'),
      sort_order: index
    }))
    
    const { error: insertError } = await supabase
      .from('packaging_attribute_values')
      .insert(valuesWithIds)
    
    if (insertError) {
      console.error('❌ Error inserting new packaging attribute values:', insertError)
      throw new Error(`Failed to insert new packaging attribute values: ${insertError.message}`)
    }
  }
  
  console.log('✅ Packaging attribute values updated successfully')
}

// Packaging CRUD operations
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

export async function createPackaging(data: CreatePackagingData): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating packaging:', data)
  
  // Generate a unique ID
  const packagingId = `PKG${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
  
  const packagingInsert = {
    id: packagingId,
    title: data.title,
    description: data.description || null,
    type: data.type,
    sku: data.sku || null,
    status: data.status
  }
  
  const { error } = await supabase
    .from('packaging')
    .insert([packagingInsert])
  
  if (error) {
    console.error('❌ Error creating packaging:', error)
    
    // Check for SKU constraint violation
    if ((error?.message?.includes('packaging_sku_key') || 
        error?.details?.includes('packaging_sku_key') ||
        error?.code === '23505') && data.sku) {
      throw new Error(`SKU "${data.sku}" already exists. Please use a different SKU.`)
    }
    
    throw new Error(`Failed to create packaging: ${error.message}`)
  }
  
  // If it's a variable packaging, add attributes and variations
  if (data.type === 'variable' && data.selectedAttributes && data.selectedAttributes.length > 0) {
    // Add packaging attributes
    await updatePackagingAttributes(packagingId, data.selectedAttributes)
    
    // Create variations
    if (data.variations && data.variations.length > 0) {
      for (const variation of data.variations) {
        await createPackagingVariation({
          ...variation,
          packaging_id: packagingId
        })
      }
    }
  }
  
  console.log('✅ Packaging created successfully')
  return packagingId
}

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
  
  const { error } = await supabase
    .from('packaging')
    .update(updateData)
    .eq('id', data.id)
  
  if (error) {
    console.error('❌ Error updating packaging:', error)
    
    // Check for SKU constraint violation
    if ((error?.message?.includes('packaging_sku_key') || 
        error?.details?.includes('packaging_sku_key') ||
        error?.code === '23505') && data.sku) {
      throw new Error(`SKU "${data.sku}" already exists. Please use a different SKU.`)
    }
    
    throw new Error(`Failed to update packaging: ${error.message}`)
  }
  
  // Update attributes if provided (for variable packaging)
  if (data.selectedAttributes !== undefined) {
    await updatePackagingAttributes(data.id, data.selectedAttributes)
  }
  
  // Update existing variations
  if (data.variations && data.variations.length > 0) {
    for (const variation of data.variations) {
      await updatePackagingVariation(variation)
    }
  }
  
  // Create new variations
  if (data.newVariations && data.newVariations.length > 0) {
    for (const newVariation of data.newVariations) {
      await createPackagingVariation({
        ...newVariation,
        packaging_id: data.id
      })
    }
  }
  
  console.log('✅ Packaging updated successfully')
}

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

export async function updatePackagingAttributes(packagingId: string, attributeIds: string[]): Promise<void> {
  const supabase = createClient()
  
  console.log('🔄 Updating packaging attributes for packaging:', packagingId)
  
  // Delete existing attributes for this packaging
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

export async function createPackagingVariation(data: CreatePackagingVariationData & { packaging_id: string }): Promise<string> {
  const supabase = createClient()
  
  console.log('🏗️ Creating packaging variation:', data)
  console.log('🔍 Raw data object:', JSON.stringify(data, null, 2))
  
  // Validate required fields
  if (!data.packaging_id) {
    console.error('❌ Missing packaging_id')
    throw new Error('packaging_id is required')
  }
  
  if (!data.sku) {
    console.error('❌ Missing SKU')
    throw new Error('SKU is required')
  }
  
  // Generate a unique ID
  const variationId = `PVAR${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
  
  const variationData = {
    id: variationId,
    packaging_id: data.packaging_id,
    sku: data.sku
  }
  
  console.log('🔍 Variation data to insert:', variationData)
  
  const { data: insertResult, error: variationError } = await supabase
    .from('packaging_variations')
    .insert(variationData)
    .select()
  
  if (variationError) {
    console.error('❌ Error creating packaging variation:', variationError)
    console.error('❌ Error message:', variationError?.message)
    console.error('❌ Error details:', variationError?.details)
    console.error('❌ Error hint:', variationError?.hint)
    console.error('❌ Error code:', variationError?.code)
    console.error('❌ Full error object:', JSON.stringify(variationError, null, 2))
    
    // Check for SKU constraint violation
    if (variationError?.message?.includes('packaging_variations_sku_key') || 
        variationError?.details?.includes('packaging_variations_sku_key') ||
        variationError?.code === '23505') {
      throw new Error(`SKU "${data.sku}" already exists. Please use a different SKU.`)
    }
    
    throw new Error(`Failed to create packaging variation: ${variationError?.message || variationError?.details || 'Unknown database error'}`)
  }
  
  console.log('✅ Variation insert result:', insertResult)
  
  // Insert variation attributes
  const attributeData = Object.entries(data.attributeValues).map(([attributeId, valueId]) => ({
    variation_id: variationId,
    attribute_id: attributeId,
    attribute_value_id: valueId
  }))
  
  console.log('🔍 Attribute data to insert:', JSON.stringify(attributeData, null, 2))
  console.log('🔍 Raw attributeValues:', JSON.stringify(data.attributeValues, null, 2))
  
  if (attributeData.length > 0) {
    // Validate attribute and value IDs exist
    for (const attr of attributeData) {
      console.log(`🔍 Validating attribute ${attr.attribute_id} and value ${attr.attribute_value_id}`)
    }
    
    const { data: attributeResult, error: attributeError } = await supabase
      .from('packaging_variation_attributes')
      .insert(attributeData)
      .select()
    
    if (attributeError) {
      console.error('❌ Error creating packaging variation attributes:', attributeError)
      console.error('❌ Attribute error message:', attributeError?.message)
      console.error('❌ Attribute error details:', attributeError?.details)
      console.error('❌ Attribute error hint:', attributeError?.hint)
      console.error('❌ Attribute error code:', attributeError?.code)
      console.error('❌ Full attribute error object:', JSON.stringify(attributeError, null, 2))
      
      // Clean up the variation if attributes creation failed
      await supabase.from('packaging_variations').delete().eq('id', variationId)
      
      throw new Error(`Failed to create packaging variation attributes: ${attributeError?.message || attributeError?.details || 'Unknown database error'}`)
    }
    
    console.log('✅ Attribute insert result:', attributeResult)
  }
  
  console.log('✅ Packaging variation created successfully')
  return variationId
}

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
    
    // Check for SKU constraint violation
    if (variationError?.message?.includes('packaging_variations_sku_key') || 
        variationError?.details?.includes('packaging_variations_sku_key') ||
        variationError?.code === '23505') {
      throw new Error(`SKU "${data.sku}" already exists. Please use a different SKU.`)
    }
    
    throw new Error(`Failed to update packaging variation: ${variationError.message}`)
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
      throw new Error(`Failed to update packaging variation attributes: ${attributeError.message}`)
    }
  }
  
  console.log('✅ Packaging variation updated successfully')
}

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

// ==============================
// SUPPLIER MUTATIONS
// ==============================

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