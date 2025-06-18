import { createClient } from './client'
import type { Database, Customer, Sale, SaleItem, Return, ReturnItem, SaleWithItems, ReturnWithItems } from './types'
import { transformDatabaseProductToProduct } from './transforms'
import type { Product, ProductVariation, Packaging, PackagingVariation } from '../mock-data/erp-data'
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
      attributeValues: variation.variation_attributes?.reduce((acc: any, attr: any) => {
        acc[attr.attribute_id] = attr.attribute_value_id
        return acc
      }, {} as { [attributeId: string]: string }) || {},
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
      attributeValues: variation.attribute_values?.reduce((acc: any, attr: any) => {
        acc[attr.attribute_id] = attr.value_id
        return acc
      }, {} as { [attributeId: string]: string }) || {},
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
export const getSales = async () => {
  console.log('🔄 getSales() - Making Supabase API call at', new Date().toISOString())
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ getSales() - Error:', error)
    throw error
  }
  
  console.log('✅ getSales() - Success, returned', data.length, 'sales records')
  return data as SaleWithItems[]
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