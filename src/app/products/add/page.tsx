"use client"

import * as React from "react"
import { useRouter } from 'next/navigation'
import { Package, Save, X, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MediaManager } from "@/components/ui/media-manager"
import { 
  createCompleteProduct,
  type CreateProductData,
  type CreateProductVariationData,
} from "@/lib/supabase/mutations"
import { toast } from "sonner"

// Import our new hooks
import { useAddProductData } from '@/lib/hooks/useAddProductData'
import { useAddProductForm } from '@/lib/hooks/useAddProductForm'
import { useAddProductValidation, useDebounceSkuValidation } from '@/lib/hooks/useAddProductValidation'

// Import existing business logic hooks
import { 
  useVariationManagement,
  useAttributeManagement
} from '@/lib/hooks/products'

// Import existing UI components
import { 
  ProductTypeSelector,
  VariationProductFields
} from '@/components/products/forms'

// Import variation components
import { VariationsTable } from '@/components/products/variations'

// Import modals
import { 
  AddVariationModal,
  EditVariationModal,
  DeleteVariationModal,
  CreateAttributeModal,
  EditAttributeModal
} from '@/components/products/modals'

// Import types
import type { Category, ProductVariation } from '@/lib/types'
import { DatabaseAttribute } from '@/lib/hooks/useProductData'

interface MediaItem {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadDate: string
  alt?: string
}

