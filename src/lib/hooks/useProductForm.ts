'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Product, ProductVariation } from '@/lib/types'

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

const defaultForm: ProductForm = {
  name: '',
  description: '',
  categoryId: '',
  type: 'simple',
  status: 'active',
  selectedAttributes: [],
  variations: []
}

export function useProductForm(initialProduct?: Product) {
  const [form, setForm] = useState<ProductForm>(defaultForm)
  const [showSuccess, setShowSuccess] = useState(false)

  // Initialize form with product data
  const initializeForm = useCallback((product: Product) => {
    const formData: ProductForm = {
      name: product.name,
      description: product.description,
      categoryId: product.categoryId || '',
      type: product.type,
      status: product.status,
      sku: product.sku,
      sellingPrice: product.price,
      buyingPrice: product.buyingPrice,
      stock: product.stock,
      boughtQuantity: product.boughtQuantity,
      parentSku: product.parentSku,
      selectedAttributes: product.attributes || [],
      variations: product.variations || []
    }
    setForm(formData)
  }, [])

  // Form field updaters
  const updateField = useCallback(<K extends keyof ProductForm>(
    field: K, 
    value: ProductForm[K]
  ) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateName = useCallback((name: string) => {
    updateField('name', name)
  }, [updateField])

  const updateDescription = useCallback((description: string) => {
    updateField('description', description)
  }, [updateField])

  const updateCategory = useCallback((categoryId: string) => {
    updateField('categoryId', categoryId)
  }, [updateField])

  const updateType = useCallback((type: 'simple' | 'variation') => {
    updateField('type', type)
    // Clear SKU and price when switching to variation type
    if (type === 'variation') {
      setForm(prev => ({ ...prev, sku: '', sellingPrice: undefined }))
    }
  }, [updateField])

  const updateStatus = useCallback((status: 'active' | 'inactive') => {
    updateField('status', status)
  }, [updateField])

  const updateSku = useCallback((sku: string) => {
    updateField('sku', sku)
  }, [updateField])

  const updatePrice = useCallback((price: number | undefined) => {
    updateField('sellingPrice', price)
  }, [updateField])

  // Attribute management
  const toggleAttribute = useCallback((attributeId: string) => {
    setForm(prev => ({
      ...prev,
      selectedAttributes: prev.selectedAttributes.includes(attributeId)
        ? prev.selectedAttributes.filter(id => id !== attributeId)
        : [...prev.selectedAttributes, attributeId]
    }))
  }, [])

  // Variation management
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

  const removeVariation = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }))
  }, [])

  // Success message management
  const showSuccessMessage = useCallback(() => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }, [])

  // Form validation helpers
  const hasVariations = form.variations.length > 0
  const canChangeType = !hasVariations
  const canChangeAttributes = !hasVariations
  const canAddVariations = form.type === 'variation' && form.selectedAttributes.length > 0

  // Initialize form when product changes
  useEffect(() => {
    if (initialProduct) {
      initializeForm(initialProduct)
    }
  }, [initialProduct, initializeForm])

  return {
    // Form state
    form,
    showSuccess,
    
    // Form field updaters
    updateName,
    updateDescription,
    updateCategory,
    updateType,
    updateStatus,
    updateSku,
    updatePrice,
    
    // Attribute management
    toggleAttribute,
    
    // Variation management
    addVariation,
    updateVariation,
    removeVariation,
    
    // Utility functions
    initializeForm,
    showSuccessMessage,
    
    // Computed values
    hasVariations,
    canChangeType,
    canChangeAttributes,
    canAddVariations,
    
    // Raw setter for complex updates
    setForm
  }
}