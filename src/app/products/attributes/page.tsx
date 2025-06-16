"use client"

import * as React from "react"
import { ArrowLeft, Plus, Settings, Edit, Trash2, X, Search, Filter } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  // Search and filter state
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(['text', 'number', 'select', 'multiselect', 'boolean', 'date'])
  const [selectedRequired, setSelectedRequired] = React.useState<string[]>(['required', 'optional'])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  
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
      values: attribute.values.length > 0 ? attribute.values.map(v => v.value) : ['']
    })
    setIsDialogOpen(true)
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!form.name.trim()) {
      newErrors.push('Attribute name is required')
    }

    if (['select', 'multiselect'].includes(form.type)) {
      const validValues = form.values.filter(v => v.trim() !== '')
      if (validValues.length === 0) {
        newErrors.push('At least one value is required for select/multiselect attributes')
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      if (editingAttribute) {
        // Update existing attribute
        const updateData: UpdateAttributeData = {
          id: editingAttribute.id,
          name: form.name.trim(),
          type: form.type,
          required: form.required
        }

        await updateAttribute(updateData)

        // Update attribute values if it's a select/multiselect type
        if (['select', 'multiselect'].includes(form.type)) {
          const validValues = form.values.filter(v => v.trim() !== '')
          
          const valueData: CreateAttributeValueData[] = validValues.map((value, index) => ({
            attribute_id: editingAttribute.id,
            value: value.trim(),
            label: value.trim(),
            sort_order: index
          }))

          await updateAttributeValues(editingAttribute.id, valueData)
        }

        toast.success('Attribute updated successfully')
      } else {
        // Create new attribute
        const createData: CreateAttributeData = {
          name: form.name.trim(),
          type: form.type,
          required: form.required
        }

        const newAttributeId = await createAttribute(createData)

        // Create attribute values if it's a select/multiselect type
        if (['select', 'multiselect'].includes(form.type)) {
          const validValues = form.values.filter(v => v.trim() !== '')
          
          if (validValues.length > 0) {
            const valueData: CreateAttributeValueData[] = validValues.map((value, index) => ({
              attribute_id: newAttributeId,
              value: value.trim(),
              label: value.trim(),
              sort_order: index
            }))

            await createAttributeValues(valueData)
          }
        }

        toast.success('Attribute created successfully')
      }

      // Refresh the attributes list
      const updatedAttributes = await getAllAttributes(true)
      setAttributes(updatedAttributes)
      
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('An unexpected error occurred')
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

      // Refresh the attributes list
      const updatedAttributes = await getAllAttributes(true)
      setAttributes(updatedAttributes)
      
      setDeleteModalOpen(false)
      setAttributeToDelete(null)
      toast.success('Attribute deleted successfully')
    } catch (error) {
      console.error('Error deleting attribute:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const addValueField = () => {
    if (form.values.length < 10) {
      setForm(prev => ({
        ...prev,
        values: [...prev.values, '']
      }))
    }
  }

  const removeValueField = (index: number) => {
    if (form.values.length > 1) {
      setForm(prev => ({
        ...prev,
        values: prev.values.filter((_, i) => i !== index)
      }))
    }
  }

  const updateValue = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      values: prev.values.map((v, i) => i === index ? value : v)
    }))
  }

  // Filter and pagination logic
  const filteredAttributes = attributes.filter(attribute => {
    const matchesSearch = attribute.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         attribute.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         attribute.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedTypes.includes(attribute.type)
    const matchesRequired = selectedRequired.includes(attribute.required ? 'required' : 'optional')
    return matchesSearch && matchesType && matchesRequired
  })

  const totalItems = filteredAttributes.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAttributes = filteredAttributes.slice(startIndex, endIndex)

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
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
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Attributes</h1>
          <p className="text-muted-foreground">
            Manage product attributes and their values for product variations
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/products">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Attribute
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search attributes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter by Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Attribute Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {['text', 'number', 'select', 'multiselect', 'boolean', 'date'].map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={selectedTypes.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedTypes([...selectedTypes, type])
                  } else {
                    setSelectedTypes(selectedTypes.filter(t => t !== type))
                  }
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Required
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Required Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedRequired.includes('required')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedRequired([...selectedRequired, 'required'])
                } else {
                  setSelectedRequired(selectedRequired.filter(r => r !== 'required'))
                }
              }}
            >
              Required
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedRequired.includes('optional')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedRequired([...selectedRequired, 'optional'])
                } else {
                  setSelectedRequired(selectedRequired.filter(r => r !== 'optional'))
                }
              }}
            >
              Optional
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
          setItemsPerPage(parseInt(value))
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Attributes Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {paginatedAttributes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Required</TableHead>
                    <TableHead className="hidden lg:table-cell">Values</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttributes.map((attribute) => (
                    <TableRow key={attribute.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{attribute.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {attribute.id}
                            <span className="sm:hidden ml-2">
                              • {attribute.type}
                              {attribute.required && ' • Required'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {attribute.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={attribute.required ? 'default' : 'secondary'}>
                          {attribute.required ? 'Required' : 'Optional'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {attribute.values.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {attribute.values.slice(0, 3).map((value) => (
                              <Badge key={value.id} variant="outline" className="text-xs">
                                {value.value}
                              </Badge>
                            ))}
                            {attribute.values.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{attribute.values.length - 3} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No values</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(attribute.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No attributes found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedTypes.length < 6 || selectedRequired.length < 2
                  ? "Try adjusting your search or filters."
                  : "Get started by creating your first attribute."}
              </p>
              {!searchTerm && selectedTypes.length === 6 && selectedRequired.length === 2 && (
                <div className="mt-6">
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Attribute
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} attributes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Attribute Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAttribute ? 'Edit Attribute' : 'Create Attribute'}
            </DialogTitle>
            <DialogDescription>
              {editingAttribute 
                ? 'Update the attribute details and values'
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
              <Label htmlFor="type">Attribute Type *</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Select (Single)</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={form.required}
                onCheckedChange={(checked) => setForm({ ...form, required: checked })}
              />
              <Label htmlFor="required">Required field</Label>
            </div>

            {['select', 'multiselect'].includes(form.type) && (
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
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addValueField}
                  disabled={form.values.length >= 10}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Value
                </Button>
              </div>
            )}

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