/**
 * Purchase Utilities Module
 * 
 * This module contains utility and helper functions extracted from the main purchases module.
 * These functions provide reusable utility functionality that doesn't directly manipulate
 * core business entities but provides support functionality.
 * 
 * Utilities include:
 * - Request deduplication system
 * - Legacy data conversion functions
 * - Statistics calculation functions
 * - Timeline event generation utilities
 * - Status correction utilities
 * - Payment timeline backfill utilities
 */

import { createClient } from './client'
import { apiCache } from './cache'
import { 
  calculatePurchaseReturnStatus, 
  calculateNetPaymentAmount, 
  calculatePaymentStatus 
} from './purchases-calculations'
import {
  PurchaseWithItems,
  PurchaseReturn,
  PurchaseStatsResponse,
  PurchaseEvent,
  PurchaseWithPayments
} from './purchases-types'

// ===== REQUEST DEDUPLICATION SYSTEM =====

/**
 * Deprecated request deduplication cache
 * This system is deprecated in favor of the global apiCache system
 * Keeping for backward compatibility but new functions should use apiCache
 */
const purchaseDataCache = new Map<string, {
  currentRequest?: Promise<any>
  lastFetch?: number
  data?: any
}>()

/**
 * Request deduplication wrapper function
 * Prevents duplicate API calls in React 18 Strict Mode
 * @deprecated Use global apiCache instead for better consistency
 */
export function withPurchaseDeduplication<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Use global apiCache instead of local cache for better consistency
  return apiCache.get(key, fn)
}

// ===== LEGACY DATA CONVERSION FUNCTIONS =====

/**
 * Convert legacy purchase returns to new format
 * Used for backward compatibility with old purchase return system
 */
export function convertLegacyReturns(legacyReturns: PurchaseWithItems[]): PurchaseReturn[] {
  return legacyReturns.map(purchase => ({
    id: `legacy-${purchase.id}`,
    purchase_id: purchase.id,
    return_number: `RET-${purchase.id}`,
    supplier_id: purchase.supplier_id,
    supplier_name: purchase.supplier_name,
    warehouse_id: purchase.warehouse_id,
    warehouse_name: purchase.warehouse_name,
    total_amount: purchase.total_amount,
    return_date: purchase.updated_at.split('T')[0], // Use updated_at as return date
    reason: 'Legacy return (migrated from old system)',
    status: 'completed' as const,
    processed_by: purchase.created_by,
    notes: purchase.notes,
    refund_status: 'pending' as const,
    refund_amount: 0,
    auto_refund_eligible: false, // Legacy returns are not auto-eligible
    created_at: purchase.created_at,
    updated_at: purchase.updated_at,
    purchase: purchase,
    items: [], // Legacy items structure is different
    refund_transactions: []
  }))
}

/**
 * Legacy method for fetching purchase returns (backward compatibility)
 */
