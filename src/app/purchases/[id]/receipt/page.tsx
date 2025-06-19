"use client"

import * as React from "react"
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, CheckCircle, AlertTriangle, Save, X, RotateCcw, Box } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getPurchaseById, updatePurchaseReceipt, type PurchaseWithItems } from "@/lib/supabase/purchases"
import { logPurchaseUpdate } from "@/lib/supabase/activity-logger"
import { toast } from "sonner"

interface UpdateReceiptPageProps {
  params: Promise<{
    id: string
  }>
}

interface ReceiptItem {
  itemId: string
  itemType: 'product' | 'package'
  itemName: string
  orderedQuantity: number
  previouslyReceived: number
  returnedQuantity: number
  newReceivedQuantity: number | null
  purchasePrice: number
  total: number
  variationId?: string
}

export default function UpdateReceiptPage({ params }: UpdateReceiptPageProps) {
  const router = useRouter()
  const resolvedParams = React.use(params)
  const [purchase, setPurchase] = React.useState<PurchaseWithItems | null>(null)
  const [loading, setLoading] = React.useState(true)
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  const [notes, setNotes] = React.useState('')
  const [receiptItems, setReceiptItems] = React.useState<ReceiptItem[]>([])
  const [hasUserMadeChanges, setHasUserMadeChanges] = React.useState(false)

  // Enhanced deduplication protection against React Strict Mode
  const initialLoadTriggered = React.useRef(false)

  const fetchPurchase = React.useCallback(async () => {
    try {
      console.log('🔄 Fetching purchase data for:', resolvedParams.id)
      setLoading(true)
      
      // The getPurchaseById function now uses the global apiCache for deduplication
      const purchaseData = await getPurchaseById(resolvedParams.id)
      
      console.log('✅ Purchase data fetched successfully')
      setPurchase(purchaseData)
      
      if (purchaseData) {
        const items: ReceiptItem[] = purchaseData.items.map(item => {
          const currentNetReceived = item.received_quantity - item.returned_quantity
          return {
            itemId: item.item_id,
            itemType: item.item_type,
            itemName: item.item_name,
            orderedQuantity: item.quantity,
            previouslyReceived: item.received_quantity,
            returnedQuantity: item.returned_quantity,
            newReceivedQuantity: null, // empty by default
            purchasePrice: Number(item.purchase_price),
            total: Number(item.total),
            variationId: item.variation_id || undefined
          }
        })
        setReceiptItems(items)
      }
    } catch (error) {
      console.error('❌ Error fetching purchase:', error)
      toast.error('Failed to load purchase details')
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id])

  // Enhanced useEffect with deduplication protection
  React.useEffect(() => {
    console.log('🚀 Receipt page useEffect triggered')
    
    // Double protection against React Strict Mode
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering purchase fetch')
      initialLoadTriggered.current = true
      fetchPurchase()
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, []) // Empty dependency array to run only on mount

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Receipt Items Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      {/* First Row - Item Info and Status */}
                      <div className="flex items-center justify-between mb-3">
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
                        <Skeleton className="h-6 w-20" />
                      </div>

                      {/* Progress Bar Skeleton */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>

                      {/* Second Row - Quantities and Prices */}
                      <div className="flex items-center justify-between gap-4">
                        {/* Prices Skeleton */}
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <Skeleton className="h-3 w-16 mb-1" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                          <div className="text-center">
                            <Skeleton className="h-3 w-10 mb-1" />
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </div>

                        {/* Quantities Skeleton */}
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <Skeleton className="h-3 w-12 mb-1" />
                            <Skeleton className="h-6 w-8" />
                          </div>
                          <div className="text-center">
                            <Skeleton className="h-3 w-20 mb-1" />
                            <Skeleton className="h-9 w-20" />
                          </div>
                          <div className="text-center">
                            <Skeleton className="h-3 w-16 mb-1" />
                            <Skeleton className="h-6 w-8" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary Card Skeleton */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-3 w-16 mb-1" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Skeleton - Hidden on mobile, shown on lg+ screens */}
          <div className="hidden lg:block space-y-6">
            {/* Quick Actions Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>

            {/* Overall Progress Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar Skeleton */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>
                
                {/* Receipt Details Grid Skeleton */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <Skeleton className="h-3 w-20 mb-1" />
                        <Skeleton className="h-6 w-8 mb-1" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receipt Summary Card Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
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
                
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Card Skeleton */}
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-40 mx-auto mt-2" />
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

  // If purchase is already fully received, redirect to details page
  if (purchase.status === 'received') {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Purchase Already Complete</h1>
          <p className="text-muted-foreground mb-6">
            This purchase has been fully received and cannot be updated.
          </p>
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

  // Check if there are any items remaining to receive
  const hasItemsToReceive = purchase.items.some(item => {
    const remainingToReceive = item.quantity - item.received_quantity
    return remainingToReceive > 0
  })

  // If no items remaining to receive, redirect to details page
  if (!hasItemsToReceive) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">All Items Already Received</h1>
          <p className="text-muted-foreground mb-6">
            All items for this purchase have been fully received. No receipt updates are needed.
          </p>
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

  // If purchase is cancelled or returned, show appropriate message
  if (purchase.status === 'cancelled' || purchase.status === 'returned') {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Cannot Update Receipt</h1>
          <p className="text-muted-foreground mb-6">
            This purchase has been {purchase.status} and cannot be updated.
          </p>
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

  const updateReceivedQuantity = (itemId: string, itemType: 'product' | 'package', variationId: string | undefined, quantity: number) => {
    setReceiptItems(prev => 
      prev.map(item => {
        if (item.itemId === itemId && item.itemType === itemType && item.variationId === variationId) {
          // If empty or invalid input, set to null
          if (isNaN(quantity) || quantity === 0) {
            return { ...item, newReceivedQuantity: null };
          }
          
          // Calculate new total received quantity (cumulative)
          const newTotalReceived = item.previouslyReceived + quantity;
          
          // Validate against constraints
          // Minimum: cannot go below returned quantity (database constraint)
          const minAllowed = item.returnedQuantity;
          // Maximum: cannot exceed ordered quantity
          const maxAllowed = item.orderedQuantity;
          
          // Enforce limits
          const validatedQuantity = Math.max(minAllowed, Math.min(maxAllowed, newTotalReceived));
          
          return { ...item, newReceivedQuantity: validatedQuantity };
        }
        return item;
      })
    );
    setHasUserMadeChanges(true);
  }

  const markAllAsReceived = () => {
    setReceiptItems(prev => 
      prev.map(item => ({
        ...item,
        newReceivedQuantity: item.orderedQuantity
      }))
    )
    setHasUserMadeChanges(true)
  }

  const markAllAsCancelled = () => {
    setReceiptItems(prev => 
      prev.map(item => ({
        ...item,
        newReceivedQuantity: 0
      }))
    )
    setHasUserMadeChanges(true)
  }

  const resetToOriginal = () => {
    setReceiptItems(prev => 
      prev.map(item => ({
        ...item,
        newReceivedQuantity: null  // Reset to original empty state
      }))
    )
    setHasUserMadeChanges(false)
  }

  const validateReceipt = () => {
    const newErrors: string[] = []

    // Check if at least one item has been updated
    const hasValidUpdates = receiptItems.some(item => 
      item.newReceivedQuantity !== null && item.newReceivedQuantity > 0
    )
    
    if (!hasValidUpdates) {
      newErrors.push('Please enter quantities for at least one item')
    }

    // Check for invalid quantities - max is ordered quantity
    const invalidQuantities = receiptItems.filter(item => {
      if (item.newReceivedQuantity === null) return false
      return item.newReceivedQuantity > item.orderedQuantity || item.newReceivedQuantity < 0
    })
    
    if (invalidQuantities.length > 0) {
      newErrors.push('Received quantities cannot exceed ordered quantities or be negative')
    }

    // Check that quantities respect database constraints
    const belowMinimumQuantities = receiptItems.filter(item => {
      if (item.newReceivedQuantity === null) return false
      // Minimum allowed is returned quantity (database constraint)
      return item.newReceivedQuantity < item.returnedQuantity
    })
    
    if (belowMinimumQuantities.length > 0) {
      newErrors.push('Received quantities cannot be less than returned quantities')
    }

    // Check if user has made any changes
    if (!hasUserMadeChanges) {
      newErrors.push('Please make at least one change to update the receipt')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateReceipt()) return

    setIsLoading(true)
    
    try {
      // Update each changed item in the database - only items with valid quantities
      // Consider it a change if: different from previous OR has returns (meaningful re-receipt)
      const changedItems = receiptItems.filter(item => {
        if (item.newReceivedQuantity === null) return false
        
        // Always consider it a change if different from previous
        if (item.newReceivedQuantity !== item.previouslyReceived) return true
        
        // Also consider it a change if there are returns and user has entered a quantity
        // This allows "re-receiving" items that were returned
        if (item.returnedQuantity > 0 && hasUserMadeChanges) return true
        
        return false
      })

      console.log('Changed items:', changedItems)
      console.log('All receipt items:', receiptItems)
      console.log('Purchase items:', purchase.items)

      if (changedItems.length === 0) {
        toast.error('No changes detected to update')
        setIsLoading(false)
        return
      }

      // Prepare item updates for the wrapper function
      const itemUpdates = changedItems.map(item => {
        // Find the database item ID based on purchase_id, item_id, item_type, and variation_id
        // Handle null/undefined variation_id comparison properly
        const dbItem = purchase.items.find(dbItem => 
          dbItem.item_id === item.itemId && 
          dbItem.item_type === item.itemType &&
          (dbItem.variation_id || null) === (item.variationId || null)
        )
        
        console.log('Looking for item:', { 
          itemId: item.itemId, 
          itemType: item.itemType, 
          variationId: item.variationId,
          newQuantity: item.newReceivedQuantity 
        })
        console.log('Found DB item:', dbItem)
        
        if (!dbItem) {
          console.error('Could not find database item for:', item)
          throw new Error(`Could not find database item for ${item.itemName}`)
        }

        return {
          itemId: dbItem.id,
          receivedQuantity: item.newReceivedQuantity as number // Already filtered to be non-null
        }
      })

      // Use the new wrapper function that includes timeline logging
      console.log('Updating purchase receipt with timeline logging...')
      await updatePurchaseReceipt(purchase.id, itemUpdates)

      // Log the purchase receipt update activity
      await logPurchaseUpdate(
        purchase.id,
        purchase.supplier_name,
        { 
          action: 'receipt_update',
          items_updated: changedItems.length 
        },
        { 
          updated_items: changedItems.map(item => ({
            item_name: item.itemName,
            previous_received: item.previouslyReceived,
            new_received: item.newReceivedQuantity
          }))
        }
      ).catch(error => {
        console.warn('Failed to log receipt update:', error)
      })

      toast.success(`Successfully updated ${changedItems.length} item(s)!`)
      
      // Redirect back to purchase details
      router.push(`/purchases/${purchase.id}`)
      
    } catch (error) {
      console.error('Error updating receipt:', error)
      toast.error('Failed to update receipt. Please try again.')
      setErrors(['Failed to update receipt. Please try again.'])
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: PurchaseWithItems['status']) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800'
      case 'partially_received':
        return 'bg-blue-100 text-blue-800'
      case 'partially_returned':
        return 'bg-orange-100 text-orange-800'
      case 'returned':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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

  const getTotalProgress = () => {
    // Total ordered is the original order quantities
    const totalOrdered = receiptItems.reduce((sum, item) => sum + item.orderedQuantity, 0)
    // Total received will be the new total (cumulative)
    const totalReceived = receiptItems.reduce((sum, item) => sum + (item.newReceivedQuantity || item.previouslyReceived), 0)
    
    // Check if user has made changes and all items are now 0
    const allCancelled = hasUserMadeChanges && receiptItems.every(item => (item.newReceivedQuantity || item.previouslyReceived) === 0)
    
    // Check if no changes have been made and all items are still at their original values
    const allPending = !hasUserMadeChanges && receiptItems.every(item => 
      item.newReceivedQuantity === null
    )
    
    return { totalOrdered, totalReceived, allCancelled, allPending }
  }

  const getItemsSummary = () => {
    const productCount = receiptItems.filter(item => item.itemType === 'product').length
    const packageCount = receiptItems.filter(item => item.itemType === 'package').length
    
    const parts = []
    if (productCount > 0) parts.push(`${productCount} product${productCount !== 1 ? 's' : ''}`)
    if (packageCount > 0) parts.push(`${packageCount} package${packageCount !== 1 ? 's' : ''}`)
    
    return parts.join(', ')
  }

  const progress = getTotalProgress()

  const getItemStatus = (item: ReceiptItem) => {
    // Current total received (either new total or previous total)
    const totalReceived = item.newReceivedQuantity !== null ? item.newReceivedQuantity : item.previouslyReceived;
    const netReceived = totalReceived - item.returnedQuantity;
    
    // If user has set quantity to 0, it's cancelled
    if (item.newReceivedQuantity === 0) {
      return { color: 'bg-red-100 text-red-800', text: 'cancelled' };
    }
    
    // If total received equals ordered quantity, it's complete
    if (totalReceived === item.orderedQuantity) {
      return { color: 'bg-green-100 text-green-800', text: 'complete' };
    }
    
    // If user has made changes and increased quantity
    if (item.newReceivedQuantity !== null && item.newReceivedQuantity > item.previouslyReceived) {
      return { color: 'bg-blue-100 text-blue-800', text: 'additional received' };
    }
    
    // If user has made changes but quantity is same or less
    if (item.newReceivedQuantity !== null) {
      return { color: 'bg-blue-100 text-blue-800', text: 'updated' };
    }
    
    // If net received is 0 (either nothing received or all returned), it's pending
    if (netReceived === 0) {
      return { color: 'bg-yellow-100 text-yellow-800', text: 'pending' };
    }
    
    // If fully received relative to effective order size
    if (netReceived === (item.orderedQuantity - item.returnedQuantity)) {
      return { color: 'bg-green-100 text-green-800', text: 'received' };
    }
    
    // If partially received with returns
    if (netReceived > 0 && item.returnedQuantity > 0) {
      return { color: 'bg-orange-100 text-orange-800', text: 'partially returned' };
    }
    
    // If partially received without returns
    if (netReceived > 0) {
      return { color: 'bg-blue-100 text-blue-800', text: 'partially received' };
    }
    
    // Default is pending
    return { color: 'bg-yellow-100 text-yellow-800', text: 'pending' };
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/purchases/${purchase.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Details
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Update Receipt - {purchase.id}</h1>
              <p className="text-muted-foreground mt-2">
                Update received quantities for products and packages • {getItemsSummary()}
              </p>
            </div>
            <Badge variant="secondary" className={getStatusColor(purchase.status)}>
              {purchase.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Receipt Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Update Item Receipts
                </CardTitle>
                <CardDescription>
                  Enter the received quantities for each product and package
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {receiptItems.map((item, index) => {
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

                    const itemStatus = getItemStatus(item)

                    return (
                      <div key={`${item.itemId}-${item.itemType}-${item.variationId || 'simple'}-${index}`} 
                           className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                        {/* First Row - Item Info and Status */}
                        <div className="flex items-center justify-between mb-3">
                          {/* Item Info */}
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

                          {/* Status */}
                          <div className="flex-shrink-0">
                            <Badge variant="secondary" className={itemStatus.color}>
                              {itemStatus.text}
                            </Badge>
                          </div>
                        </div>

                        {/* Progress Bar for Partial Receipts */}
                        {item.orderedQuantity > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Receipt Progress</span>
                              <span>{item.newReceivedQuantity || 0}/{item.orderedQuantity - item.returnedQuantity} ({Math.round(((item.newReceivedQuantity || 0) / (item.orderedQuantity - item.returnedQuantity)) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  item.newReceivedQuantity === (item.orderedQuantity - item.returnedQuantity)
                                    ? 'bg-green-500' 
                                    : (item.newReceivedQuantity || 0) > 0 
                                    ? 'bg-blue-500' 
                                    : 'bg-gray-300'
                                }`}
                                style={{ width: `${(item.newReceivedQuantity || 0) > 0 ? Math.max(0, ((item.newReceivedQuantity || 0) / (item.orderedQuantity - item.returnedQuantity)) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Second Row - Quantities and Prices */}
                        <div className="flex items-center justify-between gap-4">
                          {/* Prices */}
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Unit Price</div>
                              <div className="font-semibold text-gray-900">{formatCurrency(item.purchasePrice)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Total</div>
                              <div className="font-semibold text-gray-900">{formatCurrency(item.total)}</div>
                            </div>
                          </div>

                          {/* Quantities */}
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Ordered</div>
                              <div className="font-semibold text-gray-900">{item.orderedQuantity}</div>
                            </div>
                            {item.returnedQuantity > 0 && (
                            <div className="text-center">
                                <div className="text-xs text-muted-foreground mb-1">Returned</div>
                                <div className="font-medium text-red-600">
                                  {item.returnedQuantity}
                              </div>
                              </div>
                            )}
                            <div className="text-center">
                              <Label htmlFor={`qty-${index}`} className="text-xs text-muted-foreground block mb-1">
                                Additional Qty
                              </Label>
                              <Input
                                id={`qty-${index}`}
                                type="number"
                                min="0"
                                max={item.orderedQuantity - item.previouslyReceived}
                                value={item.newReceivedQuantity !== null ? (item.newReceivedQuantity - item.previouslyReceived) : ''}
                                onChange={(e) => updateReceivedQuantity(item.itemId, item.itemType, item.variationId, parseInt(e.target.value) || 0)}
                                className="w-20 h-9 text-center"
                                disabled={false}
                                placeholder="0"
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Remaining</div>
                              <div className={`font-medium ${
                                item.newReceivedQuantity === null 
                                  ? 'text-gray-600'
                                  : (item.orderedQuantity - (item.newReceivedQuantity || item.previouslyReceived)) === 0 
                                    ? 'text-green-600' 
                                    : 'text-orange-600'
                              }`}>
                                {item.newReceivedQuantity === null 
                                  ? item.orderedQuantity - item.previouslyReceived
                                  : item.orderedQuantity - item.newReceivedQuantity
                                }
                              </div>
                            </div>
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
                          <span className="font-medium text-gray-900">{receiptItems.length}</span> Items
                        </span>
                        <span>
                          <span className="font-medium text-gray-900">{progress.totalOrdered}</span> Total Ordered
                        </span>
                        <span>
                          <span className="font-medium text-gray-900">{progress.totalReceived}</span> Will Be Received
                        </span>
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

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>
                  Add any comments about the receipt (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter any additional notes about this receipt..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-20"
                />
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
                         {/* Quick Actions */}
             <Card>
               <CardHeader>
                 <CardTitle>Quick Actions</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 <Button
                   type="button"
                   onClick={markAllAsReceived}
                   className="w-full"
                   variant="outline"
                 >
                   <CheckCircle className="mr-2 h-4 w-4" />
                   Mark All as Received
                 </Button>
                 
                 {/* Show Cancel All Items only for pending and partially received purchases */}
                 {(purchase.status === 'pending' || purchase.status === 'partially_received') && (
                   <Button
                     type="button"
                     onClick={markAllAsCancelled}
                     variant="outline"
                     className="w-full"
                   >
                     <X className="mr-2 h-4 w-4" />
                     Cancel All Items
                   </Button>
                 )}
                 
                 <Button
                   type="button"
                   onClick={resetToOriginal}
                   variant="outline"
                   className="w-full"
                 >
                   <RotateCcw className="mr-2 h-4 w-4" />
                   Reset to Original
                 </Button>
               </CardContent>
             </Card>

            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
                <CardDescription>
                  {purchase.status === 'partially_received' ? 'Continuing receipt process' : 'New receipt entry'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Receipt Progress</span>
                    <span className={`text-sm font-semibold px-2 py-1 rounded-md ${
                      progress.totalReceived === progress.totalOrdered 
                        ? 'bg-green-100 text-green-700' 
                        : progress.totalReceived > 0 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {progress.totalReceived}/{progress.totalOrdered} items
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        progress.totalReceived === progress.totalOrdered 
                          ? 'bg-green-500' 
                          : progress.totalReceived > 0 
                          ? 'bg-blue-500' 
                          : 'bg-gray-400'
                      }`}
                      style={{ 
                        width: `${Math.max(0, progress.totalOrdered > 0 ? (progress.totalReceived / progress.totalOrdered) * 100 : 0)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {progress.totalOrdered > 0 
                      ? `${Math.round((progress.totalReceived / progress.totalOrdered) * 100)}% complete`
                      : 'No items to receive'
                    }
                  </p>
                </div>
                
                {/* Receipt Details */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-600 mb-1">Previously Received</div>
                      <div className="text-lg font-semibold text-blue-700">
                        {receiptItems.reduce((sum, item) => sum + item.previouslyReceived, 0)}
                    </div>
                      <div className="text-xs text-blue-500">items</div>
                    </div>
                    
                    {receiptItems.some(item => item.returnedQuantity > 0) && (
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-red-600 mb-1">Previously Returned</div>
                        <div className="text-lg font-semibold text-red-700">
                          {receiptItems.reduce((sum, item) => sum + item.returnedQuantity, 0)}
                        </div>
                        <div className="text-xs text-red-500">items</div>
                  </div>
                )}
                    
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-green-600 mb-1">Net Received</div>
                      <div className="text-lg font-semibold text-green-700">
                        {receiptItems.reduce((sum, item) => sum + (item.previouslyReceived - item.returnedQuantity), 0)}
                      </div>
                      <div className="text-xs text-green-500">items</div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-orange-600 mb-1">Still Remaining</div>
                      <div className="text-lg font-semibold text-orange-700">
                        {progress.totalOrdered - progress.totalReceived}
                      </div>
                      <div className="text-xs text-orange-500">items</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receipt Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Receipt Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Total Items:</span>
                  <span className="font-medium">{receiptItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Products:</span>
                  <span className="font-medium">{receiptItems.filter(item => item.itemType === 'product').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Packages:</span>
                  <span className="font-medium">{receiptItems.filter(item => item.itemType === 'package').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Ordered:</span>
                  <span className="font-medium">{progress.totalOrdered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Will Be Received:</span>
                  <span className={`font-medium ${
                    progress.allCancelled ? 'text-red-600' : 
                    progress.totalReceived === progress.totalOrdered ? 'text-green-600' : 
                    progress.totalReceived > 0 ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {progress.totalReceived}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Order Total:</span>
                    <span>{formatCurrency(Number(purchase.total_amount))}</span>
                  </div>
                </div>

                {/* Status Preview - only show when user has made changes */}
                {hasUserMadeChanges && (
                  <div className="border-t pt-4">
                    <div className="text-sm text-muted-foreground mb-2">New Status Preview:</div>
                    <Badge variant="secondary" className={`text-xs ${
                      progress.allCancelled || (hasUserMadeChanges && progress.totalReceived === 0)
                        ? 'bg-red-100 text-red-800'
                        : progress.totalReceived === progress.totalOrdered
                        ? 'bg-green-100 text-green-800'
                        : progress.totalReceived > 0
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {progress.allCancelled || (hasUserMadeChanges && progress.totalReceived === 0)
                        ? 'cancelled'
                        : progress.totalReceived === progress.totalOrdered
                        ? 'received'
                        : progress.totalReceived > 0
                        ? 'partially received'
                        : 'pending'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Card>
              <CardContent className="pt-6">
                                  <Button 
                    type="submit" 
                    className="w-full bg-black border-black text-white hover:bg-gray-800"
                    disabled={isLoading || !hasUserMadeChanges}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Receipt
                      </>
                    )}
                  </Button>
                
                {!hasUserMadeChanges && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Make changes to enable the update button
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
} 