"use client"

import * as React from "react"
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, Plus, X, Upload, Edit, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { createClient } from "@/lib/supabase/client"
import { 
  updateCompleteProduct,
  createProductVariation,
  deleteProductVariation,
  checkSkuExists,
  createAttribute,
  createAttributeValues,
  updateAttribute,
  updateAttributeValues,
  type UpdateProductData,
  type UpdateProductVariationData,
  type CreateProductVariationData,
  type CreateAttributeData,
  type CreateAttributeValueData
} from "@/lib/supabase/mutations"
import { toast } from "sonner"
import type { Product, ProductVariation } from "@/lib/types"

// Client-side type definitions
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

interface EditAttributeForm {
  id: string
  name: string
  values: string[]
}


// Import existing hooks for data management
import { useProductData } from '@/lib/hooks/useProductData'
import { useProductValidation } from '@/lib/hooks/useProductValidation'
import { transformDatabaseProductToProduct } from '@/lib/utils/productTransforms'

export default function EditProductPage() {
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

function transformDatabaseProductToProduct(dbProduct: DatabaseProduct): Product {
  const baseProduct: Product = {
    id: dbProduct.id,
    name: dbProduct.name,
    sku: dbProduct.sku,
    description: dbProduct.description,
    category: dbProduct.category?.name || 'Unknown',
    categoryId: dbProduct.category_id,
    status: dbProduct.status,
    type: dbProduct.type,
    image: dbProduct.image_url,
    parentSku: dbProduct.parent_sku,
  }

  if (dbProduct.type === 'simple') {
    return {
      ...baseProduct,
      price: dbProduct.price,
      // Legacy fields removed - will be handled by warehouse stock system
      buyingPrice: 0,
      stock: 0,
      boughtQuantity: 0,
    }
  } else {
    // Variation product
    const variations: ProductVariation[] = dbProduct.variations?.map(dbVariation => ({
      id: dbVariation.id,
      productId: dbVariation.product_id,
      sku: dbVariation.sku,
      price: dbVariation.price,
      // Legacy fields removed - will be handled by warehouse stock system
      buyingPrice: 0,
      stock: 0,
      boughtQuantity: 0,
      attributeValues: dbVariation.attribute_values?.reduce((acc: Record<string, string>, attr: { attribute_id: string; value_id: string }) => {
        acc[attr.attribute_id] = attr.value_id
        return acc
      }, {} as Record<string, string>) || {}
    })) || []

    return {
      ...baseProduct,
      variations,
      attributes: dbProduct.attributes?.map(attr => attr.id) || []
    }
  }
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  const [editingVariationIndex, setEditingVariationIndex] = React.useState<number | null>(null)
  const [product, setProduct] = React.useState<Product | null>(null)
  const [categories, setCategories] = React.useState<DatabaseCategory[]>([])

  const [attributes, setAttributes] = React.useState<DatabaseAttribute[]>([])
  const [formInitialized, setFormInitialized] = React.useState(false)
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [deletedVariationIds, setDeletedVariationIds] = React.useState<string[]>([])
  
  const [form, setForm] = React.useState<ProductForm>({
    name: '',
    description: '',
    categoryId: '',
    type: 'simple',
    status: 'active',
    selectedAttributes: [],
    variations: []
  })

  const [variationForm, setVariationForm] = React.useState<VariationForm>({
    sku: '',
    sellingPrice: undefined,
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
  
  // Edit attribute modal states
  const [showEditAttributeModal, setShowEditAttributeModal] = React.useState(false)
  const [editAttributeForm, setEditAttributeForm] = React.useState<EditAttributeForm>({
    id: '',
    name: '',
    values: ['']
  })
  const [isEditingAttribute, setIsEditingAttribute] = React.useState(false)
  
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

  // Enhanced deduplication with component-level tracking
  const componentId = React.useRef(`edit-product-${productId}`)
  const initialLoadCompleted = React.useRef(false)
  const loadingPromise = React.useRef<Promise<void> | null>(null)

  // Load data on mount with enhanced deduplication
  React.useEffect(() => {
    // Don't load if no productId
    if (!productId) {
      return
    }

    // Prevent multiple calls in React Strict Mode development
    if (initialLoadCompleted.current) {
      console.log('⛔ Preventing duplicate data load - already completed')
      return
    }

    // If there's already a loading promise, wait for it instead of creating a new one
    if (loadingPromise.current) {
      console.log('⛔ Preventing duplicate data load - loading in progress')
      return
    }
    
    const loadData = async () => {
      try {
        console.log('🚀 Starting data load for component:', componentId.current)
        
        const [productData, categoriesData, attributesData] = await Promise.all([
          getProductById(productId),
          getCategories(),
          getAttributes()
        ])

        if (!productData) {
          toast.error('Product not found')
          router.push('/products')
          return
        }

        console.log('🔍 Raw product data from DB:', productData)
        
        const transformedProduct = transformDatabaseProductToProduct(productData)
        console.log('🔄 Transformed product:', transformedProduct)
        
        setProduct(transformedProduct)
        setCategories(categoriesData)
        setAttributes(attributesData)

        // Set form data
        const selectedAttributes = transformedProduct.attributes || []
        
        const formData = {
          name: transformedProduct.name,
          description: transformedProduct.description,
          categoryId: transformedProduct.categoryId,
          type: transformedProduct.type,
          status: transformedProduct.status,
          sku: transformedProduct.sku,
          sellingPrice: transformedProduct.price,
          buyingPrice: transformedProduct.buyingPrice,
          stock: transformedProduct.stock,
          boughtQuantity: transformedProduct.boughtQuantity,
          parentSku: transformedProduct.parentSku,
          selectedAttributes: selectedAttributes,
          variations: transformedProduct.variations || []
        }
        
        console.log('📝 Setting form data:', formData)
        setForm(formData)
        
        setFormInitialized(true)
        initialLoadCompleted.current = true
        
        console.log('✅ Data load completed for component:', componentId.current)
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load product data')
        router.push('/products')
      } finally {
        loadingPromise.current = null
      }
    }

    loadingPromise.current = loadData()
  }, [productId])

  // SKU validation with debouncing and deduplication
  const validateSku = React.useCallback(async (sku: string, isVariation = false, excludeId?: string) => {
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
      // Also check against local variations if this is for a variation
      let duplicateInVariations = false
      if (isVariation) {
        duplicateInVariations = form.variations.some((v, index) => 
          index !== editingVariationIndex &&
          v.sku.toLowerCase() === sku.toLowerCase()
        )
      }

      if (duplicateInVariations) {
        setValidation({ 
          isChecking: false, 
          isValid: false, 
          message: 'SKU already exists in another variation'
        })
        return
      }

      // Check if SKU exists in database (excluding current product/variation) with deduplication
      const exists = await validateSkuUnique(sku, excludeId || productId)

      if (exists) {
        setValidation({ 
          isChecking: false, 
          isValid: false, 
          message: 'SKU already exists' 
        })
      } else {
        setValidation({ isChecking: false, isValid: true, message: 'SKU is available' })
      }
    } catch (error) {
      console.error('Error validating SKU:', error)
      setValidation({ isChecking: false, isValid: null, message: 'Could not validate SKU' })
    }
  }, [form.variations, editingVariationIndex, productId])

  // Debounced SKU validation
  React.useEffect(() => {
    if (form.type === 'simple' && form.sku && formInitialized) {
      const timer = setTimeout(() => {
        validateSku(form.sku!, false)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setSkuValidation({ isChecking: false, isValid: null, message: '' })
    }
  }, [form.sku, form.type, validateSku, formInitialized])

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

  const validateForm = () => {
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
    
    console.log('🚀 Form submitted with data:', form)
    
    if (!validateForm()) {
      console.log('❌ Form validation failed')
      return
    }

    setIsLoading(true)
    
    try {
      if (!product) throw new Error('Product not found')

      console.log('📦 Original product:', product)
      console.log('📝 Form data:', form)

      // Prepare product data
      const productData: UpdateProductData = {
        id: productId,
        name: form.name,
        description: form.description,
        category_id: form.categoryId || undefined,
        status: form.status,
        type: form.type,
        sku: form.sku,
        price: form.sellingPrice,
        parent_sku: form.parentSku
      }

      console.log('📤 Sending product data to update:', productData)

      // Handle variations for variation products
      let existingVariations: UpdateProductVariationData[] = []
      let newVariations: CreateProductVariationData[] = []

      if (form.type === 'variation') {
        form.variations.forEach(variation => {
          if (variation.id.startsWith('new_')) {
            // This is a new variation
            newVariations.push({
              product_id: productId,
              sku: variation.sku,
              price: variation.price,
              attribute_values: variation.attributeValues
            })
          } else {
            // This is an existing variation
            existingVariations.push({
              id: variation.id,
              sku: variation.sku,
              price: variation.price,
              attribute_values: variation.attributeValues
            })
          }
        })

        // Delete removed variations
        for (const deletedId of deletedVariationIds) {
          if (!deletedId.startsWith('new_')) {
            await deleteProductVariation(deletedId)
          }
        }
      }

      // Update the complete product
      console.log('🔄 Calling updateCompleteProduct...')
      await updateCompleteProduct(
        productData,
        existingVariations,
        newVariations,
        form.type === 'variation' ? form.selectedAttributes : undefined
      )
      
      console.log('✅ Update completed successfully!')
      toast.success('Product updated successfully!')
      setShowSuccess(true)
      
      // Redirect after a delay to show success message
      setTimeout(() => {
        router.push('/products')
      }, 2000)
      
    } catch (error) {
      console.error('Error updating product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update product'
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

    // Check if all required attributes are filled
    const missingAttributes = form.selectedAttributes.filter(
      attrId => !variationForm.attributeValues[attrId]
    )
    if (missingAttributes.length > 0) {
      toast.error("Missing Values", {
        description: 'Please fill in all attribute values'
      })
      return
    }

    // Check for duplicate SKU (this should already be caught by validation but keeping as backup)
    if (form.variations.some((v, index) => 
      index !== editingVariationIndex && v.sku === variationForm.sku
    )) {
      toast.error("Duplicate SKU", {
        description: 'SKU already exists in another variation'
      })
      return
    }

    const newVariation: ProductVariation = {
      id: editingVariationIndex !== null 
        ? form.variations[editingVariationIndex].id
        : `new_${Date.now()}`, // Temporary ID for new variations
      productId: productId,
      sku: variationForm.sku,
      attributeValues: { ...variationForm.attributeValues }, // Create a copy
      price: variationForm.sellingPrice || 0,
      buyingPrice: editingVariationIndex !== null 
        ? form.variations[editingVariationIndex].buyingPrice 
        : 0,
      stock: editingVariationIndex !== null 
        ? form.variations[editingVariationIndex].stock 
        : 0,
      boughtQuantity: editingVariationIndex !== null 
        ? form.variations[editingVariationIndex].boughtQuantity 
        : 0
    }

    if (editingVariationIndex !== null) {
      // Update existing variation
      setForm(prev => ({
        ...prev,
        variations: prev.variations.map((v, i) => 
          i === editingVariationIndex ? newVariation : v
        )
      }))
    } else {
      // Add new variation
      setForm(prev => ({
        ...prev,
        variations: [...prev.variations, newVariation]
      }))
    }

    resetVariationForm()
    setErrors([])
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
      attributeValues: { ...variation.attributeValues } // Create a copy to avoid reference issues
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
    
    const variation = form.variations[variationToDelete]
    
    // If it's an existing variation (not a new one), mark it for deletion
    if (!variation.id.startsWith('new_')) {
      setDeletedVariationIds(prev => [...prev, variation.id])
    }
    
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
    const value = attribute?.values?.find((val: any) => val.id === valueId)
    return value?.label || valueId
  }

  const getAttributeName = (attributeId: string) => {
    const attribute = attributes.find(attr => attr.id === attributeId)
    return attribute?.name || attributeId
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

  const openEditAttributeModal = (attribute: DatabaseAttribute) => {
    setEditAttributeForm({
      id: attribute.id,
      name: attribute.name,
      values: attribute.values && attribute.values.length > 0 ? attribute.values.map(v => v.value) : ['']
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
      const updatedAttributes = await getAttributes()
      setAttributes(updatedAttributes)
      
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
      const updatedAttributes = await getAttributes()
      setAttributes(updatedAttributes)
      
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

  // Calculate total stock for variable products
  const calculateTotalStock = () => {
    if (form.type === 'variation') {
      return form.variations.reduce((total, variation) => total + (variation.stock || 0), 0)
    }
    return form.stock || 0
  }

  // Handle missing productId
  if (!productId) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center">
          <p className="text-lg text-red-600">Invalid product ID</p>
          <Link href="/products">
            <Button className="mt-4">Back to Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!formInitialized) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center">
          <p className="text-lg text-red-600">Product not found</p>
          <Link href="/products">
            <Button className="mt-4">Back to Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground">
              Update product information and settings
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          ID: {productId}
        </Badge>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6">
          <Alert className="border-green-200 bg-green-50">
            <Package className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Product has been updated successfully! Redirecting...
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Product name, description, and category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Enter product description"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setForm({ ...form, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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

              <div className="space-y-3">
                <Label className="text-base font-medium mb-2 block">Product Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div 
                    className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${
                      form.type === 'simple' 
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                        : 'border-muted-foreground/30 bg-muted/30'
                    } opacity-60 cursor-not-allowed`}
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
                    className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${
                      form.type === 'variation' 
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                        : 'border-muted-foreground/30 bg-muted/30'
                    } opacity-60 cursor-not-allowed`}
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
                <p className="text-xs text-muted-foreground">
                  Product type cannot be changed after creation
                </p>
              </div>


            </CardContent>
          </Card>

          {/* Simple Product Fields */}
          {form.type === 'simple' && (
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  SKU and pricing information. Stock quantity is managed through Purchase system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <div className="relative">
                      <Input
                        id="sku"
                        value={form.sku || ''}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="Enter SKU"
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

              {/* Variations Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Product Variations
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openAddVariationModal()}
                      disabled={form.selectedAttributes.length === 0}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Variation
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Create specific combinations of your selected attributes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">


                  {/* Variations List */}
                  {form.variations.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Current Variations</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Attributes</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {form.variations.map((variation, index) => (
                            <TableRow key={variation.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {variation.sku}
                                  {variation.id.startsWith('new_') ? (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      New
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      Existing
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(variation.attributeValues).map(([attrId, valueId]) => (
                                    <Badge key={attrId} variant="secondary" className="text-xs">
                                      {getAttributeName(attrId)}: {getAttributeValueName(attrId, valueId)}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editVariation(index)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {/* Only show delete button for new variations (not saved to database yet) */}
                                  {variation.id.startsWith('new_') && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteClick(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
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
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Update Product
                  </>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => router.push('/products')}
                disabled={isLoading}
              >
                Cancel
              </Button>
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
                  <div className="flex justify-between">
                    <span className="text-sm">Total Stock:</span>
                    <span className="font-medium">{calculateTotalStock()}</span>
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
        </div>
      </form>

      {/* Add Variation Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Variation</DialogTitle>
            <DialogDescription>
              Create specific combinations of your selected attributes
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
                <Label htmlFor="add-variation-selling-price">Selling Price</Label>
                <Input
                  id="add-variation-selling-price"
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
                      <SelectContent className="z-[9999]">
                        {attribute?.values?.map((value: any) => (
                          <SelectItem key={value.id} value={value.id}>
                            {value.label}
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
                <Label htmlFor="modal-variation-sku">SKU *</Label>
                <div className="relative">
                  <Input
                    id="modal-variation-sku"
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
                <Label htmlFor="edit-variation-selling-price">Selling Price</Label>
                <Input
                  id="edit-variation-selling-price"
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
                      <SelectContent className="z-[9999]">
                        {attribute?.values?.map((value: any) => (
                          <SelectItem key={value.id} value={value.id}>
                            {value.label}
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
                  {Object.entries(form.variations[variationToDelete]?.attributeValues || {}).map(([attrId, valueId]) => (
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditingAttribute ? 'Updating...' : 'Update Attribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 