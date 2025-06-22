import { createClient } from './client'
import { apiCache } from './cache'

export interface DatabaseProduct {
  id: string
  name: string
  sku?: string
  description: string
  price?: number
  category_id?: string
  status: 'active' | 'inactive'
  type: 'simple' | 'variation'
  image_url?: string
  parent_sku?: string
  created_at: string
  updated_at: string
  // Joined data
  category?: {
    id: string
    name: string
    slug: string
  }
  variations?: DatabaseProductVariation[]
  attributes?: {
    id: string
    name: string
    type: string
  }[]
}

export interface DatabaseProductVariation {
  id: string
  product_id: string
  sku: string
  price: number
  created_at: string
  updated_at: string
  attribute_values?: {
    attribute_id: string
    attribute_name: string
    value_id: string
    value_label: string
  }[]
}

export interface DatabaseCategory {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface DatabaseWarehouse {
  id: string
  name: string
  location?: string
  address?: string
  manager?: string
  contact?: string
  capacity?: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface DatabaseAttribute {
  id: string
  name: string
  type: string
  required: boolean
  created_at: string
  updated_at: string
  values?: DatabaseAttributeValue[]
}

export interface DatabaseAttributeValue {
  id: string
  attribute_id: string
  value: string
  label: string
  sort_order: number
  created_at: string
}

// Packaging-related interfaces
export interface DatabasePackagingAttribute {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  values?: DatabasePackagingAttributeValue[]
}

export interface DatabasePackagingAttributeValue {
  id: string
  attribute_id: string
  value: string
  label: string
  slug: string
  sort_order: number
  created_at: string
}

export interface DatabasePackaging {
  id: string
  title: string
  description?: string
  type: 'simple' | 'variable'
  sku?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  // Joined data
  attributes?: string[]
  variations?: DatabasePackagingVariation[]
}

export interface DatabasePackagingVariation {
  id: string
  packaging_id: string
  sku: string
  created_at: string
  updated_at: string
  attribute_values?: {
    attribute_id: string
    attribute_name: string
    value_id: string
    value_label: string
  }[]
}

export interface DatabasePackagingWarehouseStock {
  id: string
  packaging_id: string
  warehouse_id: string
  variation_id?: string
  current_stock: number
  reserved_stock: number
  available_stock: number
  buying_price?: number
  bought_quantity?: number
  last_movement_at?: string
  created_at: string
  updated_at: string
}

export async function getProducts(): Promise<DatabaseProduct[]> {
  return apiCache.get('products-all', async () => {
    const supabase = createClient()
    
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      throw new Error('Failed to fetch products')
    }

    // Get variations for variation products
    const variationProductIds = products
      .filter(p => p.type === 'variation')
      .map(p => p.id)

    let variationsWithAttributes: any[] = []
    if (variationProductIds.length > 0) {
      const { data: variations, error: variationsError } = await supabase
        .from('product_variations')
        .select(`
          *,
          product_variation_attributes(
            attribute_id,
            attribute_value_id,
            attributes!inner(id, name, type),
            attribute_values!inner(id, value, label)
          )
        `)
        .in('product_id', variationProductIds)

      if (variationsError) {
        console.error('Error fetching variations:', variationsError)
      } else {
        variationsWithAttributes = variations || []
      }
    }

    // Transform the data to include variations
    return products.map(product => ({
      ...product,
      variations: product.type === 'variation' 
        ? variationsWithAttributes
            .filter(v => v.product_id === product.id)
            .map(variation => ({
              ...variation,
              attribute_values: variation.product_variation_attributes.map((pva: any) => ({
                attribute_id: pva.attribute_id,
                attribute_name: pva.attributes.name,
                value_id: pva.attribute_value_id,
                value_label: pva.attribute_values.label
              }))
            }))
        : undefined
    }))
  })
}

export async function getProductById(id: string): Promise<DatabaseProduct | null> {
  const supabase = createClient()
  
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      product_attributes(
        attribute_id,
        attributes!inner(id, name, type)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }

  // Get variations if it's a variation product
  let variations: any[] = []
  if (product.type === 'variation') {
    const { data: variationData, error: variationsError } = await supabase
      .from('product_variations')
      .select(`
        *,
        product_variation_attributes(
          attribute_id,
          attribute_value_id,
          attributes!inner(id, name, type),
          attribute_values!inner(id, value, label)
        )
      `)
      .eq('product_id', id)

    if (!variationsError && variationData) {
      variations = variationData.map(variation => ({
        ...variation,
        attribute_values: variation.product_variation_attributes.map((pva: any) => ({
          attribute_id: pva.attribute_id,
          attribute_name: pva.attributes.name,
          value_id: pva.attribute_value_id,
          value_label: pva.attribute_values.label
        }))
      }))
    }
  }

  return {
    ...product,
    variations: product.type === 'variation' ? variations : undefined,
    attributes: product.product_attributes?.map((pa: any) => pa.attributes) || []
  }
}

export async function getCategories(): Promise<DatabaseCategory[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('Error fetching categories:', error)
    throw new Error('Failed to fetch categories')
  }

