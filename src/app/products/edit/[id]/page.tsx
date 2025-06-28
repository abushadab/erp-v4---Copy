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
import { 
  updateCompleteProduct,
  createProductVariation,
  deleteProductVariation,
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

// Import existing hooks for data management
import { useProductData, type DatabaseAttribute } from '@/lib/hooks/useProductData'
import { useProductValidation, useDebounceSkuValidation } from '@/lib/hooks/useProductValidation'
import { transformDatabaseProductToProduct } from '@/lib/utils/productTransforms'

// Import extracted UI components
import { 
  ProductHeader, 
  ProductSummary, 
  ProductStatusMessages, 
  ActionButtons 
} from '@/components/products/ui'

// Import form components
import { 
  ProductTypeSelector, 
  VariationProductFields 
} from '@/components/products/forms'

// Import variation components
import { VariationsTable } from '@/components/products/variations'

// Import business logic hooks
import { 
  useProductForm,
  useVariationManagement,
  useAttributeManagement
} from '@/lib/hooks/products'

// Import modals
import { 
  AddVariationModal,
  EditVariationModal,
  DeleteVariationModal,
  CreateAttributeModal,
  EditAttributeModal
} from '@/components/products/modals'

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

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  // Use existing hooks for data management
  const { 
    product: databaseProduct, 
    categories, 
    attributes, 
    loading, 
    errors: dataErrors, 
    loadProduct 
  } = useProductData(productId)
  
  const {
    skuValidation,
    variationSkuValidation,
    errors: validationErrors,
    formInitialized,
    editingVariationIndex,
    validateSku,
    validateForm,
    initializeForm,
    setEditingVariationIndexValue,
    resetValidation
  } = useProductValidation(productId)
  
  const [errors, setErrors] = React.useState<string[]>([])
  const [product, setProduct] = React.useState<Product | null>(null)
  const [deletedVariationIds, setDeletedVariationIds] = React.useState<string[]>([])
  
  // Use business logic hooks
  const productForm = useProductForm(product || undefined)
  const variationManagement = useVariationManagement()
  const attributeManagement = useAttributeManagement()

  // Transform database product when it loads
  React.useEffect(() => {
    if (databaseProduct) {
      const transformedProduct = transformDatabaseProductToProduct(databaseProduct)
      setProduct(transformedProduct)
      initializeForm()
    }
  }, [databaseProduct, initializeForm])

  // Debounced SKU validation
  useDebounceSkuValidation(
    productForm.form.sku,
    productForm.form.type,
    validateSku,
    formInitialized
  )

  // Handlers using business logic hooks
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

  // Show loading state
  if (loading.product || loading.categories || loading.attributes) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
  if (dataErrors.product || dataErrors.categories || dataErrors.attributes) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Failed to load product data. Please try again.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Link href="/products">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <ProductHeader productId={productId} />
      
      <ProductStatusMessages 
        showSuccess={productForm.showSuccess}
        errors={errors}
        validationErrors={validationErrors}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Basic Information Card */}
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
                    suppressHydrationWarning
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
                    suppressHydrationWarning
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={productForm.form.categoryId}
                      onValueChange={productForm.updateCategory}
                    >
                      <SelectTrigger suppressHydrationWarning>
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
                      <SelectTrigger suppressHydrationWarning>
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

          {/* Product Type Selector */}
          <ProductTypeSelector
            value={productForm.form.type}
            onChange={productForm.updateType}
            disabled={!productForm.canChangeType}
          />

          {/* Product Type Specific Fields */}
          {productForm.form.type === 'simple' && (
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  SKU and pricing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <div className="relative">
                      <Input
                        id="sku"
                        value={productForm.form.sku || ''}
                        onChange={(e) => productForm.updateSku(e.target.value)}
                        placeholder="Enter SKU"
                        suppressHydrationWarning
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

                  <div className="space-y-2">
                    <Label htmlFor="selling-price">Selling Price</Label>
                    <Input
                      id="selling-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.form.sellingPrice || ''}
                      onChange={(e) => productForm.updatePrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      suppressHydrationWarning
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variation Product Fields */}
          {productForm.form.type === 'variation' && (
            <>
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
            </>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ActionButtons 
            onSave={async () => {
              if (validateForm(productForm.form)) {
                try {
                  const updateData: UpdateProductData = {
                    id: productId,
                    name: productForm.form.name,
                    description: productForm.form.description,
                    category_id: productForm.form.categoryId,
                    type: productForm.form.type,
                    status: productForm.form.status,
                    sku: productForm.form.sku,
                    price: productForm.form.sellingPrice,
                    parent_sku: productForm.form.parentSku
                  }

                  const variationUpdates: UpdateProductVariationData[] = productForm.form.variations
                    .filter(v => !v.id.startsWith('temp-'))
                    .map(v => ({
                      id: v.id,
                      sku: v.sku,
                      price: v.price,
                      attribute_values: v.attributeValues
                    }))

                  const newVariations: CreateProductVariationData[] = productForm.form.variations
                    .filter(v => v.id.startsWith('temp-'))
                    .map(v => ({
                      product_id: productId,
                      sku: v.sku,
                      price: v.price,
                      attribute_values: v.attributeValues
                    }))
                  
                  await updateCompleteProduct(
                    updateData,
                    variationUpdates,
                    newVariations,
                    productForm.form.selectedAttributes
                  )
                  toast.success('Product updated successfully')
                  productForm.showSuccessMessage()
                  
                  // Reload product data
                  await loadProduct(productId)
                  
                  // Clear deleted variation IDs
                  setDeletedVariationIds([])
                } catch (error) {
                  console.error('Error updating product:', error)
                  toast.error('Failed to update product')
                  setErrors(['Failed to update product. Please try again.'])
                }
              }
            }}
            loading={loading.product}
          />
          
          <ProductSummary product={product} />
        </div>
      </div>

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
            productId: productId,
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
            productForm.removeVariation(variationManagement.deletingIndex)
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
    </div>
  )
}