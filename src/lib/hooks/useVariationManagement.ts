'use client'

import { useState, useCallback } from 'react'
import type { ProductVariation } from '@/lib/types'

interface VariationForm {
  sku: string
  sellingPrice?: number
  attributeValues: { [attributeId: string]: string }
}

const defaultVariationForm: VariationForm = {
  sku: '',
  sellingPrice: undefined,
  attributeValues: {}
}

export function useVariationManagement() {
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Form states
  const [variationForm, setVariationForm] = useState<VariationForm>(defaultVariationForm)
  const [editingIndex, setEditingIndex] = useState<number>(-1)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)

  // Modal handlers
  const openAddModal = useCallback(() => {
    setVariationForm(defaultVariationForm)
    setShowAddModal(true)
  }, [])

  const openEditModal = useCallback((variation: ProductVariation, index: number) => {
    setVariationForm({
      sku: variation.sku,
      sellingPrice: variation.price,
      attributeValues: variation.attributeValues || {}
    })
    setEditingIndex(index)
    setShowEditModal(true)
  }, [])

  const openDeleteModal = useCallback((index: number) => {
    setDeletingIndex(index)
    setShowDeleteModal(true)
  }, [])

  const closeAddModal = useCallback(() => {
    setShowAddModal(false)
    setVariationForm(defaultVariationForm)
  }, [])

  const closeEditModal = useCallback(() => {
    setShowEditModal(false)
    setEditingIndex(-1)
    setVariationForm(defaultVariationForm)
  }, [])

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false)
    setDeletingIndex(null)
  }, [])

  // Form field updaters
  const updateVariationSku = useCallback((sku: string) => {
    setVariationForm(prev => ({ ...prev, sku }))
  }, [])

  const updateVariationPrice = useCallback((price: number | undefined) => {
    setVariationForm(prev => ({ ...prev, sellingPrice: price }))
  }, [])

  const updateAttributeValue = useCallback((attributeId: string, valueId: string) => {
    setVariationForm(prev => ({
      ...prev,
      attributeValues: {
        ...prev.attributeValues,
        [attributeId]: valueId
      }
    }))
  }, [])

  const clearAttributeValue = useCallback((attributeId: string) => {
    setVariationForm(prev => {
      const newAttributeValues = { ...prev.attributeValues }
      delete newAttributeValues[attributeId]
      return { ...prev, attributeValues: newAttributeValues }
    })
  }, [])

  // Validation helpers
  const isValidVariation = useCallback((
    attributeIds: string[],
    existingVariations: ProductVariation[] = [],
    excludeIndex = -1
  ): { isValid: boolean; error?: string } => {
    // Check if SKU is provided
    if (!variationForm.sku.trim()) {
      return { isValid: false, error: 'SKU is required' }
    }

    // Check if all required attributes are selected
    const missingAttributes = attributeIds.filter(id => !variationForm.attributeValues[id])
    if (missingAttributes.length > 0) {
      return { isValid: false, error: 'All attributes must be selected' }
    }

    // Check for duplicate attribute combinations
    const currentCombination = JSON.stringify(variationForm.attributeValues)
    const isDuplicate = existingVariations.some((variation, index) => {
      if (index === excludeIndex) return false // Exclude current variation when editing
      const existingCombination = JSON.stringify(variation.attributeValues || {})
      return currentCombination === existingCombination
    })

    if (isDuplicate) {
      return { isValid: false, error: 'This attribute combination already exists' }
    }

    // Check for duplicate SKUs
    const isDuplicateSku = existingVariations.some((variation, index) => {
      if (index === excludeIndex) return false // Exclude current variation when editing
      return variation.sku.toLowerCase() === variationForm.sku.toLowerCase()
    })

    if (isDuplicateSku) {
      return { isValid: false, error: 'This SKU already exists in another variation' }
    }

    return { isValid: true }
  }, [variationForm])

  // Create variation from form
  const createVariationFromForm = useCallback((): ProductVariation => {
    return {
      id: '', // Will be set by backend
      productId: '', // Will be set by backend
      sku: variationForm.sku,
      price: variationForm.sellingPrice,
      buyingPrice: 0,
      stock: 0,
      boughtQuantity: 0,
      attributeValues: variationForm.attributeValues
    }
  }, [variationForm])

  // Generate SKU suggestion based on attribute values
  const generateSkuSuggestion = useCallback((
    baseSku: string,
    attributeValues: { [key: string]: string },
    attributes: any[]
  ): string => {
    if (!baseSku) return ''
    
    const attributeParts = Object.entries(attributeValues)
      .map(([attrId, valueId]) => {
        const attribute = attributes.find(a => a.id === attrId)
        const value = attribute?.values?.find((v: any) => v.id === valueId)
        return value?.value?.substring(0, 3).toUpperCase() || ''
      })
      .filter(Boolean)
      .join('-')

    return attributeParts ? `${baseSku}-${attributeParts}` : baseSku
  }, [])

  return {
    // Modal states
    showAddModal,
    showEditModal,
    showDeleteModal,
    
    // Form states
    variationForm,
    editingIndex,
    deletingIndex,
    
    // Modal handlers
    openAddModal,
    openEditModal,
    openDeleteModal,
    closeAddModal,
    closeEditModal,
    closeDeleteModal,
    
    // Form field updaters
    updateVariationSku,
    updateVariationPrice,
    updateAttributeValue,
    clearAttributeValue,
    
    // Validation and utilities
    isValidVariation,
    createVariationFromForm,
    generateSkuSuggestion,
    
    // Raw setters for complex updates
    setVariationForm
  }
}