export async function getPurchaseReturnsLegacy(): Promise<PurchaseWithItems[]> {
  const supabase = createClient()

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select(`
      *,
      purchase_items (*)
    `)
    .in('status', ['returned', 'partially_returned'])
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch purchase returns: ${error.message}`)
  }

  return purchases?.map(purchase => ({
    ...purchase,
    items: purchase.purchase_items || []
  })) || []
}

// ===== STATISTICS CALCULATION FUNCTIONS =====

/**
 * Calculate purchase statistics
 * Provides overview of purchase status distribution and total amounts
 */
export async function getPurchaseStats(): Promise<PurchaseStatsResponse> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('purchases')
    .select('status, total_amount')
    .neq('status', 'returned') // Exclude returned purchases from main stats

  if (error) {
    console.error('Error fetching purchase stats:', error)
    throw new Error('Failed to fetch purchase stats')
  }

  const purchases = data || []
  
  return {
    totalPurchases: purchases.length,
    totalAmount: purchases.reduce((sum, p) => sum + p.total_amount, 0),
    pendingPurchases: purchases.filter(p => p.status === 'pending').length,
    receivedPurchases: purchases.filter(p => p.status === 'received').length,
    partiallyReceivedPurchases: purchases.filter(p => p.status === 'partially_received').length,
    cancelledPurchases: purchases.filter(p => p.status === 'cancelled').length
  }
}

// ===== TIMELINE EVENT UTILITIES =====

/**
 * Generate initial timeline events for existing purchases
 * Used for backfilling timeline data for purchases created before timeline system
 */
export async function generateInitialTimelineEvents(purchaseId: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Enhanced check for existing timeline events with specific order_placed check
    const { data: existingEvents } = await supabase
      .from('purchase_events')
      .select('id, event_type')
      .eq('purchase_id', purchaseId)
    
    if (existingEvents && existingEvents.length > 0) {
      console.log(`Timeline events already exist for ${purchaseId} (${existingEvents.length} events)`)
      
      // Check if there's already an order_placed event
      const hasOrderPlaced = existingEvents.some(event => event.event_type === 'order_placed')
      if (hasOrderPlaced) {
        console.log(`Order placed event already exists for ${purchaseId}`)
        return
      }
    }
    
    console.log(`Generating initial timeline events for ${purchaseId}...`)
    
    // Get purchase details
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchaseId)
      .single()
    
    if (purchaseError || !purchase) {
      console.error('Purchase not found:', purchaseError)
      return
    }
    
    // Get purchase items count
    const { data: items } = await supabase
      .from('purchase_items')
      .select('quantity, received_quantity, returned_quantity')
      .eq('purchase_id', purchaseId)
    
    const totalItems = items?.length || 0
    const totalQuantity = items?.reduce((sum, item) => sum + item.quantity, 0) || 0
    const totalReceived = items?.reduce((sum, item) => sum + item.received_quantity, 0) || 0
    const totalReturned = items?.reduce((sum, item) => sum + item.returned_quantity, 0) || 0
    
    // Import createPurchaseEvent dynamically to avoid circular dependency
    const { createPurchaseEvent } = await import('./purchases-core')
    
    // Create order placed event
    await createPurchaseEvent({
      purchase_id: purchaseId,
      event_type: 'order_placed',
      event_title: 'Order Placed',
      event_description: 'Purchase order created and sent to supplier',
      new_status: 'pending',
      total_items_count: totalItems,
      created_by: 'system'
    })
    
    // Create receipt events based on current status
    if (purchase.status === 'partially_received' && totalReceived > 0) {
      await createPurchaseEvent({
        purchase_id: purchaseId,
        event_type: 'partial_receipt',
        event_title: 'Items Partially Received',
        event_description: `${totalReceived} out of ${totalQuantity} items received`,
        previous_status: 'pending',
        new_status: 'partially_received',
        affected_items_count: items?.filter(item => item.received_quantity > 0).length || 0,
        total_items_count: totalItems,
        created_by: 'system'
      })
    } else if (purchase.status === 'received' && totalReceived > 0) {
      // For fully received orders, we might have had partial receipt first
      if (totalReceived === totalQuantity) {
        await createPurchaseEvent({
          purchase_id: purchaseId,
          event_type: 'full_receipt',
          event_title: 'All Items Received',
          event_description: 'All ordered items have been received and verified',
          previous_status: 'pending',
          new_status: 'received',
          affected_items_count: totalItems,
          total_items_count: totalItems,
          created_by: 'system'
        })
      }
    }
    
    // Create return events based on current status
    if (purchase.status === 'partially_returned' && totalReturned > 0) {
      await createPurchaseEvent({
        purchase_id: purchaseId,
        event_type: 'partial_return',
        event_title: 'Partial Return Processed',
        event_description: `${totalReturned} out of ${totalReceived} received items returned`,
        previous_status: purchase.status === 'received' ? 'received' : 'partially_received',
        new_status: 'partially_returned',
        affected_items_count: items?.filter(item => item.returned_quantity > 0).length || 0,
        return_reason: purchase.return_reason || 'Return processed (reason not specified)',
        created_by: 'system'
      })
    } else if (purchase.status === 'returned' && totalReturned > 0) {
      await createPurchaseEvent({
        purchase_id: purchaseId,
        event_type: 'full_return',
        event_title: 'Return Completed',
        event_description: `All received items (${totalReturned}) have been returned to supplier`,
        previous_status: 'received',
        new_status: 'returned',
        affected_items_count: totalItems,
        return_reason: purchase.return_reason || 'Full return processed (reason not specified)',
        created_by: 'system'
      })
    }
    
    console.log(`Generated initial timeline events for ${purchaseId}`)
  } catch (error) {
    console.error('Error generating initial timeline events:', error)
    throw error
  }
}

/**
 * Utility function to backfill timeline events for all purchases
 * Used for data migration and system updates
 */
export async function backfillAllTimelineEvents(): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Get all purchases that don't have timeline events
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('id')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching purchases for backfill:', error)
      return
    }
    
    console.log(`Starting backfill for ${purchases?.length || 0} purchases...`)
    
    for (const purchase of purchases || []) {
      try {
        await generateInitialTimelineEvents(purchase.id)
        console.log(`✓ Backfilled timeline for ${purchase.id}`)
      } catch (error) {
        console.error(`✗ Failed to backfill timeline for ${purchase.id}:`, error)
      }
    }
    
    console.log('Timeline backfill completed!')
  } catch (error) {
    console.error('Error in backfillAllTimelineEvents:', error)
    throw error
  }
}

// ===== STATUS CORRECTION UTILITIES =====

/**
 * Utility function to fix all purchase statuses using the new logic
 * Corrects any inconsistent statuses across all purchases
 */
export async function fixAllPurchaseStatuses(): Promise<void> {
  const supabase = createClient()
  
  try {
    console.log('🔄 Starting purchase status correction...')
    
    // Get all purchases with their item data
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`
        id,
        status,
        purchase_items (
          quantity,
          received_quantity,
          returned_quantity
        )
      `)
    
    if (error) {
      console.error('Error fetching purchases for status fix:', error)
      throw new Error('Failed to fetch purchases')
    }
    
    let fixedCount = 0
    
    for (const purchase of purchases || []) {
      const items = purchase.purchase_items || []
      
      // Calculate correct status using our new logic
      const totalOrdered = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      const totalReceived = items.reduce((sum: number, item: any) => sum + item.received_quantity, 0)
      const totalReturned = items.reduce((sum: number, item: any) => sum + item.returned_quantity, 0)
      const netReceived = totalReceived - totalReturned
      
      let correctStatus: string
      
      if (totalReturned === 0) {
        // No returns yet - use standard receipt logic
        if (totalReceived === 0) {
          correctStatus = 'pending'
        } else if (totalReceived < totalOrdered) {
          correctStatus = 'partially_received'
        } else {
          correctStatus = 'received'
        }
      } else {
        // Returns have occurred - determine appropriate status
        if (netReceived === 0) {
          // All received items have been returned
          if (totalReceived === totalOrdered) {
            // All ordered items were received and then returned = Full Return
            correctStatus = 'returned'
          } else {
            // Only some items were received and then returned = Back to Pending
            correctStatus = 'pending'
          }
        } else {
          // Some items are still in possession after returns
          if (totalReceived === totalOrdered) {
            // All items were received, but some returned = Partial Return
            correctStatus = 'partially_returned'
          } else {
            // Still have partial receipt situation with some returns = Partial Receipt
            correctStatus = 'partially_received'
          }
        }
      }
      
      // Update status if it's incorrect
      if (purchase.status !== correctStatus) {
        console.log(`🔧 Fixing ${purchase.id}: ${purchase.status} → ${correctStatus}`)
        
        const { error: updateError } = await supabase
          .from('purchases')
          .update({ 
            status: correctStatus,
            last_updated: new Date().toISOString()
          })
          .eq('id', purchase.id)
        
        if (updateError) {
          console.error(`Failed to update ${purchase.id}:`, updateError)
        } else {
          fixedCount++
          
          // Create a timeline event for the status correction
          try {
            // Import createPurchaseEvent dynamically to avoid circular dependency
            const { createPurchaseEvent } = await import('./purchases-core')
            
            await createPurchaseEvent({
              purchase_id: purchase.id,
              event_type: 'status_change',
              event_title: 'Status Corrected',
              event_description: `Status corrected from ${purchase.status} to ${correctStatus} (system update)`,
              previous_status: purchase.status,
              new_status: correctStatus,
              created_by: 'system'
            })
          } catch (eventError) {
            console.error(`Failed to create timeline event for ${purchase.id}:`, eventError)
            // Continue anyway
          }
        }
      }
    }
    
    console.log(`✅ Purchase status correction completed. Fixed ${fixedCount} purchases.`)
  } catch (error) {
    console.error('Error fixing purchase statuses:', error)
    throw error
  }
}

// ===== PAYMENT UTILITIES =====

/**
 * Function to backfill payment timeline events for existing payments
 * Used to add timeline events for payments created before the timeline system
 */
export async function backfillPaymentTimelineEvents(purchaseId?: string): Promise<void> {
  try {
    const supabase = createClient()
    
    // Get payments to backfill
    let paymentsQuery = supabase
      .from('purchase_payments')
      .select('*, purchases!inner(supplier_name)')
      .eq('status', 'active') // Only active payments
      .order('created_at', { ascending: true })
    
    if (purchaseId) {
      paymentsQuery = paymentsQuery.eq('purchase_id', purchaseId)
    }
    
    const { data: payments, error: paymentsError } = await paymentsQuery
    
    if (paymentsError) {
      console.error('Error fetching payments for backfill:', paymentsError)
      return
    }
    
    if (!payments || payments.length === 0) {
      console.log(`No payments found ${purchaseId ? `for purchase ${purchaseId}` : 'for backfill'}`)
      return
    }
    
    console.log(`🔄 Backfilling timeline events for ${payments.length} payments...`)
    
    // Import getPurchaseById dynamically to avoid circular dependencies
    const { getPurchaseById } = await import('./purchases-core')
    
    for (const payment of payments) {
      try {
        // Check if timeline event already exists for this payment
        const { data: existingEvents } = await supabase
          .from('purchase_events')
          .select('id')
          .eq('purchase_id', payment.purchase_id)
          .eq('payment_id', payment.id)
          .eq('event_type', 'payment_made')
        
        if (existingEvents && existingEvents.length > 0) {
          console.log(`⏭️ Timeline event already exists for payment ${payment.id}`)
          continue
        }
        
        // Get purchase details for payment status calculation
        const purchase = await getPurchaseById(payment.purchase_id)
        if (!purchase) {
          console.log(`⚠️ Purchase not found for payment ${payment.id}`)
          continue
        }
        
        // Calculate payment status at time of this payment
        const { netAmount } = calculateNetPaymentAmount(purchase)
        const { status: paymentStatus } = calculatePaymentStatus(purchase, payment.amount)
        
        const paymentStatusText = paymentStatus === 'paid' ? 'fully paid' : 
                                 paymentStatus === 'partial' ? 'partially paid' : 
                                 paymentStatus === 'overpaid' ? 'overpaid' : 'paid'
        
        // Import createPurchaseEvent dynamically to avoid circular dependency
        const { createPurchaseEvent } = await import('./purchases-core')
        
        // Create timeline event
        await createPurchaseEvent({
          purchase_id: payment.purchase_id,
          event_type: 'payment_made',
          event_title: `Payment Received`,
          event_description: `Payment of ৳${payment.amount.toLocaleString()} received via ${payment.payment_method.replace('_', ' ')}. Purchase is now ${paymentStatusText}.`,
          payment_amount: payment.amount,
          payment_method: payment.payment_method,
          payment_id: payment.id,
          new_status: paymentStatus,
          created_by: payment.created_by || 'system'
        })
        
        console.log(`✅ Created timeline event for payment ${payment.id}`)
      } catch (error) {
        console.error(`❌ Failed to create timeline event for payment ${payment.id}:`, error)
      }
    }
    
    console.log(`🎉 Finished backfilling payment timeline events`)
  } catch (error) {
    console.error('Error in backfillPaymentTimelineEvents:', error)
    throw error
  }
}

// ===== RECEIPT TIMELINE UTILITIES =====

/**
 * Create timeline event specifically for tracking receipt updates
 * Provides detailed information about received quantities and changes
 */
export async function createReceiptTimelineEvent(purchaseId: string, actualQuantityChange?: number): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current purchase and items data
    const [purchaseResult, itemsResult, previousEventsResult] = await Promise.all([
      supabase.from('purchases').select('status').eq('id', purchaseId).single(),
      supabase.from('purchase_items').select('quantity, received_quantity').eq('purchase_id', purchaseId),
      supabase.from('purchase_events')
        .select('event_description')
        .eq('purchase_id', purchaseId)
        .in('event_type', ['partial_receipt', 'full_receipt'])
        .order('created_at', { ascending: false })
        .limit(1)
    ])

    if (purchaseResult.error || itemsResult.error) {
      console.error('Error fetching data for receipt timeline:', purchaseResult.error || itemsResult.error)
      return
    }

    const purchase = purchaseResult.data
    const items = itemsResult.data
    const previousEvents = previousEventsResult.data || []

    // Calculate current totals
    const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalReceived = items.reduce((sum, item) => sum + item.received_quantity, 0)
    const affectedItems = items.filter(item => item.received_quantity > 0).length

    // Use actualQuantityChange if provided, otherwise calculate increment from previous receipt event
    let newItemsReceived = actualQuantityChange || 0
    if (!actualQuantityChange) {
      let previousReceived = 0
      if (previousEvents.length > 0) {
        const previousDescription = previousEvents[0].event_description
        // Extract previous received count from description like "16 out of 50 items received"
        const match = previousDescription?.match(/(\d+) out of \d+ items received/)
        if (match) {
          previousReceived = parseInt(match[1])
        }
      }
      newItemsReceived = totalReceived - previousReceived
    }

    let eventType: PurchaseEvent['event_type']
    let eventTitle: string
    let eventDescription: string

    if (purchase.status === 'received') {
      eventType = 'full_receipt'
      eventTitle = 'All Items Received'
      if (newItemsReceived > 0 && (previousEvents.length > 0 || actualQuantityChange)) {
        eventDescription = `All ordered items have been received and verified (+${newItemsReceived} new items)`
      } else {
        eventDescription = 'All ordered items have been received and verified'
      }
    } else if (purchase.status === 'partially_received') {
      eventType = 'partial_receipt'
      eventTitle = 'Items Partially Received'
      if (newItemsReceived > 0 && (previousEvents.length > 0 || actualQuantityChange)) {
        eventDescription = `${totalReceived} out of ${totalOrdered} items received (+${newItemsReceived} new items)`
      } else {
        eventDescription = `${totalReceived} out of ${totalOrdered} items received`
      }
    } else {
      // For other cases, create a general receipt event
      eventType = 'status_change'
      eventTitle = 'Receipt Updated'
      if (newItemsReceived > 0 && (previousEvents.length > 0 || actualQuantityChange)) {
        eventDescription = `Purchase receipt updated - ${totalReceived} out of ${totalOrdered} items received (+${newItemsReceived} new items)`
      } else {
        eventDescription = `Purchase receipt updated - ${totalReceived} out of ${totalOrdered} items received`
      }
    }

    // Import createPurchaseEvent dynamically to avoid circular dependency
    const { createPurchaseEvent } = await import('./purchases-core')
    
    await createPurchaseEvent({
      purchase_id: purchaseId,
      event_type: eventType,
      event_title: eventTitle,
      event_description: eventDescription,
      new_status: purchase.status,
      affected_items_count: affectedItems,
      total_items_count: items.length,
      created_by: 'system'
    })

    console.log(`Created receipt timeline event for ${purchaseId}: ${eventTitle}`)
  } catch (error) {
    console.error('Error creating receipt timeline event:', error)
  }
}