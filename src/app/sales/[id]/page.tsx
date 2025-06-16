"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  DollarSign,
  User,
  Package,
  Users,
  UserCheck,
  CheckCircle,
  Clock,
  XCircle,
  Warehouse,
  Receipt,
  TrendingUp,
  RotateCcw,
  Tag,
  Percent
} from "lucide-react"
import { getSaleById } from "@/lib/supabase/sales-client"
import { SaleWithItems, Customer } from "@/lib/supabase/types"

// Cache and request deduplication for sale details
const saleDetailCache = new Map<string, { sale: SaleWithItems; customer: Customer | null; timestamp: number }>()
const pendingRequests = new Map<string, Promise<{ sale: SaleWithItems; customer: Customer | null } | null>>()
const CACHE_DURATION = 30000 // 30 seconds

// Helper function to format variation attributes
const formatVariationAttributes = (variation: any) => {
  if (!variation?.product_variation_attributes?.length) return ""
  
  return variation.product_variation_attributes
    .map((attr: any) => `${attr.attributes.name}: ${attr.attribute_values.label}`)
    .join(", ")
}

// Helper function to get variation details by ID
const getVariationDetails = (variationId: string | null, productVariations: any[]) => {
  if (!variationId || !productVariations?.length) return null
  
  const variation = productVariations.find(v => v.id === variationId)
  if (!variation) return null
  
  return {
    sku: variation.sku,
    attributes: formatVariationAttributes(variation),
    price: variation.price
  }
}

// Helper function to format packaging variation attributes
const formatPackagingVariationAttributes = (packagingVariation: any) => {
  if (!packagingVariation?.packaging_variation_attributes?.length) return ""
  
  return packagingVariation.packaging_variation_attributes
    .map((attr: any) => `${attr.packaging_attributes.name}: ${attr.packaging_attribute_values.label}`)
    .join(", ")
}

// Helper function to get packaging details
const getPackagingDetails = (item: any) => {
  if (!item.packaging) return null
  
  const packaging = item.packaging
  const packagingVariation = item.packaging_variations
  
  return {
    title: packaging.title,
    type: packaging.type,
    sku: packaging.sku,
    variationSku: packagingVariation?.sku,
    variationAttributes: packagingVariation ? formatPackagingVariationAttributes(packagingVariation) : null
  }
}

