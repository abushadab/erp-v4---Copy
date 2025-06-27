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
import { 
  createCompleteProduct,
  type CreateProductData,
  type CreateProductVariationData,
  type CreateAttributeData,
  type CreateAttributeValueData,
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
  ProductTypeSelector
} from '@/components/products/forms'

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
    variationSkuValidation,
    errors: validationErrors,
    validateSku,
    validateForm,
    resetValidation
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
        category_id: productForm.form.categoryId,
        status: productForm.form.status,
        type: productForm.form.type,
        sku: productForm.form.sku,
        price: productForm.form.sellingPrice,
        image_url: selectedImage?.url
      }

      // Add variations for variation products
      const variations: CreateProductVariationData[] = []
      if (productForm.form.type === 'variation') {
        for (const variation of productForm.form.variations) {
          variations.push({
            sku: variation.sku,
            price: variation.price,
            attribute_values: variation.attribute_values
          })
        }
      }

      await createCompleteProduct(productData, {
        attributes: productForm.form.selectedAttributes,
        variations
      })

      toast.success('Success', {
        description: 'Product created successfully'
      })
      
      productForm.showSuccessMessage()
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/products')
      }, 1500)
      
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
              <ArrowLeft className="mr-2 h-4 w-4" />
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/products">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
              </div>
            </div>
            <p className="text-muted-foreground">
              Create a new product for your inventory
            </p>
          </div>
        </div>
      </motion.div>

      {/* Success Message */}
      {productForm.showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <p className="text-green-800">Product created successfully! Redirecting...</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Information Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
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
                        <Label htmlFor="category">Category *</Label>
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
            </motion.div>

            {/* Product Type Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ProductTypeSelector
                value={productForm.form.type}
                onChange={productForm.updateType}
              />
            </motion.div>

            {/* Simple Product Fields */}
            {productForm.form.type === 'simple' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                    <CardDescription>
                      SKU and pricing information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU *</Label>
                        <div className="relative">
                          <Input
                            id="sku"
                            value={productForm.form.sku || ''}
                            onChange={(e) => productForm.updateSku(e.target.value)}
                            placeholder="Enter SKU"
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

                      <div className="grid grid-cols-2 gap-4">
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
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="buying-price">Buying Price</Label>
                          <Input
                            id="buying-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={productForm.form.buyingPrice || ''}
                            onChange={(e) => productForm.updateBuyingPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stock">Initial Stock</Label>
                        <Input
                          id="stock"
                          type="number"
                          min="0"
                          value={productForm.form.stock || ''}
                          onChange={(e) => productForm.updateStock(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* TODO: Add Variation Product Fields here */}
            {productForm.form.type === 'variation' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">
                      Variation product fields will be added in the next phase.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
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
                    <Button variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Product Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
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
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </form>

      {/* TODO: Add modals here */}
    </div>
  )
}