  return data || []
}

// Global cache for warehouses to prevent duplicate API calls
let warehousesCache: {
  data: DatabaseWarehouse[] | null
  timestamp: number
  promise: Promise<DatabaseWarehouse[]> | null
} = {
  data: null,
  timestamp: 0,
  promise: null
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getWarehouses(): Promise<DatabaseWarehouse[]> {
  const now = Date.now()

  // Return cached data if it's still fresh
  if (warehousesCache.data && (now - warehousesCache.timestamp) < CACHE_DURATION) {
    console.log('🏭 Using cached warehouses data')
    return warehousesCache.data
  }

  // If there's already a request in progress, wait for it
  if (warehousesCache.promise) {
    console.log('🏭 Warehouses request already in progress, waiting...')
    return warehousesCache.promise
  }

  // Create new request promise
  const requestPromise = (async (): Promise<DatabaseWarehouse[]> => {
    try {
      console.log('🏭 Fetching fresh warehouses data from API')
      const supabase = createClient()

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching warehouses:', error)
        throw new Error('Failed to fetch warehouses')
      }

      const result = data || []

      // Update cache with result
      warehousesCache.data = result
      warehousesCache.timestamp = now
      warehousesCache.promise = null

      return result
    } catch (error) {
      // Clear promise on error so next call can retry
      warehousesCache.promise = null
      throw error
    }
  })()

  // Store the promise
  warehousesCache.promise = requestPromise

  return requestPromise
}

export async function getWarehouseById(id: string): Promise<DatabaseWarehouse | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No rows found
    }
    console.error('Error fetching warehouse:', error)
    throw new Error('Failed to fetch warehouse')
  }

  return data
}

// Cache invalidation function
export function invalidateWarehousesCache(): void {
  console.log('🗑️ Invalidating warehouses cache')
  warehousesCache.data = null
  warehousesCache.timestamp = 0
  warehousesCache.promise = null
}

export async function getActiveWarehouses(): Promise<DatabaseWarehouse[]> {
  // Get all warehouses from cache and filter active ones
  const allWarehouses = await getWarehouses()
  return allWarehouses.filter(warehouse => warehouse.status === 'active')
}

export async function getAttributes(): Promise<DatabaseAttribute[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('attributes')
    .select(`
      *,
      values:attribute_values(id, value, label, sort_order, created_at)
    `)
    .order('name')

  if (error) {
    console.error('Error fetching attributes:', error)
    throw new Error('Failed to fetch attributes')
  }

  return data?.map(attr => ({
    ...attr,
    values: attr.values?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
  })) || []
}

export async function getAttributeValues(attributeId: string): Promise<DatabaseAttributeValue[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('attribute_values')
    .select('*')
    .eq('attribute_id', attributeId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching attribute values:', error)
    throw new Error('Failed to fetch attribute values')
  }

  return data || []
}

export async function getProductsByCategory(categoryId: string): Promise<DatabaseProduct[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('Error fetching products by category:', error)
    throw new Error('Failed to fetch products by category')
  }

  return data || []
}

