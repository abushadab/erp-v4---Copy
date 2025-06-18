import { createClient } from './client'
import { updateWarehouseStock as updateWarehouseStockFunction } from '../utils/multi-warehouse-stock'
import { updatePackagingWarehouseStock as updatePackagingWarehouseStockFunction } from '../utils/multi-warehouse-packaging-stock'
import { createPurchaseJournalEntry, createPurchaseReturnJournalEntry, createPurchaseReceiptJournalEntry, createPaymentJournalEntry, createPaymentReversalJournalEntry } from './accounts-client'

// 🔄 REQUEST DEDUPLICATION SYSTEM (prevents duplicate API calls in React 18 Strict Mode)
const purchaseDataCache = new Map<string, {
  currentRequest?: Promise<any>
  lastFetch?: number
  data?: any
}>()

function withPurchaseDeduplication<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = purchaseDataCache.get(key)
  const now = Date.now()
  
  // If there's an active request, return it
  if (cached?.currentRequest) {
    console.log(`🔄 Deduplicating purchase request: ${key}`)
    return cached.currentRequest
  }
  
  // Create new request
  const request = fn().finally(() => {
    // Clear the active request when done
    const entry = purchaseDataCache.get(key)
    if (entry) {
      entry.currentRequest = undefined
      entry.lastFetch = now
    }
  })
  
  // Store the active request
  if (!cached) {
    purchaseDataCache.set(key, { currentRequest: request })
  } else {
    cached.currentRequest = request
  }
  
  return request
}

// Database types for purchases
export interface DatabasePurchase {
  id: string
  supplier_id: string
  supplier_name: string
  warehouse_id: string
  warehouse_name: string
  total_amount: number
  purchase_date: string
  status: 'pending' | 'partially_received' | 'received' | 'partially_returned' | 'returned' | 'cancelled'
  created_by: string
  last_updated: string
  notes?: string
  created_at: string
  updated_at: string
  amount_paid?: number
  payment_status?: string
}

export interface DatabasePurchaseItem {
  id: string
  purchase_id: string
  item_id: string
  item_type: 'product' | 'package'
  item_name: string
  variation_id?: string
  quantity: number
  received_quantity: number
  returned_quantity: number
  purchase_price: number
  total: number
  created_at: string
  updated_at: string
}

export interface DatabaseSupplier {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  status: 'active' | 'inactive'
  total_purchases: number
  total_spent: number
  join_date: string
  created_at: string
  updated_at: string
}

export interface DatabaseWarehouse {
  id: string
  name: string
  location?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}



// Combined type for purchase with items
export interface PurchaseWithItems extends DatabasePurchase {
  items: DatabasePurchaseItem[]
}

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

export async function getPurchaseById(id: string): Promise<PurchaseWithItems | null> {
  return withPurchaseDeduplication(`purchase-${id}`, async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        items:purchase_items(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Purchase not found
      }
      console.error('Error fetching purchase:', error)
      throw new Error('Failed to fetch purchase')
    }

    return data
  })
}

export async function getSuppliers(): Promise<DatabaseSupplier[]> {
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
}

// Use cached version from queries to prevent duplicate API calls
import { getActiveWarehouses } from './queries'

export async function getWarehouses(): Promise<DatabaseWarehouse[]> {
  return await getActiveWarehouses()
}

// New interface for purchase returns with refund data
export interface PurchaseReturn {
  id: string
  purchase_id: string
  return_number: string
  supplier_id: string
  supplier_name: string
  warehouse_id: string
  warehouse_name: string
  total_amount: number
  return_date: string
  reason: string
  status: 'pending' | 'completed' | 'cancelled'
  processed_by?: string
  notes?: string
  refund_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  refund_amount: number
  refund_processed_at?: string
  refund_processed_by?: string
  refund_failure_reason?: string
  auto_refund_eligible: boolean
  created_at: string
  updated_at: string
  // Related data
  purchase?: DatabasePurchase
  items?: PurchaseReturnItem[]
  refund_transactions?: RefundTransaction[]
}

