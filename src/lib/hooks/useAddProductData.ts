'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DatabaseAttribute } from './useProductData'

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface AttributeValue {
  id: string
  attribute_id: string
  value: string
  label: string
  sort_order: number
}

interface Attribute {
  id: string
  name: string
  type: string
  required: boolean
  created_at: string
  updated_at: string
  values?: AttributeValue[]
}

// Reuse the existing cache from useProductData but for add page data
const dataCache = {
  categories: [] as Category[],
  attributes: [] as DatabaseAttribute[],
  lastFetch: { categories: 0, attributes: 0 },
  currentRequests: {
    categories: null as Promise<Category[]> | null,
    attributes: null as Promise<DatabaseAttribute[]> | null
  }
}

const CACHE_DURATION = 30000 // 30 seconds

async function getCategories(forceRefresh = false): Promise<Category[]> {
  const now = Date.now()

  // Check cache first
  if (!forceRefresh && 
      dataCache.categories.length > 0 && 
      (now - dataCache.lastFetch.categories) < CACHE_DURATION) {
    console.log('📦 Using cached categories data (add page)')
    return dataCache.categories
  }

  // If there's already a request in progress, wait for it
  if (dataCache.currentRequests.categories) {
    console.log('⏳ Categories request already in progress, waiting for existing promise...')
    return await dataCache.currentRequests.categories
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<Category[]> => {
    try {
      console.log('🔄 Fetching fresh categories data from API (add page)')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('❌ Error loading categories:', error)
        throw error
      }

      const result = data || []
      
      // Update cache
      dataCache.categories = result
      dataCache.lastFetch.categories = now

      console.log('✅ Categories data fetched successfully (add page)')
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
    console.log('📦 Using cached attributes data (add page)')
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
      console.log('🔄 Fetching fresh attributes data from API (add page)')
      const supabase = createClient()
      
      // Get attributes and their values
      const [attributesResult, attributeValuesResult] = await Promise.all([
        supabase
          .from('attributes')
          .select('*')
          .order('name'),
        supabase
          .from('attribute_values')
          .select('*')
          .order('sort_order')
      ])

      if (attributesResult.error) {
        console.error('❌ Error loading attributes:', attributesResult.error)
        throw attributesResult.error
      }

      if (attributeValuesResult.error) {
        console.error('❌ Error loading attribute values:', attributeValuesResult.error)
        throw attributeValuesResult.error
      }

      const attributes = attributesResult.data || []
      const attributeValues = attributeValuesResult.data || []

      // Combine attributes with their values
      const result: DatabaseAttribute[] = attributes.map((attr: any) => ({
        ...attr,
        values: attributeValues.filter((val: any) => val.attribute_id === attr.id)
      }))
      
      // Update cache
      dataCache.attributes = result
      dataCache.lastFetch.attributes = now

      console.log('✅ Attributes data fetched successfully (add page)')
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

export function useAddProductData() {
  const [categories, setCategories] = useState<Category[]>([])
  const [attributes, setAttributes] = useState<DatabaseAttribute[]>([])
  const [loading, setLoading] = useState({
    categories: true,
    attributes: true
  })
  const [errors, setErrors] = useState({
    categories: null as string | null,
    attributes: null as string | null
  })

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

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadCategories(true),
      loadAttributes(true)
    ])
  }, [loadCategories, loadAttributes])

  const clearCache = useCallback(() => {
    dataCache.categories = []
    dataCache.attributes = []
    dataCache.currentRequests.categories = null
    dataCache.currentRequests.attributes = null
    dataCache.lastFetch = { categories: 0, attributes: 0 }
  }, [])

  // Load initial data
  useEffect(() => {
    loadCategories()
    loadAttributes()
  }, [loadCategories, loadAttributes])

  return {
    categories,
    attributes,
    loading,
    errors,
    loadCategories,
    loadAttributes,
    refreshData,
    clearCache
  }
}