export async function getProductsByWarehouse(warehouseId: string): Promise<DatabaseProduct[]> {
  const supabase = createClient()
  
  // Get products that have stock in the specified warehouse
  const { data: stockData, error: stockError } = await supabase
    .from('product_warehouse_stock')
    .select(`
      product_id,
      products!inner(
        *,
        category:categories(id, name, slug)
      )
    `)
    .eq('warehouse_id', warehouseId)
    .gt('current_stock', 0)

  if (stockError) {
    console.error('Error fetching products by warehouse:', stockError)
    throw new Error('Failed to fetch products by warehouse')
  }

  // Extract unique products
  const uniqueProducts = new Map()
  stockData?.forEach(item => {
    if (!uniqueProducts.has(item.product_id)) {
      uniqueProducts.set(item.product_id, item.products)
    }
  })

  return Array.from(uniqueProducts.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export async function searchProducts(searchTerm: string): Promise<DatabaseProduct[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug)
    `)
    .or(`name.ilike.%${searchTerm}%, sku.ilike.%${searchTerm}%, description.ilike.%${searchTerm}%`)
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('Error searching products:', error)
    throw new Error('Failed to search products')
  }

  return data || []
}

// Global cache for packaging attributes to prevent duplicate API calls
const packagingAttributesCache = {
  data: null as DatabasePackagingAttribute[] | null,
  timestamp: 0,
  promise: null as Promise<DatabasePackagingAttribute[]> | null,
  CACHE_DURATION: 30000 // 30 seconds
}

// Packaging attribute queries
export async function getPackagingAttributes(): Promise<DatabasePackagingAttribute[]> {
  const now = Date.now()
  
  // Return cached data if fresh
  if (packagingAttributesCache.data && (now - packagingAttributesCache.timestamp) < packagingAttributesCache.CACHE_DURATION) {
    console.log('📦 getPackagingAttributes() - Using cached data')
    return packagingAttributesCache.data
  }
  
  // If there's already a request in progress, return it
  if (packagingAttributesCache.promise) {
    console.log('⏳ getPackagingAttributes() - Request already in progress, waiting...')
    return packagingAttributesCache.promise
  }
  
  console.log('🔄 getPackagingAttributes() - Fetching fresh data')
  
  // Create new request with timeout and proper cleanup
  packagingAttributesCache.promise = (async () => {
    try {
      const supabase = createClient()
      
      // Add timeout to prevent hanging forever
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.error('⏰ getPackagingAttributes() - Request timed out after 10 seconds')
      }, 10000) // 10 second timeout
      
      const { data, error } = await supabase
        .from('packaging_attributes')
        .select(`
          *,
          values:packaging_attribute_values(id, value, label, slug, sort_order, created_at)
        `)
        .eq('status', 'active')
        .order('name')
      
      clearTimeout(timeoutId)

      if (error) {
        console.error('❌ getPackagingAttributes() - Error fetching packaging attributes:', error)
        throw new Error(`Failed to fetch packaging attributes: ${error.message}`)
      }

      const transformedData = data?.map(attr => ({
        ...attr,
        values: attr.values?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      })) || []

      // Cache the result
      packagingAttributesCache.data = transformedData
      packagingAttributesCache.timestamp = now
      console.log('✅ getPackagingAttributes() - Data cached successfully')
      
      return transformedData
    } catch (error) {
      console.error('💥 getPackagingAttributes() - Promise failed:', error)
      // Return empty array as fallback instead of throwing
      const fallbackData: DatabasePackagingAttribute[] = []
      packagingAttributesCache.data = fallbackData
      packagingAttributesCache.timestamp = now
      return fallbackData
    } finally {
      // CRITICAL: Always clear the promise, even on error
      packagingAttributesCache.promise = null
      console.log('🧹 getPackagingAttributes() - Promise cleaned up')
    }
  })()
  
  return packagingAttributesCache.promise
}

// Function to invalidate packaging attributes cache
export function invalidatePackagingAttributesCache() {
  console.log('🗑️ Invalidating packaging attributes cache')
  packagingAttributesCache.data = null
  packagingAttributesCache.timestamp = 0
  packagingAttributesCache.promise = null
}

// Global cache for packaging warehouse stock to prevent duplicate API calls
const packagingWarehouseStockCache = {
  data: null as any[] | null,
  timestamp: 0,
  promise: null as Promise<any[]> | null,
  CACHE_DURATION: 30000 // 30 seconds
}

// Get all packaging warehouse stock in one query (for batch operations)
export async function getAllPackagingWarehouseStock(): Promise<any[]> {
  const now = Date.now()
  
  // Return cached data if fresh
  if (packagingWarehouseStockCache.data && (now - packagingWarehouseStockCache.timestamp) < packagingWarehouseStockCache.CACHE_DURATION) {
    console.log('📦 getAllPackagingWarehouseStock() - Using cached data')
    return packagingWarehouseStockCache.data
  }
  
  // If there's already a request in progress, return it
  if (packagingWarehouseStockCache.promise) {
    console.log('⏳ getAllPackagingWarehouseStock() - Request already in progress, waiting...')
    return packagingWarehouseStockCache.promise
  }
  
  console.log('🔄 getAllPackagingWarehouseStock() - Fetching fresh data')
  
  // Create new request
  packagingWarehouseStockCache.promise = (async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('packaging_warehouse_stock')
        .select('packaging_id, variation_id, current_stock')

      if (error) {
        console.error('Error fetching packaging warehouse stock:', error)
        throw new Error('Failed to fetch packaging warehouse stock')
      }

      // Cache the result
      packagingWarehouseStockCache.data = data || []
      packagingWarehouseStockCache.timestamp = now
      console.log('✅ getAllPackagingWarehouseStock() - Data cached successfully')
      
      return data || []
    } finally {
      // Clear the promise
      packagingWarehouseStockCache.promise = null
    }
  })()
  
  return packagingWarehouseStockCache.promise
}

// Function to invalidate packaging warehouse stock cache
export function invalidatePackagingWarehouseStockCache() {
  console.log('🗑️ Invalidating packaging warehouse stock cache')
  packagingWarehouseStockCache.data = null
  packagingWarehouseStockCache.timestamp = 0
  packagingWarehouseStockCache.promise = null
}

export async function getPackagingAttributeById(id: string): Promise<DatabasePackagingAttribute | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('packaging_attributes')
    .select(`
      *,
      values:packaging_attribute_values(id, value, label, slug, sort_order, created_at)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching packaging attribute:', error)
    return null
  }

  return {
    ...data,
    values: data.values?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
  }
}

