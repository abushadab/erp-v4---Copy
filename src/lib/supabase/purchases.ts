import { createClient } from './client'
import { updateWarehouseStock as updateWarehouseStockFunction } from '../utils/multi-warehouse-stock'
import { updatePackagingWarehouseStock as updatePackagingWarehouseStockFunction } from '../utils/multi-warehouse-packaging-stock'
import { createPurchaseJournalEntry, createPurchaseReturnJournalEntry, createPurchaseReceiptJournalEntry, createPaymentJournalEntry, createPaymentReversalJournalEntry } from './accounts-client'
import { apiCache } from './cache'
import { createPurchaseEvent, getPurchaseById } from './purchases-core'
import { 
  withPurchaseDeduplication,
  convertLegacyReturns,
  getPurchaseReturnsLegacy,
  getPurchaseStats,
  generateInitialTimelineEvents,
  backfillAllTimelineEvents,
  fixAllPurchaseStatuses,
  backfillPaymentTimelineEvents,
  createReceiptTimelineEvent
} from './purchases-utils'
import { 
  calculatePurchaseReturnStatus,
  calculateNetPaymentAmount, 
  calculatePaymentStatus,
  calculateOriginalPaymentStatus,
  calculateRefundDue,
  calculateNetPaymentStatus,
  calculateCompletePaymentStatus,
  calculateRefundBreakdown,
  checkRefundEligibility
} from './purchases-calculations'
import {
  DatabasePurchase,
  DatabasePurchaseItem,
  DatabaseSupplier,
  DatabaseWarehouse,
  PurchaseWithItems,
  PurchaseReturn,
  PurchaseReturnItem,
  RefundTransaction,
  PurchaseEvent,
  PurchasePayment,
  CreatePurchaseData,
  CreatePurchaseItemData,
  UpdatePurchaseData,
  ProcessPurchaseReturnData,
  CreatePurchasePaymentData,
  AutomaticRefundResponse,
  PurchaseStatsResponse,
  PurchaseWithPayments,
  PAYMENT_METHODS
} from './purchases-types'

// Re-export types for external use
export type {
  DatabaseSupplier,
  DatabaseWarehouse,
  CreatePurchaseData,
  CreatePurchaseItemData,
  DatabasePurchase,
  DatabasePurchaseItem,
  PurchaseWithItems
} from './purchases-types'

// Request deduplication system moved to purchases-utils.ts

// All types are now imported from purchases-types.ts

