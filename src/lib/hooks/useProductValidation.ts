'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { validateSku as validateSkuUnique } from '@/lib/utils/skuValidation'
import type { ProductVariation } from '@/lib/types'

interface ValidationState {
  isChecking: boolean
  isValid: boolean | null  // null = unknown/error, true = valid, false = invalid
  message: string
  isError?: boolean  // indicates if the validation failed due to an error vs invalid SKU
}

interface ProductForm {
  name: string
  description: string
  categoryId?: string
  type: 'simple' | 'variation'
  status: 'active' | 'inactive'
  image?: File
  sku?: string
  sellingPrice?: number
  buyingPrice?: number
  stock?: number
  boughtQuantity?: number
  parentSku?: string
  selectedAttributes: string[]
  variations: ProductVariation[]
}

interface VariationForm {
  sku: string
  sellingPrice?: number
  attributeValues: { [attributeId: string]: string }
}

export function useProductValidation(productId: string) {
  
  const [skuValidation, setSkuValidation] = useState<ValidationState>({
    isChecking: false,
    isValid: null,
    message: '',
    isError: false
  })
  
  const [variationSkuValidation, setVariationSkuValidation] = useState<ValidationState>({
    isChecking: false,
    isValid: null,
    message: '',
    isError: false
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [formInitialized, setFormInitialized] = useState(false)
  const [editingVariationIndex, setEditingVariationIndex] = useState(-1)

  // SKU validation with debouncing and deduplication
  const validateSku = useCallback(async (
    sku: string, 
    isVariation = false, 
    excludeId?: string,
    variations: ProductVariation[] = [],
    currentEditingIndex = -1
  ) => {
    if (!sku.trim()) {
      if (isVariation) {
        setVariationSkuValidation({ isChecking: false, isValid: null, message: '', isError: false })
      } else {
        setSkuValidation({ isChecking: false, isValid: null, message: '', isError: false })
      }
      return
    }

    const setValidation = isVariation ? setVariationSkuValidation : setSkuValidation
    setValidation({ isChecking: true, isValid: null, message: 'Checking SKU...' })

    try {
      // Also check against local variations if this is for a variation
      let duplicateInVariations = false
      if (isVariation) {
        duplicateInVariations = variations.some((v, index) => 
          index !== currentEditingIndex &&
          v.sku.toLowerCase() === sku.toLowerCase()
        )
      }

      if (duplicateInVariations) {
        setValidation({ 
          isChecking: false, 
          isValid: false, 
          message: 'SKU already exists in another variation',
          isError: false
        })
        return
      }

      // Check if SKU exists in database (excluding current product/variation) with deduplication
      const exists = await validateSkuUnique(sku, excludeId || productId)

      if (exists) {
        setValidation({ 
          isChecking: false, 
          isValid: false, 
          message: 'SKU already exists',
          isError: false
        })
      } else {
        setValidation({ 
          isChecking: false, 
          isValid: true, 
          message: 'SKU is available',
          isError: false
        })
      }
    } catch (error) {
      console.error('Error validating SKU:', error)
      const errorMessage = error instanceof Error ? error.message : 'Could not validate SKU'
      setValidation({ 
        isChecking: false, 
        isValid: null, 
        message: errorMessage,
        isError: true  // Mark as error so UI can handle differently
      })
    }
  }, [productId])

  const validateForm = useCallback((form: ProductForm) => {
    const newErrors: string[] = []

    if (!form.name.trim()) newErrors.push('Product name is required')

    if (form.type === 'simple') {
      if (!form.sku?.trim()) {
        newErrors.push('SKU is required for simple products')
      } else if (skuValidation.isValid === false) {
        newErrors.push(skuValidation.message || 'SKU is not valid')
      } else if (skuValidation.isChecking) {
        newErrors.push('Please wait for SKU validation to complete')
      }
      if (!form.sellingPrice || form.sellingPrice <= 0) newErrors.push('Selling price must be greater than 0')
    } else {
      // Only require attributes if no variations exist yet
      if (form.selectedAttributes.length === 0 && form.variations.length === 0) {
        newErrors.push('At least one attribute must be selected for variation products')
      }
      if (form.variations.length === 0) newErrors.push('At least one variation must be created')
    }

    // Show all errors in a single toast if there are any
    if (newErrors.length > 0) {
      if (newErrors.length === 1) {
        toast.error("Validation Error", {
          description: newErrors[0]
        })
      } else {
        // Format multiple errors with bullet points for better readability
        const formattedErrors = newErrors.map(error => `• ${error}`).join('\n')
        toast.error("Validation Errors", {
          description: `Please fix the following issues:\n${formattedErrors}`
        })
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }, [skuValidation])

  // Helper functions for managing validation state
  const initializeForm = useCallback(() => {
    setFormInitialized(true)
  }, [])

  const setEditingVariationIndexValue = useCallback((index: number) => {
    setEditingVariationIndex(index)
  }, [])

  const resetValidation = useCallback(() => {
    setSkuValidation({ isChecking: false, isValid: null, message: '', isError: false })
    setVariationSkuValidation({ isChecking: false, isValid: null, message: '', isError: false })
    setErrors([])
  }, [])

  return {
    skuValidation,
    variationSkuValidation,
    errors,
    formInitialized,
    editingVariationIndex,
    validateSku,
    validateForm,
    initializeForm,
    setEditingVariationIndexValue,
    resetValidation
  }
}

// Debounced SKU validation hooks
export function useDebounceSkuValidation(
  sku: string | undefined,
  type: 'simple' | 'variation',
  validateSku: (sku: string, isVariation: boolean, excludeId?: string, variations?: ProductVariation[], currentEditingIndex?: number) => Promise<void>,
  formInitialized: boolean,
  variations: ProductVariation[] = [],
  editingIndex = -1,
  delay = 500
) {
  useEffect(() => {
    if (type === 'simple' && sku && formInitialized) {
      const timer = setTimeout(() => {
        validateSku(sku, false)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [sku, type, validateSku, formInitialized, delay])
}

export function useDebounceVariationSkuValidation(
  sku: string,
  validateSku: (sku: string, isVariation: boolean, excludeId?: string, variations?: ProductVariation[], currentEditingIndex?: number) => Promise<void>,
  variations: ProductVariation[] = [],
  editingIndex = -1,
  delay = 500
) {
  useEffect(() => {
    if (sku) {
      const timer = setTimeout(() => {
        validateSku(sku, true, undefined, variations, editingIndex)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [sku, validateSku, variations, editingIndex, delay])
}