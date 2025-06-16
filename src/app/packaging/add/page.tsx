"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Box, Plus, X, Edit, Save } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { getPackagingAttributes } from "@/lib/supabase/queries"
import type { DatabasePackagingAttribute } from "@/lib/supabase/queries"
import { 
  createPackaging, 
  checkPackagingSkuExists, 
  createPackagingAttribute,
  updatePackagingAttribute 
} from "@/lib/supabase/mutations"
import type { 
  CreatePackagingData, 
  CreatePackagingAttributeData,
  UpdatePackagingAttributeData 
} from "@/lib/supabase/mutations"

interface PackagingVariation {
  id: string
  sku: string
  attributeValues: { [attributeId: string]: string }
}

interface PackagingForm {
  title: string
  description: string
  type: 'simple' | 'variable'
  status: 'active' | 'inactive'
  // Simple packaging fields
  sku?: string
  // Variable packaging fields
  selectedAttributes: string[]
  variations: PackagingVariation[]
}

interface VariationForm {
  sku: string
  attributeValues: { [attributeId: string]: string }
}

interface EditAttributeForm {
  id: string
  name: string
  values: string[]
}

export default function AddPackagingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  const [editingVariationIndex, setEditingVariationIndex] = React.useState<number | null>(null)
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [packagingAttributes, setPackagingAttributes] = React.useState<DatabasePackagingAttribute[]>([])
  const [loadingAttributes, setLoadingAttributes] = React.useState(true)
  
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
  
  const [form, setForm] = React.useState<PackagingForm>({
    title: '',
    description: '',
    type: 'simple',
    status: 'active',
    selectedAttributes: [],
    variations: []
  })

  const [variationForm, setVariationForm] = React.useState<VariationForm>({
    sku: '',
    attributeValues: {}
  })

  // Modal state variables
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [variationToDelete, setVariationToDelete] = React.useState<number | null>(null)
  
  // Attribute creation modal state
  const [showCreateAttributeModal, setShowCreateAttributeModal] = React.useState(false)
  const [createAttributeForm, setCreateAttributeForm] = React.useState({
    name: '',
    values: ['']
  })
  const [isCreatingAttribute, setIsCreatingAttribute] = React.useState(false)

  // Edit Attribute Modal states
  const [showEditAttributeModal, setShowEditAttributeModal] = React.useState(false)
  const [editAttributeForm, setEditAttributeForm] = React.useState<EditAttributeForm>({
    id: '',
    name: '',
    values: ['']
  })
  const [isEditingAttribute, setIsEditingAttribute] = React.useState(false)

  // Load packaging attributes from Supabase
  React.useEffect(() => {
    loadPackagingAttributes()
  }, [])

  const loadPackagingAttributes = async () => {
    try {
      setLoadingAttributes(true)
      const data = await getPackagingAttributes()
      setPackagingAttributes(data)
    } catch (error) {
      console.error('Error loading packaging attributes:', error)
      setErrors(['Failed to load packaging attributes'])
    } finally {
      setLoadingAttributes(false)
    }
  }

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
      const exists = await checkPackagingSkuExists(sku)
      
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

  const validateForm = () => {
    const newErrors: string[] = []

    if (!form.title.trim()) {
      newErrors.push('Packaging title is required')
    }

    if (form.type === 'simple') {
      if (!form.sku?.trim()) {
        newErrors.push('SKU is required for simple packaging')
      } else if (skuValidation.isValid === false) {
        newErrors.push(skuValidation.message || 'SKU is not valid')
      } else if (skuValidation.isChecking) {
        newErrors.push('Please wait for SKU validation to complete')
      }
    } else {
      if (form.selectedAttributes.length === 0) {
        newErrors.push('At least one attribute must be selected for variable packaging')
      }
      if (form.variations.length === 0) {
        newErrors.push('At least one variation must be created')
      }
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
    
    console.log('🎯 handleSubmit called!')
    console.log('🔍 Form data:', form)
    
    const isValid = validateForm()
    console.log('✅ Form validation result:', isValid)
    console.log('🚨 Validation errors:', errors)
    
    if (!isValid) {
      console.log('❌ Form validation failed, stopping submission')
      return
    }

    console.log('🚀 Form validation passed, proceeding with submission')
    setIsLoading(true)
    setErrors([])
    
    try {
      console.log('🚀 Creating packaging with data:', form)
      
      // Prepare data for API
      const createData: CreatePackagingData = {
        title: form.title,
        description: form.description,
        type: form.type,
        status: form.status,
        sku: form.type === 'simple' ? form.sku : undefined,
        selectedAttributes: form.type === 'variable' ? form.selectedAttributes : undefined,
        variations: form.type === 'variable' ? form.variations.map(v => ({
          sku: v.sku,
          attributeValues: v.attributeValues
        })) : undefined
      }
      
      console.log('🔍 Prepared data for createPackaging:', createData)
      
      // Create the packaging
      const packagingId = await createPackaging(createData)
      
      console.log('✅ Packaging created successfully with ID:', packagingId)
      
      // Show success message
      toast.success("Packaging created successfully!", {
        description: `${form.title} has been added to your packaging list.`
      })
      
      // Redirect to packaging list
      router.push('/packaging')
      
    } catch (error) {
      console.error('❌ Error creating packaging:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create packaging. Please try again.'
      setErrors([errorMessage])
      toast.error("Failed to create packaging", {
        description: errorMessage
      })
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

    // Check if SKU already exists in other variations (exclude current editing variation)
    const existingSKU = form.variations.find((v, index) => 
      index !== editingVariationIndex &&
      v.sku.toLowerCase() === variationForm.sku.toLowerCase()
    )

    if (existingSKU) {
      const errorMsg = `SKU "${variationForm.sku}" already exists in another variation`
      console.log('❌ Duplicate SKU found:', errorMsg)
      toast.error("Duplicate SKU", {
        description: errorMsg
      })
      console.log('📢 Toast error called for duplicate SKU')
      return
    }

    // Check if all selected attributes have values
    const missingAttributes = form.selectedAttributes.filter(
      attrId => !variationForm.attributeValues[attrId]
    )

    if (missingAttributes.length > 0) {
      const errorMsg = 'Please select values for all attributes'
      toast.error("Missing Values", {
        description: errorMsg
      })
      return
    }

    // Check if variation with same attribute values already exists (exclude current editing variation)
    const existingVariation = form.variations.find((v, index) => 
      index !== editingVariationIndex &&
      JSON.stringify(v.attributeValues) === JSON.stringify(variationForm.attributeValues)
    )

    if (existingVariation) {
      const attributeNames = Object.entries(variationForm.attributeValues).map(([attrId, valueId]) => {
        const attrName = getAttributeName(attrId)
        const valueName = getAttributeValueName(attrId, valueId)
        return `${attrName}: ${valueName}`
      }).join(', ')
      
      const errorMsg = `A variation with these attributes already exists: ${attributeNames}`
      console.log('❌ Duplicate variation found:', errorMsg)
      toast.error("Duplicate Variation", {
        description: errorMsg
      })
      console.log('📢 Toast error called for duplicate variation')
      return
    }

    const newVariation: PackagingVariation = {
      id: editingVariationIndex !== null ? form.variations[editingVariationIndex].id : `VAR_${Date.now()}`,
      sku: variationForm.sku,
      attributeValues: { ...variationForm.attributeValues }
    }

    if (editingVariationIndex !== null) {
      // Update existing variation
      const updatedVariations = [...form.variations]
      updatedVariations[editingVariationIndex] = newVariation
      setForm(prev => ({ ...prev, variations: updatedVariations }))
      setEditingVariationIndex(null)
    } else {
      // Add new variation
      setForm(prev => ({ ...prev, variations: [...prev.variations, newVariation] }))
    }

    resetVariationForm()
    setShowAddModal(false)
    setShowEditModal(false)
    setErrors([])
  }

  const editVariation = (index: number) => {
    const variation = form.variations[index]
    
    // Clear previous state first to prevent contamination
    resetVariationForm()
    
    setVariationForm({
      sku: variation.sku,
      attributeValues: { ...variation.attributeValues }
    })
    setEditingVariationIndex(index)
    setShowEditModal(true)
  }

  const openAddVariationModal = () => {
    resetVariationForm()
    setShowAddModal(true)
  }

  const resetVariationForm = () => {
    setVariationForm({
      sku: '',
      attributeValues: {}
    })
    setVariationSkuValidation({ isChecking: false, isValid: null, message: '' })
    setEditingVariationIndex(null)
    setShowAddModal(false)
    setShowEditModal(false)
  }

  const handleDeleteClick = (index: number) => {
    setVariationToDelete(index)
    setShowDeleteModal(true)
  }

  const confirmDeleteVariation = () => {
    if (variationToDelete !== null) {
      setForm(prev => ({
        ...prev,
        variations: prev.variations.filter((_, i) => i !== variationToDelete)
      }))
      setVariationToDelete(null)
      setShowDeleteModal(false)
    }
  }

  const getAttributeValueName = (attributeId: string, valueId: string) => {
    const attribute = packagingAttributes.find(attr => attr.id === attributeId)
    const value = attribute?.values?.find(val => val.id === valueId)
    return value?.value || valueId
  }

  const getAttributeName = (attributeId: string) => {
    const attribute = packagingAttributes.find(attr => attr.id === attributeId)
    return attribute?.name || attributeId
  }

  // Attribute creation functions
  const openCreateAttributeModal = () => {
    setCreateAttributeForm({
      name: '',
      values: ['']
    })
    setShowCreateAttributeModal(true)
  }

  const openEditAttributeModal = (attribute: DatabasePackagingAttribute) => {
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
      const attributeData: CreatePackagingAttributeData = {
        name: createAttributeForm.name,
        values: createAttributeForm.values.filter(v => v.trim())
      }
      
      const attributeId = await createPackagingAttribute(attributeData)
      
      // Refresh packaging attributes
      await loadPackagingAttributes()
      
      // Auto-select the newly created attribute
      setForm(prev => ({
        ...prev,
        selectedAttributes: [...prev.selectedAttributes, attributeId]
      }))
      
      // Close modal and reset form
      setShowCreateAttributeModal(false)
      setCreateAttributeForm({
        name: '',
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
      const attributeData: UpdatePackagingAttributeData = {
        id: editAttributeForm.id,
        name: editAttributeForm.name,
        values: editAttributeForm.values.filter(v => v.trim())
      }
      
      await updatePackagingAttribute(attributeData)
      
      // Refresh packaging attributes
      await loadPackagingAttributes()
      
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

  if (loadingAttributes) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading packaging attributes...</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="container mx-auto px-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Link href="/packaging">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Packaging
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Packaging</h1>
          <p className="text-muted-foreground mt-2">
            Create packaging options for your products
          </p>
        </div>
      </motion.div>

      {/* Success Message */}
      {showSuccess && (
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="border-green-200 bg-green-50">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-green-600" />
              <span className="text-green-800">
                Packaging created successfully! Redirecting to packaging page...
              </span>
            </div>
          </Alert>
        </motion.div>
      )}

      <motion.div
        className="grid gap-6 lg:grid-cols-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details for this packaging option
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="mb-2 block">Packaging Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Standard Box, Gift Wrapping"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="mb-2 block">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe this packaging option..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium mb-2 block">Packaging Type</Label>
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
                          <h3 className="font-medium text-sm sm:text-base">Simple Packaging</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                            Single packaging option with one SKU
                          </p>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        form.type === 'variable' 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-muted hover:border-muted-foreground/50 hover:shadow-sm'
                      }`}
                      onClick={() => setForm({ ...form, type: 'variable', sku: '' })}
                    >
                      <div className="flex items-start sm:items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 sm:mt-0 flex-shrink-0 ${
                          form.type === 'variable' ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {form.type === 'variable' && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm sm:text-base">Variable Packaging</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                            Multiple variations with different attributes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {form.type === 'simple' && (
                  <div className="space-y-2">
                    <Label htmlFor="sku" className="mb-2 block">SKU *</Label>
                    <div className="relative">
                      <Input
                        id="sku"
                        value={form.sku || ''}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="e.g., PKG-STD-001"
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
                )}
              </CardContent>
            </Card>

            {form.type === 'variable' && (
              <>
                {/* Attributes Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Packaging Attributes
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
                      Select attributes to create variations (e.g., Size, Material, Color)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                      {packagingAttributes.map((attribute) => (
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
                    
                    {packagingAttributes.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No packaging attributes found. Use the "Create Attribute" button above to get started.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Variations */}
                {(form.selectedAttributes.length > 0 || form.variations.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Packaging Variations
                        <Button
                          type="button"
                          onClick={openAddVariationModal}
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
                                      {Object.entries(variation.attributeValues).map(([attrId, valueId]) => (
                                        <Badge key={attrId} variant="secondary" className="text-xs">
                                          {getAttributeName(attrId)}: {getAttributeValueName(attrId, valueId)}
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
                      
                      <Alert className="border-blue-200 bg-blue-50">
                        <AlertDescription className="text-blue-800">
                          <strong>Note:</strong> Variation stock will start at 0. Use "Create Purchase" to add inventory for each variation.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Packaging Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Packaging Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Type:</span>
                <Badge variant="secondary">
                  {form.type === 'simple' ? 'Simple Packaging' : 'Variable Packaging'}
                </Badge>
              </div>
              {form.type === 'variable' && (
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
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="packaging-status" className="text-sm font-medium">
                    Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {form.status === 'active' ? 'Packaging is active and available' : 'Packaging is inactive and hidden'}
                  </p>
                </div>
                <Switch
                  id="packaging-status"
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
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault()
                    handleSubmit(e as any)
                  }}
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
                    <Box className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? 'Creating...' : 'Create Packaging'}
                </Button>
                
                <Link href="/packaging">
                  <Button variant="outline" className="w-full border-gray-300 bg-background cursor-pointer" disabled={isLoading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Add Variation Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Variation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-sku">SKU *</Label>
              <div className="relative">
                <Input
                  id="add-sku"
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

            {/* Attribute Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.selectedAttributes.map((attributeId) => {
                const attribute = packagingAttributes.find(attr => attr.id === attributeId)
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
                        {attribute?.values?.map((value) => (
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

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>Note:</strong> Variation stock will start at 0. Use "Create Purchase" to add inventory.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addVariation}>
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
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU *</Label>
              <div className="relative">
                <Input
                  id="edit-sku"
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

            {/* Attribute Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.selectedAttributes.map((attributeId) => {
                const attribute = packagingAttributes.find(attr => attr.id === attributeId)
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
                        {attribute?.values?.map((value) => (
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

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>Note:</strong> Changes will be saved when you update the variation.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addVariation}>
              Update Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Variation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this variation? This action cannot be undone.
            </p>
            
            {variationToDelete !== null && form.variations[variationToDelete] && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="space-y-2">
                  <div className="font-medium text-sm">
                    SKU: {form.variations[variationToDelete].sku}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(form.variations[variationToDelete].attributeValues).map(([attrId, valueId]) => (
                      <Badge key={attrId} variant="secondary" className="text-xs">
                        {getAttributeName(attrId)}: {getAttributeValueName(attrId, valueId)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Warning:</strong> This variation will be permanently deleted.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteVariation}>
              Delete Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Attribute Modal */}
      <Dialog open={showCreateAttributeModal} onOpenChange={setShowCreateAttributeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Packaging Attribute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attribute-name">Attribute Name *</Label>
              <Input
                id="attribute-name"
                value={createAttributeForm.name}
                onChange={(e) => setCreateAttributeForm({ ...createAttributeForm, name: e.target.value })}
                placeholder="e.g., Size, Material, Color"
              />
            </div>

            <div className="space-y-3">
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
              
              {createAttributeForm.values.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No attribute values added yet. Click "Add Value" to get started.
                </p>
              )}
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>Tip:</strong> The newly created attribute will be automatically selected for use in variations.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateAttributeModal(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateAttribute}>
              Create Attribute
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
                value={editAttributeForm.name}
                onChange={(e) => setEditAttributeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Size, Material, Color"
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
                <motion.div
                  className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditingAttribute ? 'Updating...' : 'Update Attribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
} 