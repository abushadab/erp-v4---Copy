"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw, Calendar, AlertTriangle, Package, Box } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { getPurchaseById, processPurchaseReturn, type PurchaseWithItems } from "@/lib/supabase/purchases"
import { toast } from "sonner"

interface ProcessReturnPageProps {
  params: Promise<{
    id: string
  }>
}

interface ReturnItem {
  itemId: string
  itemType: 'product' | 'package'
  itemName: string
  maxReturnQuantity: number // received_quantity - returned_quantity
  returnQuantity: number
  purchasePrice: number
  variationId?: string
}

interface PurchaseReturnForm {
  reason: string
  date: string
  items: ReturnItem[]
}

export default function ProcessReturnPage({ params }: ProcessReturnPageProps) {
  const router = useRouter()
  const resolvedParams = React.use(params)
  const [purchase, setPurchase] = React.useState<PurchaseWithItems | null>(null)
  const [loading, setLoading] = React.useState(true)
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  const [form, setForm] = React.useState<PurchaseReturnForm>({
    reason: '',
    date: new Date().toISOString().split('T')[0],
    items: []
  })

  // Helper functions
  const getStatusColor = (status: PurchaseWithItems['status']) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'partially_received':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'partially_returned':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200'
      case 'returned':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  const isWithinReturnWindow = (purchaseDate: string, status: PurchaseWithItems['status']) => {
    // Allow returns for received, partially received, or partially returned orders
    if (status !== 'received' && status !== 'partially_received' && status !== 'partially_returned') {
      return false
    }

    const purchase = new Date(purchaseDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - purchase.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays <= 30
  }

  const getReturnWindowInfo = (purchaseDate: string) => {
    const purchase = new Date(purchaseDate)
    const returnDeadline = new Date(purchase)
    returnDeadline.setDate(returnDeadline.getDate() + 30)
    
    const today = new Date()
    const daysRemaining = Math.ceil((returnDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      deadline: returnDeadline,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired: daysRemaining <= 0
    }
  }

  React.useEffect(() => {
    const fetchPurchase = async () => {
      try {
        setLoading(true)
        const purchaseData = await getPurchaseById(resolvedParams.id)
        setPurchase(purchaseData)
        
        if (purchaseData) {
          // Initialize return items from purchase items
          const returnItems: ReturnItem[] = purchaseData.items.map(item => ({
            itemId: item.id,
            itemType: item.item_type,
            itemName: item.item_name,
            maxReturnQuantity: item.received_quantity - item.returned_quantity, // Available to return
            returnQuantity: 0,
            purchasePrice: Number(item.purchase_price),
            variationId: item.variation_id || undefined
          }))
          setForm(prev => ({ ...prev, items: returnItems }))
        }
      } catch (error) {
        console.error('Error fetching purchase:', error)
        toast.error('Failed to load purchase details')
      } finally {
        setLoading(false)
      }
    }

    fetchPurchase()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading purchase details...</p>
        </div>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Purchase Order Not Found</h1>
          <p className="text-muted-foreground mb-6">The requested purchase order could not be found.</p>
          <Link href="/purchases">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Check return window and status eligibility
  const returnWindowInfo = getReturnWindowInfo(purchase.purchase_date)
  const isReturnAllowed = isWithinReturnWindow(purchase.purchase_date, purchase.status)

  if (!isReturnAllowed) {
    const isStatusIssue = purchase.status !== 'received' && purchase.status !== 'partially_received' && purchase.status !== 'partially_returned'
    const isTimeIssue = returnWindowInfo.isExpired && !isStatusIssue

    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Return Not Available</h1>
          
          {isStatusIssue ? (
            <div className="mb-6">
              <p className="text-muted-foreground mb-2">
                Returns can only be processed for received, partially received, or partially returned orders.
              </p>
              <div className="text-sm">
                Current status: <Badge className={getStatusColor(purchase.status)}>{purchase.status.replace('_', ' ')}</Badge>
              </div>
            </div>
          ) : isTimeIssue ? (
            <div className="mb-6">
              <p className="text-muted-foreground mb-2">
                The 30-day return window for this purchase has expired.
              </p>
              <div className="text-sm text-muted-foreground">
                <p>Purchase Date: {new Date(purchase.purchase_date).toLocaleDateString('en-BD')}</p>
                <p>Return Deadline: {returnWindowInfo.deadline.toLocaleDateString('en-BD')}</p>
                <p className="text-red-600 font-medium mt-2">
                  Return window expired {Math.abs(returnWindowInfo.daysRemaining)} days ago
                </p>
              </div>
            </div>
          ) : null}
          
          <Link href={`/purchases/${purchase.id}`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchase Details
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Helper function to update return quantities
  const updateReturnQuantity = (itemId: string, variationId: string | undefined, quantity: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.itemId === itemId && item.variationId === variationId
          ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.maxReturnQuantity)) }
          : item
      )
    }))
  }

  // Helper functions for UI
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

  const getReturnableItems = () => {
    return form.items.filter(item => item.maxReturnQuantity > 0)
  }

  const validateForm = () => {
    const newErrors: string[] = []

    if (!form.reason.trim()) newErrors.push('Please provide a reason for the return')
    if (!form.date) newErrors.push('Please select a return date')
    
    const hasReturnItems = form.items.some(item => item.returnQuantity > 0)
    if (!hasReturnItems) newErrors.push('Please specify quantities for at least one item')

    // Validate individual item quantities
    const invalidQuantities = form.items.filter(item => 
      item.returnQuantity > item.maxReturnQuantity || item.returnQuantity < 0
    )
    if (invalidQuantities.length > 0) {
      newErrors.push('Return quantities cannot exceed available quantities or be negative')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      // Filter items with return quantities > 0
      const itemsToReturn = form.items
        .filter(item => item.returnQuantity > 0)
        .map(item => ({
          item_id: item.itemId,
          return_quantity: item.returnQuantity
        }))

      if (itemsToReturn.length === 0) {
        setErrors(['Please specify quantities for at least one item to return'])
        return
      }

      const returnData = {
        purchase_id: purchase.id,
        return_reason: form.reason,
        return_date: form.date,
        returned_by: 'admin', // In a real app, this would come from the authenticated user
        items: itemsToReturn
      }

      console.log('Submitting return data:', returnData)

      await processPurchaseReturn(purchase.id, returnData)
      
      toast.success('Purchase return processed successfully!')
      
      // Redirect back to purchase details
      router.push(`/purchases/${purchase.id}`)
      
    } catch (error) {
      console.error('Error processing return:', error)
      
      // More detailed error handling
      let errorMessage = 'Failed to process purchase return. Please try again.'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error details:', error.stack)
      }
      
      toast.error(errorMessage)
      setErrors([errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <motion.div
      className="container mx-auto px-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Link href={`/purchases/${purchase.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Details
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Process Return - {purchase.id}</h1>
              <p className="text-muted-foreground mt-2">
                Process return for purchase items • {getReturnableItems().length} item{getReturnableItems().length !== 1 ? 's' : ''} available
              </p>
            </div>
            <Badge variant="secondary" className={getStatusColor(purchase.status)}>
              {purchase.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Return Items Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Select Items to Return
                </CardTitle>
                <CardDescription>
                  Choose quantities for items you want to return. You can only return received items that haven't been returned yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getReturnableItems().map((item, index) => {
                    // Extract base name and variation details
                    const getItemDisplayInfo = (itemName: string) => {
                      if (itemName.includes(' (') && itemName.includes(')')) {
                        const lastParenIndex = itemName.lastIndexOf(' (')
                        const baseName = itemName.substring(0, lastParenIndex)
                        const variation = itemName.substring(lastParenIndex + 2, itemName.length - 1)
                        return { baseName, variation }
                      }
                      return { baseName: itemName, variation: null }
                    }

                    const { baseName, variation } = getItemDisplayInfo(item.itemName)

                    return (
                      <div key={`${item.itemId}-${item.variationId || 'simple'}-${index}`} 
                           className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                        {/* Item Info */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {getItemTypeIcon(item.itemType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1 truncate">{baseName}</h4>
                              <div className="flex items-center gap-2">
                                {getItemTypeBadge(item.itemType)}
                                {variation && (
                                  <Badge variant="outline" className="text-xs">
                                    {variation}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Available to Return</div>
                            <div className="font-semibold text-gray-900">{item.maxReturnQuantity}</div>
                          </div>
                        </div>

                        {/* Return Quantity Input */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Unit Price</div>
                              <div className="font-semibold text-gray-900">{formatCurrency(item.purchasePrice)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Return Total</div>
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(item.returnQuantity * item.purchasePrice)}
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <Label htmlFor={`qty-${index}`} className="text-xs text-muted-foreground block mb-1">
                              Return Quantity
                            </Label>
                            <Input
                              id={`qty-${index}`}
                              type="number"
                              min="0"
                              max={item.maxReturnQuantity}
                              value={item.returnQuantity}
                              onChange={(e) => updateReturnQuantity(item.itemId, item.variationId, parseInt(e.target.value) || 0)}
                              className="w-20 h-9 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {getReturnableItems().length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Items Available for Return</h3>
                      <p className="text-sm text-muted-foreground">
                        All items have either not been received yet or have already been returned.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Return Information */}
            <Card>
              <CardHeader>
                <CardTitle>Return Details</CardTitle>
                <CardDescription>
                  Provide additional information about this return.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reason">Return Reason *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe the reason for returning these items..."
                    value={form.reason}
                    onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="min-h-20"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="date">Return Date *</Label>
                  <DatePicker
                    date={form.date ? new Date(form.date) : undefined}
                    onDateChange={(date) => {
                      if (date) {
                        // Format date as YYYY-MM-DD without timezone conversion
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        const formattedDate = `${year}-${month}-${day}`
                        setForm(prev => ({ ...prev, date: formattedDate }))
                      } else {
                        setForm(prev => ({ ...prev, date: '' }))
                      }
                    }}
                    placeholder="Select return date"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Info */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Purchase ID:</span>
                  <span className="font-medium">{purchase.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Supplier:</span>
                  <span className="font-medium text-sm">{purchase.supplier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Purchase Date:</span>
                  <span className="font-medium text-sm">
                    {new Date(purchase.purchase_date).toLocaleDateString('en-BD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(Number(purchase.total_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Items Count:</span>
                  <span className="font-medium">{purchase.items.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Return Window Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Return Window
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Return Deadline:</span>
                  <span className="font-medium text-sm">
                    {returnWindowInfo.deadline.toLocaleDateString('en-BD')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Days Remaining:</span>
                  <span className={`font-medium text-sm ${
                    returnWindowInfo.daysRemaining <= 3 
                      ? 'text-red-600' 
                      : returnWindowInfo.daysRemaining <= 7 
                        ? 'text-orange-600' 
                        : 'text-green-600'
                  }`}>
                    {returnWindowInfo.daysRemaining} days
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Time Remaining</span>
                    <span>{Math.round((returnWindowInfo.daysRemaining / 30) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        returnWindowInfo.daysRemaining <= 3 
                          ? 'bg-red-500' 
                          : returnWindowInfo.daysRemaining <= 7 
                            ? 'bg-orange-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.max((returnWindowInfo.daysRemaining / 30) * 100, 0)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {returnWindowInfo.daysRemaining <= 7 && (
                  <Alert className={`border-${returnWindowInfo.daysRemaining <= 3 ? 'red' : 'orange'}-200 bg-${returnWindowInfo.daysRemaining <= 3 ? 'red' : 'orange'}-50`}>
                    <AlertTriangle className={`h-4 w-4 text-${returnWindowInfo.daysRemaining <= 3 ? 'red' : 'orange'}-600`} />
                    <AlertDescription className={`text-${returnWindowInfo.daysRemaining <= 3 ? 'red' : 'orange'}-700 text-sm`}>
                      {returnWindowInfo.daysRemaining <= 3 
                        ? 'Return window expires soon! Process your return immediately.'
                        : 'Return window expires within a week. Plan your return accordingly.'
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Return Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Return Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Items Available:</span>
                  <span className="font-medium">{getReturnableItems().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Items Selected:</span>
                  <span className="font-medium text-blue-600">
                    {form.items.filter(item => item.returnQuantity > 0).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Quantity:</span>
                  <span className="font-medium">
                    {form.items.reduce((sum, item) => sum + item.returnQuantity, 0)}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Return Amount:</span>
                    <span className="text-red-600">
                      {formatCurrency(form.items.reduce((sum, item) => sum + (item.returnQuantity * item.purchasePrice), 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full bg-black border-black text-white hover:bg-gray-800"
                  disabled={isLoading || form.items.every(item => item.returnQuantity === 0)}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Process Return
                    </>
                  )}
                </Button>
                
                {form.items.every(item => item.returnQuantity === 0) && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Select quantities to enable return processing
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </form>
    </motion.div>
  )
} 