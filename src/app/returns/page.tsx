"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
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
  RotateCcw,
  Package,
  User,
  Calendar,
  ShoppingCart,
  CheckCircle,
  Minus,
  Plus,
  Receipt,
  AlertTriangle
} from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { getSaleById, createReturn, getCustomerById, type SaleWithItems } from "@/lib/supabase/sales-client"
import { apiCache } from "@/lib/supabase/cache"
import { toast } from "sonner"

interface ReturnItem {
  productId: string
  productName: string
  originalQuantity: number
  returnQuantity: number
  price: number
  maxReturnQty: number
  productVariationId?: string
  packagingId?: string
  packagingVariationId?: string
}

export default function ReturnsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const saleId = searchParams.get('saleId')
  
  const [sale, setSale] = React.useState<SaleWithItems | null>(null)
  const [customer, setCustomer] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [returnItems, setReturnItems] = React.useState<ReturnItem[]>([])
  const [returnReason, setReturnReason] = React.useState('')
  const [returnDate, setReturnDate] = React.useState(new Date().toISOString().split('T')[0]) // Default to today but user can change
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [alertMessage, setAlertMessage] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Find sale data and initialize return items
  React.useEffect(() => {
    const fetchSaleData = async () => {
      if (!saleId) {
        setError("No sale ID provided")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Use the new cache system with request deduplication
        const saleData = await apiCache.get(`sale-${saleId}`, () => getSaleById(saleId))
        
        if (saleData && saleData.sale) {
          setSale(saleData.sale)
          
          // Handle customer data with caching
          if (saleData.customer) {
            setCustomer(saleData.customer)
          } else if (saleData.sale.customer_id) {
            // Use cache for customer data too
            try {
              const customerData = await apiCache.get(
                `customer-${saleData.sale.customer_id}`, 
                () => getCustomerById(saleData.sale.customer_id!)
              )
              setCustomer(customerData)
            } catch (customerError) {
              console.warn('Could not fetch customer:', customerError)
            }
          }
        
        // Initialize return items from sale data, excluding fully returned items
          const initialReturnItems: ReturnItem[] = saleData.sale.sale_items
            ?.filter((item: any) => (item.returned_quantity || 0) < item.quantity) // Only include items that can still be returned
            .map((item: any) => ({
              productId: item.product_id || '', // Handle null case
              productName: item.product_name,
            originalQuantity: item.quantity,
            returnQuantity: 0,
            price: item.price,
              maxReturnQty: item.quantity - (item.returned_quantity || 0), // Maximum returnable quantity
              productVariationId: item.variation_id || undefined,
              packagingId: item.packaging_id || undefined,
              packagingVariationId: item.packaging_variation_id || undefined
          }))
            .filter((item: ReturnItem) => item.productId) || [] // Filter out items with empty productId
        
        setReturnItems(initialReturnItems)
        } else {
          setError("Sale not found")
        }
      } catch (err) {
        console.error('Error fetching sale:', err)
        setError("Failed to load sale data")
      } finally {
        setLoading(false)
      }
    }

    fetchSaleData()
  }, [saleId])

  // Reset fetchedRef when saleId changes
  React.useEffect(() => {
    return () => {
      // No cleanup needed with the new cache system
    }
  }, [saleId])

  // Handle quantity updates
  const updateReturnQuantity = (productId: string, quantity: number) => {
    setReturnItems(prev => prev.map(item => 
      item.productId === productId 
        ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.maxReturnQty)) }
        : item
    ))
  }

  // Calculate totals
  const totalReturnAmount = returnItems.reduce((sum, item) => 
    sum + (item.returnQuantity * item.price), 0
  )
  
  const totalReturnItems = returnItems.reduce((sum, item) => 
    sum + item.returnQuantity, 0
  )

  // Validate and submit return
  const handleSubmitReturn = async () => {
    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0)
    
    if (itemsToReturn.length === 0) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Please select at least one item to return' 
      })
      return
    }

    if (!returnReason.trim()) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Please provide a reason for the return' 
      })
      return
    }

    if (!returnDate) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Please select a return date' 
      })
      return
    }

    setIsSubmitting(true)
    setAlertMessage(null)

    try {
      // Create return record in Supabase
      const returnData = {
        sale_id: saleId!,
        customer_name: customer?.name || sale?.customer_name || 'Unknown Customer',
        total_amount: totalReturnAmount,
        reason: returnReason,
        return_date: returnDate, // Use the user-selected date
        status: 'pending' as const
      }

      const returnItemsData = itemsToReturn.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        variation_id: item.productVariationId || null,
            quantity: item.returnQuantity,
            price: item.price,
            total: item.returnQuantity * item.price
      }))

      console.log('📝 Return data to submit:', returnData)
      console.log('📝 Return items data to submit:', returnItemsData)

      // Test database connection and table structure
      console.log('🔍 Testing database connection...')
      
      await createReturn(returnData, returnItemsData)
      
      // Invalidate cache to ensure fresh data on next visit
      if (saleId) {
        apiCache.invalidate(`sale-${saleId}`)
      }

      toast.success('Return request submitted successfully!')

      // Redirect to returns list with success message
      router.push(`/sales/returns?success=${encodeURIComponent('Return request submitted successfully!')}`)

    } catch (error) {
      console.error('Error submitting return:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // Try to extract meaningful error message
      let errorMessage = 'Failed to submit return request. Please try again.'
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = `Error: ${error.message}`
        } else if ('details' in error) {
          errorMessage = `Database error: ${error.details}`
        } else if ('hint' in error) {
          errorMessage = `Hint: ${error.hint}`
        }
      }
      
      setAlertMessage({ 
        type: 'error', 
        message: errorMessage
      })
      
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !sale) {
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
              <h1 className="text-3xl font-bold tracking-tight">Sale Not Found</h1>
              <p className="text-muted-foreground">
                The sale you're trying to process returns for doesn't exist.
              </p>
            </div>
          </div>
        </div>

        <Card className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sale Not Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {saleId 
              ? `Sale with ID "${saleId}" could not be found or doesn't exist.`
              : "No sale ID was provided."
            }
          </p>
          <div className="flex space-x-2">
            <Link href="/sales">
              <Button variant="outline">
                View All Sales
              </Button>
            </Link>
            <Link href="/sales/returns">
              <Button>
                View Returns
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/sales/${sale.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sale #{sale.id}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Process Return
            </h1>
            <p className="text-muted-foreground">
              Process return for Sale #{sale.id} • Customer: {sale.customer_name}
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant={alertMessage.type === 'error' ? 'destructive' : 'success'}>
              <AlertDescription>{alertMessage.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Information Alert */}
        <Alert>
          <AlertDescription>
            <strong>Return Process:</strong> Only items that haven't been fully returned are shown below. 
            The "Available" quantity shows how many items you can still return for each product.
          </AlertDescription>
        </Alert>

        {/* Sale Information - Full Width with Inline Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 md:gap-8">
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-muted-foreground mb-1">Sale ID</Label>
                <p className="text-lg font-semibold">#{sale.id}</p>
              </div>
              
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-muted-foreground mb-1">Customer</Label>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{sale.customer_name}</p>
                </div>
              </div>
              
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-muted-foreground mb-1">Sale Date</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p>{sale.created_at ? new Date(sale.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-muted-foreground mb-1">Original Total</Label>
                <p className="text-xl font-bold text-green-600">৳{sale.total_amount.toFixed(2)}</p>
              </div>
              
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-muted-foreground mb-1">Salesperson</Label>
                <p className="font-medium">{sale.salesperson || 'N/A'}</p>
              </div>
              
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-muted-foreground mb-1">Warehouse</Label>
                <p className="font-medium">{sale.warehouse_id || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Items Table - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Items to Return
            </CardTitle>
            <CardDescription>
              Specify the quantity of each item you want to return
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {returnItems.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Original Qty</TableHead>
                      <TableHead>Remaining Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Return Qty</TableHead>
                      <TableHead>Refund Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnItems.map((item) => {
                      const saleItem = sale?.sale_items.find(si => si.product_id === item.productId)
                      const alreadyReturned = saleItem?.returned_quantity || 0
                      const remainingQty = item.maxReturnQty - item.returnQuantity // Reactive remaining quantity
                      
                      return (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <p className="font-medium">{item.productName}</p>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>Original: {item.originalQuantity}</span>
                                {item.maxReturnQty < item.originalQuantity && (
                                  <span className="text-orange-600">
                                    • Returned: {item.originalQuantity - item.maxReturnQty}
                                  </span>
                                )}
                                <span className="text-green-600">
                                  • Available: {item.maxReturnQty}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.originalQuantity}</TableCell>
                          <TableCell className={`font-medium ${remainingQty > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {remainingQty}
                          </TableCell>
                          <TableCell>৳{item.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateReturnQuantity(item.productId, item.returnQuantity - 1)}
                                disabled={item.returnQuantity <= 0 || isSubmitting}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                max={item.maxReturnQty}
                                value={item.returnQuantity}
                                onChange={(e) => updateReturnQuantity(item.productId, parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                                disabled={isSubmitting}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateReturnQuantity(item.productId, item.returnQuantity + 1)}
                                disabled={item.returnQuantity >= item.maxReturnQty || isSubmitting}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              ৳{(item.returnQuantity * item.price).toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Return Reason and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="returnReason">Return Reason *</Label>
                  <Textarea
                    id="returnReason"
                    placeholder="Please provide a reason for the return..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    disabled={isSubmitting}
                    className="min-h-[100px]"
                  />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="returnDate">Return Date *</Label>
                    <DatePicker
                      date={returnDate ? new Date(returnDate) : undefined}
                      onDateChange={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const formattedDate = `${year}-${month}-${day}`
                          setReturnDate(formattedDate)
                        } else {
                          setReturnDate('')
                        }
                      }}
                      placeholder="Select return date"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Return Summary */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Items to Return:</span>
                      <span className="font-medium">{totalReturnItems}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Refund Amount:</span>
                      <span>৳{totalReturnAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitReturn}
                    disabled={isSubmitting || totalReturnItems === 0}
                    size="lg"
                    className="min-w-[150px]"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {isSubmitting ? 'Processing...' : 'Submit Return'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Items Available for Return</h3>
                <p className="text-muted-foreground">
                  All items in this sale have already been fully returned.
                </p>
                <div className="mt-4">
                  <Link href={`/sales/${sale?.id}`}>
                    <Button variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sale
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 