export interface PurchaseReturnItem {
  id: string
  return_id: string
  item_id: string
  item_type: 'product' | 'package'
  item_name: string
  variation_id?: string
  quantity_returned: number
  unit_price: number
  total_amount: number
  created_at: string
  updated_at: string
}

export interface RefundTransaction {
  id: string
  return_id: string
  payment_id: string
  refund_amount: number
  refund_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  payment_date?: string
  bank_reference?: string
  check_number?: string
  failure_reason?: string
  processed_at?: string
  journal_entry_id?: string
  created_at: string
  updated_at: string
}

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
        
// Legacy method for backward compatibility
async function getPurchaseReturnsLegacy(): Promise<PurchaseWithItems[]> {
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

// Convert legacy purchase returns to new format
function convertLegacyReturns(legacyReturns: PurchaseWithItems[]): PurchaseReturn[] {
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

// New refund-related functions
export async function calculateRefundBreakdown(returnId: string): Promise<{
  success: boolean
  refunds: RefundTransaction[]
  total_amount: number
  errors: string[]
}> {
  const supabase = createClient()

  try {
    // First, get the return data to extract purchase_id and total_amount
    const { data: returnData, error: returnError } = await supabase
      .from('purchase_returns')
      .select('purchase_id, total_amount')
      .eq('id', returnId)
      .single()

    if (returnError || !returnData) {
      console.error('Error fetching return data:', returnError)
      return {
        success: false,
        refunds: [],
        total_amount: 0,
        errors: [returnError?.message || 'Return not found']
      }
    }

    // Now call the database function with correct parameters
    const { data, error } = await supabase.rpc('calculate_refund_breakdown', {
      p_purchase_id: returnData.purchase_id,
      p_refund_amount: returnData.total_amount
    })

    if (error) {
      console.error('Error calculating refund breakdown:', error)
      return {
        success: false,
        refunds: [],
        total_amount: 0,
        errors: [error.message]
      }
    }

    // Transform the database result to match our interface
    const refunds: RefundTransaction[] = data?.map((item: any) => ({
      id: `temp-${item.payment_id}`,
      return_id: returnId,
      payment_id: item.payment_id,
      refund_amount: Number(item.refund_amount),
      refund_method: item.payment_method,
      status: 'pending' as const,
      payment_date: item.payment_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })) || []

    const totalAmount = refunds.reduce((sum, refund) => sum + refund.refund_amount, 0)

    return {
      success: true,
      refunds,
      total_amount: totalAmount,
      errors: []
    }
  } catch (error) {
    console.error('Refund calculation failed:', error)
    return {
      success: false,
      refunds: [],
      total_amount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

export async function processAutomaticRefund(returnId: string, processedBy: string): Promise<{
  success: boolean
  refund_transactions: RefundTransaction[]
  errors: string[]
}> {
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

export async function checkRefundEligibility(purchaseId: string): Promise<{
  eligible: boolean
  reason?: string
  days_since_purchase?: number
}> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('is_return_refund_eligible', {
      p_purchase_id: purchaseId
    })

    if (error) {
      console.error('Error checking refund eligibility:', error)
      return {
        eligible: false,
        reason: error.message
      }
    }

    return data || {
      eligible: false,
      reason: 'No data returned'
    }
  } catch (error) {
    console.error('Refund eligibility check failed:', error)
    return {
      eligible: false,
      reason: error instanceof Error ? error.message : 'Unknown error'
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

// Mutation functions
export interface CreatePurchaseData {
  supplier_id: string
  supplier_name: string
  warehouse_id: string
  warehouse_name: string
  purchase_date: string
  created_by: string
  notes?: string
}

export interface CreatePurchaseItemData {
  item_id: string
  item_type: 'product' | 'package'
  item_name: string
  variation_id?: string
  quantity: number
  purchase_price: number
  total: number
}

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

export interface UpdatePurchaseData {
  id: string
  supplier_id?: string
  supplier_name?: string
  warehouse_id?: string
  warehouse_name?: string
  purchase_date?: string
  status?: 'pending' | 'partially_received' | 'received' | 'returned' | 'cancelled'
  notes?: string
}

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

// New function specifically for tracking receipt updates
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

// Return functions
export interface ProcessPurchaseReturnData {
  purchase_id: string
  return_reason: string
  return_date: string
  returned_by: string
  items: {
    item_id: string
    return_quantity: number
  }[]
}

// Timeline event types
export interface PurchaseEvent {
  id: string
  purchase_id: string
  event_type: 'order_placed' | 'partial_receipt' | 'full_receipt' | 'partial_return' | 'full_return' | 'cancelled' | 'status_change' | 'balance_resolved' | 'payment_made' | 'payment_voided'
  event_title: string
  event_description?: string
  previous_status?: string
  new_status?: string
  affected_items_count?: number
  total_items_count?: number
  return_reason?: string
  return_amount?: number
  payment_amount?: number
  payment_method?: string
  payment_id?: string
  metadata?: any
  created_by?: string
  created_at: string
  event_date: string
}

// Payment types
export interface PurchasePayment {
  id: string
  purchase_id: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'
  payment_date: string
  notes?: string
  journal_entry_id?: string
  created_by?: string
  status: 'active' | 'void'
  created_at: string
  updated_at: string
}

export interface CreatePurchasePaymentData {
  purchase_id: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'
  payment_date: string
  notes?: string
  created_by: string
}

// Payment methods for UI
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
] as const

// Create timeline event function
export async function createPurchaseEvent(eventData: {
  purchase_id: string
  event_type: PurchaseEvent['event_type']
  event_title: string
  event_description?: string
  previous_status?: string
  new_status?: string
  affected_items_count?: number
  total_items_count?: number
  return_reason?: string
  return_amount?: number
  payment_amount?: number
  payment_method?: string
  payment_id?: string
  metadata?: any
  created_by?: string
}): Promise<string> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('purchase_events')
      .insert([eventData])
      .select('id')
      .single()

    if (error) {
      // Handle duplicate order_placed events gracefully
      if (error.code === '23505' && eventData.event_type === 'order_placed') {
        console.log(`Order placed event already exists for ${eventData.purchase_id}, skipping duplicate`)
        // Return a placeholder ID since this is not an error
        return 'duplicate-prevented'
      }
      
      const errorMessage = error.message || JSON.stringify(error) || 'Unknown database error'
      console.error('Error creating purchase event:', errorMessage)
      throw new Error(`Failed to create purchase event: ${errorMessage}`)
    }

    return data.id
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 
                        (error && typeof error === 'object' ? JSON.stringify(error) : 
                         String(error) || 'Unknown error')
    console.error('Error in createPurchaseEvent:', errorMessage)
    throw new Error(`Error in createPurchaseEvent: ${errorMessage}`)
  }
}

// Function to generate initial timeline events for existing purchases
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
async function calculatePurchaseReturnStatus(purchaseId: string): Promise<'pending' | 'partially_received' | 'received' | 'partially_returned' | 'returned'> {
  const supabase = await createClient()

  // Get all items for this purchase with full details
  const { data: items, error } = await supabase
    .from('purchase_items')
    .select('quantity, received_quantity, returned_quantity')
    .eq('purchase_id', purchaseId)

  if (error) {
    console.error('Error fetching items for status calculation:', error)
    throw new Error('Failed to calculate return status')
  }

  // Calculate totals
  const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalReceived = items.reduce((sum, item) => sum + item.received_quantity, 0)
  const totalReturned = items.reduce((sum, item) => sum + item.returned_quantity, 0)
  const netReceived = totalReceived - totalReturned // Items that are currently in possession

  // Determine status based on comprehensive business logic
  if (totalReturned === 0) {
    // No returns yet - use standard receipt logic
    if (totalReceived === 0) {
      return 'pending'
    } else if (totalReceived < totalOrdered) {
      return 'partially_received'
  } else {
      return 'received'
    }
  } else {
    // Returns have occurred - determine appropriate status
    if (netReceived === 0) {
      // All received items have been returned
      if (totalReceived === totalOrdered) {
        // All ordered items were received and then returned = Full Return
        return 'returned'
      } else {
        // Only some items were received and then returned = Back to Pending
        return 'pending'
      }
    } else {
      // Some items are still in possession after returns
      if (totalReceived === totalOrdered) {
        // All items were received, but some returned = Partial Return
        return 'partially_returned'
      } else {
        // Still have partial receipt situation with some returns = Partial Receipt
        return 'partially_received'
      }
    }
  }
}

// Statistics functions
export async function getPurchaseStats(): Promise<{
  totalPurchases: number
  totalAmount: number
  pendingPurchases: number
  receivedPurchases: number
  partiallyReceivedPurchases: number
  cancelledPurchases: number
}> {
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

// Utility function to backfill timeline events for all purchases
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

// Calculate net payment amount (original amount minus return amount)
export function calculateNetPaymentAmount(purchase: PurchaseWithItems): {
  originalAmount: number
  returnAmount: number
  netAmount: number
} {
  const originalAmount = purchase.total_amount
  const returnAmount = purchase.items.reduce((sum, item) => 
    sum + (item.returned_quantity * item.purchase_price), 0
  )
  const netAmount = originalAmount - returnAmount

  return {
    originalAmount,
    returnAmount,
    netAmount: Math.max(0, netAmount) // Ensure non-negative
  }
}

// Calculate payment status considering returns
export function calculatePaymentStatus(purchase: PurchaseWithItems, amountPaid: number): {
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  remainingAmount: number
  overpaidAmount: number
} {
  const { netAmount } = calculateNetPaymentAmount(purchase)
  
  if (amountPaid === 0) {
    return {
      status: 'unpaid',
      remainingAmount: netAmount,
      overpaidAmount: 0
    }
  }
  
  if (amountPaid < netAmount) {
    return {
      status: 'partial',
      remainingAmount: netAmount - amountPaid,
      overpaidAmount: 0
    }
  }
  
  if (amountPaid === netAmount) {
    return {
      status: 'paid',
      remainingAmount: 0,
      overpaidAmount: 0
    }
  }
  
  // amountPaid > netAmount
    return {
      status: 'overpaid',
      remainingAmount: 0,
      overpaidAmount: amountPaid - netAmount
    }
}

// NEW PAYMENT STATUS FUNCTIONS FOR PROPER BUSINESS LOGIC

/**
 * Calculate payment status based on original purchase amount only
 * This shows whether the original purchase has been paid for
 */
export function calculateOriginalPaymentStatus(purchase: PurchaseWithItems, amountPaid: number): {
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  remainingAmount: number
  overpaidAmount: number
  progressPercentage: number
} {
  const originalAmount = purchase.total_amount
  
  if (amountPaid === 0) {
    return {
      status: 'unpaid',
      remainingAmount: originalAmount,
      overpaidAmount: 0,
      progressPercentage: 0
    }
  }
  
  if (amountPaid < originalAmount) {
    return {
      status: 'partial',
      remainingAmount: originalAmount - amountPaid,
      overpaidAmount: 0,
      progressPercentage: Math.round((amountPaid / originalAmount) * 100)
    }
  }
  
  if (amountPaid === originalAmount) {
    return {
      status: 'paid',
      remainingAmount: 0,
      overpaidAmount: 0,
      progressPercentage: 100
    }
  }
  
  // amountPaid > originalAmount - true overpayment
  return {
    status: 'overpaid',
    remainingAmount: 0,
    overpaidAmount: amountPaid - originalAmount,
    progressPercentage: Math.round((amountPaid / originalAmount) * 100)
  }
}

/**
 * Calculate refund amount due based on returned items, actual refund status, and chronological order
 * This is separate from payment status
 */
export function calculateRefundDue(purchase: PurchaseWithItems, amountPaid: number, returns?: PurchaseReturn[], timeline?: PurchaseEvent[]): {
  refundDue: number
  returnAmount: number
  hasReturns: boolean
  refundedAmount: number
  pendingRefundAmount: number
  paymentMadeAfterReturns: boolean
} {
  const { returnAmount } = calculateNetPaymentAmount(purchase)
  const hasReturns = returnAmount > 0
  
  // Calculate actual refund status from returns data
  let refundedAmount = 0
  let pendingRefundAmount = 0
  
  if (returns && returns.length > 0) {
    returns.forEach(returnItem => {
      if (returnItem.refund_status === 'completed') {
        refundedAmount += returnItem.refund_amount || 0
      } else if (returnItem.refund_status === 'pending' || returnItem.refund_status === 'processing') {
        pendingRefundAmount += returnItem.total_amount || 0
      }
    })
  }
  
  // Check chronological order: were payments made after returns?
  let paymentMadeAfterReturns = false
  if (timeline && timeline.length > 0 && hasReturns) {
    // Sort events by date
    const sortedEvents = [...timeline].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    // Find the last return event and first payment event
    const lastReturnEvent = sortedEvents
      .filter(e => e.event_type === 'partial_return' || e.event_type === 'full_return')
      .pop()
    
    const firstPaymentEvent = sortedEvents
      .find(e => e.event_type === 'payment_made')
    
    // If there's a payment made after the last return, it was likely adjusted
    if (lastReturnEvent && firstPaymentEvent) {
      paymentMadeAfterReturns = new Date(firstPaymentEvent.created_at) > new Date(lastReturnEvent.created_at)
    }
  }
  
  // Calculate remaining refund due
  let refundDue = 0
  if (hasReturns && amountPaid > 0) {
    if (paymentMadeAfterReturns) {
      // Payment was made after returns, likely adjusted - no refund due unless explicitly processed
      refundDue = 0
    } else {
      // Payment was made before returns - refund may be due
      const maxRefundable = Math.min(returnAmount, amountPaid)
      refundDue = Math.max(0, maxRefundable - refundedAmount)
    }
  }
  
  return {
    refundDue,
    returnAmount,
    hasReturns,
    refundedAmount,
    pendingRefundAmount,
    paymentMadeAfterReturns
  }
}

/**
 * Calculate payment status based on net amount (considering returns and chronology)
 */
export function calculateNetPaymentStatus(purchase: PurchaseWithItems, amountPaid: number, timeline?: PurchaseEvent[]): {
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  remainingAmount: number
  overpaidAmount: number
  progressPercentage: number
  baseAmount: number
  paymentMadeAfterReturns: boolean
} {
  const { originalAmount, returnAmount, netAmount } = calculateNetPaymentAmount(purchase)
  
  // Check if payment was made after returns
  let paymentMadeAfterReturns = false
  if (timeline && timeline.length > 0 && returnAmount > 0) {
    const sortedEvents = [...timeline].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    const lastReturnEvent = sortedEvents
      .filter(e => e.event_type === 'partial_return' || e.event_type === 'full_return')
      .pop()
    
    const firstPaymentEvent = sortedEvents
      .find(e => e.event_type === 'payment_made')
    
    if (lastReturnEvent && firstPaymentEvent) {
      paymentMadeAfterReturns = new Date(firstPaymentEvent.created_at) > new Date(lastReturnEvent.created_at)
    }
  }
  
  // Use net amount as base when payment was made after returns, otherwise use original amount
  const baseAmount = paymentMadeAfterReturns ? netAmount : originalAmount
  
  let status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  let remainingAmount = 0
  let overpaidAmount = 0
  let progressPercentage = 0
  
  if (amountPaid === 0) {
    status = 'unpaid'
    remainingAmount = baseAmount
    progressPercentage = 0
  } else if (amountPaid < baseAmount) {
    status = 'partial'
    remainingAmount = baseAmount - amountPaid
    progressPercentage = Math.round((amountPaid / baseAmount) * 100)
  } else if (amountPaid === baseAmount) {
    status = 'paid'
    remainingAmount = 0
    progressPercentage = 100
  } else {
    status = 'overpaid'
    overpaidAmount = amountPaid - baseAmount
    progressPercentage = Math.round((amountPaid / baseAmount) * 100)
  }
  
  return {
    status,
    remainingAmount,
    overpaidAmount,
    progressPercentage,
    baseAmount,
    paymentMadeAfterReturns
  }
}

/**
 * Complete payment status calculation with proper business logic
 * Separates payment status from refund obligations
 */
export function calculateCompletePaymentStatus(purchase: PurchaseWithItems, amountPaid: number, returns?: PurchaseReturn[], timeline?: PurchaseEvent[]): {
  // Original payment status
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  remainingAmount: number
  overpaidAmount: number
  progressPercentage: number
  
  // Refund information
  refundDue: number
  returnAmount: number
  hasReturns: boolean
  refundedAmount: number
  pendingRefundAmount: number
  paymentMadeAfterReturns: boolean
  
  // Display information
  displayStatus: string
  displayBadgeColor: string
  showRefundSection: boolean
} {
  // Use the new net payment status calculation
  const netPayment = calculateNetPaymentStatus(purchase, amountPaid, timeline)
  const refundInfo = calculateRefundDue(purchase, amountPaid, returns, timeline)
  
  // Determine display status and colors
  let displayStatus: string
  let displayBadgeColor: string
  
  if (refundInfo.paymentMadeAfterReturns) {
    // Payment was made after returns - treat as adjusted payment, no refund confusion
    switch (netPayment.status) {
      case 'unpaid':
        displayStatus = 'Unpaid'
        displayBadgeColor = 'red'
        break
      case 'partial':
        displayStatus = 'Partially Paid'
        displayBadgeColor = 'yellow'
        break
      case 'paid':
        displayStatus = 'Paid'
        displayBadgeColor = 'green'
        break
      case 'overpaid':
        displayStatus = 'Overpaid'
        displayBadgeColor = 'purple'
        break
    }
  } else if (refundInfo.refundedAmount > 0 && refundInfo.refundDue === 0) {
    // Refunds have been completed
    if (netPayment.status === 'paid') {
      displayStatus = 'Paid - Refunded'
      displayBadgeColor = 'green' // Green for completed state
    } else if (netPayment.status === 'overpaid') {
      displayStatus = 'Overpaid - Refunded'
      displayBadgeColor = 'green' // Green for completed state
    } else {
      displayStatus = 'Partial - Refunded'
      displayBadgeColor = 'green'
    }
  } else if (refundInfo.refundDue > 0) {
    // There's still a refund due
    if (netPayment.status === 'paid') {
      displayStatus = 'Paid - Refund Due'
      displayBadgeColor = 'orange' // Orange for refund due
    } else if (netPayment.status === 'overpaid') {
      displayStatus = 'Overpaid - Refund Due'
      displayBadgeColor = 'orange' // Orange for refund due
    } else {
      displayStatus = 'Partial - Refund Due'
      displayBadgeColor = 'orange'
    }
  } else {
    // No refunds involved - standard status
    switch (netPayment.status) {
      case 'unpaid':
        displayStatus = 'Unpaid'
        displayBadgeColor = 'red'
        break
      case 'partial':
        displayStatus = 'Partially Paid'
        displayBadgeColor = 'yellow'
        break
      case 'paid':
        displayStatus = 'Paid'
        displayBadgeColor = 'green'
        break
      case 'overpaid':
        displayStatus = 'Overpaid'
        displayBadgeColor = 'purple'
        break
    }
  }
  
  return {
    // Payment status (now using net calculation)
    paymentStatus: netPayment.status,
    remainingAmount: netPayment.remainingAmount,
    overpaidAmount: netPayment.overpaidAmount,
    progressPercentage: netPayment.progressPercentage,
    
    // Refund information
    refundDue: refundInfo.refundDue,
    returnAmount: refundInfo.returnAmount,
    hasReturns: refundInfo.hasReturns,
    refundedAmount: refundInfo.refundedAmount,
    pendingRefundAmount: refundInfo.pendingRefundAmount,
    paymentMadeAfterReturns: refundInfo.paymentMadeAfterReturns,
    
    // Display information
    displayStatus,
    displayBadgeColor,
    showRefundSection: (refundInfo.refundDue > 0 || refundInfo.refundedAmount > 0) && !refundInfo.paymentMadeAfterReturns
  }
}

// Get purchase with payment information and net calculations
export async function getPurchaseWithPayments(purchaseId: string): Promise<PurchaseWithItems & { 
  amount_paid?: number
  payment_status?: string
  payments?: PurchasePayment[]
} | null> {
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

// Utility function to fix all purchase statuses using the new logic
// Function to backfill payment timeline events for existing payments
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