export default function SaleDetailPage() {
  const params = useParams()
  const saleId = params.id as string
  
  const [sale, setSale] = React.useState<SaleWithItems | null>(null)
  const [customer, setCustomer] = React.useState<Customer | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchSaleData() {
      try {
        setLoading(true)
        setError(null)
        
        // Check cache first
        const cached = saleDetailCache.get(saleId)
        const now = Date.now()
        
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          console.log('Using cached sale data for', saleId)
          setSale(cached.sale)
          setCustomer(cached.customer)
          setLoading(false)
          return
        }
        
        // Check if there's already a pending request for this saleId
        let pendingRequest = pendingRequests.get(saleId)
        
        if (!pendingRequest) {
          console.log('Creating new request for sale data:', saleId)
          // Create new request and store it
          pendingRequest = getSaleById(saleId)
          pendingRequests.set(saleId, pendingRequest)
          
          // Clean up the pending request when it completes
          pendingRequest.finally(() => {
            pendingRequests.delete(saleId)
          })
        } else {
          console.log('Using existing pending request for sale data:', saleId)
        }
        
        const saleData = await pendingRequest
        if (saleData) {
          // Cache the result
          saleDetailCache.set(saleId, {
            sale: saleData.sale,
            customer: saleData.customer,
            timestamp: now
          })
          
          setSale(saleData.sale)
          setCustomer(saleData.customer)
        } else {
          setError("Sale not found")
        }
      } catch (err) {
        console.error('Error fetching sale:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sale')
      } finally {
        setLoading(false)
      }
    }

    if (saleId) {
      fetchSaleData()
    }
  }, [saleId])

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'returned':
        return <XCircle className="h-5 w-5 text-gray-600" />
      case 'partially returned':
        return <Clock className="h-5 w-5 text-orange-600" />
      default:
        return <ShoppingBag className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      case 'returned':
        return 'outline'
      case 'partially returned':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Loading Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-9 w-20" />
            <div>
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-60 mt-2" />
            </div>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Sale Information Loading */}
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Loading */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customer Information Loading */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Products Loading */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-12 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Sale</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/sales">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sales
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Sale Not Found</h1>
          <Link href="/sales">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sales
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalItems = sale.sale_items?.reduce((acc: number, item) => acc + item.quantity, 0) || 0
  const totalReturnedItems = sale.sale_items?.reduce((acc: number, item) => acc + (item.returned_quantity || 0), 0) || 0
  const profit = sale.profit || 0

  // Check if sale is fully returned (all items returned)
  const isFullyReturned = sale.status === 'returned'
  // Check if sale can be returned (not cancelled or already fully returned)
  const canReturn = !['cancelled', 'returned'].includes(sale.status || '')
  // Check if all products are returned
  const allProductsReturned = sale.sale_items?.every(item => (item.returned_quantity || 0) >= item.quantity) || false

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/sales">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sale #{sale.id}</h1>
            <p className="text-muted-foreground">
              Sale details and transaction information
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canReturn && (
            <Link href={`/returns?saleId=${sale.id}`}>
              <Button>
                <RotateCcw className="mr-2 h-4 w-4" />
                Return
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sale Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sale ID</label>
                  <p className="text-lg font-semibold">#{sale.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(sale.status)}
                    <Badge variant={getStatusColor(sale.status) as any} className="text-sm">
                      {(sale.status || 'pending').charAt(0).toUpperCase() + (sale.status || 'pending').slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Return Information */}
                {(sale.status === 'returned' || sale.status === 'partially returned') && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Return Information</label>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{totalReturnedItems}/{totalItems}</span> items returned
                      </p>
                      {sale.return_reason && (
                        <p className="text-sm text-muted-foreground">
                          Reason: {sale.return_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <p>{sale.customer_name}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Salesperson</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p>{sale.salesperson}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sale Date</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{new Date(sale.sale_date || '').toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warehouse</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <p>Warehouse #{sale.warehouse_id}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Items</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <p>{totalItems} items</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">৳{sale.subtotal.toFixed(2)}</span>
              </div>
              
              {/* Item-level discounts summary */}
              {sale.sale_items?.some(item => item.discount && item.discount > 0) && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Item Discounts:</span>
                  <span className="font-medium">
                    -৳{sale.sale_items.reduce((sum, item) => sum + (item.discount || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              
              {/* Total Discount - only show if there's a total discount beyond item discounts */}
              {sale.total_discount && sale.total_discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Total Discount:</span>
                  <span className="font-medium text-green-600">
                    -৳{sale.total_discount.toFixed(2)}
                  </span>
                </div>
              )}
              
              {/* After Discount - only show if there are any discounts */}
              {sale.after_discount !== sale.subtotal && (
                <div className="flex justify-between text-sm">
                  <span>After Discount:</span>
                  <span className="font-medium">৳{sale.after_discount.toFixed(2)}</span>
                </div>
              )}
              
              {/* Item-level taxes summary */}
              {sale.sale_items?.some(item => item.tax && item.tax > 0) && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Item Taxes:</span>
                  <span className="font-medium">
                    +৳{sale.sale_items.reduce((sum, item) => sum + (item.tax || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              
              {/* Tax - only show if tax is applied at sale level */}
              {sale.tax_rate && sale.tax_rate > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({sale.tax_rate}%):</span>
                  <span className="font-medium text-blue-600">+৳{sale.tax_amount?.toFixed(2)}</span>
                </div>
              )}
              
              {/* Total Amount */}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-3 mt-3">
                <span>Total:</span>
                <span className="text-green-600">৳{sale.total_amount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {!allProductsReturned && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{profit.toFixed(2)}</div>
              </CardContent>
            </Card>
          )}

{/* Commission card removed as commission field is not available in current schema */}
        </div>
      </div>

      {/* Customer Information */}
      {customer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="font-semibold">{customer.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm">{customer.email}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm">{customer.phone}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Spent</label>
                <p className="font-semibold">৳{(customer.total_spent || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products ({sale.sale_items?.length || 0} items)
          </CardTitle>
          <CardDescription>
            Complete list of products in this sale with variation details, pricing, and applicable discounts/taxes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sale.sale_items?.map((item, index) => {
              const returnedQty = item.returned_quantity || 0
              const remainingQty = item.quantity - returnedQty
              const isFullyReturnedItem = returnedQty >= item.quantity
              
              // Get variation and packaging details if available
              const saleItem = item as any // Extended with products and packaging data
              const variationDetails = saleItem.products?.product_variations?.length > 0 
                ? getVariationDetails(item.variation_id, saleItem.products.product_variations)
                : null
              const packagingDetails = getPackagingDetails(saleItem)
              

              
              return (
                <div 
                  key={index} 
                  className={`border rounded-lg p-4 transition-shadow ${
                    isFullyReturnedItem ? 'bg-gray-50 opacity-75' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Parent Column 1: Icon + Product Information */}
                    <div className="flex items-center space-x-4 flex-1">
                      {/* First Sub-column: Icon (larger and centered) */}
                      <div className="flex items-center justify-center">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      
                      {/* Second Sub-column: Product Information */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3 flex-wrap">
                          <h4 className={`font-semibold text-base ${isFullyReturnedItem ? 'text-gray-500 line-through' : ''}`}>
                            {item.product_name}
                          </h4>
                          {saleItem.products?.type && saleItem.products.type !== 'variation' && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              {saleItem.products.type.charAt(0).toUpperCase() + saleItem.products.type.slice(1)}
                            </Badge>
                          )}
                          {/* Return Status moved to pricing location */}
                          {returnedQty > 0 && (
                            <>
                              <span className="text-black font-normal text-xs">
                                {returnedQty} of {item.quantity} returned
                              </span>
                              <span className={`text-xs font-normal px-2 py-1 rounded-full ${
                                returnedQty === item.quantity 
                                  ? 'text-black' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {returnedQty === item.quantity ? 'Fully Returned' : 'Partially Returned'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Variation and Packaging details */}
                        {(variationDetails || packagingDetails) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Variation Details - Remove label */}
                            {variationDetails && (
                              <div className="bg-blue-50 border border-blue-200 rounded-md px-2 py-1 inline-flex items-center space-x-1.5 text-xs">
                                <span className="text-blue-600">{variationDetails.attributes}</span>
                              </div>
                            )}

                            {/* Packaging Details */}
                            {packagingDetails && (
                              <div className="bg-purple-50 border border-purple-200 rounded-md px-2 py-1 inline-flex items-center space-x-1.5 text-xs">
                                <span className="text-purple-600">{packagingDetails.title}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parent Column 2: Quantity, Unit Price, Total */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                        <div className={`font-semibold text-sm ${isFullyReturnedItem ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {item.quantity}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Unit Price</div>
                        <div className={`font-semibold text-sm ${isFullyReturnedItem ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          ৳{item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Total</div>
                        <div className={`font-semibold text-sm ${isFullyReturnedItem ? 'text-gray-500 line-through' : 'text-green-600'}`}>
                        ৳{(item.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t my-4" />
          
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Items: {totalItems}</p>
              <p className="text-sm text-muted-foreground">Products: {sale.sale_items?.length || 0}</p>
              <p className="text-sm text-muted-foreground">
                Items with variations: {sale.sale_items?.filter(item => item.variation_id).length || 0}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-2xl font-bold">৳{sale.total_amount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Grand Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 