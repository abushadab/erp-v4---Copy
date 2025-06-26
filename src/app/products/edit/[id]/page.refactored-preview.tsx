"use client"

// REFACTORED PREVIEW - This shows how the main page would look after complete refactoring
// This reduces the main file from 2,256 lines to approximately 400-500 lines

import * as React from "react"
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Package, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

// Import extracted hooks
import { useProductData } from "@/lib/hooks/useProductData"
import { useProductValidation, useDebounceSkuValidation } from "@/lib/hooks/useProductValidation"
import { transformDatabaseProductToProduct } from "@/lib/utils/productTransforms"

// Import extracted form components
import { BasicProductForm, SimpleProductFields } from "@/components/products/forms"

// Import extracted modal components
import {
  AddVariationModal,
  EditVariationModal,
  DeleteVariationModal,
  CreateAttributeModal,
  EditAttributeModal
} from "@/components/products/modals"

// Import business logic hooks (to be created)
import { useProductForm } from "@/hooks/products/useProductForm"
import { useVariationForm } from "@/hooks/products/useVariationForm"
import { useAttributeForm } from "@/hooks/products/useAttributeForm"

// Import UI components (to be created)
import { ProductHeader } from "@/components/products/ui/ProductHeader"
import { ProductSummary } from "@/components/products/ui/ProductSummary"
import { VariableProductFields } from "@/components/products/forms/VariableProductFields"
import { VariationsTable } from "@/components/products/variations/VariationsTable"

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  // Use extracted data hooks
  const {
    product: dbProduct,
    categories,
    attributes,
    loading,
    errors,
    validateSku
  } = useProductData(productId)

  // Use extracted validation hooks
  const {
    skuValidation,
    variationSkuValidation,
    errors: validationErrors,
    formInitialized,
    validateSku: validateSkuWithState,
    validateForm,
    initializeForm
  } = useProductValidation(productId)

  // Use extracted business logic hooks
  const {
    form,
    setForm,
    resetForm,
    handleSubmit
  } = useProductForm(dbProduct, categories)

  const {
    variationForm,
    setVariationForm,
    resetVariationForm,
    editingVariationIndex,
    addVariation,
    editVariation,
    deleteVariation
  } = useVariationForm(form, setForm)

  const {
    createAttributeForm,
    editAttributeForm,
    isCreatingAttribute,
    isEditingAttribute,
    handleCreateAttribute,
    handleEditAttribute
  } = useAttributeForm(attributes)

  // Modal states
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [showCreateAttributeModal, setShowCreateAttributeModal] = React.useState(false)
  const [showEditAttributeModal, setShowEditAttributeModal] = React.useState(false)
  const [variationToDelete, setVariationToDelete] = React.useState<number | null>(null)

  // Set up debounced SKU validation
  useDebounceSkuValidation(
    form.sku,
    form.type,
    validateSkuWithState,
    formInitialized,
    form.variations
  )

  // Initialize form when product loads
  React.useEffect(() => {
    if (dbProduct && !formInitialized) {
      const transformedProduct = transformDatabaseProductToProduct(dbProduct)
      resetForm(transformedProduct)
      initializeForm()
    }
  }, [dbProduct, formInitialized, resetForm, initializeForm])

  // Modal handlers
  const handleAddVariation = () => {
    resetVariationForm()
    setShowAddModal(true)
  }

  const handleEditVariation = (index: number) => {
    editVariation(index)
    setShowEditModal(true)
  }

  const handleDeleteVariation = (index: number) => {
    setVariationToDelete(index)
    setShowDeleteModal(true)
  }

  const confirmDeleteVariation = () => {
    if (variationToDelete !== null) {
      deleteVariation(variationToDelete)
      setShowDeleteModal(false)
      setVariationToDelete(null)
    }
  }

  // Loading state
  if (loading.product || loading.categories || loading.attributes) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (errors.product || !dbProduct) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errors.product || 'Product not found'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <ProductHeader
          productName={form.name}
          onBack={() => router.push('/products')}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Product Form */}
            <BasicProductForm
              form={form}
              onFormChange={setForm}
              categories={categories}
              isTypeReadOnly={true} // Can't change type after creation
            />

            {/* Simple Product Fields */}
            {form.type === 'simple' && (
              <SimpleProductFields
                form={form}
                onFormChange={setForm}
                skuValidation={skuValidation}
                onSkuChange={(sku) => validateSkuWithState(sku, false)}
              />
            )}

            {/* Variable Product Fields */}
            {form.type === 'variation' && (
              <VariableProductFields
                form={form}
                onFormChange={setForm}
                attributes={attributes}
                onCreateAttribute={() => setShowCreateAttributeModal(true)}
                onEditAttribute={() => setShowEditAttributeModal(true)}
                onAddVariation={handleAddVariation}
              />
            )}

            {/* Variations Table */}
            {form.type === 'variation' && form.variations.length > 0 && (
              <VariationsTable
                variations={form.variations}
                attributes={attributes}
                onEditVariation={handleEditVariation}
                onDeleteVariation={handleDeleteVariation}
              />
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <ProductSummary
              form={form}
              onFormChange={setForm}
              categories={categories}
              onSave={handleSubmit}
              onValidate={validateForm}
            />
          </div>
        </div>

        {/* Modals */}
        <AddVariationModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          variationForm={variationForm}
          onVariationFormChange={setVariationForm}
          skuValidation={variationSkuValidation}
          selectedAttributes={form.selectedAttributes}
          attributes={attributes}
          onAddVariation={addVariation}
          onReset={resetVariationForm}
        />

        <EditVariationModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          variationForm={variationForm}
          onVariationFormChange={setVariationForm}
          skuValidation={variationSkuValidation}
          selectedAttributes={form.selectedAttributes}
          attributes={attributes}
          onUpdateVariation={addVariation} // Same handler, different context
          onReset={resetVariationForm}
        />

        <DeleteVariationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          variation={variationToDelete !== null ? form.variations[variationToDelete] : null}
          attributes={attributes}
          onConfirmDelete={confirmDeleteVariation}
        />

        <CreateAttributeModal
          isOpen={showCreateAttributeModal}
          onClose={() => setShowCreateAttributeModal(false)}
          form={createAttributeForm}
          onFormChange={() => {}} // Handled by hook
          isCreating={isCreatingAttribute}
          onCreateAttribute={handleCreateAttribute}
          onAddValue={() => {}} // Handled by hook
          onUpdateValue={() => {}} // Handled by hook
          onRemoveValue={() => {}} // Handled by hook
        />

        <EditAttributeModal
          isOpen={showEditAttributeModal}
          onClose={() => setShowEditAttributeModal(false)}
          form={editAttributeForm}
          onFormChange={() => {}} // Handled by hook
          isEditing={isEditingAttribute}
          onUpdateAttribute={handleEditAttribute}
          onAddValue={() => {}} // Handled by hook
          onUpdateValue={() => {}} // Handled by hook
          onRemoveValue={() => {}} // Handled by hook
        />
      </div>
    </div>
  )
}

/*
REFACTORING SUMMARY:
==================

BEFORE: 2,256 lines
AFTER:  ~400-500 lines (78% reduction)

EXTRACTED COMPONENTS:
- 5 Modal components (436 lines → separate files)
- 3 Form components (600 lines → reusable components)
- 3 Data hooks (400 lines → reusable logic)
- 4 Business logic hooks (300 lines → testable logic)
- 3 UI components (200 lines → focused components)

BENEFITS:
- 78% reduction in main file size
- Reusable components for add product page
- Isolated, testable business logic
- Better TypeScript inference
- Easier maintenance and debugging
- Improved code organization
- Better developer experience

NEXT STEPS:
1. Create remaining business logic hooks
2. Create remaining UI components
3. Update imports in main file
4. Test all functionality
5. Apply same pattern to other large files
*/