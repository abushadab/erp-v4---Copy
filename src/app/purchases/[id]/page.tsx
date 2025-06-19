"use client"

import * as React from "react"
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, Truck, Calendar, User, MapPin, FileText, CheckCircle, Clock, Box } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPurchaseById, getPurchaseTimeline, getPurchaseWithPayments, calculateNetPaymentAmount, calculatePaymentStatus, calculateCompletePaymentStatus, type PurchaseWithItems, type PurchaseEvent } from "@/lib/supabase/purchases"
import { PurchaseTimeline } from "@/components/PurchaseTimeline"
import PurchasePaymentHistory from "@/components/PurchasePaymentHistory"
import { toast } from "sonner"

interface PurchaseDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function PurchaseDetailsPage({ params }: PurchaseDetailsPageProps) {
  const router = useRouter()
  const resolvedParams = React.use(params)
  const [purchase, setPurchase] = React.useState<PurchaseWithItems & { 
    amount_paid?: number
    payment_status?: string
    payments?: any[]
  } | null>(null)
  const [timeline, setTimeline] = React.useState<PurchaseEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [timelineLoading, setTimelineLoading] = React.useState(true)
  
  const fetchPurchaseData = React.useCallback(async () => {
    try {
      setLoading(true)
      setTimelineLoading(true)
      
      // Fetch purchase with payments and timeline in parallel
      const [purchaseData, timelineData] = await Promise.all([
        getPurchaseWithPayments(resolvedParams.id),
        getPurchaseTimeline(resolvedParams.id)
      ])
      
      setPurchase(purchaseData)
      setTimeline(timelineData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load purchase details')
    } finally {
      setLoading(false)
      setTimelineLoading(false)
    }
  }, [resolvedParams.id])

  React.useEffect(() => {
    fetchPurchaseData()
  }, [fetchPurchaseData])

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Purchase Items Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        {/* Item Info Skeleton */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5" />
                            <div className="flex-1 min-w-0">
                              <Skeleton className="h-5 w-48 mb-1" />
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-20" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quantities Skeleton */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <Skeleton className="h-3 w-12 mb-1" />
                            <Skeleton className="h-6 w-8" />
                          </div>
                          <div className="text-center">
                            <Skeleton className="h-3 w-14 mb-1" />
                            <Skeleton className="h-6 w-8" />
                          </div>
                        </div>

                        {/* Price & Total Skeleton */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <Skeleton className="h-3 w-16 mb-1" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                          <div className="text-right">
                            <Skeleton className="h-3 w-10 mb-1" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </div>

                        {/* Status Skeleton */}
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Timeline Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-64" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment History Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton - Hidden on mobile, shown on lg+ screens */}
          <div className="hidden lg:block space-y-6">
            {/* Actions Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-16" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>

            {/* Order Summary Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </CardContent>
            </Card>

            {/* Purchase Details Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-40" />
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-5 w-36" />
                </div>
              </CardContent>
            </Card>
          </div>
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

  const getStatusColor = (status: PurchaseWithItems['status']) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800'
      case 'partially_received':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'partially_returned':
        return 'bg-orange-100 text-orange-800'
      case 'returned':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

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

  const getProgressInfo = () => {
    const totalOrdered = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalReceived = purchase.items.reduce((sum, item) => sum + item.received_quantity, 0)
    const totalReturned = purchase.items.reduce((sum, item) => sum + item.returned_quantity, 0)
    const progressPercentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0
    
    return {
      totalOrdered,
      totalReceived,
      totalReturned,
      progressPercentage
    }
  }

  const getItemsSummary = () => {
    const productCount = purchase.items.filter(item => item.item_type === 'product').length
    const packageCount = purchase.items.filter(item => item.item_type === 'package').length
    
    const parts = []
    if (productCount > 0) parts.push(`${productCount} product${productCount !== 1 ? 's' : ''}`)
    if (packageCount > 0) parts.push(`${packageCount} package${packageCount !== 1 ? 's' : ''}`)
    
    return parts.join(', ')
  }

  const progressInfo = getProgressInfo()

  // Check if there are any items remaining to receive
  const hasItemsToReceive = () => {
    return purchase.items.some(item => {
      const remainingToReceive = item.quantity - item.received_quantity
      return remainingToReceive > 0
    })
  }

  // Return window logic
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

  const returnWindowInfo = getReturnWindowInfo(purchase.purchase_date)
  const canProcessReturn = isWithinReturnWindow(purchase.purchase_date, purchase.status)

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
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Purchase Order {purchase.id}</h1>
              <p className="text-muted-foreground mt-2">
                Created on {new Date(purchase.purchase_date).toLocaleDateString('en-BD')} • {getItemsSummary()}
              </p>
            </div>
            <Badge variant="secondary" className={getStatusColor(purchase.status)}>
              {purchase.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
              <CardDescription>
                Products and packages included in this purchase order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchase.items.map((item, index) => {
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

                  const { baseName, variation } = getItemDisplayInfo(item.item_name)

                  return (
                    <div key={`${item.item_id}-${item.item_type}-${item.variation_id || 'simple'}-${index}`} 
                         className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-4">
                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {getItemTypeIcon(item.item_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1 truncate">{baseName}</h4>
                              <div className="flex items-center gap-2">
                                {getItemTypeBadge(item.item_type)}
                                {variation && (
                                  <Badge variant="outline" className="text-xs">
                                    {variation}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quantities */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Ordered</div>
                            <div className="font-semibold text-gray-900">{item.quantity}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Received</div>
                            <div className={`font-semibold ${
                              item.received_quantity === item.quantity 
                                ? 'text-green-600' 
                                : item.received_quantity > 0 
                                ? 'text-blue-600' 
                                : 'text-yellow-600'
                            }`}>
                              {item.received_quantity}
                            </div>
                          </div>
                          {item.returned_quantity > 0 && (
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Returned</div>
                              <div className="font-semibold text-red-600">
                                {item.returned_quantity}
                              </div>
                            </div>
                          )}
                          {item.returned_quantity > 0 && (
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Net</div>
                              <div className={`font-semibold ${
                                (item.received_quantity - item.returned_quantity) > 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {item.received_quantity - item.returned_quantity}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Price & Total */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Unit Price</div>
                            <div className="font-semibold text-gray-900">{formatCurrency(Number(item.purchase_price))}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Total</div>
                            <div className="font-semibold text-gray-900">{formatCurrency(Number(item.total))}</div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex-shrink-0">
                          <Badge variant="secondary" className={`text-xs ${
                            (() => {
                              const netReceived = item.received_quantity - item.returned_quantity;
                              
                              // If purchase is cancelled and nothing received
                              if (purchase.status === 'cancelled' && item.received_quantity === 0) {
                                return 'bg-red-100 text-red-800';
                              }
                              
                              // If all received items were returned AND the item was fully received originally
                              if (netReceived === 0 && item.received_quantity > 0 && item.received_quantity === item.quantity) {
                                return 'bg-red-100 text-red-800';
                              }
                              
                              // If all received items were returned BUT the item wasn't fully received originally
                              if (netReceived === 0 && item.received_quantity > 0 && item.received_quantity < item.quantity) {
                                return 'bg-yellow-100 text-yellow-800';
                              }
                              
                              // If fully received (accounting for returns)
                              if (netReceived === item.quantity) {
                                return 'bg-green-100 text-green-800';
                              }
                              
                              // If partially received (accounting for returns)
                              if (netReceived > 0) {
                                return 'bg-blue-100 text-blue-800';
                              }
                              
                              // If nothing received yet
                              return 'bg-yellow-100 text-yellow-800';
                            })()
                          }`}>
                            {(() => {
                              const netReceived = item.received_quantity - item.returned_quantity;
                              
                              // If purchase is cancelled and nothing received
                              if (purchase.status === 'cancelled' && item.received_quantity === 0) {
                                return 'Cancelled';
                              }
                              
                              // If all received items were returned AND the item was fully received originally
                              if (netReceived === 0 && item.received_quantity > 0 && item.received_quantity === item.quantity) {
                                return 'Returned';
                              }
                              
                              // If all received items were returned BUT the item wasn't fully received originally
                              if (netReceived === 0 && item.received_quantity > 0 && item.received_quantity < item.quantity) {
                                return 'Pending';
                              }
                              
                              // If fully received (accounting for returns)
                              if (netReceived === item.quantity) {
                                return 'Complete';
                              }
                              
                              // If partially received (accounting for returns)
                              if (netReceived > 0) {
                                return 'Partial';
                              }
                              
                              // If nothing received yet
                              return 'Pending';
                            })()}
                          </Badge>
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
                        <span className="font-medium text-gray-900">{purchase.items.length}</span> Items
                      </span>
                      <span>
                        <span className="font-medium text-gray-900">{progressInfo.totalOrdered}</span> Total Ordered
                      </span>
                      {/* Only show Received and Returned if they're not equal (to save space) */}
                      {progressInfo.totalReceived !== progressInfo.totalReturned && (
                        <>
                          <span>
                            <span className="font-medium text-gray-900">{progressInfo.totalReceived}</span> Total Received
                          </span>
                          {(purchase.status === 'partially_returned' || purchase.status === 'returned') && (
                            <span>
                              <span className="font-medium text-red-600">{progressInfo.totalReturned}</span> Total Returned
                            </span>
                          )}
                        </>
                      )}
                      {/* Show net received when received equals returned */}
                      {progressInfo.totalReceived === progressInfo.totalReturned && progressInfo.totalReceived > 0 && (
                        <span>
                          <span className="font-medium text-gray-600">{progressInfo.totalReceived - progressInfo.totalReturned}</span> Net Received
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Grand Total</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(Number(purchase.total_amount))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Summary */}
          {purchase.status === 'partially_received' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{progressInfo.totalReceived}/{progressInfo.totalOrdered} items received</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-black h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${progressInfo.progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-700">
                    {Math.round(progressInfo.progressPercentage)}% of items received
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Window Information */}
          {(purchase.status === 'received' || purchase.status === 'partially_received') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Return Window
                </CardTitle>
                <CardDescription>
                  30-day return window from purchase date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Return Deadline</div>
                    <div className="font-medium">
                      {returnWindowInfo.deadline.toLocaleDateString('en-BD')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Days Remaining</div>
                    <div className={`font-medium ${
                      returnWindowInfo.isExpired
                        ? 'text-red-600'
                        : returnWindowInfo.daysRemaining <= 3 
                          ? 'text-red-600' 
                          : returnWindowInfo.daysRemaining <= 7 
                            ? 'text-orange-600' 
                            : 'text-green-600'
                    }`}>
                      {returnWindowInfo.isExpired ? 'Expired' : `${returnWindowInfo.daysRemaining} days`}
                    </div>
                  </div>
                </div>
                
                {!returnWindowInfo.isExpired && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Window Progress</span>
                      <span>{Math.round(((30 - returnWindowInfo.daysRemaining) / 30) * 100)}%</span>
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
                          width: `${Math.min(((30 - returnWindowInfo.daysRemaining) / 30) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className={`p-3 rounded-lg ${
                  returnWindowInfo.isExpired 
                    ? 'bg-red-50 border border-red-200' 
                    : returnWindowInfo.daysRemaining <= 7
                      ? 'bg-orange-50 border border-orange-200'
                      : 'bg-green-50 border border-green-200'
                }`}>
                  <p className={`text-sm ${
                    returnWindowInfo.isExpired 
                      ? 'text-red-700' 
                      : returnWindowInfo.daysRemaining <= 7
                        ? 'text-orange-700'
                        : 'text-green-700'
                  }`}>
                    {returnWindowInfo.isExpired 
                      ? '⚠️ The return window has expired. Returns are no longer available for this purchase.'
                      : canProcessReturn
                        ? '✅ You can still process returns for received items.'
                        : '⏳ Returns will be available once items are received.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline */}
          <PurchaseTimeline events={timeline} isLoading={timelineLoading} />

          {/* Payment History - Only show for non-pending purchases */}
          {purchase.status !== 'pending' && (
            <PurchasePaymentHistory
              purchaseId={purchase.id}
              supplierName={purchase.supplier_name}
              totalAmount={Number(purchase.total_amount)}
              amountPaid={Number(purchase.amount_paid || 0)}
              paymentStatus={purchase.payment_status || 'unpaid'}
              purchase={purchase}
              payments={purchase.payments || []}
              timeline={timeline}
              onPaymentUpdate={fetchPurchaseData}
            />
          )}

          {/* Notes */}
          {purchase.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{purchase.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {purchase.status !== 'cancelled' && purchase.status !== 'returned' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {purchase.status !== 'received' && hasItemsToReceive() ? (
                  <Link href={`/purchases/${purchase.id}/receipt`} className="block">
                    <Button className="w-full bg-black border-black text-white hover:bg-gray-800 cursor-pointer">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Update Receipt
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed opacity-50" 
                      disabled
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Update Receipt
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {purchase.status === 'received' 
                        ? 'All items fully received'
                        : !hasItemsToReceive()
                          ? 'No items remaining to receive'
                          : `Purchase ${purchase.status}`
                      }
                    </p>
                  </div>
                )}
                
                {canProcessReturn ? (
                  <Link href={`/purchases/${purchase.id}/process-return`} className="block">
                    <Button variant="outline" className="w-full border-gray-300 bg-background cursor-pointer">
                      <Clock className="mr-2 h-4 w-4" />
                      Process Return
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-300 bg-background cursor-not-allowed opacity-50" 
                      disabled
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Process Return
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {purchase.status !== 'received' && purchase.status !== 'partially_received' && purchase.status !== 'partially_returned'
                        ? 'No items received yet'
                        : returnWindowInfo.isExpired
                          ? 'Return window expired'
                          : 'Returns not available'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Completed Purchase Message */}
          {purchase.status === 'received' && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Complete</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    This purchase has been completed. All items have been received.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Total Items:</span>
                <span className="font-medium">{purchase.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Products:</span>
                <span className="font-medium">{purchase.items.filter(item => item.item_type === 'product').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Packages:</span>
                <span className="font-medium">{purchase.items.filter(item => item.item_type === 'package').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Quantity:</span>
                <span className="font-medium">{progressInfo.totalOrdered}</span>
              </div>
              {purchase.status !== 'pending' && (
                <div className="flex justify-between">
                  <span className="text-sm">Received:</span>
                  <span className="font-medium text-green-600">{progressInfo.totalReceived}</span>
                </div>
              )}
              {(purchase.status === 'partially_returned' || purchase.status === 'returned') && (
                <div className="flex justify-between">
                  <span className="text-sm">Returned:</span>
                  <span className="font-medium text-red-600">{progressInfo.totalReturned}</span>
                </div>
              )}
                              <div className="border-t pt-4 space-y-2">
                {(() => {
                  const amountPaid = Number(purchase.amount_paid || 0)
                  const completeStatus = calculateCompletePaymentStatus(purchase, amountPaid, [], timeline)
                  
                  // Helper function to get badge color classes
                  const getBadgeColorClasses = (color: string) => {
                    switch (color) {
                      case 'green':
                        return 'bg-green-100 text-green-800'
                      case 'yellow':
                        return 'bg-yellow-100 text-yellow-800'
                      case 'red':
                        return 'bg-red-100 text-red-800'
                      case 'orange':
                        return 'bg-orange-100 text-orange-800'
                      case 'purple':
                        return 'bg-purple-100 text-purple-800'
                      default:
                        return 'bg-gray-100 text-gray-800'
                    }
                  }
                  
                  return (
                    <>
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Original Amount:</span>
                        <span>{formatCurrency(purchase.total_amount)}</span>
                      </div>
                      
                      {/* Total Returned Amount */}
                      {completeStatus.hasReturns && (
                        <div className="flex justify-between text-sm">
                          <span>Total Returned:</span>
                          <span className="font-medium text-orange-600">-{formatCurrency(completeStatus.returnAmount)}</span>
                        </div>
                      )}
                      
                      {amountPaid > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Amount Paid:</span>
                          <span className="font-medium text-green-600">{formatCurrency(amountPaid)}</span>
                        </div>
                      )}
                      
                      {/* Payment Status Badge */}
                      {amountPaid > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span>Payment Status:</span>
                          <Badge variant="secondary" className={`text-xs ${getBadgeColorClasses(completeStatus.displayBadgeColor)}`}>
                            {completeStatus.displayStatus}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Payment Progress Bar */}
                      {amountPaid > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Payment Progress</span>
                            <span>{completeStatus.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                completeStatus.progressPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(completeStatus.progressPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Remaining Amount */}
                      {completeStatus.remainingAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Remaining:</span>
                          <span className="font-medium text-red-600">{formatCurrency(completeStatus.remainingAmount)}</span>
                      </div>
                      )}
                      
                      {/* Returns & Refunds Section */}
                      {completeStatus.showRefundSection && (
                        <div className="border-t pt-3 space-y-2">
                          <h4 className="text-sm font-medium text-gray-900">Returns & Refunds</h4>
                          
                          <div className="flex justify-between text-sm">
                            <span>Items Returned:</span>
                            <span className="font-medium text-orange-600">{formatCurrency(completeStatus.returnAmount)}</span>
                          </div>
                          
                          {completeStatus.refundDue > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Refund Due:</span>
                              <span className="font-medium text-purple-600">{formatCurrency(completeStatus.refundDue)}</span>
                            </div>
                          )}
                          
                          {completeStatus.refundDue > 0 && (
                            <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded mt-2">
                              💡 Refund of {formatCurrency(completeStatus.refundDue)} is due for returned items
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* True Overpayment */}
                      {completeStatus.overpaidAmount > 0 && !completeStatus.hasReturns && (
                        <div className="flex justify-between text-sm">
                          <span>Overpaid Amount:</span>
                          <span className="font-medium text-purple-600">{formatCurrency(completeStatus.overpaidAmount)}</span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Purchase Details */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Supplier</span>
                </div>
                <p className="font-medium">{purchase.supplier_name}</p>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Delivery Location</span>
                </div>
                <p className="font-medium">{purchase.warehouse_name}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 