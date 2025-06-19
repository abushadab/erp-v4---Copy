"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, Plus, X, Upload, Edit, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// Alert removed - using Sonner toasts instead
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MediaManager } from "@/components/ui/media-manager"
import { createClient } from "@/lib/supabase/client"
import { 
  createCompleteProduct,
  checkSkuExists,
  createAttribute,
  createAttributeValues,
  type CreateProductData,
  type CreateProductVariationData,
  type CreateAttributeData,
  type CreateAttributeValueData,
  updateAttribute,
  updateAttributeValues
} from "@/lib/supabase/mutations"
import { toast } from "sonner"

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

interface Attribute {
  id: string
  name: string
  type: string
  required: boolean
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

interface AttributeWithValues extends Attribute {
  values: AttributeValue[]
}

interface ProductVariation {
  id: string
  product_id: string
  sku: string
  price: number
  buying_price: number
  stock: number
  bought_quantity: number
  attribute_values: { [attributeId: string]: string }
}

interface MediaItem {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadDate: string
  alt?: string
}

interface ProductForm {
  name: string
  description: string
  categoryId: string
  type: 'simple' | 'variation'
  status: 'active' | 'inactive'
  image?: File
  // Simple product fields
  sku?: string
  sellingPrice?: number
  buyingPrice?: number
  stock?: number
  // Variable product fields
  selectedAttributes: string[]
  variations: ProductVariation[]
}

interface VariationForm {
  sku: string
  sellingPrice?: number
  attributeValues: { [attributeId: string]: string }
}

interface EditAttributeForm {
  id: string
  name: string
  values: string[]
}

// Deduplication cache for API calls
const dataCache = {
  categories: [] as Category[],
  attributes: [] as AttributeWithValues[],
  lastFetch: 0,
  currentRequest: null as Promise<{ categories: Category[], attributes: AttributeWithValues[] }> | null
}

const CACHE_DURATION = 30000 // 30 seconds

// Combined API call function with deduplication
async function loadPageData(forceRefresh = false): Promise<{ categories: Category[], attributes: AttributeWithValues[] }> {
  const now = Date.now()

  // Check cache first
  if (!forceRefresh && 
      dataCache.categories.length > 0 && 
      dataCache.attributes.length > 0 &&
      (now - dataCache.lastFetch) < CACHE_DURATION) {
    console.log('📦 Using cached add product page data')
    return { categories: dataCache.categories, attributes: dataCache.attributes }
  }

  // If there's already a request in progress, wait for it
  if (dataCache.currentRequest) {
    console.log('⏳ Request already in progress, waiting for existing promise...')
    return await dataCache.currentRequest
  }

  // Create a new request promise
  const requestPromise = (async () => {
    try {
      console.log('🔄 Fetching fresh add product page data from API')
  const supabase = createClient()
  
      // Make both API calls in parallel to reduce overall loading time
      const [categoriesResult, attributesResult, attributeValuesResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('status', 'active')
          .order('name'),
        supabase
    .from('attributes')
    .select('*')
          .order('name'),
        supabase
    .from('attribute_values')
    .select('*')
    .order('sort_order')
      ])

      if (categoriesResult.error) {
        console.error('Error fetching categories:', categoriesResult.error)
        throw new Error('Failed to fetch categories')
      }

      if (attributesResult.error) {
        console.error('Error fetching attributes:', attributesResult.error)
        throw new Error('Failed to fetch attributes')
      }

      if (attributeValuesResult.error) {
        console.error('Error fetching attribute values:', attributeValuesResult.error)
    throw new Error('Failed to fetch attribute values')
  }

  // Combine attributes with their values
      const attributesWithValues = (attributesResult.data || []).map(attr => ({
    ...attr,
        values: (attributeValuesResult.data || []).filter(val => val.attribute_id === attr.id)
  }))

      const result = {
        categories: categoriesResult.data || [],
        attributes: attributesWithValues
      }

      // Update cache
      dataCache.categories = result.categories
      dataCache.attributes = result.attributes
      dataCache.lastFetch = now

      console.log('✅ Add product page data fetched successfully')
      return result
    } catch (error) {
      console.error('❌ Error loading add product page data:', error)
      throw error
    } finally {
      dataCache.currentRequest = null
    }
  })()

