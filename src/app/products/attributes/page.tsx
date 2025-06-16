"use client"

import * as React from "react"
import { ArrowLeft, Plus, Settings, Edit, Trash2, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { 
  createAttribute, 
  updateAttribute, 
  deleteAttribute,
  createAttributeValues,
  updateAttributeValues,
  type CreateAttributeData,
  type UpdateAttributeData,
  type CreateAttributeValueData
} from "@/lib/supabase/mutations"
import { DeleteAttributeModal } from "@/components/products/DeleteAttributeModal"
import { toast } from "sonner"

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

interface AttributeForm {
  name: string
  type: string
  required: boolean
  values: string[]
}

interface AttributeWithValues extends Attribute {
  values: AttributeValue[]
}

// Deduplication cache for API calls
const dataCache = {
  attributes: [] as AttributeWithValues[],
  lastFetch: 0,
  currentRequest: null as Promise<AttributeWithValues[]> | null
}

const CACHE_DURATION = 30000 // 30 seconds

// Client-side query function with deduplication
async function getAllAttributes(forceRefresh = false): Promise<AttributeWithValues[]> {
  const now = Date.now()

  // Check cache first
  if (!forceRefresh && 
      dataCache.attributes.length > 0 && 
      (now - dataCache.lastFetch) < CACHE_DURATION) {
    console.log('📦 Using cached attributes data')
    return dataCache.attributes
  }

  // If there's already a request in progress, wait for it
  if (dataCache.currentRequest) {
    console.log('⏳ Request already in progress, waiting for existing promise...')
    return await dataCache.currentRequest
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<AttributeWithValues[]> => {
    try {
      console.log('🔄 Fetching fresh attributes data from API')
      const supabase = createClient()

      // Make both API calls in parallel
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

      // Update cache
      dataCache.attributes = attributesWithValues
      dataCache.lastFetch = now

      console.log('✅ Attributes data fetched successfully')
      return attributesWithValues
    } catch (error) {
      console.error('❌ Error loading attributes data:', error)
      throw error
    } finally {
      dataCache.currentRequest = null
    }
  })()

  // Store the request promise
  dataCache.currentRequest = requestPromise
  
  return await requestPromise
}

export default function AttributesPage() {
  const [attributes, setAttributes] = React.useState<AttributeWithValues[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingAttribute, setEditingAttribute] = React.useState<AttributeWithValues | null>(null)
  const [errors, setErrors] = React.useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [attributeToDelete, setAttributeToDelete] = React.useState<AttributeWithValues | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  
  const [form, setForm] = React.useState<AttributeForm>({
    name: '',
    type: 'text',
    required: false,
    values: ['']
  })

  // Deduplication cache and initial load tracker
  const initialLoadTriggered = React.useRef(false)

  // Load attributes on mount with deduplication
  React.useEffect(() => {
    if (initialLoadTriggered.current) {
      return
    }
    initialLoadTriggered.current = true

    const loadAttributes = async () => {
      try {
        setIsLoading(true)
        const attributesData = await getAllAttributes()
        setAttributes(attributesData)
        console.log('🎨 Loaded attributes from Supabase:', attributesData.length)
      } catch (error) {
        console.error('Error loading attributes:', error)
        toast.error('Failed to load attributes')
      } finally {
        setIsLoading(false)
      }
    }

    loadAttributes()
  }, [])

  const resetForm = () => {
    setForm({
      name: '',
      type: 'text',
      required: false,
      values: ['']
    })
    setEditingAttribute(null)
    setErrors([])
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (attribute: AttributeWithValues) => {
    setEditingAttribute(attribute)
    setForm({
      name: attribute.name,
      type: attribute.type,
      required: attribute.required,
      values: attribute.values.map(val => val.value)
    })
    setIsDialogOpen(true)
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!form.name.trim()) newErrors.push('Attribute name is required')
    
    const validValues = form.values.filter(val => val.trim())
    if (validValues.length === 0) newErrors.push('At least one attribute value is required')
    
    // Check for duplicate values
    const duplicates = validValues.filter((val, index) => validValues.indexOf(val) !== index)
    if (duplicates.length > 0) newErrors.push('Duplicate attribute values are not allowed')

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors([])

    try {
      const validValues = form.values.filter(val => val.trim())
      
      if (editingAttribute) {
        // Update existing attribute
        const updateData: UpdateAttributeData = {
          id: editingAttribute.id,
          name: form.name,
          type: form.type,
          required: form.required
        }
        
        await updateAttribute(updateData)
        
        // Update attribute values
        const valueData = validValues.map((value, index) => ({
          attribute_id: editingAttribute.id,
          value: value.trim(),
          label: value.trim(),
          sort_order: index
        }))
        
        await updateAttributeValues(editingAttribute.id, valueData)
        toast.success('Attribute updated successfully!')
      } else {
        // Create new attribute
        const createData: CreateAttributeData = {
          name: form.name,
          type: form.type,
          required: form.required
        }
        
        const newAttributeId = await createAttribute(createData)
        
        // Create attribute values
        const valueData = validValues.map((value, index) => ({
          attribute_id: newAttributeId,
          value: value.trim(),
          label: value.trim(),
          sort_order: index
        }))
        
        await createAttributeValues(valueData)
        toast.success('Attribute created successfully!')
      }

      // Reload attributes
      const updatedAttributes = await getAllAttributes(true)
      setAttributes(updatedAttributes)

      // Close dialog and reset form
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving attribute:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save attribute'
      toast.error(errorMessage)
      setErrors([errorMessage])
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteModal = (attribute: AttributeWithValues) => {
    setAttributeToDelete(attribute)
    setDeleteModalOpen(true)
  }

  const handleDeleteAttribute = async () => {
    if (!attributeToDelete) return

    setIsDeleting(true)
    try {
      await deleteAttribute(attributeToDelete.id)
      
      // Reload attributes
      const updatedAttributes = await getAllAttributes(true)
      setAttributes(updatedAttributes)

      setDeleteModalOpen(false)
      setAttributeToDelete(null)
      toast.success('Attribute deleted successfully!')
    } catch (error) {
      console.error('Error deleting attribute:', error)
      toast.error('Failed to delete attribute')
    } finally {
      setIsDeleting(false)
    }
  }

  const addValueField = () => {
    setForm({
      ...form,
      values: [...form.values, '']
    })
  }

  const removeValueField = (index: number) => {
    if (form.values.length > 1) {
      setForm({
        ...form,
        values: form.values.filter((_, i) => i !== index)
      })
    }
  }

  const updateValue = (index: number, value: string) => {
    const newValues = [...form.values]
    newValues[index] = value
    setForm({ ...form, values: newValues })
  }

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-9 w-32" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
          <h1 className="text-3xl font-bold tracking-tight">Product Attributes</h1>
          <p className="text-muted-foreground mt-2">
            Manage attributes for variable products like size, color, and material
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Attribute
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAttribute ? 'Edit Attribute' : 'Create Attribute'}
              </DialogTitle>
              <DialogDescription>
                {editingAttribute 
                  ? 'Update the attribute name and values'
                  : 'Create a new attribute for product variations'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Attribute Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Size, Color, Material"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Attribute Values *</Label>
                <div className="space-y-2">
                  {form.values.map((value, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={value}
                        onChange={(e) => updateValue(index, e.target.value)}
                        placeholder={`Value ${index + 1}`}
                      />
                      {form.values.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeValueField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addValueField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Value
                </Button>
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingAttribute ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingAttribute ? 'Update Attribute' : 'Create Attribute'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attributes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Attributes List
          </CardTitle>
          <CardDescription>
            {attributes.length} attribute{attributes.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attributes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Values</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((attribute) => (
                  <TableRow key={attribute.id}>
                    <TableCell className="font-medium">{attribute.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {attribute.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {attribute.values.map((value) => (
                          <Badge key={value.id} variant="secondary" className="text-xs">
                            {value.value}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(attribute.created_at).toLocaleDateString('en-BD')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(attribute)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(attribute)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No attributes found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first attribute to start using product variations.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Attribute
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Attribute Modal */}
      {attributeToDelete && (
        <DeleteAttributeModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setAttributeToDelete(null)
          }}
          onConfirm={handleDeleteAttribute}
          attributeName={attributeToDelete.name}
          isLoading={isDeleting}
          valueCount={attributeToDelete.values.length}
        />
      )}
    </div>
  )
} 