// Query functions
export async function getPurchases(filters?: {
  status?: string
  searchTerm?: string
  supplierId?: string
  warehouseId?: string
}): Promise<PurchaseWithItems[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('purchases')
    .select(`
      *,
      items:purchase_items(*)
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  
  if (filters?.supplierId) {
    query = query.eq('supplier_id', filters.supplierId)
  }
  
  if (filters?.warehouseId) {
    query = query.eq('warehouse_id', filters.warehouseId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching purchases:', error)
    throw new Error('Failed to fetch purchases')
  }

  let purchases = data || []

  // Apply search filter client-side for complex text search
  if (filters?.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase()
    purchases = purchases.filter(purchase => 
      purchase.id.toLowerCase().includes(searchLower) ||
      purchase.supplier_name.toLowerCase().includes(searchLower) ||
      purchase.created_by.toLowerCase().includes(searchLower) ||
      purchase.notes?.toLowerCase().includes(searchLower)
    )
  }

  return purchases
}

// getPurchaseById moved to purchases-core.ts and imported above
export { getPurchaseById } from './purchases-core'

export async function getSuppliers(): Promise<DatabaseSupplier[]> {
  return apiCache.get('suppliers-active', async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error) {
      console.error('Error fetching suppliers:', error)
      throw new Error('Failed to fetch suppliers')
    }

    return data || []
  })
}

// Use cached version from queries to prevent duplicate API calls
import { getActiveWarehouses } from './queries'

export async function getWarehouses(): Promise<DatabaseWarehouse[]> {
  return await getActiveWarehouses()
}

// Purchase return types are now imported from purchases-types.ts

export async function getPurchaseReturns(): Promise<PurchaseReturn[]> {
  const supabase = createClient()

  try {
    console.log('📦 Fetching purchase returns from new table...')

    const { data: returns, error } = await supabase
      .from('purchase_returns')
    .select(`
      *,
        purchase:purchases(*),
        items:purchase_return_items(*),
        refund_transactions(*)
    `)
      .order('created_at', { ascending: false })

  if (error) {
      const errorMsg = error.message || JSON.stringify(error)
    console.error('Error fetching purchase returns:', error)
      
      // Check if it's a table not found error - fall back to old method
      if (errorMsg.includes('does not exist') || errorMsg.includes('purchase_returns')) {
        console.log('⚠️ New purchase_returns table does not exist, falling back to old method...')
        const legacyReturns = await getPurchaseReturnsLegacy()
        return convertLegacyReturns(legacyReturns)
      }
      
      throw new Error(`Failed to fetch purchase returns: ${errorMsg}`)
    }

    console.log(`✅ Found ${returns?.length || 0} purchase returns`)
    return returns || []
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Purchase returns fetch failed:', errorMsg)
        
    // Try fallback to legacy method
    try {
      console.log('🔄 Attempting fallback to legacy method...')
      const legacyReturns = await getPurchaseReturnsLegacy()
      return convertLegacyReturns(legacyReturns)
    } catch (fallbackError) {
      console.error('Legacy fallback also failed:', fallbackError)
      throw new Error(`Purchase returns fetch failed: ${errorMsg}`)
    }
  }
        }
        
// Legacy conversion functions moved to purchases-utils.ts and imported above

// New refund-related functions

export async function processAutomaticRefund(returnId: string, processedBy: string): Promise<AutomaticRefundResponse> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('process_automatic_refund', {
      p_return_id: returnId,
      p_created_by: processedBy
    })

    if (error) {
      console.error('Error processing automatic refund:', error)
      return {
        success: false,
        refund_transactions: [],
        errors: [error.message]
      }
    }

    return data || {
      success: false,
      refund_transactions: [],
      errors: ['No data returned']
    }
  } catch (error) {
    console.error('Automatic refund processing failed:', error)
    return {
      success: false,
      refund_transactions: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}


export async function updateRefundStatus(
  refundTransactionId: string, 
  status: 'completed' | 'failed' | 'cancelled',
  failureReason?: string,
  bankReference?: string,
  checkNumber?: string
): Promise<RefundTransaction> {
  const supabase = createClient()

  const updateData: any = {
    status,
    processed_at: new Date().toISOString()
  }

  if (failureReason) updateData.failure_reason = failureReason
  if (bankReference) updateData.bank_reference = bankReference
  if (checkNumber) updateData.check_number = checkNumber

  const { data, error } = await supabase
    .from('refund_transactions')
    .update(updateData)
    .eq('id', refundTransactionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating refund status:', error)
    throw new Error('Failed to update refund status')
  }

  return data
}

// Mutation functions - types are now imported from purchases-types.ts

export async function createPurchase(
  purchaseData: CreatePurchaseData,
  items: CreatePurchaseItemData[]
): Promise<PurchaseWithItems> {
  const supabase = createClient()

  // Validate input
  if (!items || items.length === 0) {
    throw new Error('Purchase must have at least one item')
  }

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + Number(item.total), 0)

  // Start a transaction by creating the purchase first
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      ...purchaseData,
      total_amount: totalAmount
    })
    .select()
    .single()

  if (purchaseError) {
    console.error('Error creating purchase:', purchaseError)
    throw new Error('Failed to create purchase')
  }

  // Generate unique IDs for purchase items to avoid duplicates
  const purchaseItems = items.map((item, index) => {
    // Generate a unique ID using timestamp + random number + index
    const uniqueId = `PIT${Date.now()}_${Math.floor(Math.random() * 1000000)}_${index + 1}`
    
    const purchaseItem = {
      id: uniqueId,
      purchase_id: purchase.id,
      item_id: item.item_id,
      item_type: item.item_type,
      item_name: item.item_name,
      variation_id: item.variation_id || null,
      quantity: Number(item.quantity),
      received_quantity: 0, // Default to 0 for new items
      purchase_price: Number(item.purchase_price),
      total: Number(item.total)
    }
    
    // Validate required fields
    if (!purchaseItem.item_id || !purchaseItem.item_type || !purchaseItem.item_name) {
      throw new Error(`Invalid item data: missing required fields for item ${item.item_name}`)
    }
    
    if (isNaN(purchaseItem.quantity) || purchaseItem.quantity <= 0) {
      throw new Error(`Invalid quantity for item ${item.item_name}: ${item.quantity}`)
    }
    
    if (isNaN(purchaseItem.purchase_price) || purchaseItem.purchase_price < 0) {
      throw new Error(`Invalid purchase price for item ${item.item_name}: ${item.purchase_price}`)
    }
    
    if (isNaN(purchaseItem.total) || purchaseItem.total < 0) {
      throw new Error(`Invalid total for item ${item.item_name}: ${item.total}`)
    }
    
    return purchaseItem
  })

  console.log('Creating purchase items:', purchaseItems)

  const { data: createdItems, error: itemsError } = await supabase
    .from('purchase_items')
    .insert(purchaseItems)
    .select()

  if (itemsError) {
    // If items creation fails, we should ideally rollback the purchase
    // For now, just throw an error
    console.error('Error creating purchase items:', itemsError)
    throw new Error(`Failed to create purchase items: ${itemsError.message || 'Unknown error'}`)
  }

  // Create initial timeline event immediately after purchase creation
  try {
    await createPurchaseEvent({
      purchase_id: purchase.id,
      event_type: 'order_placed',
      event_title: 'Order Placed',
      event_description: 'Purchase order created and sent to supplier',
      new_status: 'pending',
      total_items_count: createdItems?.length || 0,
      created_by: purchaseData.created_by
    })
    console.log(`Created initial timeline event for purchase ${purchase.id}`)
  } catch (timelineError) {
    console.error('Error creating initial timeline event:', timelineError)
    // Don't fail the entire purchase creation for timeline issues
  }

  // Note: No journal entry created here - accounting entries are only created when goods are received or payments are made

  return {
    ...purchase,
    items: createdItems || []
  }
}

// UpdatePurchaseData type is now imported from purchases-types.ts

export async function updatePurchase(data: UpdatePurchaseData): Promise<DatabasePurchase> {
  const supabase = createClient()

  const { id, ...updateData } = data

  const { data: purchase, error } = await supabase
    .from('purchases')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating purchase:', error)
    throw new Error('Failed to update purchase')
  }

  return purchase
}

export async function updatePurchaseItemReceived(
  itemId: string,
  newReceivedQuantity: number
): Promise<DatabasePurchaseItem> {
  const supabase = createClient()

  console.log(`Updating purchase item ${itemId} received_quantity to: ${newReceivedQuantity}`)

  const { data: item, error } = await supabase
    .from('purchase_items')
    .update({ received_quantity: newReceivedQuantity })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('Error updating purchase item:', error)
    throw new Error('Failed to update purchase item')
  }

  console.log('Successfully updated item:', item)
  return item
}

export async function updatePurchaseStatus(purchaseId: string, createTimelineEvent: boolean = true): Promise<DatabasePurchase> {
  const supabase = createClient()

  // Get current purchase status for timeline
  const { data: currentPurchase, error: currentError } = await supabase
    .from('purchases')
    .select('status')
    .eq('id', purchaseId)
    .single()

  if (currentError) {
    console.error('Error fetching current purchase:', currentError)
    throw new Error('Failed to fetch current purchase')
  }

  // Get all items for this purchase
  const { data: items, error: itemsError } = await supabase
    .from('purchase_items')
    .select('quantity, received_quantity')
    .eq('purchase_id', purchaseId)

  if (itemsError) {
    console.error('Error fetching purchase items for status update:', itemsError)
    throw new Error('Failed to fetch purchase items')
  }

  // Calculate totals
  const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalReceived = items.reduce((sum, item) => sum + item.received_quantity, 0)

  // Determine new status
  let newStatus: 'pending' | 'partially_received' | 'received' | 'cancelled'
  if (totalReceived === 0) {
    newStatus = 'cancelled'
  } else if (totalReceived === totalOrdered) {
    newStatus = 'received'
  } else if (totalReceived > 0) {
    newStatus = 'partially_received'
  } else {
    newStatus = 'pending'
  }

  console.log(`Updating purchase ${purchaseId} status to: ${newStatus} (${totalReceived}/${totalOrdered})`)

  // Update purchase status
  const { data: purchase, error } = await supabase
    .from('purchases')
    .update({ 
      status: newStatus,
      last_updated: new Date().toISOString()
    })
    .eq('id', purchaseId)
    .select()
    .single()

  if (error) {
    console.error('Error updating purchase status:', error)
    throw new Error('Failed to update purchase status')
  }

  return purchase
}

// createReceiptTimelineEvent moved to purchases-utils.ts and imported above
export { createReceiptTimelineEvent } from './purchases-utils'

export async function deletePurchase(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting purchase:', error)
    throw new Error('Failed to delete purchase')
  }
}

// ProcessPurchaseReturnData type is now imported from purchases-types.ts

// PurchaseEvent type is now imported from purchases-types.ts

// Payment types and constants are now imported from purchases-types.ts

// createPurchaseEvent moved to purchases-core.ts and imported above
export { createPurchaseEvent } from './purchases-core'

// generateInitialTimelineEvents moved to purchases-utils.ts and imported above
export { generateInitialTimelineEvents } from './purchases-utils'

// Enhanced getPurchaseTimeline with automatic event generation
export async function getPurchaseTimeline(purchaseId: string): Promise<PurchaseEvent[]> {
  return withPurchaseDeduplication(`timeline-${purchaseId}`, async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('purchase_events')
      .select('*')
      .eq('purchase_id', purchaseId)
      .order('event_date', { ascending: true })

    if (error) {
      console.error('Error fetching purchase timeline:', error)
      throw error
    }

    return data || []
  })
}

// Enhanced processPurchaseReturn with timeline logging
export async function processPurchaseReturn(
  purchaseId: string,
  returnData: ProcessPurchaseReturnData
): Promise<void> {
  try {
    // Validate required fields
    if (!returnData.returned_by) {
      throw new Error('returned_by field is required but was not provided')
    }
    if (!returnData.return_reason) {
      throw new Error('return_reason field is required but was not provided')
    }
    if (!returnData.return_date) {
      throw new Error('return_date field is required but was not provided')
    }

    console.log('Processing return with data:', {
      purchaseId,
      returned_by: returnData.returned_by,
      return_reason: returnData.return_reason,
      return_date: returnData.return_date,
      items_count: returnData.items.length
    })

    const supabase = await createClient()

    // Get current purchase data for timeline and warehouse info
    const { data: currentPurchase, error: purchaseSelectError } = await supabase
      .from('purchases')
      .select('status, total_amount, warehouse_id, created_by, supplier_name')
      .eq('id', purchaseId)
      .single()

    if (purchaseSelectError) {
      console.error('Error fetching purchase data:', purchaseSelectError)
      throw new Error(`Purchase not found: ${purchaseSelectError.message || 'Unknown error'}`)
    }

    // Update item quantities and calculate return amount
    let totalReturnAmount = 0
    let affectedItemsCount = 0

    for (const item of returnData.items) {
      if (item.return_quantity > 0) {
        affectedItemsCount++
        
        // Get current returned quantity and item details
        const { data: itemData } = await supabase
          .from('purchase_items')
          .select('returned_quantity, purchase_price, item_id, item_type, variation_id')
          .eq('id', item.item_id)  // item.item_id is actually the purchase_item.id
          .single()

        if (itemData) {
          const newReturnedQuantity = itemData.returned_quantity + item.return_quantity
          totalReturnAmount += item.return_quantity * Number(itemData.purchase_price)

          // Get the maximum returnable quantity (need to check received_quantity)
          const { data: fullItemData } = await supabase
            .from('purchase_items')
            .select('received_quantity')
            .eq('id', item.item_id)
            .single()

          if (fullItemData && newReturnedQuantity > fullItemData.received_quantity) {
            const maxReturnable = fullItemData.received_quantity - itemData.returned_quantity
            throw new Error(`Cannot return ${item.return_quantity} items. Only ${maxReturnable} items available for return (${fullItemData.received_quantity} received, ${itemData.returned_quantity} already returned).`)
          }

          // Update returned quantity
          console.log(`Updating item ${item.item_id}: setting returned_quantity to ${newReturnedQuantity}`)
          const { error: updateError } = await supabase
            .from('purchase_items')
            .update({ returned_quantity: newReturnedQuantity })
            .eq('id', item.item_id)  // item.item_id is actually the purchase_item.id

          if (updateError) {
            console.error('Update error details:', updateError)
            console.error('Failed item data:', {
              item_id: item.item_id,
              return_quantity: item.return_quantity,
              current_returned: itemData.returned_quantity,
              new_returned: newReturnedQuantity,
              received_quantity: fullItemData?.received_quantity
            })
            if (updateError.message && updateError.message.includes('returned_quantity_check')) {
              throw new Error(`Return quantity validation failed: Cannot return more items than were received.`)
            }
            throw new Error(`Failed to update return quantity for item ${item.item_id}: ${updateError.message || 'Unknown database error'}`)
          }

          // Update warehouse stock - decrease stock for returned items
          if (currentPurchase) {
            try {
              if (itemData.item_type === 'product') {
                await updateWarehouseStockFunction({
                  productId: itemData.item_id,
                  warehouseId: currentPurchase.warehouse_id,
                  variationId: itemData.variation_id || null,
                  quantityChange: -item.return_quantity, // Negative for returns
                  movementType: 'return',
                  referenceId: purchaseId,
                  reason: `Purchase return - ${returnData.return_reason}`,
                  createdBy: returnData.returned_by,
                  notes: `Stock returned from purchase order ${purchaseId}: ${returnData.return_reason}`
                })
                console.log(`Updated warehouse stock for returned product ${itemData.item_id}: -${item.return_quantity}`)
              } else if (itemData.item_type === 'package') {
                await updatePackagingWarehouseStockFunction({
                  packagingId: itemData.item_id,
                  warehouseId: currentPurchase.warehouse_id,
                  variationId: itemData.variation_id || null,
                  quantityChange: -item.return_quantity, // Negative for returns
                  movementType: 'return',
                  referenceId: purchaseId,
                  reason: `Purchase return - ${returnData.return_reason}`,
                  createdBy: returnData.returned_by,
                  notes: `Packaging stock returned from purchase order ${purchaseId}: ${returnData.return_reason}`
                })
                console.log(`Updated warehouse stock for returned packaging ${itemData.item_id}: -${item.return_quantity}`)
              }
            } catch (stockError) {
              console.error(`Failed to update warehouse stock for returned item ${itemData.item_id}:`, stockError)
              // Continue with other items even if one fails
            }
          }
        }
      }
    }

    // Calculate new status by checking all items in database
    const newStatus = await calculatePurchaseReturnStatus(purchaseId)
    
    // Update purchase with return details and new status
    // Note: return_date, return_reason, returned_by are stored in timeline events, not in purchases table
    const { error: purchaseError } = await supabase
      .from('purchases')
      .update({
        status: newStatus,
        last_updated: new Date().toISOString()
      })
      .eq('id', purchaseId)

    if (purchaseError) {
      console.error('Purchase update error details:', purchaseError)
      throw new Error(`Failed to update purchase status: ${purchaseError.message || 'Unknown database error'}`)
    }

    // Get detailed information for better timeline event
    const { data: items } = await supabase
      .from('purchase_items')
      .select('id, item_id, item_type, item_name, variation_id, quantity, received_quantity, returned_quantity, purchase_price')
      .eq('purchase_id', purchaseId)

    const totalReceived = items?.reduce((sum, item) => sum + item.received_quantity, 0) || 0
    const totalReturned = items?.reduce((sum, item) => sum + item.returned_quantity, 0) || 0
    const totalReturnedInThisAction = returnData.items.reduce((sum, item) => sum + item.return_quantity, 0)

    // Create enhanced timeline event with specific details
    const eventTitle = newStatus === 'returned' ? 'Return Completed' : 'Partial Return Processed'
    let eventDescription: string

    if (newStatus === 'returned') {
      eventDescription = `All ${totalReturned} received items have been returned to supplier`
    } else {
      // For partial returns, show specific numbers like receipts
      eventDescription = `${totalReturned} out of ${totalReceived} received items returned (+${totalReturnedInThisAction} returned)`
    }

    try {
    await createPurchaseEvent({
      purchase_id: purchaseId,
      event_type: newStatus === 'returned' ? 'full_return' : 'partial_return',
      event_title: eventTitle,
      event_description: eventDescription,
      previous_status: currentPurchase?.status,
      new_status: newStatus,
      affected_items_count: affectedItemsCount,
      total_items_count: items?.length || 0,
      return_reason: returnData.return_reason,
      return_amount: totalReturnAmount,
      metadata: {
        returned_items: returnData.items.filter(item => item.return_quantity > 0),
        return_date: returnData.return_date,
        total_returned_in_action: totalReturnedInThisAction,
        total_returned_overall: totalReturned,
        total_received: totalReceived
      },
      created_by: returnData.returned_by
    })
    
    // Check if total received equals total returned and create balance resolved event
    // Only create this event if there was actual business activity (received > 0 and meaningful resolution)
    if (totalReceived > 0 && totalReceived === totalReturned && totalReceived > 1) {
      // Only create "balance resolved" for orders with significant activity (> 1 item)
      // For single-item orders that are fully returned, it's just a simple return, not a "resolution"
      console.log(`Creating balance resolved event: received ${totalReceived} = returned ${totalReturned}`)
      await createPurchaseEvent({
        purchase_id: purchaseId,
        event_type: 'balance_resolved',
        event_title: 'Order Balance Resolved',
        event_description: `All ${totalReceived} received items have been returned to supplier. Order effectively resolved with zero net received items.`,
        previous_status: newStatus,
        new_status: 'pending',
        total_items_count: items?.length || 0,
        metadata: {
          total_received: totalReceived,
          total_returned: totalReturned,
          net_received: totalReceived - totalReturned,
          resolution_date: returnData.return_date
        },
        created_by: returnData.returned_by
      })
    }

    // Note: Return records are now automatically created by the database trigger
    // when purchase_items.returned_quantity is updated. This prevents duplicates
    // and ensures consistency. The trigger creates both purchase_returns and 
    // purchase_return_items records automatically.
    console.log('✅ Return records will be created automatically by database trigger')
    } catch (timelineError) {
      const errorMessage = timelineError instanceof Error ? timelineError.message : 
                          (timelineError && typeof timelineError === 'object' ? JSON.stringify(timelineError) : 
                           String(timelineError) || 'Unknown timeline error')
      console.error('Failed to create timeline event (continuing anyway):', errorMessage)
      // Don't fail the entire operation just for timeline event creation
    }

    // 📊 ACCOUNTING INTEGRATION: Create journal entry for the purchase return
    if (totalReturnAmount > 0) {
      try {
        console.log('💰 Creating journal entry for purchase return:', purchaseId)
        
        // Generate a unique return ID for the journal entry
        const returnJournalId = `${purchaseId}-${Date.now()}`
        
        const journalEntryId = await createPurchaseReturnJournalEntry(
          returnJournalId,
          purchaseId,
          currentPurchase?.supplier_name || 'Unknown Supplier',
          totalReturnAmount,
          returnData.return_date,
          returnData.returned_by
        )
        
        console.log('✅ Journal entry created for purchase return:', journalEntryId)
      } catch (journalError) {
        console.error('⚠️ Failed to create journal entry for purchase return:', journalError)
        // Don't fail the entire operation for accounting issues
      }
    }

    console.log(`Purchase return processed successfully for ${purchaseId}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 
                        (error && typeof error === 'object' ? JSON.stringify(error) : 
                         String(error) || 'Unknown error')
    console.error('Error processing purchase return:', errorMessage)
    
    // Enhanced error handling for better debugging
    if (error && typeof error === 'object') {
      if ('message' in error && error.message) {
        throw new Error(`Purchase return processing failed: ${error.message}`)
      }
      if ('code' in error && error.code) {
        throw new Error(`Database error during return processing: ${error.code}`)
      }
      if ('details' in error && error.details) {
        throw new Error(`Return processing error: ${error.details}`)
      }
    }
    
    throw new Error(`Failed to process purchase return: ${errorMessage}`)
  }
}