export async function getPackagingAttributeValues(attributeId: string): Promise<DatabasePackagingAttributeValue[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('packaging_attribute_values')
    .select('*')
    .eq('attribute_id', attributeId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching packaging attribute values:', error)
    throw new Error('Failed to fetch packaging attribute values')
  }

  return data || []
}

// Global cache for packaging data to prevent duplicate API calls
const packagingCache = {
  data: null as DatabasePackaging[] | null,
  timestamp: 0,
  promise: null as Promise<DatabasePackaging[]> | null,
  CACHE_DURATION: 30000 // 30 seconds
}

// Packaging queries
export async function getPackaging(): Promise<DatabasePackaging[]> {
  return apiCache.get('packaging-all', async () => {
    const supabase = createClient()
    
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
      .order('title')

    if (error) {
      console.error('Error fetching packaging:', error)
      throw new Error('Failed to fetch packaging')
    }

    // Transform the data to include attribute values in the expected format
    const transformedData = data?.map(packaging => ({
      ...packaging,
      variations: packaging.variations?.map((variation: any) => ({
        ...variation,
        attribute_values: variation.variation_attributes?.map((attr: any) => ({
          attribute_id: attr.attribute_id,
          attribute_name: attr.attribute?.name || '',
          value_id: attr.attribute_value_id,
          value_label: attr.value?.label || attr.value?.value || ''
        })) || []
      })) || []
    })) || []
    
    return transformedData
  })
}

// Function to invalidate packaging cache (call this after CREATE/UPDATE/DELETE operations)
export function invalidatePackagingCache() {
  console.log('🗑️ Invalidating packaging cache')
  packagingCache.data = null
  packagingCache.timestamp = 0
  packagingCache.promise = null
}

