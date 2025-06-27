"use client"

import * as React from "react"
import { ArrowLeft, Plus, Trash2, ShoppingCart, Calendar, Package, Box, Search, X, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"

// Custom hooks and utilities
import { usePurchaseFormData, useItemSelection, usePurchaseForm } from "@/hooks/purchases"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { 
  formatCurrency, 
  isPackaging, 
  getItemDisplayInfo, 
  filterProducts, 
  filterPackages 
} from "@/lib/purchases/add-purchase-utils"

// Type imports
import { 
  type DatabaseProduct, 
  type DatabasePackaging,
  type DatabaseProductVariation,
  type DatabasePackagingVariation
} from "@/lib/supabase/queries"

// Note: PurchaseItem, SelectedItem, and PurchaseForm interfaces are now defined in the hooks
// Type guard isPackaging is now imported from utils

export default function CreatePurchasePage() {
  // Use custom hooks for all logic
  const { suppliers, warehouses, products, packages, dataLoading } = usePurchaseFormData()
  
  const {
    selectedItems,
    isModalOpen,
    isVariationModalOpen, 
    selectedPackageForVariation,
    activeTab,
    searchTerm,
    productVariations,
    packageVariations,
    setSelectedItems,
    setIsModalOpen,
    setIsVariationModalOpen,
    setSelectedPackageForVariation,
    setActiveTab,
    setSearchTerm,
    handleProductSelection,
    handlePackageSelection,
    handleVariationSelection,
    handleProductVariationSelection,
    handleProductSelectionWithVariations,
    isItemSelected,
    getSelectionSummary
  } = useItemSelection()
  
  const {
    form,
    isLoading,
    setForm,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    handleSubmit,
    getItemNameById,
    addSelectedItemsToPurchase: addItemsToForm
  } = usePurchaseForm()

  // Get current user for additional validation
  const { user, loading: userLoading } = useCurrentUser()

  // Data loading is now handled by usePurchaseFormData hook

  const selectedSupplier = suppliers.find(s => s.id === form.supplierId)
  const totalAmount = form.items.reduce((sum, item) => sum + item.total, 0)

  // Filter products and packages using utility functions
  const filteredProducts = filterProducts(products, searchTerm)
  const filteredPackages = filterPackages(packages, searchTerm)

  // Helper function to add selected items to purchase
  const addSelectedItemsToPurchase = () => {
    addItemsToForm(selectedItems)
    setSelectedItems([])
    setIsModalOpen(false)
  }

  // Helper function to handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    handleSubmit(e, suppliers, warehouses)
  }

  // Helper functions for UI rendering
  const getItemTypeIcon = (itemType: 'product' | 'package') => {
    return itemType === 'package' ? (
      <Package className="h-4 w-4 text-purple-600" />
    ) : (
      <Box className="h-4 w-4 text-blue-600" />
    )
  }

  const getItemTypeBadge = (itemType: 'product' | 'package') => {
    return itemType === 'package' ? (
      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">Package</Badge>
    ) : (
      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Product</Badge>
    )
  }

  if (dataLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Section Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-48" />
                </div>
                
                {/* Sample Item Skeletons */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <Skeleton className="h-5 w-5 mt-1" />
                            <div className="flex-1 min-w-0">
                              <Skeleton className="h-5 w-48 mb-1" />
                              <div className="flex items-center gap-2 mb-3">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-20" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <Skeleton className="h-3 w-12 mb-1" />
                            <Skeleton className="h-9 w-20" />
                          </div>
                          <div className="text-center">
                            <Skeleton className="h-3 w-20 mb-1" />
                            <Skeleton className="h-9 w-28" />
                          </div>
                          <div className="text-center min-w-[80px]">
                            <Skeleton className="h-3 w-8 mb-1" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                          <Skeleton className="h-9 w-9 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton - Hidden on mobile, shown on lg+ screens */}
          <div className="hidden lg:block space-y-6">
            {/* Purchase Summary Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-36" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-18" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions Skeleton */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/purchases">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Purchase Order</h1>
          <p className="text-muted-foreground mt-2">
            Add a new purchase order for products and packages from a supplier
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Purchase Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Information</CardTitle>
                <CardDescription>
                  Enter the basic details for this purchase order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select 
                      value={form.supplierId} 
                      onValueChange={(value) => setForm({ ...form, supplierId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.filter(s => s.status === 'active').map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse *</Label>
                    <Select 
                      value={form.warehouse} 
                      onValueChange={(value) => setForm({ ...form, warehouse: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.filter(w => w.status === 'active').map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} - {warehouse.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Purchase Date *</Label>
                    <DatePicker
                      date={form.date ? new Date(form.date) : undefined}
                      onDateChange={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const formattedDate = `${year}-${month}-${day}`
                          setForm({ ...form, date: formattedDate })
                        } else {
                          setForm({ ...form, date: '' })
                        }
                      }}
                      placeholder="Select purchase date"
                    />
                  </div>
                  <div></div>
                </div>
              </CardContent>
            </Card>

            {/* Items Section */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Items</CardTitle>
                <CardDescription>
                  Choose products and packages for this purchase order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {form.items.length === 0 ? 'No items added yet' : `${form.items.length} item(s) added`}
                  </p>
                  <Button 
                    type="button" 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Choose Product or Package
                  </Button>
                </div>

                {/* Items List */}
                {form.items.length > 0 && (
                  <div className="space-y-4">
                    {form.items.map((item, index) => {
                      // Extract base name and variation details using utility function
                      const { baseName, variation } = getItemDisplayInfo(item.itemName)

                      return (
                        <div key={`${item.itemId}-${item.itemType}-${item.variationId || 'simple'}-${index}`} 
                             className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-4">
                            {/* Item Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  {getItemTypeIcon(item.itemType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 mb-1">{baseName}</h4>
                                  <div className="flex items-center gap-2 mb-3">
                                    {getItemTypeBadge(item.itemType)}
                                    {variation && (
                                      <Badge variant="outline" className="text-xs">
                                        {variation}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Quantity & Price Controls */}
                            <div className="flex items-center gap-4">
                              {/* Quantity */}
                              <div className="text-center">
                                <Label htmlFor={`qty-${index}`} className="text-xs text-muted-foreground block mb-1">
                                  Quantity
                                </Label>
                                <Input
                                  id={`qty-${index}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity || ''}
                                  onChange={(e) => updateItemQuantity(index, e.target.value)}
                                  placeholder="1"
                                  className="w-20 h-9 text-center"
                                />
                              </div>

                              {/* Unit Price */}
                              <div className="text-center">
                                <Label htmlFor={`price-${index}`} className="text-xs text-muted-foreground block mb-1">
                                  Unit Price (BDT)
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                                  <Input
                                    id={`price-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.purchasePrice || ''}
                                    onChange={(e) => updateItemPrice(index, e.target.value)}
                                    placeholder="0.00"
                                    className="w-28 h-9 pl-8 text-center"
                                  />
                                </div>
                              </div>

                              {/* Total */}
                              <div className="text-center min-w-[80px]">
                                <div className="text-xs text-muted-foreground mb-1">Total</div>
                                <div className="font-semibold text-lg text-gray-900">
                                  {formatCurrency(item.total)}
                                </div>
                              </div>

                              {/* Remove Button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Summary Card */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>
                            <span className="font-medium text-gray-900">{form.items.length}</span> Items
                          </span>
                          <span>
                            <span className="font-medium text-gray-900">{form.items.reduce((sum, item) => sum + item.quantity, 0)}</span> Total Quantity
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Grand Total</div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(totalAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Purchase Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSupplier && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Supplier Details:</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Name:</strong> {selectedSupplier.name}</p>
                      <p><strong>Email:</strong> {selectedSupplier.email}</p>
                      <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span>{form.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Products:</span>
                    <span>{form.items.filter(item => item.itemType === 'product').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Packages:</span>
                    <span>{form.items.filter(item => item.itemType === 'package').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Quantity:</span>
                    <span>{form.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || form.items.length === 0 || userLoading || !user}
                  >
                    {isLoading ? (
                      <div className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <ShoppingCart className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Creating...' : userLoading ? 'Loading...' : !user ? 'Please log in' : 'Create Purchase Order'}
                  </Button>
                  
                  <Link href="/purchases">
                    <Button variant="outline" className="w-full" disabled={isLoading}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Item Selection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose Products or Packages</DialogTitle>
            <DialogDescription>
              Select products and packages to add to your purchase order
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Packages
                </TabsTrigger>
              </TabsList>

              {/* Search Bar */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <TabsContent value="products" className="flex-1 overflow-hidden mt-4">
                <div className="h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {filteredProducts.map((product) => (
                      <div 
                        key={product.id} 
                        onClick={() => handleProductSelectionWithVariations(product)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          isItemSelected(product, 'product') 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Box className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{product.name}</h4>
                              {product.sku && (
                                <Badge variant="outline" className="text-xs">SKU: {product.sku}</Badge>
                              )}
                              {product.type === 'variation' && (
                                <>
                                  <Badge variant="default" className="text-xs">Variable</Badge>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                            )}
                            {product.type === 'simple' && (
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Price: {formatCurrency(product.price || 0)}</span>
                                <span>Stock: {(product as any).stock || 0}</span>
                              </div>
                            )}
                            {product.type === 'variation' && (
                              <p className="text-sm text-muted-foreground">
                                {product.variations?.length || 0} variations available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground py-8">No products found</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="packages" className="flex-1 overflow-hidden mt-4">
                <div className="h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {filteredPackages.map((packaging) => (
                      <div 
                        key={packaging.id} 
                        onClick={() => handlePackageSelection(packaging)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          isItemSelected(packaging, 'package') 
                            ? 'ring-2 ring-purple-500 bg-purple-50' 
                            : 'hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{packaging.title}</h4>
                              {packaging.sku && (
                                <Badge variant="outline" className="text-xs">SKU: {packaging.sku}</Badge>
                              )}
                              <Badge variant={packaging.type === 'variable' ? 'default' : 'secondary'} className="text-xs">
                                {packaging.type === 'variable' ? 'Variable' : 'Simple'}
                              </Badge>
                              {packaging.type === 'variable' && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {packaging.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{packaging.description}</p>
                            )}
                            {packaging.type === 'simple' && (
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Package Item</span>
                                <span>Stock: {(packaging as any).stock || 0}</span>
                              </div>
                            )}
                            {packaging.type === 'variable' && (
                              <p className="text-sm text-muted-foreground">
                                {packaging.variations?.length || 0} variations available
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredPackages.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground py-8">No packages found</div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {selectedItems.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-2">
                {(() => {
                  const summary = getSelectionSummary()
                  return (
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {summary}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            
            {selectedItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No items selected
              </p>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={addSelectedItemsToPurchase}
                disabled={selectedItems.length === 0}
              >
                Add Selected Items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Variation Selection Modal */}
      <Dialog open={isVariationModalOpen} onOpenChange={setIsVariationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose {selectedPackageForVariation && isPackaging(selectedPackageForVariation) ? 'Package' : 'Product'} Variations</DialogTitle>
            <DialogDescription>
              Select variations for {selectedPackageForVariation && isPackaging(selectedPackageForVariation) ? selectedPackageForVariation.title : selectedPackageForVariation ? (selectedPackageForVariation as DatabaseProduct).name : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3 p-4">
              {/* Handle Package Variations */}
              {selectedPackageForVariation && isPackaging(selectedPackageForVariation) && selectedPackageForVariation.variations?.map((variation) => (
                <div 
                  key={variation.id}
                  onClick={() => handleVariationSelection(variation)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    isItemSelected(selectedPackageForVariation, 'package', variation.id)
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{variation.sku}</span>
                        <Badge variant="outline" className="text-xs">
                          {variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>SKU: {variation.sku}</span>
                        <span>Type: Package Variation</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Handle Product Variations */}
              {selectedPackageForVariation && !isPackaging(selectedPackageForVariation) && selectedPackageForVariation.variations?.map((variation: DatabaseProductVariation) => (
                <div 
                  key={variation.id}
                  onClick={() => handleProductVariationSelection(variation)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    isItemSelected(selectedPackageForVariation as DatabaseProduct, 'product', variation.id)
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{variation.sku}</span>
                        <Badge variant="outline" className="text-xs">
                          {variation.attribute_values?.map(av => av.value_label).join(', ') || variation.sku}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Price: {formatCurrency(variation.price || 0)}</span>
                        <span>SKU: {variation.sku}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variation Modal Footer */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {(() => {
              const variationItems = selectedItems.filter(item => 
                item.id === selectedPackageForVariation?.id && 
                (item.type === 'package' || item.type === 'product') && 
                item.variationId
              )
              
              return (
                <div className="text-sm text-muted-foreground space-y-2">
                  {variationItems.length > 0 ? (
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {variationItems.length} variation(s) selected:
                      </div>
                      {variationItems.map((item, index) => (
                        <div key={`${item.id}-${item.variationId}-${index}`} className="flex items-center gap-1 text-xs">
                          {item.type === 'product' ? (
                            <Box className="h-3 w-3 text-blue-600" />
                          ) : (
                            <Package className="h-3 w-3 text-purple-600" />
                          )}
                          <span>{item.variationName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>No variations selected</span>
                  )}
                </div>
              )
            })()}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsVariationModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 