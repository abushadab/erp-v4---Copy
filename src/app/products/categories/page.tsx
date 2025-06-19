"use client"

import * as React from "react"
import { ArrowLeft, Plus, BookOpen, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  createCategory, 
  updateCategory, 
  deleteCategory,
  type CreateCategoryData,
  type UpdateCategoryData 
} from "@/lib/supabase/mutations"
import { DeleteCategoryModal } from "@/components/products/DeleteCategoryModal"
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

interface CategoryForm {
  name: string
  description: string
  parentId: string
}

// Deduplication cache for API calls
const dataCache = {
  categories: [] as Category[],
  lastFetch: 0,
  currentRequest: null as Promise<Category[]> | null
}

const CACHE_DURATION = 30000 // 30 seconds

// Client-side query function with deduplication
async function getAllCategories(forceRefresh = false): Promise<Category[]> {
  const now = Date.now()

  // Check cache first
  if (!forceRefresh && 
      dataCache.categories.length > 0 && 
      (now - dataCache.lastFetch) < CACHE_DURATION) {
    console.log('📦 Using cached categories data')
    return dataCache.categories
  }

  // If there's already a request in progress, wait for it
  if (dataCache.currentRequest) {
    console.log('⏳ Request already in progress, waiting for existing promise...')
    return await dataCache.currentRequest
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<Category[]> => {
    try {
      console.log('🔄 Fetching fresh categories data from API')
      const supabase = createClient()
      
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
        throw new Error('Failed to fetch categories')
      }

      const result = categories || []

      // Update cache
      dataCache.categories = result
      dataCache.lastFetch = now

      console.log('✅ Categories data fetched successfully')
      return result
    } catch (error) {
      console.error('❌ Error loading categories data:', error)
      throw error
    } finally {
      dataCache.currentRequest = null
    }
  })()

  // Store the request promise
  dataCache.currentRequest = requestPromise
  
  return await requestPromise
}

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [errors, setErrors] = React.useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  
  const [form, setForm] = React.useState<CategoryForm>({
    name: '',
    description: '',
    parentId: ''
  })

  // Deduplication cache and initial load tracker
  const initialLoadTriggered = React.useRef(false)

  // Load categories on mount with deduplication
  React.useEffect(() => {
    if (initialLoadTriggered.current) {
      return
    }
    initialLoadTriggered.current = true

    const loadCategories = async () => {
      try {
        setIsLoading(true)
        const categoriesData = await getAllCategories()
        setCategories(categoriesData)
        console.log('📂 Loaded categories from Supabase:', categoriesData.length)
      } catch (error) {
        console.error('Error loading categories:', error)
        toast.error('Failed to load categories')
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [])

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      parentId: ''
    })
    setEditingCategory(null)
    setErrors([])
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      description: category.description || '',
      parentId: category.parent_id || ''
    })
    setIsDialogOpen(true)
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!form.name.trim()) newErrors.push('Category name is required')
    
    // Check if parent category exists
    if (form.parentId && !categories.find(cat => cat.id === form.parentId)) {
      newErrors.push('Selected parent category does not exist')
    }

    // Prevent circular reference
    if (editingCategory && form.parentId === editingCategory.id) {
      newErrors.push('Category cannot be its own parent')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors([])

    try {
      if (editingCategory) {
        // Update existing category
        const updateData: UpdateCategoryData = {
          id: editingCategory.id,
          name: form.name,
          slug: form.name.toLowerCase().replace(/\s+/g, '-'),
          description: form.description || undefined,
          parent_id: form.parentId || undefined,
          status: editingCategory.status
        }
        
        await updateCategory(updateData)
        toast.success('Category updated successfully!')
      } else {
        // Create new category
        const createData: CreateCategoryData = {
          name: form.name,
          slug: form.name.toLowerCase().replace(/\s+/g, '-'),
          description: form.description || undefined,
          parent_id: form.parentId || undefined,
          status: 'active'
        }
        
        await createCategory(createData)
        toast.success('Category created successfully!')
      }

      // Reload categories
      const updatedCategories = await getAllCategories(true)
      setCategories(updatedCategories)

      // Close dialog and reset form
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving category:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save category'
      toast.error(errorMessage)
      setErrors([errorMessage])
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteModal = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteModalOpen(true)
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    setIsDeleting(true)
    try {
      await deleteCategory(categoryToDelete.id)
      
      // Reload categories
      const updatedCategories = await getAllCategories(true)
      setCategories(updatedCategories)

      setDeleteModalOpen(false)
      setCategoryToDelete(null)
      toast.success('Category deleted successfully!')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    } finally {
      setIsDeleting(false)
    }
  }

  const getParentCategoryName = (parentId?: string) => {
    if (!parentId) return 'None'
    const parent = categories.find(cat => cat.id === parentId)
    return parent ? parent.name : 'Unknown'
  }

  const getRootCategories = () => {
    return categories.filter(cat => !cat.parent_id)
  }

  const getChildCategories = (parentId: string) => {
    return categories.filter(cat => cat.parent_id === parentId)
  }

  const getCategoryChildren = (categoryId: string) => {
    return categories.filter(cat => cat.parent_id === categoryId)
  }

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
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
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
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
          <h1 className="text-3xl font-bold tracking-tight">Product Categories</h1>
          <p className="text-muted-foreground">
            Organize your products into categories and subcategories
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory 
                    ? 'Update the category information'
                    : 'Create a new product category'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Electronics, Clothing"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of the category"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Category</Label>
                  <Select
                    value={form.parentId || "none"}
                    onValueChange={(value) => setForm({ ...form, parentId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Root Category)</SelectItem>
                      {categories
                        .filter(cat => cat.id !== editingCategory?.id)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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
                        {editingCategory ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingCategory ? 'Update Category' : 'Create Category'
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
      </div>

      {/* Categories Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {categories.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Parent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground sm:hidden truncate max-w-[200px]">
                            {category.description || 'No description'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-1">
                          <div className="max-w-xs truncate">
                            {category.description || '-'}
                          </div>
                          <div className="text-sm text-muted-foreground md:hidden">
                            Parent: {getParentCategoryName(category.parent_id)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getParentCategoryName(category.parent_id)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={category.status === 'active' ? 'default' : 'secondary'}
                        >
                          {category.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(category.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openDeleteModal(category)}
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
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by creating your first product category
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Category
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Category Modal */}
      {categoryToDelete && (
        <DeleteCategoryModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setCategoryToDelete(null)
          }}
          onConfirm={handleDeleteCategory}
          categoryName={categoryToDelete.name}
          isLoading={isDeleting}
          childrenCount={getCategoryChildren(categoryToDelete.id).length}
        />
      )}
    </div>
  )
} 