export async function getPackagingById(id: string): Promise<DatabasePackaging | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('packaging')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching packaging:', error)
    return null
  }

  if (!data) return null

  // Get packaging attributes
  const { data: attributeIds, error: attrError } = await supabase
    .from('packaging_packaging_attributes')
    .select('attribute_id')
    .eq('packaging_id', id)

  if (attrError) {
    console.error('Error fetching packaging attributes:', attrError)
  }

  // Get packaging variations with their attribute values
  const { data: variations, error: varError } = await supabase
    .from('packaging_variations')
    .select(`
      *,
      variation_attributes:packaging_variation_attributes(
        attribute_id,
        attribute_value_id,
        attribute:packaging_attributes(name),
        value:packaging_attribute_values(value, label)
      )
    `)
    .eq('packaging_id', id)

  if (varError) {
    console.error('Error fetching packaging variations:', varError)
  }

  // Transform variation attribute data
  const transformedVariations = variations?.map(variation => ({
    ...variation,
    attribute_values: variation.variation_attributes?.map((attr: any) => ({
      attribute_id: attr.attribute_id,
      attribute_name: attr.attribute?.name || '',
      value_id: attr.attribute_value_id,
      value_label: attr.value?.label || attr.value?.value || ''
    })) || []
  }))

  return {
    ...data,
    attributes: attributeIds?.map(a => a.attribute_id) || [],
    variations: transformedVariations || []
  }
}

export async function getPackagingVariations(packagingId: string): Promise<DatabasePackagingVariation[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('packaging_variations')
    .select(`
      *,
      variation_attributes:packaging_variation_attributes(
        attribute_id,
        attribute_value_id,
        attribute:packaging_attributes(name),
        value:packaging_attribute_values(value, label)
      )
    `)
    .eq('packaging_id', packagingId)

  if (error) {
    console.error('Error fetching packaging variations:', error)
    throw new Error('Failed to fetch packaging variations')
  }

  // Transform the data to match our interface
  return data?.map(variation => ({
    ...variation,
    attribute_values: variation.variation_attributes?.map((attr: any) => ({
      attribute_id: attr.attribute_id,
      attribute_name: attr.attribute?.name || '',
      value_id: attr.attribute_value_id,
      value_label: attr.value?.label || attr.value?.value || ''
    })) || []
  })) || []
}

// Packaging warehouse stock functions
export async function getPackagingWarehouseStock(packagingId: string, warehouseId?: string): Promise<DatabasePackagingWarehouseStock[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('packaging_warehouse_stock')
    .select('*')
    .eq('packaging_id', packagingId)

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching packaging warehouse stock:', error)
    throw new Error('Failed to fetch packaging warehouse stock')
  }

  return data || []
}

export async function getPackagingStockByWarehouse(warehouseId: string): Promise<DatabasePackagingWarehouseStock[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('packaging_warehouse_stock')
    .select(`
      *,
      packaging:packaging!inner(id, title, sku, type, status),
      packaging_variation:packaging_variations(id, sku)
    `)
    .eq('warehouse_id', warehouseId)
    .order('current_stock', { ascending: false })

  if (error) {
    console.error('Error fetching packaging stock by warehouse:', error)
    throw new Error('Failed to fetch packaging stock by warehouse')
  }

  return data || []
}

export async function getTotalPackagingStock(packagingId: string, variationId?: string): Promise<number> {
  const supabase = createClient()
  
  let query = supabase
    .from('packaging_warehouse_stock')
    .select('current_stock')
    .eq('packaging_id', packagingId)

  if (variationId) {
    query = query.eq('variation_id', variationId)
  } else {
    query = query.is('variation_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching total packaging stock:', error)
    return 0
  }

  return data?.reduce((total, item) => total + (item.current_stock || 0), 0) || 0
}

// Helper function to get total product variation stock across all warehouses
export async function getTotalProductVariationStock(productId: string, variationId?: string): Promise<number> {
  const supabase = createClient()
  
  let query = supabase
    .from('product_warehouse_stock')
    .select('current_stock')
    .eq('product_id', productId)

  if (variationId) {
    query = query.eq('variation_id', variationId)
  } else {
    query = query.is('variation_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching total product variation stock:', error)
    return 0
  }

  return data?.reduce((total, item) => total + (item.current_stock || 0), 0) || 0
}

// Global cache for recent activities to prevent duplicate API calls
const recentActivitiesCache = {
  data: null as any[] | null,
  timestamp: 0,
  promise: null as Promise<any[]> | null,
  abortController: null as AbortController | null,
  CACHE_DURATION: 30000 // 30 seconds
}