export default function AddProductPage() {
  const router = useRouter()
  
  // Use our extracted hooks
  const { categories, attributes, loading, errors: dataErrors } = useAddProductData()
  const productForm = useAddProductForm()
  const {
    skuValidation,
    validateSku,
    validateForm,
  } = useAddProductValidation()
  
  // Business logic hooks
  const variationManagement = useVariationManagement()
  const attributeManagement = useAttributeManagement()
  
  // Local state for media and UI
  const [isLoading, setIsLoading] = React.useState(false)
  const [showMediaManager, setShowMediaManager] = React.useState(false)
  const [selectedImage, setSelectedImage] = React.useState<MediaItem | null>(null)

  // Debounced SKU validation
  useDebounceSkuValidation(
    productForm.form.sku,
    productForm.form.type,
    validateSku
  )

  // Handlers
  const handleAddVariation = () => {
    variationManagement.openAddModal()
  }

  const handleEditVariation = (index: number) => {
    const variation = productForm.form.variations[index]
    variationManagement.openEditModal(variation, index)
  }

  const handleDeleteVariation = (index: number) => {
    variationManagement.openDeleteModal(index)
  }

  const handleCreateAttribute = () => {
    attributeManagement.openCreateModal()
  }

  const handleMediaSelect = (media: MediaItem) => {
    setSelectedImage(media)
    setShowMediaManager(false)
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(productForm.form)) {
      return
    }

    setIsLoading(true)
    try {
      const productData: CreateProductData = {
        name: productForm.form.name,
        description: productForm.form.description,
        category_id: productForm.form.categoryId || undefined,
        status: productForm.form.status,
        type: productForm.form.type,
        sku: productForm.form.sku,
        price: productForm.form.sellingPrice,
        image_url: selectedImage?.url
      }

      if (productForm.form.type === 'simple') {
        // Create simple product
        await createCompleteProduct(productData)
      } else {
        // Create variation product with variations
        const variations: CreateProductVariationData[] = productForm.form.variations.map(variation => ({
          product_id: '', // Will be set by the backend
          sku: variation.sku,
          price: variation.price,
          attribute_values: variation.attributeValues
        }))

        await createCompleteProduct(productData, variations, productForm.form.selectedAttributes)
      }

      toast.success('Success', {
        description: 'Product created successfully'
      })
      
      productForm.showSuccessMessage()
      
      // Redirect after a short delay with cleanup
      const timeoutId = setTimeout(() => {
        router.push('/products')
      }, 1500)
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(timeoutId)
      
    } catch (error) {
      console.error('Error creating product:', error)
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to create product'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state
  if (loading.categories || loading.attributes) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                  <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
                  </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (dataErrors.categories || dataErrors.attributes) {
  return (
    <div className="container mx-auto px-6 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-800">
              Failed to load required data. Please try again.
            </p>
              </CardContent>
            </Card>
        <div className="flex justify-center mt-6">
        <Link href="/products">
            <Button variant="outline">
            Back to Products
          </Button>
        </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
            </div>
            <p className="text-muted-foreground">
            Create a new product for your inventory
          </p>
        </div>
        </div>
      </div>

      {/* Success Message */}
      {productForm.showSuccess && (
        <div className="mb-6">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <p className="text-green-800">Product created successfully! Redirecting...</p>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Information Card */}
            <div>
            <Card>
              <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details for your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                        value={productForm.form.name}
                        onChange={(e) => productForm.updateName(e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={productForm.form.description}
                        onChange={(e) => productForm.updateDescription(e.target.value)}
                        placeholder="Enter product description"
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                        <Select
                          value={productForm.form.categoryId}
                          onValueChange={productForm.updateCategory}
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

                <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={productForm.form.status}
                          onValueChange={productForm.updateStatus}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        </div>
                        </div>
                      </div>
                </CardContent>
              </Card>
                    </div>

            {/* Product Type Selector */}
            <div>
              <ProductTypeSelector
                value={productForm.form.type}
                onChange={productForm.updateType}
              />
                </div>

            {/* Simple Product Fields */}
            {productForm.form.type === 'simple' && (
              <div>
              <Card>
                <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  <CardDescription>
                      SKU and pricing information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* SKU */}
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <div className="relative">
                        <Input
                          id="sku"
                            value={productForm.form.sku || ''}
                            onChange={(e) => productForm.updateSku(e.target.value)}
                          placeholder="Enter SKU"
                          required
                          className={
                              skuValidation.isError
                                ? "border-orange-500 focus-visible:ring-orange-500"
                                : skuValidation.isValid === false 
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
                            skuValidation.isError
                              ? "text-orange-600"
                              : skuValidation.isValid === false 
                            ? "text-red-600" 
                            : skuValidation.isValid === true 
                              ? "text-green-600" 
                              : "text-gray-600"
                        }`}>
                          {skuValidation.message}
                        </p>
                      )}
                    </div>
                    
                      {/* Selling Price */}
                    <div className="space-y-2">
                        <Label htmlFor="selling-price">Selling Price *</Label>
                      <Input
                          id="selling-price"
                        type="number"
                        step="0.01"
                        min="0"
                          value={productForm.form.sellingPrice || ''}
                          onChange={(e) => productForm.updatePrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Variation Product Fields */}
            {productForm.form.type === 'variation' && (
              <div className="space-y-6">
                <VariationProductFields
                  attributes={attributes}
                  selectedAttributes={productForm.form.selectedAttributes}
                  onAttributeToggle={productForm.toggleAttribute}
                  onCreateAttribute={handleCreateAttribute}
                  hasVariations={productForm.hasVariations}
                />
                <VariationsTable
                  variations={productForm.form.variations}
                  attributes={attributes}
                  onAddVariation={handleAddVariation}
                  onEditVariation={handleEditVariation}
                  onDeleteVariation={handleDeleteVariation}
                  canAddVariations={productForm.canAddVariations}
                />
                        </div>
            )}
                    
                      </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submit Button */}
            <div>
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
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Product
                      </>
                    )}
                                      </Button>
                  
                  <Link href="/products">
                    <Button variant="outline" className="w-full" disabled={isLoading}>
                      Cancel
                                      </Button>
                  </Link>
                    </CardContent>
                  </Card>
          </div>

            {/* Product Image */}
            <div>
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
            </div>

            {/* Product Summary */}
            <div>
            <Card>
              <CardHeader>
                  <CardTitle>Summary</CardTitle>
              </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">
                      {productForm.form.type === 'simple' ? 'Simple Product' : 'Variation Product'}
                  </Badge>
                </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={productForm.form.status === 'active' ? 'default' : 'secondary'}>
                      {productForm.form.status}
                    </Badge>
                    </div>
                  {productForm.form.type === 'simple' && productForm.form.sellingPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">${productForm.form.sellingPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {productForm.form.type === 'variation' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Variations:</span>
                      <span className="font-medium">{productForm.form.variations.length}</span>
                    </div>
                  )}
                  {productForm.form.categoryId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium text-sm">
                        {categories.find(cat => cat.id === productForm.form.categoryId)?.name}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
                </div>
          </div>
        </div>
      </form>

      {/* Variation Modals */}
      <AddVariationModal
        open={variationManagement.showAddModal}
        onOpenChange={variationManagement.closeAddModal}
        attributes={attributes}
        selectedAttributes={productForm.form.selectedAttributes}
        existingVariations={productForm.form.variations}
        onSubmit={(variationData) => {
          const newVariation: ProductVariation = {
            id: `temp-${Date.now()}`,
            productId: '',
            sku: variationData.sku,
            price: variationData.price || 0,
            buyingPrice: 0,
            stock: 0,
            boughtQuantity: 0,
            attributeValues: variationData.attributeValues
          }
          productForm.addVariation(newVariation)
          variationManagement.closeAddModal()
        }}
      />

      <EditVariationModal
        open={variationManagement.showEditModal}
        onOpenChange={variationManagement.closeEditModal}
        attributes={attributes}
        selectedAttributes={productForm.form.selectedAttributes}
        existingVariations={productForm.form.variations}
        editingIndex={variationManagement.editingIndex ?? -1}
        variation={variationManagement.editingIndex !== null ? productForm.form.variations[variationManagement.editingIndex] : undefined}
        onSubmit={(variationData) => {
          if (variationManagement.editingIndex !== null) {
            const updatedVariation: ProductVariation = {
              ...productForm.form.variations[variationManagement.editingIndex],
              sku: variationData.sku,
              price: variationData.price || 0,
              attributeValues: variationData.attributeValues
            }
            productForm.updateVariation(variationManagement.editingIndex, updatedVariation)
          }
          variationManagement.closeEditModal()
        }}
      />

      <DeleteVariationModal
        open={variationManagement.showDeleteModal}
        onOpenChange={variationManagement.closeDeleteModal}
        variation={variationManagement.deletingIndex !== null ? productForm.form.variations[variationManagement.deletingIndex] : undefined}
        attributes={attributes}
        onConfirm={() => {
          if (variationManagement.deletingIndex !== null) {
            productForm.deleteVariation(variationManagement.deletingIndex)
          }
          variationManagement.closeDeleteModal()
        }}
        isLoading={false}
      />

      {/* Attribute Modals */}
      <CreateAttributeModal
        open={attributeManagement.showCreateModal}
        onOpenChange={attributeManagement.closeCreateModal}
        onSuccess={(newAttributeId) => {
          // Auto-select the newly created attribute
          productForm.toggleAttribute(newAttributeId)
          attributeManagement.closeCreateModal()
        }}
      />

      <EditAttributeModal
        open={attributeManagement.showEditModal}
        onOpenChange={attributeManagement.closeEditModal}
        attribute={attributeManagement.editForm}
        onSuccess={() => {
          attributeManagement.closeEditModal()
        }}
      />

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