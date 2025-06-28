'use client'

import { useState, useCallback, useMemo } from 'react'
import type { ProductVariation } from '@/lib/types'

interface ProductForm {
  name: string
  description: string
  categoryId: string
  type: 'simple' | 'variation'
  status: 'active' | 'inactive'
  image?: File
  sku?: string
  sellingPrice?: number
  buyingPrice?: number
  stock?: number
  selectedAttributes: string[]
  variations: ProductVariation[]
}

const defaultForm: ProductForm = {
  name: '',
  description: '',
  categoryId: '',
  type: 'simple',
  status: 'active',
  image: undefined,
  sku: '',
  sellingPrice: undefined,
  buyingPrice: undefined,
  stock: undefined,
  selectedAttributes: [],
  variations: []
}

export function useAddProductForm() {
  const [form, setForm] = useState<ProductForm>(defaultForm)
  const [showSuccess, setShowSuccess] = useState(false)

  // Field updaters
  const updateName = useCallback((name: string) => {
    setForm(prev => ({ ...prev, name }))
  }, [])

  const updateDescription = useCallback((description: string) => {
    setForm(prev => ({ ...prev, description }))
  }, [])

  const updateCategory = useCallback((categoryId: string) => {
    setForm(prev => ({ ...prev, categoryId }))
  }, [])

  const updateStatus = useCallback((status: 'active' | 'inactive') => {
    setForm(prev => ({ ...prev, status }))
  }, [])

  const updateType = useCallback((type: 'simple' | 'variation') => {
    setForm(prev => {
      const updated = { ...prev, type }
      
      // Clear type-specific fields when switching
      if (type === 'variation') {
        // Clear simple product fields
        updated.sku = ''
        updated.sellingPrice = undefined
        updated.buyingPrice = undefined
        updated.stock = undefined
      } else {
        // Clear variation fields
        updated.selectedAttributes = []
        updated.variations = []
      }
      
      return updated
    })
  }, [])

  const updateSku = useCallback((sku: string) => {
    setForm(prev => ({ ...prev, sku }))
  }, [])

  const updatePrice = useCallback((sellingPrice: number | undefined) => {
    setForm(prev => ({ ...prev, sellingPrice }))
  }, [])

  const updateBuyingPrice = useCallback((buyingPrice: number | undefined) => {
    setForm(prev => ({ ...prev, buyingPrice }))
  }, [])

  const updateStock = useCallback((stock: number | undefined) => {
    setForm(prev => ({ ...prev, stock }))
  }, [])

  const updateImage = useCallback((image: File | undefined) => {
    setForm(prev => ({ ...prev, image }))
  }, [])

  // Variation product methods
  const toggleAttribute = useCallback((attributeId: string) => {
    setForm(prev => ({
      ...prev,
      selectedAttributes: prev.selectedAttributes.includes(attributeId)
        ? prev.selectedAttributes.filter(id => id !== attributeId)
        : [...prev.selectedAttributes, attributeId]
    }))
  }, [])

  const addVariation = useCallback((variation: ProductVariation) => {
    setForm(prev => ({
      ...prev,
      variations: [...prev.variations, variation]
    }))
  }, [])

  const updateVariation = useCallback((index: number, variation: ProductVariation) => {
    setForm(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => i === index ? variation : v)
    }))
  }, [])

  const deleteVariation = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }))
  }, [])

  // Computed properties
  const canAddVariations = useMemo(() => {
    return form.selectedAttributes.length > 0
  }, [form.selectedAttributes])

  const hasVariations = useMemo(() => {
    return form.variations.length > 0
  }, [form.variations])

  // Success message
  const showSuccessMessage = useCallback(() => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    setForm(defaultForm)
    setShowSuccess(false)
  }, [])

  // Bulk update for complex operations
  const updateForm = useCallback((updates: Partial<ProductForm>) => {
    setForm(prev => ({ ...prev, ...updates }))
  }, [])

  return {
    // Form state
    form,
    showSuccess,
    
    // Field updaters
    updateName,
    updateDescription,
    updateCategory,
    updateStatus,
    updateType,
    updateSku,
    updatePrice,
    updateBuyingPrice,
    updateStock,
    updateImage,
    
    // Variation methods
    toggleAttribute,
    addVariation,
    updateVariation,
    deleteVariation,
    
    // Computed properties
    canAddVariations,
    hasVariations,
    
    // Utility methods
    showSuccessMessage,
    resetForm,
    updateForm,
    
    // Raw setters for complex updates
    setForm
  }
}