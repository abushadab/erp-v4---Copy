/**
 * Purchase Management Types
 * 
 * This module contains all type definitions for the purchase management system.
 * These types are shared across purchase-related modules to ensure type safety
 * and consistency throughout the application.
 * 
 * Types are organized by category:
 * - Core Database Types
 * - Business Logic Types
 * - UI/Form Types
 * - API Response Types
 * - Calculation Result Types
 * - Constants
 */

// ===== CORE DATABASE TYPES =====

/**
 * Database record for purchases table
 */
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

/**
 * Database record for purchase_items table
 */
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

/**
 * Database record for suppliers table
 */
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

/**
 * Database record for warehouses table
 */
export interface DatabaseWarehouse {
  id: string
  name: string
  location?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// ===== BUSINESS LOGIC TYPES =====

/**
 * Purchase with its items (primary business entity)
 */
export interface PurchaseWithItems extends DatabasePurchase {
  items: DatabasePurchaseItem[]
}

/**
 * Purchase return record
 */
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

/**
 * Purchase return item record
 */
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

/**
 * Refund transaction record
 */
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

/**
 * Purchase event/timeline record
 */
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

/**
 * Purchase payment record
 */
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

// ===== UI/FORM TYPES =====

/**
 * Data for creating a new purchase
 */
export interface CreatePurchaseData {
  supplier_id: string
  supplier_name: string
  warehouse_id: string
  warehouse_name: string
  purchase_date: string
  created_by: string
  notes?: string
}

/**
 * Data for creating a purchase item
 */
export interface CreatePurchaseItemData {
  item_id: string
  item_type: 'product' | 'package'
  item_name: string
  variation_id?: string
  quantity: number
  purchase_price: number
  total: number
}

/**
 * Data for updating a purchase
 */
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

/**
 * Data for processing a purchase return
 */
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

/**
 * Data for creating a purchase payment
 */
export interface CreatePurchasePaymentData {
  purchase_id: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'
  payment_date: string
  notes?: string
  created_by: string
}

// ===== API RESPONSE TYPES =====

/**
 * Response type for automatic refund processing
 */
export interface AutomaticRefundResponse {
  success: boolean
  refund_transactions: RefundTransaction[]
  errors: string[]
}

/**
 * Response type for refund breakdown calculation
 */
export interface RefundBreakdownResponse {
  success: boolean
  refunds: RefundTransaction[]
  total_amount: number
  errors: string[]
}

/**
 * Response type for refund eligibility check
 */
export interface RefundEligibilityResponse {
  eligible: boolean
  reason?: string
  days_since_purchase?: number
}

/**
 * Purchase statistics response
 */
export interface PurchaseStatsResponse {
  totalPurchases: number
  totalAmount: number
  pendingPurchases: number
  receivedPurchases: number
  partiallyReceivedPurchases: number
  cancelledPurchases: number
}

/**
 * Purchase with payment information
 */
export interface PurchaseWithPayments extends PurchaseWithItems {
  amount_paid?: number
  payment_status?: string
  payments?: PurchasePayment[]
}

// ===== CALCULATION RESULT TYPES =====

/**
 * Result of net payment amount calculation
 */
export interface NetPaymentAmount {
  originalAmount: number
  returnAmount: number
  netAmount: number
}

/**
 * Result of payment status calculation
 */
export interface PaymentStatus {
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
  remainingAmount: number
  overpaidAmount: number
}

/**
 * Result of original payment status calculation
 */
export interface OriginalPaymentStatus extends PaymentStatus {
  progressPercentage: number
}

/**
 * Result of refund due calculation
 */
export interface RefundDue {
  refundDue: number
  returnAmount: number
  hasReturns: boolean
  refundedAmount: number
  pendingRefundAmount: number
  paymentMadeAfterReturns: boolean
}

/**
 * Result of net payment status calculation
 */
export interface NetPaymentStatus extends PaymentStatus {
  progressPercentage: number
  baseAmount: number
  paymentMadeAfterReturns: boolean
}

/**
 * Complete payment status calculation result
 */
export interface CompletePaymentStatus {
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
}

// ===== CONSTANTS =====

/**
 * Payment methods for UI components
 */
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
] as const

/**
 * Purchase status values
 */
export type PurchaseStatus = 'pending' | 'partially_received' | 'received' | 'partially_returned' | 'returned' | 'cancelled'

/**
 * Purchase return status values
 */
export type PurchaseReturnStatus = 'pending' | 'completed' | 'cancelled'

/**
 * Refund status values
 */
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * Payment method values
 */
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'

/**
 * Item type values
 */
export type ItemType = 'product' | 'package'

/**
 * Payment status values
 */
export type PaymentStatusType = 'active' | 'void'

/**
 * Purchase event type values
 */
export type PurchaseEventType = 'order_placed' | 'partial_receipt' | 'full_receipt' | 'partial_return' | 'full_return' | 'cancelled' | 'status_change' | 'balance_resolved' | 'payment_made' | 'payment_voided'