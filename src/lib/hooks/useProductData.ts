'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Type definitions

// Raw query result from Supabase for variations
interface VariationQueryResult {
  id: string
  product_id: string
  sku: string
  price?: number
  created_at: string
  updated_at: string
  product_variation_attributes: Array<{
    attribute_id: string
    attribute_value_id: string
    attributes: { id: string; name: string; type: string }
    attribute_values: { id: string; value: string; label: string }
  }>
}

interface DatabaseProductVariation {
  id: string
  product_id: string
  sku: string
  price?: number
  created_at: string
  updated_at: string
  product_variation_attributes: DatabaseProductVariationAttribute[]
  // Computed property added during processing for easier access
  attribute_values?: DatabaseVariationAttributeValue[]
}

interface DatabaseProductVariationAttribute {
  attribute_id: string
  attribute_value_id: string
  attributes: {
    id: string
    name: string
    type: string
  }
  attribute_values: {
    id: string
    value: string
    label: string
  }
}

interface DatabaseProductAttribute {
  id: string
  attribute_id: string
  product_id: string
  created_at: string
  updated_at: string
  attributes: {
    id: string
    name: string
    type: string
  }
}

interface DatabaseProduct {
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
  category?: { id: string; name: string; slug: string }
  variations?: DatabaseProductVariation[]
  attributes?: DatabaseAttribute[]
  product_attributes?: DatabaseProductAttribute[]
}

interface DatabaseCategory {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface DatabaseAttributeValue {
  id: string
  value: string
  label: string
  sort_order?: number
  created_at: string
}

interface DatabaseVariationAttributeValue {
  attribute_id: string
  attribute_name: string
  value_id: string
  value_label: string
}

interface DatabaseAttribute {
  id: string
  name: string
  type: string
  required: boolean
  created_at: string
  updated_at: string
  values?: DatabaseAttributeValue[]
}

// Simple module-level cache to avoid window object issues
const dataCache = {
  product: null as DatabaseProduct | null,
  productId: '',
  categories: [] as DatabaseCategory[],
  attributes: [] as DatabaseAttribute[],
  lastFetch: {
    product: 0,
    categories: 0,
    attributes: 0
  },
  currentRequests: {
    products: new Map<string, Promise<DatabaseProduct | null>>(),
    categories: null as Promise<DatabaseCategory[]> | null,
    attributes: null as Promise<DatabaseAttribute[]> | null,
  },
  requestCounters: {
    product: 0,
    categories: 0,
    attributes: 0
  }
}

const CACHE_DURATION = 30000 // 30 seconds

// Client-side query functions with deduplication
async function getProductById(id: string, forceRefresh = false): Promise<DatabaseProduct | null> {
  const now = Date.now()

  // Check cache first
  if (!forceRefresh && 
      dataCache.product && 
      dataCache.productId === id &&
      (now - dataCache.lastFetch.product) < CACHE_DURATION) {
    console.log('📦 Using cached product data for', id)
    return dataCache.product
  }

  // If there's already a request in progress for this specific product, wait for it
  const existingRequest = dataCache.currentRequests.products.get(id)
  if (existingRequest) {
    console.log(`⏳ Product request already in progress for ID ${id}, waiting for existing promise...`)
    return await existingRequest
  }

  // Increment request counter for tracking
  dataCache.requestCounters.product++
  const requestNumber = dataCache.requestCounters.product
  
  // Generate unique request ID for tracking
  const requestId = Math.random().toString(36).substr(2, 9)
  
  // Create a new request promise
  const requestPromise = (async (): Promise<DatabaseProduct | null> => {
    try {
      console.log(`🔄 [${requestId}] (#${requestNumber}) Fetching fresh product data from API for`, id)
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
      let variations: DatabaseProductVariation[] = []
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
          variations = variationData.map((variation: VariationQueryResult): DatabaseProductVariation => ({
            ...variation,
            product_variation_attributes: variation.product_variation_attributes,
            attribute_values: variation.product_variation_attributes.map(pva => ({
              attribute_id: pva.attribute_id,
              attribute_name: pva.attributes.name,
              value_id: pva.attribute_value_id,
              value_label: pva.attribute_values.label
            }))
          }))
        }
      }

      const result = {
        ...product,
        variations: product.type === 'variation' ? variations : undefined,
        attributes: product.product_attributes?.map((pa: DatabaseProductAttribute) => pa.attributes) || []
      }

      // Update cache
      dataCache.product = result
      dataCache.productId = id
      dataCache.lastFetch.product = now

      console.log(`✅ [${requestId}] (#${requestNumber}) Product data fetched successfully`)
      return result
    } catch (error) {
      console.error(`❌ [${requestId}] (#${requestNumber}) Error loading product data:`, error)
      throw error
    } finally {
      dataCache.currentRequests.products.delete(id)
    }
  })()

  // Store the request promise for this specific product ID
  dataCache.currentRequests.products.set(id, requestPromise)
  
  return await requestPromise
}

