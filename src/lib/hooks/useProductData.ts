'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { checkSkuExists } from '@/lib/supabase/mutations'

// Type definitions
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
  variations?: any[]
  attributes?: any[]
  product_attributes?: any[]
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

interface DatabaseAttribute {
  id: string
  name: string
  type: string
  required: boolean
  created_at: string
  updated_at: string
  values?: any[]
}

// Simple module-level cache to avoid window object issues
const dataCache = {
  product: null as DatabaseProduct | null,
  productId: '',
  categories: [] as DatabaseCategory[],
  attributes: [] as DatabaseAttribute[],
  skuValidations: new Map<string, { result: boolean, timestamp: number }>(),
  lastFetch: {
    product: 0,
    categories: 0,
    attributes: 0
  },
  currentRequests: {
    product: null as Promise<DatabaseProduct | null> | null,
    categories: null as Promise<DatabaseCategory[]> | null,
    attributes: null as Promise<DatabaseAttribute[]> | null,
    skuValidations: new Map<string, Promise<boolean>>()
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

  // If there's already a request in progress, wait for it regardless of product ID
  if (dataCache.currentRequests.product) {
    console.log('⏳ Product request already in progress, waiting for existing promise...')
    return await dataCache.currentRequests.product
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

      const result = {
        ...product,
        variations: product.type === 'variation' ? variations : undefined,
        attributes: product.product_attributes?.map((pa: any) => pa.attributes) || []
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
      dataCache.currentRequests.product = null
    }
  })()

  // Store the request promise
  dataCache.currentRequests.product = requestPromise
  
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
        values: attr.values?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
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

// Deduplicated SKU validation function
async function validateSkuUnique(sku: string, excludeId: string, forceRefresh = false): Promise<boolean> {
  const now = Date.now()
  const cacheKey = `${sku}:${excludeId}`

  // Check cache first
  if (!forceRefresh) {
    const cached = dataCache.skuValidations.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached SKU validation for', sku)
      return cached.result
    }
  }

  // If there's already a request in progress, wait for it
  const existingRequest = dataCache.currentRequests.skuValidations.get(cacheKey)
  if (existingRequest) {
    console.log('⏳ SKU validation request already in progress, waiting for existing promise...')
    return await existingRequest
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<boolean> => {
    try {
      console.log('🔄 Fetching fresh SKU validation from API for', sku)
      const exists = await checkSkuExists(sku, excludeId)
      
      // Update cache
      dataCache.skuValidations.set(cacheKey, { result: exists, timestamp: now })
      
      console.log('✅ SKU validation completed')
      return exists
    } catch (error) {
      console.error('❌ Error validating SKU:', error)
      throw error
    } finally {
      dataCache.currentRequests.skuValidations.delete(cacheKey)
    }
  })()

  // Store the request promise
  dataCache.currentRequests.skuValidations.set(cacheKey, requestPromise)
  
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

  const validateSku = useCallback(async (sku: string, excludeId: string = '') => {
    try {
      return await validateSkuUnique(sku, excludeId)
    } catch (error) {
      console.error('Error validating SKU:', error)
      return false
    }
  }, [])

  const clearCache = useCallback(() => {
    dataCache.product = null
    dataCache.productId = ''
    dataCache.categories = []
    dataCache.attributes = []
    dataCache.skuValidations.clear()
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
    validateSku,
    clearCache
  }
}

// Export types for external use
export type { DatabaseProduct, DatabaseCategory, DatabaseAttribute }