"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Settings, Edit, X, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getPackagingAttributes, invalidatePackagingAttributesCache } from "@/lib/supabase/queries"
import { createPackagingAttribute, updatePackagingAttribute, deletePackagingAttribute } from "@/lib/supabase/mutations"
import type { DatabasePackagingAttribute } from "@/lib/supabase/queries"
import { DeletePackagingAttributeModal } from "@/components/packaging/DeletePackagingAttributeModal"
import { toast } from "sonner"

interface PackagingAttributeForm {
  name: string
  values: string[]
}

export default function PackagingAttributesPage() {
  const [attributes, setAttributes] = React.useState<DatabasePackagingAttribute[]>([])
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingAttribute, setEditingAttribute] = React.useState<DatabasePackagingAttribute | null>(null)
  const [errors, setErrors] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [attributeToDelete, setAttributeToDelete] = React.useState<DatabasePackagingAttribute | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  
  const [form, setForm] = React.useState<PackagingAttributeForm>({
    name: '',
    values: ['']
  })

  // Deduplication cache and initial load tracker
  const initialLoadTriggered = React.useRef(false)
  const CACHE_DURATION = 30000 // 30 seconds
  
  const dataCache = React.useRef<{
    attributes: DatabasePackagingAttribute[]
    lastFetch: number
    currentRequest: Promise<void> | null
  }>({
    attributes: [],
    lastFetch: 0,
    currentRequest: null
  })

  // Load packaging attributes from Supabase with deduplication
  const loadPackagingAttributes = async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadPackagingAttributes called with forceRefresh:', forceRefresh)
    
    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        dataCache.current.attributes.length > 0 && 
        (now - dataCache.current.lastFetch) < CACHE_DURATION) {
      console.log('📦 Using cached attributes data')
      setAttributes(dataCache.current.attributes)
      setLoading(false)
      return
    }

    // If there's already a request in progress, wait for it
    if (dataCache.current.currentRequest) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        await dataCache.current.currentRequest
        // After the request completes, update state with cached data
        if (dataCache.current.attributes.length > 0) {
          console.log('📦 Using data from completed request')
          setAttributes(dataCache.current.attributes)
          setLoading(false)
        }
      } catch (error) {
        console.error('⚠️ Error in concurrent request:', error)
      }
      return
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh attributes data from API')
        setLoading(true)
        
        const data = await getPackagingAttributes()
        
        console.log('✅ Attributes data fetched successfully')
        
        // Update cache
        dataCache.current.attributes = data
        dataCache.current.lastFetch = now
        
        // Update state
        setAttributes(data)
      } catch (error) {
        console.error('❌ Error loading packaging attributes:', error)
        toast.error('Failed to load packaging attributes')
        setAttributes([])
      } finally {
        console.log('🏁 Request completed, setting loading to false')
        setLoading(false)
        dataCache.current.currentRequest = null
      }
    })()

    // Store the request promise so other calls can wait for it
    dataCache.current.currentRequest = requestPromise
    
    // Wait for the request to complete
    await requestPromise
  }

  // Load initial data only once
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering data fetch')
      initialLoadTriggered.current = true
      loadPackagingAttributes(false)
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, []) // Empty dependency array to run only once on mount

  const resetForm = () => {
    setForm({
      name: '',
      values: ['']
    })
    setEditingAttribute(null)
    setErrors([])
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (attribute: DatabasePackagingAttribute) => {
    setEditingAttribute(attribute)
    setForm({
      name: attribute.name,
      values: attribute.values?.map(val => val.value) || ['']
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

    try {
      const validValues = form.values.filter(val => val.trim())

      if (editingAttribute) {
        // Update existing attribute
        await updatePackagingAttribute({
          id: editingAttribute.id,
          name: form.name,
          values: validValues
        })
      } else {
        // Create new attribute
        await createPackagingAttribute({
          name: form.name,
          values: validValues
        })
      }

      // Invalidate cache and reload the data
      invalidatePackagingAttributesCache()
      await loadPackagingAttributes(true) // Force refresh
      setIsDialogOpen(false)
      resetForm()
      toast.success(editingAttribute ? 'Attribute updated successfully!' : 'Attribute created successfully!')
    } catch (error) {
      console.error('Error saving packaging attribute:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save packaging attribute'
      setErrors([errorMessage])
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteModal = (attribute: DatabasePackagingAttribute) => {
    setAttributeToDelete(attribute)
    setDeleteModalOpen(true)
  }

  const handleDeleteAttribute = async () => {
    if (!attributeToDelete) return

    setIsDeleting(true)
    try {
      await deletePackagingAttribute(attributeToDelete.id)
      toast.success('Packaging attribute deleted successfully!')
      
      // Invalidate cache and reload attributes
      invalidatePackagingAttributesCache()
      await loadPackagingAttributes(true) // Force refresh
      
      setDeleteModalOpen(false)
      setAttributeToDelete(null)
    } catch (error) {
      console.error('Error deleting packaging attribute:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete packaging attribute'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const addValueField = () => {
    setForm(prev => ({
      ...prev,
      values: [...prev.values, '']
    }))
  }

  const removeValueField = (index: number) => {
    setForm(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }))
  }

  const updateValue = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      values: prev.values.map((val, i) => i === index ? value : val)
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-32" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-52 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
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
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
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
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/packaging">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Packaging
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Packaging Attributes</h1>
              <p className="text-muted-foreground mt-2">
                Manage attributes for packaging variations
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Attribute
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAttribute ? 'Edit Packaging Attribute' : 'Create Packaging Attribute'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAttribute 
                      ? 'Update the attribute name and values'
                      : 'Create a new attribute for packaging variations'
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
                      placeholder="e.g., Size, Material, Color"
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
                      {isSubmitting 
                        ? 'Saving...' 
                        : editingAttribute ? 'Update Attribute' : 'Create Attribute'
                      }
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
        </div>
      </div>

      {/* Attributes Table */}
      <div>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {attributes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Values</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attributes.map((attribute) => (
                      <TableRow key={attribute.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{attribute.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {attribute.values?.map((value) => (
                              <Badge key={value.id} variant="secondary" className="text-xs">
                                {value.value}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(attribute.created_at).toLocaleDateString('en-BD')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => openEditDialog(attribute)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 cursor-pointer"
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
              <div className="text-center py-12">
                <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No attributes found</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first packaging attribute to start using packaging variations.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Attribute
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Packaging Attribute Modal */}
      {attributeToDelete && (
        <DeletePackagingAttributeModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setAttributeToDelete(null)
          }}
          onConfirm={handleDeleteAttribute}
          attributeName={attributeToDelete.name}
          isLoading={isDeleting}
          valueCount={attributeToDelete.values?.length || 0}
        />
      )}
    </div>
  )
} 