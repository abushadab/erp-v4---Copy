import { createClient } from './client'
import type { Database, Customer, Sale, SaleItem, Return, ReturnItem, SaleWithItems, ReturnWithItems } from './types'
import { transformDatabaseProductToProduct } from './transforms'
import type { Product, ProductVariation, Packaging, PackagingVariation } from '../types'
import { createSaleJournalEntry, createReturnJournalEntry } from './accounts-client'
import { apiCache } from './cache'

export type { Customer, Sale, SaleItem, Return, ReturnItem, SaleWithItems, ReturnWithItems }

// Create a singleton Supabase client instance to avoid recreating it multiple times
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    console.log('Creating new Supabase client instance')
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

const supabase = getSupabaseClient()

// Warehouse operations - use cached version from queries
import { getActiveWarehouses } from './queries'

export const getWarehouses = async () => {
  return await getActiveWarehouses()
}

// Product operations
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variations (
        *,
        product_variation_attributes (
          attribute_id,
          attribute_value_id,
          attributes!inner(id, name, type),
          attribute_values!inner(id, value, label)
        )
      )
    `)
    .eq('status', 'active')
    .order('name')

  if (error) throw error
  
  // Transform database products to ERP Product interface
  return (data || []).map(dbProduct => {
    // Map product_variations to variations for compatibility with proper attribute data
    const typedProduct = dbProduct as any
    const variations = typedProduct.product_variations?.map((variation: any) => ({
      ...variation,
      attribute_values: variation.product_variation_attributes?.map((pva: any) => ({
        attribute_id: pva.attribute_id,
        attribute_name: pva.attributes.name,
        value_id: pva.attribute_value_id,
        value_label: pva.attribute_values.label
      })) || []
    })) || []
    
    const productWithVariations = {
      ...typedProduct,
      variations
    }
    return transformDatabaseProductToProduct(productWithVariations)
  })
}

export const getProductsByWarehouse = async (warehouseId: string): Promise<Product[]> => {
  console.log('🔄 getProductsByWarehouse() - Fetching products for warehouse:', warehouseId)
  
  const { data, error } = await supabase
    .from('product_warehouse_stock')
    .select(`
      product_id,
      warehouse_id,
      available_stock,
      variation_id,
      products!inner (
        *,
        product_variations (
          *,
          product_variation_attributes (
            attribute_id,
            attribute_value_id,
            attributes!inner(id, name, type),
            attribute_values!inner(id, value, label)
          )
        )
      )
    `)
    .eq('warehouse_id', warehouseId)
    .gt('available_stock', 0) // Only show products with stock > 0
    .order('products(name)')

  if (error) {
    console.error('❌ getProductsByWarehouse() - Error:', error)
    throw error
  }
  
  // Group by product and properly map stock to variations
  const productMap = new Map()
  
  data?.forEach(item => {
    const dbProduct = item.products as any
    
    if (!productMap.has(dbProduct.id)) {
      productMap.set(dbProduct.id, {
        ...dbProduct,
        variations: dbProduct.product_variations?.map((variation: any) => ({
          ...variation,
          stock: 0, // Initialize stock
          attribute_values: variation.product_variation_attributes?.map((pva: any) => ({
            attribute_id: pva.attribute_id,
            attribute_name: pva.attributes.name,
            value_id: pva.attribute_value_id,
            value_label: pva.attribute_values.label
          })) || []
        })) || [],
        warehouse_stock: item.available_stock,
        warehouse_id: item.warehouse_id
      })
    }
    
    // Update stock for the specific variation or simple product
    const product = productMap.get(dbProduct.id)
    if (item.variation_id) {
      // Find and update the specific variation's stock
      const variationIndex = product.variations?.findIndex((v: any) => v.id === item.variation_id)
      if (variationIndex !== -1 && product.variations) {
        product.variations[variationIndex].stock = item.available_stock
      }
    } else {
      // For simple products, update the product's stock
      product.stock = item.available_stock
    }
  })

  const products = Array.from(productMap.values()).map(productWithVariations => {
    console.log('🔍 Raw product data before transformation:', {
      id: productWithVariations.id,
      name: productWithVariations.name,
      price: productWithVariations.price,
      type: productWithVariations.type,
      variations: productWithVariations.variations?.map((v: any) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        stock: v.stock
      }))
    })
    
    const transformed = transformDatabaseProductToProduct(productWithVariations)
    
    console.log('🔍 Transformed product data:', {
      id: transformed.id,
      name: transformed.name,
      price: (transformed as any).price,
      type: transformed.type,
      variations: transformed.variations?.map(v => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        stock: v.stock
      }))
    })
    
    return transformed
  })
  
  console.log('✅ getProductsByWarehouse() - Success, found', products.length, 'products for warehouse', warehouseId)
  return products
}

export const getProductById = async (id: string): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variations (
        *,
        product_variation_attributes (
          attribute_id,
          attribute_value_id,
          attributes!inner(id, name, type),
          attribute_values!inner(id, value, label)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  
  // Map product_variations to variations for compatibility with proper attribute data
  const typedProduct = data as any
  const variations = typedProduct.product_variations?.map((variation: any) => ({
    ...variation,
    attribute_values: variation.product_variation_attributes?.map((pva: any) => ({
      attribute_id: pva.attribute_id,
      attribute_name: pva.attributes.name,
      value_id: pva.attribute_value_id,
      value_label: pva.attribute_values.label
    })) || []
  })) || []
  
  const productWithVariations = {
    ...typedProduct,
    variations
  }
  return transformDatabaseProductToProduct(productWithVariations)
}

// Packaging operations
export const getPackaging = async (): Promise<Packaging[]> => {
  const { data, error } = await supabase
    .from('packaging')
    .select(`
      *,
      variations:packaging_variations(
        id,
        sku,
        created_at,
        updated_at,
        variation_attributes:packaging_variation_attributes(
          attribute_id,
          attribute_value_id,
          attribute:packaging_attributes(name),
          value:packaging_attribute_values(value, label)
        )
      )
    `)
    .eq('status', 'active')
    .order('title')

  if (error) throw error

  // Transform the data to include attribute values in the expected format
  return (data || []).map(packaging => ({
    id: packaging.id,
    title: packaging.title,
    description: packaging.description || '',
    type: packaging.type as 'simple' | 'variable',
    sku: packaging.sku || undefined,
    status: packaging.status as 'active' | 'inactive',
    createdAt: packaging.created_at,
    variations: packaging.variations?.map((variation: any) => ({
      id: variation.id,
      sku: variation.sku,
      attributeValues: variation.variation_attributes?.reduce((acc: Record<string, string>, attr: { attribute_id: string; attribute_value_id: string }) => {
        acc[attr.attribute_id] = attr.attribute_value_id
        return acc
      }, {} as Record<string, string>) || {},
      price: 0, // These would come from warehouse stock data
      buyingPrice: 0,
      stock: 0,
      boughtQuantity: 0,
      // Preserve raw attribute_values for display purposes
      attribute_values: variation.variation_attributes?.map((attr: any) => ({
        attribute_id: attr.attribute_id,
        attribute_name: attr.attribute?.name || '',
        value_id: attr.attribute_value_id,
        value_label: attr.value?.label || attr.value?.value || ''
      })) || []
    })) || []
  }))
}

export const getPackagingByWarehouse = async (warehouseId: string): Promise<Packaging[]> => {
  console.log('🔄 getPackagingByWarehouse() - Fetching packaging for warehouse:', warehouseId)
  
  const { data, error } = await supabase
    .from('packaging_warehouse_stock')
    .select(`
      packaging_id,
      warehouse_id,
      available_stock,
      variation_id,
      packaging!inner (
        *,
        variations:packaging_variations (
          *,
          variation_attributes:packaging_variation_attributes (
            attribute_id,
            attribute_value_id,
            attribute:packaging_attributes!inner(id, name),
            value:packaging_attribute_values!inner(id, value, label)
          )
        )
      )
    `)
    .eq('warehouse_id', warehouseId)
    .gt('available_stock', 0) // Only show packaging with stock > 0
    .order('packaging(title)')

  if (error) {
    console.error('❌ getPackagingByWarehouse() - Error:', error)
    throw error
  }
  
  // Group by packaging and properly map stock to variations
  const packagingMap = new Map()
  
  data?.forEach(item => {
    const dbPackaging = item.packaging as any
    
    if (!packagingMap.has(dbPackaging.id)) {
      packagingMap.set(dbPackaging.id, {
        ...dbPackaging,
        variations: dbPackaging.variations?.map((variation: any) => ({
          ...variation,
          stock: 0, // Initialize stock
          attribute_values: variation.variation_attributes?.map((va: any) => ({
            attribute_id: va.attribute_id,
            attribute_name: va.attribute.name,
            value_id: va.attribute_value_id,
            value_label: va.value.label
          })) || []
        })) || [],
        warehouse_stock: item.available_stock,
        warehouse_id: item.warehouse_id
      })
    }
    
    // Update stock for the specific variation or simple packaging
    const packaging = packagingMap.get(dbPackaging.id)
    if (item.variation_id) {
      // Find and update the specific variation's stock
      const variationIndex = packaging.variations?.findIndex((v: any) => v.id === item.variation_id)
      if (variationIndex !== -1 && packaging.variations) {
        packaging.variations[variationIndex].stock = item.available_stock
      }
    } else {
      // For simple packaging, update the packaging's stock
      packaging.stock = item.available_stock
    }
  })

  const packagingList = Array.from(packagingMap.values()).map(packagingWithVariations => ({
    id: packagingWithVariations.id,
    title: packagingWithVariations.title,
    description: packagingWithVariations.description || '',
    type: packagingWithVariations.type as 'simple' | 'variable',
    sku: packagingWithVariations.sku || undefined,
    status: packagingWithVariations.status as 'active' | 'inactive',
    createdAt: packagingWithVariations.created_at,
    stock: packagingWithVariations.stock || 0,
    variations: packagingWithVariations.variations?.map((variation: any) => ({
      id: variation.id,
      sku: variation.sku,
      attributeValues: variation.attribute_values?.reduce((acc: Record<string, string>, attr: { attribute_id: string; value_id: string }) => {
        acc[attr.attribute_id] = attr.value_id
        return acc
      }, {} as Record<string, string>) || {},
      price: 0, // These would come from pricing tables
      buyingPrice: 0,
      stock: variation.stock || 0,
      boughtQuantity: 0,
      // Preserve raw attribute_values for display purposes
      attribute_values: variation.attribute_values || []
    })) || []
  }))
  
  console.log('✅ getPackagingByWarehouse() - Success, found', packagingList.length, 'packaging for warehouse', warehouseId)
  return packagingList
}

// Customer operations
export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const getCustomerById = async (id: string) => {
  // Use the apiCache to avoid duplicate requests
  return await apiCache.get(`customer-${id}`, async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  })
}

export const createCustomer = async (customer: Database['public']['Tables']['customers']['Insert']) => {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateCustomer = async (id: string, updates: Database['public']['Tables']['customers']['Update']) => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteCustomer = async (id: string) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Sales operations
export const getSalesBasic = async () => {
  console.log('🔄 getSalesBasic() - Making basic Supabase API call (no joins) at', new Date().toISOString())
  
  try {
    // Simple query without joins for debugging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100) // Small limit for testing
      .abortSignal(controller.signal)
    
    clearTimeout(timeoutId)

    if (error) {
      console.error('❌ getSalesBasic() - Error:', error)
      throw error
    }
    
    if (!data) {
      console.log('⚠️ getSalesBasic() - No data returned, returning empty array')
      return []
    }
    
    console.log('✅ getSalesBasic() - Success, returned', data.length, 'sales records')
    return data
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ getSalesBasic() - Request timed out after 10 seconds')
      throw new Error('Basic sales query timeout - database connection issue')
    }
    
    console.error('❌ getSalesBasic() - Unexpected error:', error)
    throw error
  }
}

export const getSales = async () => {
  console.log('🔄 getSales() - Making Supabase API call at', new Date().toISOString())
  
  try {
    // First try a basic query to see if the issue is with joins
    try {
      await getSalesBasic()
      console.log('✅ Basic sales query successful, proceeding with full query')
    } catch (basicError) {
      console.error('❌ Basic sales query failed, database connection issue:', basicError)
      throw new Error('Database connection issue - unable to access sales table')
    }
    
    // Add timeout and optimize query
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (*)
      `)
      .order('created_at', { ascending: false })
      .limit(1000) // Add reasonable limit to prevent huge datasets
      .abortSignal(controller.signal)
    
    clearTimeout(timeoutId)

    if (error) {
      console.error('❌ getSales() - Error:', error)
      throw error
    }
    
    if (!data) {
      console.log('⚠️ getSales() - No data returned, returning empty array')
      return []
    }
    
    console.log('✅ getSales() - Success, returned', data.length, 'sales records')
    return data as SaleWithItems[]
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ getSales() - Request timed out after 15 seconds')
      throw new Error('Sales data request timeout after 15 seconds')
    }
    
    // Check for common Supabase/database errors
    if (error.code === 'PGRST301') {
      console.error('❌ getSales() - Row Level Security error - user may not have permission')
      throw new Error('Permission denied: Unable to access sales data')
    }
    
    if (error.code === 'PGRST116') {
      console.error('❌ getSales() - Query timeout from database')
      throw new Error('Database query timeout - too much data to process')
    }
    
    console.error('❌ getSales() - Unexpected error:', error)
    throw error
  }
}

