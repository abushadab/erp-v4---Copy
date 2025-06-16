"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  RotateCcw,
  AlertTriangle
} from "lucide-react"
import { getReturnById, getSaleById, getCustomerById, type ReturnWithItems, type SaleWithItems } from "@/lib/supabase/sales-client"
import { apiCache } from "@/lib/supabase/cache"
import { toast } from "sonner"

export default function ReturnDetailPage() {
  const params = useParams()
  const returnId = params.id as string
  
  const [returnData, setReturnData] = React.useState<ReturnWithItems | null>(null)
  const [originalSale, setOriginalSale] = React.useState<SaleWithItems | null>(null)
  const [customer, setCustomer] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchReturnData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Use cache for return data
        const fetchedReturn = await apiCache.get(`return-${returnId}`, () => getReturnById(returnId))
        setReturnData(fetchedReturn)
        
        // Fetch original sale data if return has sale_id
        if (fetchedReturn.sale_id) {
          try {
            // Use cache for sale data (shared with other pages)
            const saleData = await apiCache.get(`sale-${fetchedReturn.sale_id}`, () => getSaleById(fetchedReturn.sale_id!))
            setOriginalSale(saleData.sale)
            if (saleData.customer) {
              setCustomer(saleData.customer)
            }
          } catch (saleError) {
            console.warn('Could not fetch original sale:', saleError)
          }
        }
        
        // Try to fetch customer data if we have customer_id
        if (fetchedReturn.customer_id && !customer) {
          try {
            // Use cache for customer data (shared with other pages)
            const customerData = await apiCache.get(`customer-${fetchedReturn.customer_id}`, () => getCustomerById(fetchedReturn.customer_id!))
            setCustomer(customerData)
          } catch (customerError) {
            console.warn('Could not fetch customer:', customerError)
          }
        }
        
      } catch (err) {
        console.error('Error fetching return:', err)
        setError('Failed to load return data')
        toast.error('Failed to load return data')
      } finally {
        setLoading(false)
      }
    }

    if (returnId) {
      fetchReturnData()
    }
  }, [returnId])

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 h-96 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !returnData) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
          <Link href="/sales/returns">
              <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Returns
            </Button>
          </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Return Not Found</h1>
              <p className="text-muted-foreground">
                The return you're looking for doesn't exist.
              </p>
            </div>
          </div>
        </div>

        <Card className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Return Not Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {returnId 
              ? `Return with ID "${returnId}" could not be found.`
              : "No return ID was provided."
            }
          </p>
          <div className="flex space-x-2">
            <Link href="/sales/returns">
              <Button>
                View All Returns
              </Button>
            </Link>
            {originalSale && (
              <Link href={`/sales/${originalSale.id}`}>
                <Button variant="outline">
                  View Original Sale
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    )
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <RotateCcw className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'approved':
        return 'default'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const totalItems = returnData.return_items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/sales/returns">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Returns
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Return #{returnData.id}</h1>
            <p className="text-muted-foreground">
              Return details and refund information
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Return Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Return Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Return ID</label>
                  <p className="text-lg font-semibold">#{returnData.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(returnData.status)}
                    <Badge variant={getStatusColor(returnData.status) as any} className="text-sm">
                      {returnData.status?.charAt(0).toUpperCase() + returnData.status?.slice(1) || 'N/A'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <p>{returnData.customer_name || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <p>{returnData.reason || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Return Date</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{formatDate(returnData.created_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Original Sale</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    {returnData.sale_id ? (
                      <Link href={`/sales/${returnData.sale_id}`} className="text-primary hover:underline">
                        #{returnData.sale_id}
                    </Link>
                    ) : (
                      <span>N/A</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Items</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <p>{totalItems} items</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Refund Amount</label>
                  <p className="text-2xl font-bold text-green-600">৳{returnData.total_amount?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        {customer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="font-medium">{customer.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{customer.email || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{customer.phone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{customer.address || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Returned Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Returned Items
          </CardTitle>
          <CardDescription>
            Items that were returned by the customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {returnData.return_items?.map((item, index) => {
                             // Get variation information
               const variationData = item.product_variations?.[0];
               const variationAttributes = variationData?.product_variation_attributes || [];
               
               // Process variation attributes safely
               const variationPairs = variationAttributes
                 .filter(attr => attr.attributes?.name && attr.attribute_values?.value)
                 .map(attr => `${attr.attributes.name}: ${attr.attribute_values.value}`);
               
               const variationText = variationPairs.join(', ');

              return (
                <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {item.product_name || 'N/A'}
                          </h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Show variation SKU if available, otherwise show product SKU */}
                            {(variationData?.sku || (item as any).product_sku) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                SKU: {variationData?.sku || (item as any).product_sku}
                              </span>
                            )}
                            {/* Show variation attributes side by side with SKU */}
                            {variationText && variationText.trim() && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {variationText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                        <div className="font-semibold text-sm h-5 flex items-center justify-center">{item.quantity || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Unit Price</div>
                        <div className="font-semibold text-sm h-5 flex items-center justify-center">৳{item.price?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Total</div>
                        <div className="font-semibold text-sm text-green-600 h-5 flex items-center justify-center">
                          ৳{item.total?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) || (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items found</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Refund Amount</p>
              <p className="text-2xl font-bold">৳{returnData.total_amount?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Original Sale Information */}
      {originalSale && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Original Sale Information
            </CardTitle>
            <CardDescription>
              Details from the original sale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sale Date</label>
                <p>{formatDate(originalSale.created_at) || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Salesperson</label>
                <p>{originalSale.salesperson || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Warehouse</label>
                <p>{originalSale.warehouse_id || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Original Total</label>
                <p className="font-semibold">৳{originalSale.total_amount?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Items</label>
                <p>{originalSale.sale_items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0} items</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sale Status</label>
                <div className="mt-1">
                <Badge variant={originalSale.status === 'completed' ? 'default' : 'secondary'}>
                    {originalSale.status || 'N/A'}
                </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 