// Helper function to calculate purchase status after return processing
// This function has been moved to purchases-calculations.ts

// getPurchaseStats moved to purchases-utils.ts and imported above
export { getPurchaseStats } from './purchases-utils'

// backfillAllTimelineEvents moved to purchases-utils.ts and imported above
export { backfillAllTimelineEvents } from './purchases-utils'

// Enhanced function to update received quantities and create timeline events
export async function updatePurchaseReceipt(
  purchaseId: string, 
  itemUpdates: { itemId: string; receivedQuantity: number }[]
): Promise<void> {
  try {
    console.log(`Updating receipt for purchase ${purchaseId} with ${itemUpdates.length} item updates`)
    
    // Get purchase details for warehouse and stock updates
    const purchase = await getPurchaseById(purchaseId)
    if (!purchase) {
      throw new Error('Purchase not found')
    }
    
    // Track total quantity change for timeline event and calculate total received amount
    let totalQuantityChange = 0
    let totalReceivedAmount = 0
    
    // Update each item's received quantity and warehouse stock
    for (const update of itemUpdates) {
      // Get current item details to calculate stock change
      const currentItem = purchase.items.find(item => item.id === update.itemId)
      if (!currentItem) {
        console.error(`Item ${update.itemId} not found in purchase ${purchaseId}`)
        continue
      }
      
      // Calculate the quantity difference (new received - previously received)
      const quantityDifference = update.receivedQuantity - currentItem.received_quantity
      totalQuantityChange += quantityDifference
      
      // Calculate the total amount for newly received items (for accounting)
      if (quantityDifference > 0) {
        totalReceivedAmount += quantityDifference * currentItem.purchase_price
      }
      
      // Update purchase item received quantity (absolute value)
      await updatePurchaseItemReceived(update.itemId, update.receivedQuantity)
      
      // Update warehouse stock only if there's a positive quantity change
      if (quantityDifference > 0) {
        try {
          if (currentItem.item_type === 'product') {
            await updateWarehouseStockFunction({
              productId: currentItem.item_id,
              warehouseId: purchase.warehouse_id,
              variationId: currentItem.variation_id || null,
              quantityChange: quantityDifference,
              movementType: 'purchase',
              referenceId: purchaseId,
              reason: `Purchase receipt - PO: ${purchaseId}`,
              createdBy: purchase.created_by,
              notes: `Stock added from purchase order ${purchaseId}`
            })
            console.log(`Updated warehouse stock for product ${currentItem.item_id}: +${quantityDifference}`)
          } else if (currentItem.item_type === 'package') {
            await updatePackagingWarehouseStockFunction({
              packagingId: currentItem.item_id,
              warehouseId: purchase.warehouse_id,
              variationId: currentItem.variation_id || null,
              quantityChange: quantityDifference,
              movementType: 'purchase',
              referenceId: purchaseId,
              reason: `Purchase receipt - PO: ${purchaseId}`,
              createdBy: purchase.created_by,
              notes: `Packaging stock added from purchase order ${purchaseId}`
            })
            console.log(`Updated warehouse stock for packaging ${currentItem.item_id}: +${quantityDifference}`)
          }
        } catch (stockError) {
          console.error(`Failed to update warehouse stock for item ${currentItem.item_id}:`, stockError)
          // Continue with other items even if one fails
        }
      }
    }
    
    // Update purchase status (without timeline event)
    await updatePurchaseStatus(purchaseId, false)
    
    // 📊 ACCOUNTING INTEGRATION: Create journal entry for received goods (only if there's a positive amount)
    if (totalReceivedAmount > 0) {
      // Generate a unique receipt ID for the journal entry
      const receiptJournalId = `RECEIPT-${purchaseId}-${Date.now()}`
      
      try {
        console.log('💰 Creating journal entry for purchase receipt:', purchaseId)
        console.log(`📋 Receipt Details: Amount: $${totalReceivedAmount.toFixed(2)}, Supplier: ${purchase.supplier_name}`)
        
        const journalEntryId = await createPurchaseReceiptJournalEntry(
          receiptJournalId,
          purchaseId,
          purchase.supplier_name,
          totalReceivedAmount,
          new Date().toISOString().split('T')[0], // Today's date
          purchase.created_by
        )
        
        console.log(`✅ Journal entry created for purchase receipt: ${journalEntryId} (Amount: $${totalReceivedAmount.toFixed(2)})`)
      } catch (journalError) {
        const errorMessage = journalError instanceof Error ? journalError.message : String(journalError)
        console.warn('⚠️ Purchase receipt accounting integration pending - database function not yet implemented')
        console.warn(`📝 Would create journal entry: Receipt ${receiptJournalId} for $${totalReceivedAmount.toFixed(2)}`)
        console.warn(`🔧 To enable: Create database function 'create_purchase_receipt_journal_entry'`)
        
        // Log the error details for debugging but don't fail the operation
        if (!errorMessage.includes('does not exist')) {
          console.error('⚠️ Unexpected accounting error:', journalError)
        }
      }
    }
    
    // Create receipt timeline event with actual quantity change
    await createReceiptTimelineEvent(purchaseId, totalQuantityChange)
    
    console.log(`Successfully updated receipt for ${purchaseId}`)
  } catch (error) {
    console.error('Error updating purchase receipt:', error)
    throw error
  }
}