  // Store the request promise
  dataCache.currentRequest = requestPromise
  
  return await requestPromise
}

export default function AddProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isPageLoading, setIsPageLoading] = React.useState(true)
  const [errors, setErrors] = React.useState<string[]>([])
  const [editingVariationIndex, setEditingVariationIndex] = React.useState<number | null>(null)
  const [showMediaManager, setShowMediaManager] = React.useState(false)
  const [selectedImage, setSelectedImage] = React.useState<MediaItem | null>(null)
  const [showSuccess, setShowSuccess] = React.useState(false)
  
  // Data states
  const [categories, setCategories] = React.useState<Category[]>([])
  const [attributes, setAttributes] = React.useState<AttributeWithValues[]>([])
  
  // SKU validation states
  const [skuValidation, setSkuValidation] = React.useState<{
    isChecking: boolean
    isValid: boolean | null
    message: string
  }>({
    isChecking: false,
    isValid: null,
    message: ''
  })
  const [variationSkuValidation, setVariationSkuValidation] = React.useState<{
    isChecking: boolean
    isValid: boolean | null
    message: string
  }>({
    isChecking: false,
    isValid: null,
    message: ''
  })

  
  const [form, setForm] = React.useState<ProductForm>({
    name: '',
    description: '',
    categoryId: '',
    type: 'simple',
    status: 'active',
    // Simple product fields
    sku: '',
    sellingPrice: 0,
    buyingPrice: 0,
    stock: 0,
    // Variable product fields
    selectedAttributes: [],
    variations: []
  })

  const [variationForm, setVariationForm] = React.useState<VariationForm>({
    sku: '',
    sellingPrice: 0,
    attributeValues: {}
  })

  const [showVariationForm, setShowVariationForm] = React.useState(false)
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [variationToDelete, setVariationToDelete] = React.useState<number | null>(null)
  
  // Create attribute modal states
  const [showCreateAttributeModal, setShowCreateAttributeModal] = React.useState(false)
  const [isCreatingAttribute, setIsCreatingAttribute] = React.useState(false)
  const [createAttributeForm, setCreateAttributeForm] = React.useState({
    name: '',
    type: 'text',
    required: false,
    values: ['']
  })

  // Edit Attribute Modal states
  const [showEditAttributeModal, setShowEditAttributeModal] = React.useState(false)
  const [editAttributeForm, setEditAttributeForm] = React.useState<EditAttributeForm>({
    id: '',
    name: '',
    values: ['']
  })
  const [isEditingAttribute, setIsEditingAttribute] = React.useState(false)

  // Deduplication cache and initial load tracker
  const initialLoadTriggered = React.useRef(false)

  // Load data on mount with deduplication
  React.useEffect(() => {
    if (initialLoadTriggered.current) {
      return
    }
    initialLoadTriggered.current = true

    const loadData = async () => {
      try {
        setIsPageLoading(true)
        const { categories: categoriesData, attributes: attributesData } = await loadPageData()
        
        setCategories(categoriesData)
        setAttributes(attributesData)
        
        console.log('📊 Loaded data for add product page')
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load page data')
      } finally {
        setIsPageLoading(false)
      }
    }

    loadData()
  }, [])

  // SKU validation with debouncing
  const validateSku = React.useCallback(async (sku: string, isVariation = false) => {
    if (!sku.trim()) {
      if (isVariation) {
        setVariationSkuValidation({ isChecking: false, isValid: null, message: '' })
      } else {
        setSkuValidation({ isChecking: false, isValid: null, message: '' })
      }
      return
    }

    const setValidation = isVariation ? setVariationSkuValidation : setSkuValidation
    setValidation({ isChecking: true, isValid: null, message: 'Checking SKU...' })

    try {
      // Check if SKU exists in database
      const exists = await checkSkuExists(sku)
      
      // Also check against local variations if this is for a variation
      let duplicateInVariations = false
      if (isVariation) {
        duplicateInVariations = form.variations.some((v, index) => 
          index !== editingVariationIndex &&
          v.sku.toLowerCase() === sku.toLowerCase()
        )
      }

      if (exists || duplicateInVariations) {
        setValidation({ 
          isChecking: false, 
          isValid: false, 
          message: duplicateInVariations 
            ? 'SKU already exists in another variation' 
            : 'SKU already exists' 
        })
      } else {
        setValidation({ isChecking: false, isValid: true, message: 'SKU is available' })
      }
    } catch (error) {
      console.error('Error validating SKU:', error)
      setValidation({ isChecking: false, isValid: null, message: 'Could not validate SKU' })
    }
  }, [form.variations, editingVariationIndex])

  // Debounced SKU validation
  React.useEffect(() => {
    if (form.type === 'simple' && form.sku) {
      const timer = setTimeout(() => {
        validateSku(form.sku!, false)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setSkuValidation({ isChecking: false, isValid: null, message: '' })
    }
  }, [form.sku, form.type, validateSku])

  React.useEffect(() => {
    if (variationForm.sku) {
      const timer = setTimeout(() => {
        validateSku(variationForm.sku, true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setVariationSkuValidation({ isChecking: false, isValid: null, message: '' })
    }
  }, [variationForm.sku, validateSku])

  const validateForm = async () => {
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
      if (form.selectedAttributes.length === 0) newErrors.push('At least one attribute must be selected for variable products')
      if (form.variations.length === 0) newErrors.push('At least one variation must be created')
    }

    // Show all errors in a single toast if there are any
    if (newErrors.length > 0) {
      if (newErrors.length === 1) {
        toast.error("Validation Error", {
          description: newErrors[0]
        })
      } else {
        toast.error("Validation Errors", {
          description: (
            <div>
              <p className="mb-2">Please fix the following issues:</p>
              <ul className="list-disc list-inside space-y-1">
                {newErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )
        })
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isValid = await validateForm()
    if (!isValid) return

    setIsLoading(true)
    
    try {
      // Prepare product data
      const productData: CreateProductData = {
        name: form.name,
        description: form.description,
        category_id: form.categoryId || undefined, // Pass undefined if no category selected
        type: form.type,
        status: form.status,
        sku: form.type === 'simple' ? form.sku : undefined,
        price: form.type === 'simple' ? form.sellingPrice : undefined,
        image_url: selectedImage?.url
      }

      if (form.type === 'simple') {
        // Create simple product
        await createCompleteProduct(productData)
        toast.success('Product created successfully!')
      } else {
        // Create variable product with variations
        const variations: CreateProductVariationData[] = form.variations.map(variation => ({
          product_id: '', // Will be set by the mutation
          sku: variation.sku,
          price: variation.price,
          attribute_values: variation.attribute_values
        }))

        await createCompleteProduct(
          productData,
          variations,
          form.selectedAttributes
        )
        toast.success('Product with variations created successfully!')
      }
      
      // Show success and redirect
      setShowSuccess(true)
      setTimeout(() => {
        router.push('/products')
      }, 2000)
      
    } catch (error) {
      console.error('Error creating product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product'
      toast.error(errorMessage)
      setErrors([errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const addVariation = () => {
    if (!variationForm.sku.trim()) {
      const errorMsg = 'SKU is required for variation'
      toast.error("Validation Error", {
        description: errorMsg
      })
      return
    }

    // Check SKU validation state
    if (variationSkuValidation.isChecking) {
      toast.error("Please wait", {
        description: "SKU validation is in progress"
      })
      return
    }

    if (variationSkuValidation.isValid === false) {
      toast.error("Invalid SKU", {
        description: variationSkuValidation.message
      })
      return
    }

    // Check if all selected attributes have values
    const missingAttributes = form.selectedAttributes.filter(
      attrId => !variationForm.attributeValues[attrId]
    )

    if (missingAttributes.length > 0) {
      toast.error("Missing Values", {
        description: 'Please select values for all attributes'
      })
      return
    }

    // Check if variation with same attribute values already exists (exclude current editing variation)
    const existingVariation = form.variations.find((v, index) => 
      index !== editingVariationIndex &&
      JSON.stringify(v.attribute_values) === JSON.stringify(variationForm.attributeValues)
    )

    if (existingVariation) {
      setErrors(['Variation with these attribute values already exists'])
      return
    }

    if (editingVariationIndex !== null) {
      // Update existing variation
      setForm(prev => ({
        ...prev,
        variations: prev.variations.map((variation, index) => 
          index === editingVariationIndex 
            ? {
                        ...variation,
        sku: variationForm.sku,
        attribute_values: { ...variationForm.attributeValues }, // Create a copy
        price: variationForm.sellingPrice || 0,
        buying_price: variation.buying_price, // Keep existing buying price
        stock: variation.stock, // Keep existing stock
        bought_quantity: variation.bought_quantity // Keep existing bought quantity
              }
            : variation
        )
      }))
    } else {
      // Add new variation
      const newVariation: ProductVariation = {
        id: `VAR${Date.now()}`,
        product_id: '',
        sku: variationForm.sku,
        attribute_values: { ...variationForm.attributeValues }, // Create a copy
        price: variationForm.sellingPrice || 0,
        buying_price: 0,
        stock: 0,
        bought_quantity: 0
      }

      setForm(prev => ({
        ...prev,
        variations: [...prev.variations, newVariation]
      }))
    }

    // Reset form
    resetVariationForm()
  }

  const openAddVariationModal = () => {
    // Always start with a completely clean state
    resetVariationForm()
    setShowAddModal(true)
  }

  const editVariation = (index: number) => {
    const variation = form.variations[index]
    // Clear any previous state first
    resetVariationForm()
    // Then set the specific variation data
    setVariationForm({
      sku: variation.sku,
      sellingPrice: variation.price || undefined,
      attributeValues: { ...variation.attribute_values } // Create a copy to avoid reference issues
    })
    setEditingVariationIndex(index)
    setShowEditModal(true)
    setErrors([])
  }

  const resetVariationForm = () => {
    setVariationForm({
      sku: '',
      sellingPrice: undefined,
      attributeValues: {}
    })
    setEditingVariationIndex(null)
    setShowVariationForm(false)
    setShowAddModal(false)
    setShowEditModal(false)
    setErrors([])
    // Clear SKU validation state
    setVariationSkuValidation({
      isChecking: false,
      isValid: null,
      message: ''
    })
  }

  const handleDeleteClick = (index: number) => {
    setVariationToDelete(index)
    setShowDeleteModal(true)
  }

  const confirmDeleteVariation = () => {
    if (variationToDelete === null) return
    
    setForm(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== variationToDelete)
    }))
    
    if (editingVariationIndex === variationToDelete) {
      resetVariationForm()
    }
    
    setShowDeleteModal(false)
    setVariationToDelete(null)
  }

  const getAttributeValueName = (attributeId: string, valueId: string) => {
    const attribute = attributes.find(attr => attr.id === attributeId)
    const value = attribute?.values.find(val => val.id === valueId)
    return value?.value || valueId
  }

  const getAttributeName = (attributeId: string) => {
    const attribute = attributes.find(attr => attr.id === attributeId)
    return attribute?.name || attributeId
  }

  const handleMediaSelect = (media: MediaItem) => {
    setSelectedImage(media)
    setForm({ ...form, image: undefined }) // Clear file input since we're using media library
  }

  // Attribute creation functions
  const openCreateAttributeModal = () => {
    setCreateAttributeForm({
      name: '',
      type: 'text',
      required: false,
      values: ['']
    })
    setShowCreateAttributeModal(true)
  }

  const openEditAttributeModal = (attribute: AttributeWithValues) => {
    setEditAttributeForm({
      id: attribute.id,
      name: attribute.name,
      values: attribute.values.length > 0 ? attribute.values.map(v => v.value) : ['']
    })
    setShowEditAttributeModal(true)
  }

  const addAttributeValue = () => {
    setCreateAttributeForm(prev => ({
      ...prev,
      values: [...prev.values, '']
    }))
  }

  const addEditAttributeValue = () => {
    setEditAttributeForm(prev => ({
      ...prev,
      values: [...prev.values, '']
    }))
  }

  const removeAttributeValue = (index: number) => {
    if (createAttributeForm.values.length > 1) {
      setCreateAttributeForm(prev => ({
        ...prev,
        values: prev.values.filter((_, i) => i !== index)
      }))
    }
  }

  const removeEditAttributeValue = (index: number) => {
    if (editAttributeForm.values.length > 1) {
      setEditAttributeForm(prev => ({
        ...prev,
        values: prev.values.filter((_, i) => i !== index)
      }))
    }
  }

  const updateAttributeValue = (index: number, value: string) => {
    setCreateAttributeForm(prev => ({
      ...prev,
      values: prev.values.map((v, i) => i === index ? value : v)
    }))
  }

  const updateEditAttributeValue = (index: number, value: string) => {
    setEditAttributeForm(prev => ({
      ...prev,
      values: prev.values.map((v, i) => i === index ? value : v)
    }))
  }

  const validateAttributeForm = () => {
    const errors: string[] = []
    
    if (!createAttributeForm.name.trim()) {
      errors.push('Attribute name is required')
    }
    
    if (createAttributeForm.values.some(v => !v.trim())) {
      errors.push('All attribute values must be filled')
    }
    
    const uniqueValues = new Set(createAttributeForm.values.filter(v => v.trim()))
    if (uniqueValues.size !== createAttributeForm.values.filter(v => v.trim()).length) {
      errors.push('Attribute values must be unique')
    }
    
    if (createAttributeForm.values.filter(v => v.trim()).length === 0) {
      errors.push('At least one attribute value is required')
    }
    
    return errors
  }

  const validateEditAttributeForm = () => {
    const errors: string[] = []
    
    if (!editAttributeForm.name.trim()) {
      errors.push('Attribute name is required')
    }
    
    if (editAttributeForm.values.some(v => !v.trim())) {
      errors.push('All attribute values must be filled')
    }
    
    const uniqueValues = new Set(editAttributeForm.values.filter(v => v.trim()))
    if (uniqueValues.size !== editAttributeForm.values.filter(v => v.trim()).length) {
      errors.push('Attribute values must be unique')
    }
    
    if (editAttributeForm.values.filter(v => v.trim()).length === 0) {
      errors.push('At least one attribute value is required')
    }
    
    return errors
  }

  const handleCreateAttribute = async () => {
    const validationErrors = validateAttributeForm()
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(', '))
      return
    }
    
    setIsCreatingAttribute(true)
    
    try {
      // Create the attribute
      const attributeId = await createAttribute({
        name: createAttributeForm.name,
        type: createAttributeForm.type,
        required: createAttributeForm.required
      })
      
      // Create attribute values
      const valueData = createAttributeForm.values
        .filter(v => v.trim())
        .map((value, index) => ({
          attribute_id: attributeId,
          value: value.trim(),
          label: value.trim(),
          sort_order: index
        }))
      
      await createAttributeValues(valueData)
      
      // Refresh attributes
      const updatedAttributes = await loadPageData()
      setAttributes(updatedAttributes.attributes)
      
      // Auto-select the newly created attribute
      setForm(prev => ({
        ...prev,
        selectedAttributes: [...prev.selectedAttributes, attributeId]
      }))
      
      // Close modal and reset form
      setShowCreateAttributeModal(false)
      setCreateAttributeForm({
        name: '',
        type: 'text',
        required: false,
        values: ['']
      })
      
      toast.success('Attribute created successfully!')
    } catch (error) {
      console.error('Error creating attribute:', error)
      toast.error('Failed to create attribute')
    } finally {
      setIsCreatingAttribute(false)
    }
  }

  const handleEditAttribute = async () => {
    const validationErrors = validateEditAttributeForm()
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(', '))
      return
    }
    
    setIsEditingAttribute(true)
    
    try {
      // Update the attribute (only name, keep existing type and required)
      await updateAttribute({
        id: editAttributeForm.id,
        name: editAttributeForm.name,
        type: 'text', // Keep existing or default to text
        required: false // Keep existing or default to false
      })
      
      // Update attribute values
      const valueData = editAttributeForm.values
        .filter(v => v.trim())
        .map((value, index) => ({
          attribute_id: editAttributeForm.id,
          value: value.trim(),
          label: value.trim(),
          sort_order: index
        }))
      
      await updateAttributeValues(editAttributeForm.id, valueData)
      
      // Refresh attributes
      const updatedAttributes = await loadPageData()
      setAttributes(updatedAttributes.attributes)
      
      // Close modal and reset form
      setShowEditAttributeModal(false)
      setEditAttributeForm({
        id: '',
        name: '',
        values: ['']
      })
      
      toast.success('Attribute updated successfully!')
    } catch (error) {
      console.error('Error updating attribute:', error)
      toast.error('Failed to update attribute')
    } finally {
      setIsEditingAttribute(false)
    }
  }

  // Show loading state
  if (isPageLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Form Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-20 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-28" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Simple Product Details Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-16" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/products">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Add Product</h1>
          <p className="text-muted-foreground mt-2">
            Create a new product for your inventory
          </p>
        </div>
      </div>

      {/* Success Message now handled by Sonner toast */}

      {/* Error Messages now handled by Sonner toasts */}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Enter the basic details for your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Enter product description (optional)"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium mb-2 block">Product Type *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div 
                      className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        form.type === 'simple' 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-muted hover:border-muted-foreground/50 hover:shadow-sm'
                      }`}
                      onClick={() => setForm({ ...form, type: 'simple', selectedAttributes: [], variations: [] })}
                    >
                      <div className="flex items-start sm:items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 sm:mt-0 flex-shrink-0 ${
                          form.type === 'simple' ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {form.type === 'simple' && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm sm:text-base">Simple Product</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                            Single product with one SKU
                          </p>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        form.type === 'variation' 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-muted hover:border-muted-foreground/50 hover:shadow-sm'
                      }`}
                      onClick={() => setForm({ ...form, type: 'variation', sku: '', sellingPrice: 0, buyingPrice: 0 })}
                    >
                      <div className="flex items-start sm:items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 sm:mt-0 flex-shrink-0 ${
                          form.type === 'variation' ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {form.type === 'variation' && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                                                  <h3 className="font-medium text-sm sm:text-base">Variable Product</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                          Multiple variations with different attributes
                        </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Image section removed - now in sidebar */}
              </CardContent>
            </Card>

            {/* Simple Product Fields */}
            {form.type === 'simple' && (
              <Card>
                <CardHeader>
                  <CardTitle>Simple Product Details</CardTitle>
                  <CardDescription>
                    Configure SKU and pricing for simple product. Stock quantity is managed through Purchase system.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <div className="relative">
                        <Input
                          id="sku"
                          value={form.sku || ''}
                          onChange={(e) => setForm({ ...form, sku: e.target.value })}
                          placeholder="Enter SKU"
                          required
                          className={
                            skuValidation.isValid === false 
                              ? "border-red-500 focus-visible:ring-red-500" 
                              : skuValidation.isValid === true 
                                ? "border-green-500 focus-visible:ring-green-500" 
                                : ""
                          }
                        />
                        {skuValidation.isChecking && (
                          <div className="absolute right-3 top-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                      {skuValidation.message && (
                        <p className={`text-xs ${
                          skuValidation.isValid === false 
                            ? "text-red-600" 
                            : skuValidation.isValid === true 
                              ? "text-green-600" 
                              : "text-gray-600"
                        }`}>
                          {skuValidation.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sellingPrice">Selling Price *</Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.sellingPrice || ''}
                        onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variable Product Fields */}
            {form.type === 'variation' && (
              <>
                {/* Attributes Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Product Attributes
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openCreateAttributeModal}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Attribute
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Select attributes to create variations (e.g., Size, Color)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                      {attributes.map((attribute) => (
                        <div key={attribute.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={attribute.id}
                            checked={form.selectedAttributes.includes(attribute.id)}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setForm(prev => ({
                                  ...prev,
                                  selectedAttributes: [...prev.selectedAttributes, attribute.id]
                                }))
                              } else {
                                setForm(prev => ({
                                  ...prev,
                                  selectedAttributes: prev.selectedAttributes.filter(id => id !== attribute.id)
                                }))
                              }
                            }}
                          />
                          <Label 
                            htmlFor={attribute.id} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {attribute.name}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditAttributeModal(attribute)}
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {attributes.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <p className="text-sm">No attributes available.</p>
                        <p className="text-xs mt-1">Create your first attribute to start adding variations.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Variations */}
                {form.selectedAttributes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Product Variations
                        <Button
                          type="button"
                          onClick={() => openAddVariationModal()}
                          size="sm"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Variation
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Create variations based on selected attributes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">


                      {/* Variations Table */}
                      {form.variations.length > 0 && (
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Attributes</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {form.variations.map((variation, index) => (
                                <TableRow key={variation.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {variation.sku}
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        New
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(variation.attribute_values).map(([attrId, valueId]) => (
                                        <Badge key={attrId} variant="secondary" className="text-xs">
                                          {getAttributeName(attrId)}: {getAttributeValueName(attrId, valueId as string)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => editVariation(index)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Product Image */}
            <Card>
              <CardHeader>
                <CardTitle>Product Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedImage ? (
                    <div className="space-y-3">
                      <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={selectedImage.url}
                          alt={selectedImage.alt || selectedImage.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium truncate">{selectedImage.name}</p>
                        {selectedImage.alt && (
                          <p className="text-xs text-muted-foreground mt-1">{selectedImage.alt}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setShowMediaManager(true)}
                        >
                          Change Image
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImage(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 border-dashed"
                      onClick={() => setShowMediaManager(true)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Add Product Image</p>
                          <p className="text-xs text-muted-foreground">
                            Choose from media library
                          </p>
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Product Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Product Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Type:</span>
                  <Badge variant="secondary">
                    {form.type === 'simple' ? 'Simple Product' : 'Variable Product'}
                  </Badge>
                </div>
                {form.type === 'variation' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm">Attributes:</span>
                      <span className="font-medium">{form.selectedAttributes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Variations:</span>
                      <span className="font-medium">{form.variations.length}</span>
                    </div>
                  </>
                )}
                {form.categoryId && (
                  <div className="flex justify-between">
                    <span className="text-sm">Category:</span>
                    <span className="font-medium text-sm">
                      {categories.find(cat => cat.id === form.categoryId)?.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="product-status" className="text-sm font-medium">
                      Status
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {form.status === 'active' ? 'Product is active and visible' : 'Product is inactive and hidden'}
                    </p>
                  </div>
                  <Switch
                    id="product-status"
                    checked={form.status === 'active'}
                    onCheckedChange={(checked) => 
                      setForm({ ...form, status: checked ? 'active' : 'inactive' })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-black hover:bg-gray-800 text-white border border-black cursor-pointer" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.div
                        className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Package className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Creating...' : 'Create Product'}
                  </Button>
                  
                  <Link href="/products">
                    <Button variant="outline" className="w-full border-gray-300 bg-background cursor-pointer" disabled={isLoading}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Add Variation Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Variation</DialogTitle>
            <DialogDescription>
              Create variations based on selected attributes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-variation-sku">SKU *</Label>
                <div className="relative">
                  <Input
                    id="add-variation-sku"
                    value={variationForm.sku}
                    onChange={(e) => setVariationForm({ ...variationForm, sku: e.target.value })}
                    placeholder="Enter variation SKU"
                    className={
                      variationSkuValidation.isValid === false 
                        ? "border-red-500 focus-visible:ring-red-500" 
                        : variationSkuValidation.isValid === true 
                          ? "border-green-500 focus-visible:ring-green-500" 
                          : ""
                    }
                  />
                  {variationSkuValidation.isChecking && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                {variationSkuValidation.message && (
                  <p className={`text-xs ${
                    variationSkuValidation.isValid === false 
                      ? "text-red-600" 
                      : variationSkuValidation.isValid === true 
                        ? "text-green-600" 
                        : "text-gray-600"
                  }`}>
                    {variationSkuValidation.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-variation-price">Selling Price</Label>
                <Input
                  id="add-variation-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={variationForm.sellingPrice || ''}
                  onChange={(e) => setVariationForm({ 
                    ...variationForm, 
                    sellingPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.selectedAttributes.map((attributeId) => {
                const attribute = attributes.find(attr => attr.id === attributeId)
                return (
                  <div key={attributeId} className="space-y-2">
                    <Label>{attribute?.name} *</Label>
                    <Select
                      value={variationForm.attributeValues[attributeId] || ''}
                      onValueChange={(value) => setVariationForm({
                        ...variationForm,
                        attributeValues: {
                          ...variationForm.attributeValues,
                          [attributeId]: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${attribute?.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {attribute?.values.map((value) => (
                          <SelectItem key={value.id} value={value.id}>
                            {value.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Variation stock will start at 0. Use "Create Purchase" to add inventory for each variation.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetVariationForm}>
              Cancel
            </Button>
            <Button onClick={addVariation}>
              Add Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variation Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Variation</DialogTitle>
            <DialogDescription>
              Update the variation details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-variation-sku">SKU *</Label>
                <div className="relative">
                  <Input
                    id="edit-variation-sku"
                    value={variationForm.sku}
                    onChange={(e) => setVariationForm({ ...variationForm, sku: e.target.value })}
                    placeholder="Enter variation SKU"
                    className={
                      variationSkuValidation.isValid === false 
                        ? "border-red-500 focus-visible:ring-red-500" 
                        : variationSkuValidation.isValid === true 
                          ? "border-green-500 focus-visible:ring-green-500" 
                          : ""
                    }
                  />
                  {variationSkuValidation.isChecking && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                {variationSkuValidation.message && (
                  <p className={`text-xs ${
                    variationSkuValidation.isValid === false 
                      ? "text-red-600" 
                      : variationSkuValidation.isValid === true 
                        ? "text-green-600" 
                        : "text-gray-600"
                  }`}>
                    {variationSkuValidation.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-variation-price">Selling Price</Label>
                <Input
                  id="edit-variation-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={variationForm.sellingPrice || ''}
                  onChange={(e) => setVariationForm({ 
                    ...variationForm, 
                    sellingPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.selectedAttributes.map((attributeId) => {
                const attribute = attributes.find(attr => attr.id === attributeId)
                return (
                  <div key={attributeId} className="space-y-2">
                    <Label>{attribute?.name} *</Label>
                    <Select
                      value={variationForm.attributeValues[attributeId] || ''}
                      onValueChange={(value) => setVariationForm({
                        ...variationForm,
                        attributeValues: {
                          ...variationForm.attributeValues,
                          [attributeId]: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${attribute?.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {attribute?.values.map((value) => (
                          <SelectItem key={value.id} value={value.id}>
                            {value.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetVariationForm}>
              Cancel
            </Button>
            <Button onClick={addVariation}>
              Update Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Variation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this variation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {variationToDelete !== null && (
            <div className="py-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">
                  SKU: {form.variations[variationToDelete]?.sku}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(form.variations[variationToDelete]?.attribute_values || {}).map(([attrId, valueId]) => (
                    <Badge key={attrId} variant="secondary" className="text-xs">
                      {getAttributeName(attrId)}: {getAttributeValueName(attrId, valueId as string)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteVariation}>
              Delete Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Attribute Modal */}
      <Dialog open={showCreateAttributeModal} onOpenChange={setShowCreateAttributeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Attribute</DialogTitle>
            <DialogDescription>
              Create a new attribute that can be used for product variations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attribute-name">Attribute Name *</Label>
              <Input
                id="attribute-name"
                value={createAttributeForm.name}
                onChange={(e) => setCreateAttributeForm({ ...createAttributeForm, name: e.target.value })}
                placeholder="e.g., Size, Color, Material"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Attribute Values *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAttributeValue}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Value
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {createAttributeForm.values.map((value, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={value}
                      onChange={(e) => updateAttributeValue(index, e.target.value)}
                      placeholder={`Value ${index + 1}`}
                      className="flex-1"
                    />
                    {createAttributeForm.values.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttributeValue(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> After creating this attribute, it will be automatically selected and you can immediately use it to create variations.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateAttributeModal(false)}
              disabled={isCreatingAttribute}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAttribute}
              disabled={isCreatingAttribute}
            >
              {isCreatingAttribute ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Attribute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Attribute Modal */}
      <Dialog open={showEditAttributeModal} onOpenChange={setShowEditAttributeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Attribute
            </DialogTitle>
            <DialogDescription>
              Update the attribute name and values
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-attribute-name">Name</Label>
              <Input
                id="edit-attribute-name"
                placeholder="e.g., Size"
                value={editAttributeForm.name}
                onChange={(e) => setEditAttributeForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-3">
              <Label>Values</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {editAttributeForm.values.map((value, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Attribute value"
                      value={value}
                      onChange={(e) => updateEditAttributeValue(index, e.target.value)}
                      className="flex-1"
                    />
                    {editAttributeForm.values.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEditAttributeValue(index)}
                        className="h-10 w-10 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEditAttributeValue}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Value
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowEditAttributeModal(false)}
              disabled={isEditingAttribute}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleEditAttribute}
              disabled={isEditingAttribute}
            >
              {isEditingAttribute ? (
                <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditingAttribute ? 'Updating...' : 'Update Attribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Manager Modal */}
      <MediaManager
        open={showMediaManager}
        onOpenChange={setShowMediaManager}
        onSelect={handleMediaSelect}
        selectedId={selectedImage?.id}
      />
    </div>
  )
} 