import { createClient } from './client'

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
  current_stock?: number
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

export async function getWarehouses(): Promise<DatabaseWarehouse[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching warehouses:', error)
    throw new Error('Failed to fetch warehouses')
  }

  return data || []
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

export async function getActiveWarehouses(): Promise<DatabaseWarehouse[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('Error fetching active warehouses:', error)
    throw new Error('Failed to fetch active warehouses')
  }

  return data || []
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
  
  // Create new request
  packagingAttributesCache.promise = (async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('packaging_attributes')
        .select(`
          *,
          values:packaging_attribute_values(id, value, label, slug, sort_order, created_at)
        `)
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Error fetching packaging attributes:', error)
        throw new Error('Failed to fetch packaging attributes')
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
    } finally {
      // Clear the promise
      packagingAttributesCache.promise = null
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
  const now = Date.now()
  
  // Return cached data if fresh
  if (packagingCache.data && (now - packagingCache.timestamp) < packagingCache.CACHE_DURATION) {
    console.log('📦 getPackaging() - Using cached data')
    return packagingCache.data
  }
  
  // If there's already a request in progress, return it
  if (packagingCache.promise) {
    console.log('⏳ getPackaging() - Request already in progress, waiting...')
    return packagingCache.promise
  }
  
  console.log('🔄 getPackaging() - Fetching fresh data')
  
  // Create new request
  packagingCache.promise = (async () => {
    try {
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

      // Cache the result
      packagingCache.data = transformedData
      packagingCache.timestamp = now
      console.log('✅ getPackaging() - Data cached successfully')
      
      return transformedData
    } finally {
      // Clear the promise
      packagingCache.promise = null
    }
  })()
  
  return packagingCache.promise
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