export const getSaleById = async (id: string) => {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        *,
        products!inner (
          id,
          name,
          type,
          product_variations (
            id,
            sku,
            price,
            product_variation_attributes (
              attribute_id,
              attribute_value_id,
              attributes!inner(id, name, type),
              attribute_values!inner(id, value, label)
            )
          )
        ),
        packaging (
          id,
          title,
          description,
          type,
          sku
        ),
        packaging_variations (
          id,
          sku,
          packaging_variation_attributes (
            attribute_id,
            attribute_value_id,
            packaging_attributes!inner(id, name),
            packaging_attribute_values!inner(id, value, label)
          )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  
  const sale = data as SaleWithItems & {
    sale_items: (SaleItem & {
      products: {
        id: string
        name: string
        type: string
        product_variations: Array<{
          id: string
          sku: string
          price: number
          product_variation_attributes: Array<{
            attribute_id: string
            attribute_value_id: string
            attributes: { id: string; name: string; type: string }
            attribute_values: { id: string; value: string; label: string }
          }>
        }>
      }
      packaging?: {
        id: string
        title: string
        description: string | null
        type: string
        sku: string | null
      }
      packaging_variations?: {
        id: string
        sku: string
        packaging_variation_attributes: Array<{
          attribute_id: string
          attribute_value_id: string
          packaging_attributes: { id: string; name: string }
          packaging_attribute_values: { id: string; value: string; label: string }
        }>
      }
    })[]
  }
  
  // Fetch customer data if customer_id exists
  let customer = null
  if (sale.customer_id) {
    const customerData = await getCustomerById(sale.customer_id)
    customer = customerData
  }
  
  return { sale, customer }
}

export const createSale = async (
  sale: Database['public']['Tables']['sales']['Insert'],
  items: Database['public']['Tables']['sale_items']['Insert'][]
) => {
  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .insert(sale)
    .select()
    .single()

  if (saleError) throw saleError

  console.log('🔧 Original sale items before cleaning:', items)

  // Insert sale items with the sale ID, being very explicit about what fields to include
  const saleItems = items.map((item, index) => {
    // Be very explicit about what fields we want to include
    const cleanItem = {
      product_id: item.product_id,
      product_name: item.product_name,
      variation_id: item.variation_id || null,
      packaging_id: item.packaging_id || null,
      packaging_name: item.packaging_name || null,
      packaging_variation_id: item.packaging_variation_id || null,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || null,
      total: item.total,
      tax: item.tax || null,
      sale_id: saleData.id
    }

    console.log(`🔧 Item ${index + 1} cleaned:`, cleanItem)
    return cleanItem
  })

  console.log('🔧 Clean sale items to insert:', saleItems)

  const { data: insertedItems, error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems)
    .select('id, product_id, product_name')

  if (itemsError) {
    console.error('❌ Sale items insertion error:', itemsError)
    throw itemsError
  }

  console.log('✅ Sale items inserted successfully with IDs:', insertedItems)

  // 📊 ACCOUNTING INTEGRATION: Create journal entry for the sale
  try {
    console.log('💰 Creating journal entry for sale:', saleData.id)
    await createSaleJournalEntry(
      saleData.id,
      sale.customer_name || 'Unknown Customer',
      sale.total_amount || 0,
      sale.sale_date || new Date().toISOString(),
      'system' // TODO: Replace with actual user ID
    )
    console.log('✅ Journal entry created for sale')
  } catch (journalError) {
    console.error('⚠️ Failed to create journal entry for sale:', journalError)
    // Don't throw error - sale was successful, accounting entry failed
  }

  return saleData
}

export const updateSale = async (id: string, updates: Database['public']['Tables']['sales']['Update']) => {
  const { data, error } = await supabase
    .from('sales')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteSale = async (id: string) => {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Returns operations
export const getReturns = async () => {
  const { data, error } = await supabase
    .from('returns')
    .select(`
      *,
      return_items (
        *,
        product_variations(
          id,
          sku,
          product_variation_attributes(
            attribute_id,
            attribute_value_id,
            attributes(name),
            attribute_values(value)
          )
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ReturnWithItems[]
}

export const getReturnById = async (id: string) => {
  // First get the basic return data
  const { data: returnData, error: returnError } = await supabase
    .from('returns')
    .select(`
      *,
      return_items (*)
    `)
    .eq('id', id)
    .single()

  if (returnError) throw returnError

  // Then enrich each return item with product and variation data
  const enrichedReturnItems = await Promise.all(
    (returnData.return_items || []).map(async (item: any) => {
      // Get base product data for SKU
      const { data: productData } = await supabase
        .from('products')
        .select('sku')
        .eq('id', item.product_id)
        .single()

      let variationData = null
      if (item.variation_id) {
        // Get variation attributes for this item
        const { data: variation } = await supabase
          .from('product_variations')
          .select(`
            id,
            sku,
            product_variation_attributes (
              attributes (name),
              attribute_values (value)
            )
          `)
          .eq('id', item.variation_id)
          .single()
        
        variationData = variation
      }

      return {
        ...item,
        product_sku: productData?.sku || null,
        product_variations: variationData ? [variationData] : []
      }
    })
  )

  return {
    ...returnData,
    return_items: enrichedReturnItems
  } as ReturnWithItems
}

export const getReturnsBySaleId = async (saleId: string) => {
  const { data, error } = await supabase
    .from('returns')
    .select(`
      *,
      return_items (
        *,
        product_variations(
          id,
          sku,
          product_variation_attributes(
            attribute_id,
            attribute_value_id,
            attributes(name),
            attribute_values(value)
          )
        )
      )
    `)
    .eq('sale_id', saleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ReturnWithItems[]
}

export const createReturn = async (
  returnData: Database['public']['Tables']['returns']['Insert'],
  items: Database['public']['Tables']['return_items']['Insert'][]
) => {
  const { data: returnRecord, error: returnError } = await supabase
    .from('returns')
    .insert(returnData)
    .select()
    .single()

  if (returnError) throw returnError

  // Insert return items with the return ID
  const returnItems = items.map(item => ({
    ...item,
    return_id: returnRecord.id
  }))

  const { error: itemsError } = await supabase
    .from('return_items')
    .insert(returnItems)

  if (itemsError) throw itemsError

  // Update the returned_quantity in sale_items table
  // This is crucial to prevent returning the same items multiple times
  for (const item of items) {
    if (item.product_id && item.quantity && returnData.sale_id) {
      // First, get the current returned_quantity for this sale item
      const { data: currentSaleItem, error: saleItemError } = await supabase
        .from('sale_items')
        .select('returned_quantity')
        .eq('sale_id', returnData.sale_id)
        .eq('product_id', item.product_id)
        .single()

      if (saleItemError) {
        console.warn(`Could not fetch current sale item for update:`, saleItemError)
        continue
      }

      // Calculate new returned quantity
      const currentReturnedQty = currentSaleItem?.returned_quantity || 0
      const newReturnedQty = currentReturnedQty + item.quantity

      // Update the sale item with new returned quantity
      const { error: updateError } = await supabase
        .from('sale_items')
        .update({ returned_quantity: newReturnedQty })
        .eq('sale_id', returnData.sale_id)
        .eq('product_id', item.product_id)

      if (updateError) {
        console.error(`Failed to update returned_quantity for product ${item.product_id}:`, updateError)
        // Continue with other items even if one fails
      }
    }
  }

  // 📊 ACCOUNTING INTEGRATION: Create journal entry for the return
  try {
    console.log('💰 Creating journal entry for return:', returnRecord.id)
    await createReturnJournalEntry(
      returnRecord.id,
      returnData.customer_name || 'Unknown Customer',
      returnData.total_amount || 0,
      returnData.return_date || new Date().toISOString(),
      'system' // TODO: Replace with actual user ID
    )
    console.log('✅ Journal entry created for return')
  } catch (journalError) {
    console.error('⚠️ Failed to create journal entry for return:', journalError)
    // Don't throw error - return was successful, accounting entry failed
  }

  return returnRecord
}

export const updateReturn = async (id: string, updates: Database['public']['Tables']['returns']['Update']) => {
  const { data, error } = await supabase
    .from('returns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteReturn = async (id: string) => {
  const { error } = await supabase
    .from('returns')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Helper functions for aggregations and statistics
export const getSalesStats = async () => {
  const { data: sales, error } = await supabase
    .from('sales')
    .select('total_amount, profit, commission, status, sale_date')

  if (error) throw error

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
  const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0)
  const totalCommission = sales.reduce((sum, sale) => sum + (sale.commission || 0), 0)
  const completedSales = sales.filter(sale => sale.status === 'completed').length
  const totalSales = sales.length

  return {
    totalRevenue,
    totalProfit,
    totalCommission,
    completedSales,
    totalSales
  }
}

export const getCustomerStats = async () => {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('status, total_orders, total_spent')

  if (error) throw error

  const activeCustomers = customers.filter(customer => customer.status === 'active').length
  const totalCustomers = customers.length
  const totalRevenue = customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0)
  const totalOrders = customers.reduce((sum, customer) => sum + (customer.total_orders || 0), 0)

  return {
    activeCustomers,
    totalCustomers,
    totalRevenue,
    totalOrders
  }
}

// 💳 SALES PAYMENT FUNCTIONS

// Payment types for sales
export interface SalePayment {
  id: string
  sale_id: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'
  payment_date: string
  notes?: string
  journal_entry_id?: string
  created_by?: string
  status: 'active' | 'void'
  created_at: string
  updated_at: string
}

export interface CreateSalePaymentData {
  sale_id: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'
  payment_date: string
  notes?: string
  created_by: string
}

// Payment methods for UI (reuse from purchases)
export const SALE_PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' }
]

// Sale events for timeline
export interface SaleEvent {
  id: string
  sale_id: string
  event_type: 'order_placed' | 'payment_made' | 'payment_voided' | 'returned' | 'cancelled' | 'status_change'
  event_title: string
  event_description?: string
  previous_status?: string
  new_status?: string
  payment_amount?: number
  payment_method?: string
  payment_id?: string
  return_amount?: number
  return_reason?: string
  metadata?: any
  created_by?: string
  created_at: string
  event_date: string
}

// Get all payments for a sale
export async function getSalePayments(saleId: string): Promise<SalePayment[]> {
  return apiCache.get(`sale-payments-${saleId}`, async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('sale_payments')
      .select('*')
      .eq('sale_id', saleId)
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('Error fetching sale payments:', error)
      throw new Error('Failed to fetch sale payments')
    }

    return data || []
  })
}

// Create a new payment for a sale
export async function createSalePayment(paymentData: CreateSalePaymentData): Promise<SalePayment> {
  const supabase = createClient()

  // Generate payment ID
  const paymentId = `SPAY-${Date.now()}`

  const { data, error } = await supabase
    .from('sale_payments')
    .insert({
      id: paymentId,
      ...paymentData
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating sale payment:', error)
    throw new Error('Failed to create sale payment')
  }

  // Clear cache for this sale's payments
  apiCache.delete(`sale-payments-${paymentData.sale_id}`)
  
  // The database triggers will automatically update the sale amount_paid and payment_status
  console.log(`✅ Created payment ${paymentId} for sale ${paymentData.sale_id}`)

  // 📅 TIMELINE: Create timeline event for the payment
  try {
    const sale = await getSaleById(paymentData.sale_id)
    
    if (sale) {
      // Calculate payment status after this payment
      const newAmountPaid = (sale.amount_paid || 0) + paymentData.amount
      const paymentStatus = newAmountPaid >= sale.total_amount ? 'fully paid' :
                           newAmountPaid > 0 ? 'partially paid' : 'paid'

      console.log(`💰 Payment calculation: totalAmount=${sale.total_amount}, currentPaid=${sale.amount_paid || 0}, newPayment=${paymentData.amount}, totalAfter=${newAmountPaid}, status=${paymentStatus}`)

      await createSaleEvent({
        sale_id: paymentData.sale_id,
        event_type: 'payment_made',
        event_title: `Payment Received`,
        event_description: `${paymentData.payment_method.replace('_', ' ')} payment of ৳${paymentData.amount.toLocaleString()} received${paymentData.notes ? ` - ${paymentData.notes}` : ''}`,
        payment_amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_id: paymentId,
        created_by: paymentData.created_by,
        metadata: {
          payment_status: paymentStatus,
          total_paid: newAmountPaid,
          remaining_balance: Math.max(0, sale.total_amount - newAmountPaid)
        }
      })
    }
  } catch (timelineError) {
    console.warn('⚠️ Failed to create timeline event for payment:', timelineError)
    // Don't fail the payment creation if timeline fails
  }

  return data
}

// Void a sale payment
export async function voidSalePayment(paymentId: string, voidReason?: string): Promise<SalePayment> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('sale_payments')
    .update({ 
      status: 'void',
      updated_at: new Date().toISOString(),
      notes: voidReason ? `VOIDED: ${voidReason}` : 'VOIDED'
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (error) {
    console.error('Error voiding sale payment:', error)
    throw new Error('Failed to void sale payment')
  }

  // Clear cache
  apiCache.delete(`sale-payments-${data.sale_id}`)

  console.log(`❌ Voided payment ${paymentId}`)

  // Create timeline event for voided payment
  try {
    await createSaleEvent({
      sale_id: data.sale_id,
      event_type: 'payment_voided',
      event_title: `Payment Voided`,
      event_description: `Payment of ৳${data.amount.toLocaleString()} voided${voidReason ? ` - ${voidReason}` : ''}`,
      payment_amount: data.amount,
      payment_method: data.payment_method,
      payment_id: paymentId,
      created_by: 'admin', // TODO: Get actual user
      metadata: { void_reason: voidReason }
    })
  } catch (timelineError) {
    console.warn('⚠️ Failed to create timeline event for voided payment:', timelineError)
  }

  return data
}

// Create a sale event for timeline tracking
export async function createSaleEvent(eventData: {
  sale_id: string
  event_type: SaleEvent['event_type']
  event_title: string
  event_description?: string
  previous_status?: string
  new_status?: string
  payment_amount?: number
  payment_method?: string
  payment_id?: string
  return_amount?: number
  return_reason?: string
  metadata?: any
  created_by?: string
}): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('sale_events')
    .insert({
      ...eventData,
      event_date: new Date().toISOString()
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating sale event:', error)
    throw new Error('Failed to create sale event')
  }

  return data.id
}

// Get sale timeline events
export async function getSaleTimeline(saleId: string): Promise<SaleEvent[]> {
  return apiCache.get(`sale-timeline-${saleId}`, async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('sale_events')
      .select('*')
      .eq('sale_id', saleId)
      .order('event_date', { ascending: false })

    if (error) {
      console.error('Error fetching sale timeline:', error)
      throw new Error('Failed to fetch sale timeline')
    }

    return data || []
  })
}

// Calculate payment status and amounts
export function calculateSalePaymentStatus(sale: SaleWithItems, amountPaid: number): {
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  remainingAmount: number
  overpaidAmount: number
  progressPercentage: number
} {
  const totalAmount = sale.total_amount
  const remaining = Math.max(0, totalAmount - amountPaid)
  const overpaid = Math.max(0, amountPaid - totalAmount)
  
  let status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  if (amountPaid === 0) {
    status = 'unpaid'
  } else if (amountPaid >= totalAmount) {
    status = overpaid > 0 ? 'overpaid' : 'paid'
  } else {
    status = 'partial'
  }

  const progressPercentage = Math.min(100, (amountPaid / totalAmount) * 100)

  return {
    status,
    remainingAmount: remaining,
    overpaidAmount: overpaid,
    progressPercentage
  }
}

// Get sale with payments information
export async function getSaleWithPayments(saleId: string): Promise<SaleWithItems & { 
  amount_paid?: number
  payment_status?: string
  payments?: SalePayment[]
} | null> {
  const sale = await getSaleById(saleId)
  if (!sale) return null

  const payments = await getSalePayments(saleId)
  
  return {
    ...sale,
    payments
  }
} 