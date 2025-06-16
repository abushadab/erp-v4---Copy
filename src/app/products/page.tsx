"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Package,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { transformDatabaseProductToProduct } from "@/lib/supabase/transforms"
import type { Product } from "@/lib/mock-data/erp-data"
import { ViewProductModal } from "@/components/products/ViewProductModal"
import { toast } from "sonner"
import { getTotalProductStock } from "@/lib/utils/multi-warehouse-stock"

// Client-side query function with deduplication
const dataCache = {
  products: [] as Product[],
  lastFetch: 0,
  currentRequest: null as Promise<Product[]> | null
}

const CACHE_DURATION = 30000 // 30 seconds

async function getAllProducts(forceRefresh = false): Promise<Product[]> {
  const now = Date.now()
  
  // Check cache first
  if (!forceRefresh && 
      dataCache.products.length > 0 && 
      (now - dataCache.lastFetch) < CACHE_DURATION) {
    console.log('📦 Using cached products data')
    return dataCache.products
  }

  // If there's already a request in progress, wait for it
  if (dataCache.currentRequest) {
    console.log('⏳ Request already in progress, waiting for existing promise...')
    return await dataCache.currentRequest
  }

  // Create a new request promise
  const requestPromise = (async (): Promise<Product[]> => {
    try {
      console.log('🔄 Fetching fresh products data from API')
      
  const supabase = createClient()
  
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      product_attributes(
        attribute_id,
        attributes!inner(id, name, type)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching products:', error)
    throw new Error('Failed to fetch products')
  }

  // Get variations for each variation product and stock data
  const transformedProducts: Product[] = []
  
  for (const product of products || []) {
    let variations: any[] = []
    
    if (product.type === 'variation') {
      const { data: variationData, error: variationsError } = await supabase
        .from('product_variations')
        .select(`
          *,
          product_variation_attributes(
            attribute_id,
            attribute_value_id,
            attributes!inner(id, name, type),
            attribute_values!inner(id, value, label)
          )
        `)
        .eq('product_id', product.id)

      if (!variationsError && variationData) {
        // Get stock for each variation
        const variationsWithStock = await Promise.all(
          variationData.map(async (variation) => {
            try {
              const stock = await getTotalProductStock(product.id, variation.id)
              return {
                ...variation,
                stock: stock, // Add actual warehouse stock
                attribute_values: variation.product_variation_attributes.map((pva: any) => ({
                  attribute_id: pva.attribute_id,
                  attribute_name: pva.attributes.name,
                  value_id: pva.attribute_value_id,
                  value_label: pva.attribute_values.label
                }))
              }
            } catch (error) {
              console.error(`Error fetching stock for variation ${variation.id}:`, error)
              return {
                ...variation,
                stock: 0,
                attribute_values: variation.product_variation_attributes.map((pva: any) => ({
                  attribute_id: pva.attribute_id,
                  attribute_name: pva.attributes.name,
                  value_id: pva.attribute_value_id,
                  value_label: pva.attribute_values.label
                }))
              }
            }
          })
        )
        variations = variationsWithStock
      }
    }

    // Get stock for simple products
    let productStock = 0
    if (product.type === 'simple') {
      try {
        productStock = await getTotalProductStock(product.id)
      } catch (error) {
        console.error(`Error fetching stock for product ${product.id}:`, error)
        productStock = 0
      }
    }

    const dbProduct = {
      ...product,
      stock: productStock, // Add actual warehouse stock for simple products
      variations: product.type === 'variation' ? variations : undefined,
      attributes: product.product_attributes?.map((pa: any) => pa.attributes) || []
    }

        const transformedProduct = transformDatabaseProductToProduct(dbProduct)
        // Add the database created_at field for display
        ;(transformedProduct as any).created_at = product.created_at
        transformedProducts.push(transformedProduct)
  }

      // Update cache
      dataCache.products = transformedProducts
      dataCache.lastFetch = now
      
      console.log('✅ Products data fetched successfully')
  return transformedProducts
    } catch (error) {
      console.error('❌ Error loading products data:', error)
      throw error
    } finally {
      dataCache.currentRequest = null
    }
  })()

  // Store the request promise
  dataCache.currentRequest = requestPromise
  
  return await requestPromise
}

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(['active', 'inactive'])
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(['simple', 'variation'])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  
  // View Product Modal state
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false)

  // Deduplication cache and initial load tracker
  const initialLoadTriggered = React.useRef(false)

  // Load products on mount with deduplication
  React.useEffect(() => {
    if (initialLoadTriggered.current) {
      return
    }
    initialLoadTriggered.current = true

    const loadProducts = async () => {
      try {
        setIsLoading(true)
        const productsData = await getAllProducts()
        setProducts(productsData)
        console.log('📦 Loaded products from Supabase:', productsData.length)
      } catch (error) {
        console.error('Error loading products:', error)
        toast.error('Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [])

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = selectedStatuses.includes(product.status)
    const matchesType = selectedTypes.includes(product.type)
    return matchesSearch && matchesStatus && matchesType
  })

  // Pagination logic
  const totalItems = filteredProducts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsViewModalOpen(true)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedProduct(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const calculateTotalStock = (product: Product): number => {
    if (product.type === 'simple') {
      return product.stock || 0
    } else if (product.type === 'variation' && product.variations) {
      return product.variations.reduce((total, variation) => total + (variation.stock || 0), 0)
    }
    return 0
  }

  const getLowStockStatus = (product: Product) => {
    const totalStock = calculateTotalStock(product)
    const threshold = 10 // Default low stock threshold
    return totalStock <= threshold
  }

  const getStockBadge = (product: Product) => {
    const totalStock = calculateTotalStock(product)
    const isLowStock = getLowStockStatus(product)
    
    return (
      <Badge variant={isLowStock ? "destructive" : "outline"} className="text-xs">
        {isLowStock ? "Low Stock" : "In Stock"}
      </Badge>
    )
  }

  const getStockDisplay = (product: Product) => {
    const totalStock = calculateTotalStock(product)
    
      return (
      <div className="space-y-1">
        <div className="font-medium">{totalStock}</div>
        {getStockBadge(product)}
      </div>
      )
    }
    
  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-10 w-36" />
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
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
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
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and inventory
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/products/categories">
            <Button variant="outline">
              Product Categories
            </Button>
          </Link>
        <Link href="/products/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter by Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Product Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.includes('active')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedStatuses([...selectedStatuses, 'active'])
                } else {
                  setSelectedStatuses(selectedStatuses.filter(s => s !== 'active'))
                }
              }}
            >
              Active
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.includes('inactive')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedStatuses([...selectedStatuses, 'inactive'])
                } else {
                  setSelectedStatuses(selectedStatuses.filter(s => s !== 'inactive'))
                }
              }}
            >
              Inactive
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter by Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Product Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes('simple')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedTypes([...selectedTypes, 'simple'])
                } else {
                  setSelectedTypes(selectedTypes.filter(t => t !== 'simple'))
                }
              }}
            >
              Simple
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes('variation')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedTypes([...selectedTypes, 'variation'])
                } else {
                  setSelectedTypes(selectedTypes.filter(t => t !== 'variation'))
                }
              }}
            >
              Variation
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

      {/* Products Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {paginatedProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.sku}
                            <span className="sm:hidden ml-2">
                              • {product.type === 'simple' ? 'Simple' : `Variation (${product.variations?.length || 0})`}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {product.type === 'simple' ? 'Simple' : 'Variation'}
                        </Badge>
                        {product.type === 'variation' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {product.variations?.length || 0} variants
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={getStatusColor(product.status) as any}>
                          {product.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStockDisplay(product)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date((product as any).created_at || Date.now()).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => handleViewProduct(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Link href={`/products/edit/${product.id}`}>
                            <Button variant="ghost" size="sm" className="cursor-pointer">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            ) : (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || selectedStatuses.length < 2 || selectedTypes.length < 2
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first product"}
                </p>
                <Link href="/products/add">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </Link>
              </div>
            )}
        </CardContent>
      </Card>

              {/* Pagination */}
      {paginatedProducts.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} products
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
            </div>
          )}

      {/* View Product Modal */}
      <ViewProductModal
        product={selectedProduct}
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
      />
    </div>
  )
} 