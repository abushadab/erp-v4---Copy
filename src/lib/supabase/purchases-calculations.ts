/**
 * Pure Calculation Functions for Purchase Management
 * 
 * This module contains all pure calculation functions extracted from purchases.ts
 * These functions perform calculations for purchase statuses, payment statuses,
 * refunds, and other business logic without side effects.
 * 
 * All functions are self-contained and do not perform database operations,
 * making them easier to test and reason about.
 */

import { createClient } from './client'
import {
  DatabasePurchase,
  DatabasePurchaseItem,
  PurchaseWithItems,
  PurchaseReturn,
  PurchaseReturnItem,
  RefundTransaction,
  PurchaseEvent,
  NetPaymentAmount,
  PaymentStatus,
  OriginalPaymentStatus,
  RefundDue,
  NetPaymentStatus,
  CompletePaymentStatus,
  RefundBreakdownResponse,
  RefundEligibilityResponse
} from './purchases-types'

// ===== TYPE DEFINITIONS =====
// All types are now imported from purchases-types.ts

// ===== CALCULATION FUNCTIONS =====

/**
 * Calculate purchase status after return processing
 * 
 * This function determines the appropriate status based on comprehensive business logic
 * considering ordered, received, and returned quantities.
 */
export async function calculatePurchaseReturnStatus(purchaseId: string): Promise<'pending' | 'partially_received' | 'received' | 'partially_returned' | 'returned'> {
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

/**
 * Calculate net payment amount (original amount minus return amount)
 * 
 * This function calculates the effective amount that should be paid after considering returns.
 */
export function calculateNetPaymentAmount(purchase: PurchaseWithItems): NetPaymentAmount {
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

/**
 * Calculate payment status considering returns
 * 
 * This function determines payment status based on net amount (after returns).
 */
export function calculatePaymentStatus(purchase: PurchaseWithItems, amountPaid: number): PaymentStatus {
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

/**
 * Calculate payment status based on original purchase amount only
 * 
 * This shows whether the original purchase has been paid for, ignoring returns.
 */
export function calculateOriginalPaymentStatus(purchase: PurchaseWithItems, amountPaid: number): OriginalPaymentStatus {
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
 * 
 * This is separate from payment status and considers the timing of payments vs returns.
 */
export function calculateRefundDue(purchase: PurchaseWithItems, amountPaid: number, returns?: PurchaseReturn[], timeline?: PurchaseEvent[]): RefundDue {
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
 * 
 * This function uses sophisticated logic to determine payment status considering
 * when payments were made relative to returns.
 */
export function calculateNetPaymentStatus(purchase: PurchaseWithItems, amountPaid: number, timeline?: PurchaseEvent[]): NetPaymentStatus {
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
 * 
 * This function separates payment status from refund obligations and provides
 * comprehensive status information for UI display.
 */
export function calculateCompletePaymentStatus(purchase: PurchaseWithItems, amountPaid: number, returns?: PurchaseReturn[], timeline?: PurchaseEvent[]): CompletePaymentStatus {
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

/**
 * Calculate refund breakdown for a return
 * 
 * This function interfaces with the database to calculate how refunds should be
 * distributed across original payments.
 */
export async function calculateRefundBreakdown(returnId: string): Promise<RefundBreakdownResponse> {
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

/**
 * Check refund eligibility for a purchase
 * 
 * This function checks if a purchase is eligible for refund processing
 * based on business rules and time constraints.
 */
export async function checkRefundEligibility(purchaseId: string): Promise<RefundEligibilityResponse> {
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