// 💳 PAYMENT FUNCTIONS

// Get all payments for a purchase
export async function getPurchasePayments(purchaseId: string): Promise<PurchasePayment[]> {
  return withPurchaseDeduplication(`payments-${purchaseId}`, async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('purchase_payments')
      .select('*')
      .eq('purchase_id', purchaseId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchase payments:', error)
      throw error
    }

    return data || []
  })
}

// Create a new payment for a purchase
export async function createPurchasePayment(paymentData: CreatePurchasePaymentData): Promise<PurchasePayment> {
  const supabase = createClient()
  
  // Generate payment ID
  const paymentId = `PAY-${Date.now()}`
  
  const { data, error } = await supabase
    .from('purchase_payments')
    .insert([{
      id: paymentId,
      ...paymentData
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating purchase payment:', error)
    throw error
  }

  // The database triggers will automatically update the purchase amount_paid and payment_status
  console.log(`✅ Created payment ${paymentId} for purchase ${paymentData.purchase_id}`)
  
  // 📅 TIMELINE: Create timeline event for the payment
  try {
    const purchase = await getPurchaseById(paymentData.purchase_id)
    if (purchase) {
      // Calculate payment status after this payment
      const { netAmount } = calculateNetPaymentAmount(purchase)
      
      // Get current active payments (excluding this new payment) to calculate actual amount paid
      // Use direct database query to avoid caching issues
      const { data: existingPayments } = await supabase
        .from('purchase_payments')
        .select('amount, status')
        .eq('purchase_id', paymentData.purchase_id)
        .neq('id', paymentId) // Exclude the current payment we just created
      
      const currentAmountPaid = (existingPayments || [])
        .filter(p => p.status !== 'void')
        .reduce((sum, p) => sum + Number(p.amount), 0)
      
      // Add this new payment to get the total after this payment
      const newAmountPaid = currentAmountPaid + paymentData.amount
      const { status: paymentStatus } = calculatePaymentStatus(purchase, newAmountPaid)
      
      const paymentStatusText = paymentStatus === 'paid' ? 'fully paid' : 
                               paymentStatus === 'partial' ? 'partially paid' : 
                               paymentStatus === 'overpaid' ? 'overpaid' : 'paid'
      
      console.log(`💰 Payment calculation: netAmount=${netAmount}, currentPaid=${currentAmountPaid}, newPayment=${paymentData.amount}, totalAfter=${newAmountPaid}, status=${paymentStatus}`)
      
      await createPurchaseEvent({
        purchase_id: paymentData.purchase_id,
        event_type: 'payment_made',
        event_title: `Payment Received`,
        event_description: `Payment of ৳${paymentData.amount.toLocaleString()} received via ${paymentData.payment_method.replace('_', ' ')}. Purchase is now ${paymentStatusText}.`,
        payment_amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_id: paymentId,
        new_status: paymentStatus,
        created_by: paymentData.created_by
      })
      console.log(`📅 Created timeline event for payment ${paymentId}`)
    }
  } catch (timelineError) {
    console.error('⚠️ Failed to create timeline event for payment:', timelineError)
    // Don't throw error - payment was successful, timeline failed
  }
  
  // 📊 ACCOUNTING INTEGRATION: Create journal entry for the payment
  try {
    // Get purchase details for supplier name
    const purchase = await getPurchaseById(paymentData.purchase_id)
    if (purchase) {
      console.log('💰 Creating journal entry for payment:', paymentId)
      const journalEntryId = await createPaymentJournalEntry(
        paymentId,
        paymentData.purchase_id,
        purchase.supplier_name,
        paymentData.amount,
        paymentData.payment_date,
        paymentData.payment_method,
        paymentData.created_by
      )
      
      // Update payment record with journal entry ID
      await supabase
        .from('purchase_payments')
        .update({ journal_entry_id: journalEntryId })
        .eq('id', paymentId)
      
      console.log('✅ Journal entry created for payment:', journalEntryId)
    }
  } catch (journalError) {
    console.error('⚠️ Failed to create journal entry for payment:', journalError)
    // Don't throw error - payment was successful, accounting entry failed
  }
  
  return data
}

// Void a payment (creates audit trail instead of deleting)
export async function voidPurchasePayment(paymentId: string, voidReason?: string): Promise<PurchasePayment> {
  const supabase = createClient()
  
  // Get the original payment
  const { data: originalPayment, error: fetchError } = await supabase
    .from('purchase_payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (fetchError) {
    console.error('Error fetching payment to void:', fetchError)
    throw fetchError
  }

  if (!originalPayment) {
    throw new Error('Payment not found')
  }

  if (originalPayment.status === 'void') {
    throw new Error('Payment is already voided')
  }

  // Update the original payment with void status and reason
  const voidNotes = voidReason 
    ? `VOIDED: ${voidReason}`
    : 'VOIDED'

  const updatedNotes = originalPayment.notes 
    ? `${originalPayment.notes} | ${voidNotes}`
    : voidNotes

  const { data: voidedPayment, error: updateError } = await supabase
    .from('purchase_payments')
    .update({ 
      status: 'void',
      notes: updatedNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId)
    .select()
    .single()

  if (updateError) {
    console.error('Error voiding payment:', updateError)
    throw updateError
  }

  // 📊 ACCOUNTING INTEGRATION: Create reversal journal entry for voided payment
  if (originalPayment.journal_entry_id) {
    try {
      const purchase = await getPurchaseById(originalPayment.purchase_id)
      if (purchase) {
        console.log('💰 Creating reversal journal entry for voided payment:', paymentId)
        
        // Create a proper reversal entry using the dedicated reversal function
        const reversalPaymentId = `VOID-${paymentId}`
        const reversalJournalEntryId = await createPaymentReversalJournalEntry(
          paymentId,
          reversalPaymentId,
          originalPayment.purchase_id,
          purchase.supplier_name,
          originalPayment.amount, // Positive amount - reversal logic is in the function
          new Date().toISOString().split('T')[0],
          originalPayment.payment_method,
          originalPayment.created_by || 'system',
          voidReason
        )
        
        console.log('✅ Reversal journal entry created for voided payment:', reversalJournalEntryId)
      }
    } catch (journalError) {
      console.error('⚠️ Failed to create reversal journal entry for voided payment:', journalError)
      // Don't throw error - void was successful, accounting reversal failed
    }
  }

  // 📅 TIMELINE: Create timeline event for the voided payment
  try {
    const purchase = await getPurchaseById(originalPayment.purchase_id)
    if (purchase) {
      await createPurchaseEvent({
        purchase_id: originalPayment.purchase_id,
        event_type: 'payment_voided',
        event_title: `Payment Voided`,
        event_description: `Payment of ৳${originalPayment.amount.toLocaleString()} was voided. ${voidReason ? `Reason: ${voidReason}` : ''}`,
        payment_amount: originalPayment.amount,
        payment_method: originalPayment.payment_method,
        payment_id: paymentId,
        created_by: originalPayment.created_by || 'system'
      })
      console.log(`📅 Created timeline event for voided payment ${paymentId}`)
    }
  } catch (timelineError) {
    console.error('⚠️ Failed to create timeline event for voided payment:', timelineError)
    // Don't throw error - void was successful, timeline failed
  }

  console.log(`↩️ Voided payment ${paymentId}`)
  
  return voidedPayment
}

// Payment calculation functions have been moved to purchases-calculations.ts

// Get purchase with payment information and net calculations
export async function getPurchaseWithPayments(purchaseId: string): Promise<PurchaseWithPayments | null> {
  const [purchase, payments] = await Promise.all([
    getPurchaseById(purchaseId),
    getPurchasePayments(purchaseId)
  ])

  if (!purchase) return null

  return {
    ...purchase,
    payments
  }
}

// backfillPaymentTimelineEvents moved to purchases-utils.ts and imported above
export { backfillPaymentTimelineEvents } from './purchases-utils'

// fixAllPurchaseStatuses moved to purchases-utils.ts and imported above
export { fixAllPurchaseStatuses } from './purchases-utils' 