// Expose simple debug helper in the browser console
if (typeof window !== 'undefined') {
  (window as any).debugRecentActivitiesCache = () => {
    const now = Date.now()
    console.log('[debugRecentActivitiesCache] Current time:', new Date(now).toISOString())
    console.table({
      hasData: Boolean(recentActivitiesCache.data),
      dataLength: recentActivitiesCache.data?.length ?? 0,
      ageMs: now - recentActivitiesCache.timestamp,
      promiseInFlight: Boolean(recentActivitiesCache.promise)
    })
    return recentActivitiesCache
  }

  // Test the RPC function directly
  (window as any).testRecentActivitiesRPC = async () => {
    console.log('🧪 [testRecentActivitiesRPC] Testing RPC function directly...')
    try {
      const supabase = createClient()
      console.log('🔑 [testRecentActivitiesRPC] Supabase client created')
      
      // Test with a small limit first
      const { data, error } = await supabase.rpc('get_recent_activities', { p_limit: 5 })
      
      if (error) {
        console.error('❌ [testRecentActivitiesRPC] RPC error:', error)
        return { success: false, error }
      }
      
      console.log('✅ [testRecentActivitiesRPC] RPC success:', data)
      return { success: true, data, count: data?.length || 0 }
    } catch (err) {
      console.error('❌ [testRecentActivitiesRPC] Exception:', err)
      return { success: false, error: err }
    }
  }

  // Test basic connectivity to Supabase
  (window as any).testSupabaseConnectivity = async () => {
    console.log('🌐 [testSupabaseConnectivity] Testing basic connectivity...')
    try {
      const supabase = createClient()
      
      console.log('🔍 [testSupabaseConnectivity] Testing auth status...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session result:', { hasSession: Boolean(session), error: sessionError })
      
      console.log('🔍 [testSupabaseConnectivity] Testing simple query...')
      const { data, error } = await supabase.from('activity_logs').select('count').limit(1)
      console.log('Simple query result:', { data, error })
      
      return { session: Boolean(session), queryWorked: !error, error }
    } catch (err) {
      console.error('❌ [testSupabaseConnectivity] Exception:', err)
      return { error: err }
    }
  }

  // Test direct RPC call without any auth checks
  (window as any).testDirectRPC = async () => {
    console.log('🚀 [testDirectRPC] Testing direct RPC call...')
    try {
      // Create a fresh client instance
      const supabase = createClient()
      
      console.log('📡 [testDirectRPC] Making direct RPC call...')
      const startTime = Date.now()
      
      // Make RPC call with timeout
      const { data, error } = await Promise.race([
        supabase.rpc('get_recent_activities', { p_limit: 3 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Direct RPC timeout after 5s')), 5000)
        )
      ])
      
      const endTime = Date.now()
      console.log(`⏰ [testDirectRPC] Completed in ${endTime - startTime}ms`)
      
      if (error) {
        console.error('❌ [testDirectRPC] RPC error:', error)
        return { success: false, error, duration: endTime - startTime }
      }
      
      console.log('✅ [testDirectRPC] Success:', data)
      return { success: true, data, count: data?.length, duration: endTime - startTime }
    } catch (err) {
      console.error('❌ [testDirectRPC] Exception:', err)
      return { success: false, error: err }
    }
  }

  // Force clear cache and abort any in-flight requests
  (window as any).clearRecentActivitiesCache = () => {
    console.log('🗑️ [clearRecentActivitiesCache] Force clearing cache...')
    if (recentActivitiesCache.abortController) {
      console.log('🚫 [clearRecentActivitiesCache] Aborting in-flight request')
      recentActivitiesCache.abortController.abort()
    }
    recentActivitiesCache.data = null
    recentActivitiesCache.timestamp = 0
    recentActivitiesCache.promise = null
    recentActivitiesCache.abortController = null
    console.log('✅ [clearRecentActivitiesCache] Cache cleared completely')
  }
}

// Activity queries with request deduplication
export async function getRecentActivities(limit: number = 100): Promise<any[]> {
  const now = Date.now()
  
  // Return cached data if fresh
  if (recentActivitiesCache.data && (now - recentActivitiesCache.timestamp) < recentActivitiesCache.CACHE_DURATION) {
    console.log(
      `📋 [getRecentActivities] Serving from cache. Age: ${now - recentActivitiesCache.timestamp} ms, Size: ${recentActivitiesCache.data.length}`
    )
    return recentActivitiesCache.data
  }
  
  // If there's already a request in progress, return it
  if (recentActivitiesCache.promise) {
    console.log('⏳ [getRecentActivities] Awaiting in-flight request…')
    return recentActivitiesCache.promise
  }
  
  // Cancel any previous stuck request
  if (recentActivitiesCache.abortController) {
    console.log('🚫 [getRecentActivities] Aborting previous stuck request')
    recentActivitiesCache.abortController.abort()
  }
  
  console.log('🔄 [getRecentActivities] Fetching fresh data…')
  
  const TIMEOUT_MS = 10_000 // 10 s cap
  const start = Date.now()
  
  // Create new AbortController for this request
  recentActivitiesCache.abortController = new AbortController()
  const abortController = recentActivitiesCache.abortController
  
  // --- NEW PROMISE WITH HARD TIME-OUT (avoids stuck skeleton) ---
  recentActivitiesCache.promise = (async (): Promise<any[]> => {
    try {
      // Run Supabase RPC and timeout in parallel – whichever resolves first wins
      const result = await Promise.race([
        (async () => {
          console.log('🚀 [getRecentActivities] Creating Supabase client...')
          const supabase = createClient()
          
          console.log('🔧 [getRecentActivities] Supabase client created, skipping auth check...')
          
          // Proactive session refresh to ensure token is fresh
          console.log('🔄 [getRecentActivities] Refreshing session for reliable RPC call...')
          try {
            await Promise.race([
              supabase.auth.refreshSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Session refresh timeout')), 3000))
            ])
            console.log('✅ [getRecentActivities] Session refresh completed')
          } catch (err) {
            console.warn('⚠️ [getRecentActivities] Session refresh failed, proceeding anyway:', err.message)
          }
          
          console.log('📡 [getRecentActivities] Making RPC call to get_recent_activities...')
          
          const startTime = Date.now()
          console.log('🌐 [getRecentActivities] About to call supabase.rpc...')
          const rpcResult = supabase.rpc('get_recent_activities', {
            p_limit: limit
          }).abortSignal(abortController.signal)
          
          console.log('🎯 [getRecentActivities] RPC query created, awaiting result...')
          const { data, error } = await rpcResult
          const endTime = Date.now()
          console.log(`📊 [getRecentActivities] RPC completed in ${endTime - startTime}ms`)

          if (error) {
            console.error('❌ [getRecentActivities] RPC error:', error)
            throw new Error('Failed to fetch recent activities')
          }
          
          console.log(`📋 [getRecentActivities] RPC success - received ${data?.length || 0} records`)
          return data || []
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            console.log('⏰ [getRecentActivities] Hard timeout reached after 10s')
            abortController.abort() // Cancel the RPC request
            reject(new Error('Timeout after 10 s'))
          }, TIMEOUT_MS)
        )
      ]) as any[]

      // Cache successful result
      recentActivitiesCache.data = result
      recentActivitiesCache.timestamp = now
      console.log(`✅ [getRecentActivities] Success – ${result.length} rows in ${Date.now() - start} ms`)
      return result
    } catch (error) {
      console.error('❌ [getRecentActivities] Error/Timeout after', Date.now() - start, 'ms :', error)
      // If we have stale cache, return it so UI is not stuck
      if (recentActivitiesCache.data) {
        console.warn('⚠️ [getRecentActivities] Returning stale activity data due to error/timeout')
        return recentActivitiesCache.data
      }
      return []
    } finally {
      recentActivitiesCache.promise = null
      recentActivitiesCache.abortController = null
      console.log('[getRecentActivities] Promise cleared – ready for next request')
    }
  })()

  return recentActivitiesCache.promise
}

/**
 * Clear recent activities cache
 */
export function clearRecentActivitiesCache(): void {
  console.log('🗑️ Clearing recent activities cache')
  recentActivitiesCache.data = null
  recentActivitiesCache.timestamp = 0
  recentActivitiesCache.promise = null
}