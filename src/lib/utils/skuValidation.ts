'use client'

import { checkSkuExists } from '@/lib/supabase/mutations'

// Simple cache for SKU validations
const skuValidationCache = {
  validations: new Map<string, { result: boolean, timestamp: number }>(),
  currentRequests: new Map<string, Promise<boolean>>()
}

const CACHE_DURATION = 30000 // 30 seconds

/**
 * Validates if a SKU is unique (doesn't already exist)
 * @param sku - The SKU to validate
 * @param excludeId - ID to exclude from the check (for editing existing items)
 * @param forceRefresh - Force a fresh validation, bypassing cache
 * @returns Promise<boolean> - true if SKU exists (invalid), false if available (valid)
 */
export async function validateSkuUnique(sku: string, excludeId: string = '', forceRefresh = false): Promise<boolean> {
  const now = Date.now()
  const cacheKey = `${sku}:${excludeId}`

  // Check cache first
  if (!forceRefresh) {
    const cached = skuValidationCache.validations.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.result
    }
  }

  // If there's already a request in progress, wait for it
  const existingRequest = skuValidationCache.currentRequests.get(cacheKey)
  if (existingRequest) {
    return await existingRequest
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<boolean> => {
    try {
      const exists = await checkSkuExists(sku, excludeId)
      
      // Update cache
      skuValidationCache.validations.set(cacheKey, { result: exists, timestamp: now })
      
      return exists
    } catch (error) {
      console.error('❌ Error validating SKU:', error)
      // Provide a more user-friendly error message
      const message = error instanceof Error ? error.message : 'Unknown error occurred'
      throw new Error(`SKU validation failed: ${message}`)
    } finally {
      skuValidationCache.currentRequests.delete(cacheKey)
    }
  })()

  // Store the request promise
  skuValidationCache.currentRequests.set(cacheKey, requestPromise)
  
  return await requestPromise
}

/**
 * Wrapper function that provides user-friendly error handling
 * @param sku - The SKU to validate
 * @param excludeId - ID to exclude from the check
 * @returns Promise<boolean> - true if SKU exists, false if available
 * @throws Error with user-friendly message on failure
 */
export async function validateSku(sku: string, excludeId: string = ''): Promise<boolean> {
  try {
    return await validateSkuUnique(sku, excludeId)
  } catch (error) {
    console.error('Error validating SKU:', error)
    // Re-throw to let the caller handle the error
    throw new Error('Failed to validate SKU. Please try again.')
  }
}

/**
 * Clear the SKU validation cache
 */
export function clearSkuValidationCache(): void {
  skuValidationCache.validations.clear()
  skuValidationCache.currentRequests.clear()
}