async function getCategories(forceRefresh = false): Promise<DatabaseCategory[]> {
  const now = Date.now()

  // Check cache first
  if (!forceRefresh && 
      dataCache.categories.length > 0 && 
      (now - dataCache.lastFetch.categories) < CACHE_DURATION) {
    console.log('📦 Using cached categories data')
    return dataCache.categories
  }

  // If there's already a request in progress, wait for it
  if (dataCache.currentRequests.categories) {
    console.log('⏳ Categories request already in progress, waiting for existing promise...')
    return await dataCache.currentRequests.categories
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<DatabaseCategory[]> => {
    try {
      console.log('🔄 Fetching fresh categories data from API')
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

      const result = data || []

      // Update cache
      dataCache.categories = result
      dataCache.lastFetch.categories = now

      console.log('✅ Categories data fetched successfully')
      return result
    } catch (error) {
      console.error('❌ Error loading categories data:', error)
      throw error
    } finally {
      dataCache.currentRequests.categories = null
    }
  })()

  // Store the request promise
  dataCache.currentRequests.categories = requestPromise
  
  return await requestPromise
}

async function getAttributes(forceRefresh = false): Promise<DatabaseAttribute[]> {
  const now = Date.now()

  // Check cache first
  if (!forceRefresh && 
      dataCache.attributes.length > 0 && 
      (now - dataCache.lastFetch.attributes) < CACHE_DURATION) {
    console.log('📦 Using cached attributes data')
    return dataCache.attributes
  }

  // If there's already a request in progress, wait for it
  if (dataCache.currentRequests.attributes) {
    console.log('⏳ Attributes request already in progress, waiting for existing promise...')
    return await dataCache.currentRequests.attributes
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<DatabaseAttribute[]> => {
    try {
      console.log('🔄 Fetching fresh attributes data from API')
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

      const result = data?.map(attr => ({
        ...attr,
        values: attr.values?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      })) || []

      // Update cache
      dataCache.attributes = result
      dataCache.lastFetch.attributes = now

      console.log('✅ Attributes data fetched successfully')
      return result
    } catch (error) {
      console.error('❌ Error loading attributes data:', error)
      throw error
    } finally {
      dataCache.currentRequests.attributes = null
    }
  })()

  // Store the request promise
  dataCache.currentRequests.attributes = requestPromise
  
  return await requestPromise
}


// Custom hook for product data management
export function useProductData(productId?: string) {
  const [product, setProduct] = useState<DatabaseProduct | null>(null)
  const [categories, setCategories] = useState<DatabaseCategory[]>([])
  const [attributes, setAttributes] = useState<DatabaseAttribute[]>([])
  const [loading, setLoading] = useState({
    product: false,
    categories: false,
    attributes: false
  })
  const [errors, setErrors] = useState({
    product: null as string | null,
    categories: null as string | null,
    attributes: null as string | null
  })

  const loadProduct = useCallback(async (id: string, forceRefresh = false) => {
    setLoading(prev => ({ ...prev, product: true }))
    setErrors(prev => ({ ...prev, product: null }))
    
    try {
      const productData = await getProductById(id, forceRefresh)
      setProduct(productData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load product'
      setErrors(prev => ({ ...prev, product: errorMessage }))
    } finally {
      setLoading(prev => ({ ...prev, product: false }))
    }
  }, [])

  const loadCategories = useCallback(async (forceRefresh = false) => {
    setLoading(prev => ({ ...prev, categories: true }))
    setErrors(prev => ({ ...prev, categories: null }))
    
    try {
      const categoriesData = await getCategories(forceRefresh)
      setCategories(categoriesData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load categories'
      setErrors(prev => ({ ...prev, categories: errorMessage }))
    } finally {
      setLoading(prev => ({ ...prev, categories: false }))
    }
  }, [])

  const loadAttributes = useCallback(async (forceRefresh = false) => {
    setLoading(prev => ({ ...prev, attributes: true }))
    setErrors(prev => ({ ...prev, attributes: null }))
    
    try {
      const attributesData = await getAttributes(forceRefresh)
      setAttributes(attributesData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load attributes'
      setErrors(prev => ({ ...prev, attributes: errorMessage }))
    } finally {
      setLoading(prev => ({ ...prev, attributes: false }))
    }
  }, [])


  const clearCache = useCallback(() => {
    dataCache.product = null
    dataCache.productId = ''
    dataCache.categories = []
    dataCache.attributes = []
    dataCache.currentRequests.products.clear()
    dataCache.lastFetch = { product: 0, categories: 0, attributes: 0 }
  }, [])

  // Load initial data
  useEffect(() => {
    if (productId) {
      loadProduct(productId)
    }
    loadCategories()
    loadAttributes()
  }, [productId, loadProduct, loadCategories, loadAttributes])

  return {
    product,
    categories,
    attributes,
    loading,
    errors,
    loadProduct,
    loadCategories,
    loadAttributes,
    clearCache
  }
}

// Export types for external use
export type { 
  DatabaseProduct,
  DatabaseProductVariation,
  DatabaseProductVariationAttribute,
  DatabaseProductAttribute,
  DatabaseCategory, 
  DatabaseAttribute, 
  DatabaseAttributeValue,
  DatabaseVariationAttributeValue,
  VariationQueryResult
}