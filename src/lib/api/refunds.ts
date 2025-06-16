import { createClient } from '@/lib/supabase/client'

export interface RefundTransaction {
  transaction_id: string
  payment_id: string
  amount: number
  method: string
  payment_date?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  failure_reason?: string
  bank_reference?: string
  check_number?: string
}

export interface RefundCalculationResult {
  success: boolean
  refunds: RefundTransaction[]
  total_amount: number
  errors: string[]
}

export interface ReturnRefundData {
  return_id: string
  return_number: string
  return_amount: number
  purchase_number: string
  supplier_name: string
  purchase_date: string
  refund_status: string
  refund_amount: number
  auto_refund_eligible: boolean
}

/**
 * Calculate automatic refund for a return
 */
export async function calculateAutomaticRefund(returnId: string): Promise<RefundCalculationResult> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('process_automatic_refund', {
      p_return_id: returnId,
      p_processed_by: null // Will be set by auth.uid() in the function
    })

    if (error) {
      console.error('Error calculating refund:', error)
      return {
        success: false,
        refunds: [],
        total_amount: 0,
        errors: [error.message]
      }
    }

    return data as RefundCalculationResult
  } catch (error) {
    console.error('Error calculating refund:', error)
    return {
      success: false,
      refunds: [],
      total_amount: 0,
      errors: ['Failed to calculate refund']
    }
  }
}

/**
 * Get return data with refund information
 */
export async function getReturnRefundData(returnId: string): Promise<ReturnRefundData | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('refund_summary')
      .select('*')
      .eq('return_id', returnId)
      .single()

    if (error) {
      console.error('Error fetching return refund data:', error)
      return null
    }

    return {
      return_id: data.return_id,
      return_number: data.return_number,
      return_amount: data.return_amount,
      purchase_number: data.purchase_number,
      supplier_name: data.supplier_name,
      purchase_date: data.purchase_date,
      refund_status: data.refund_status,
      refund_amount: data.refund_amount,
      auto_refund_eligible: data.auto_refund_eligible
    }
  } catch (error) {
    console.error('Error fetching return refund data:', error)
    return null
  }
}

/**
 * Get refund transactions for a return
 */
export async function getRefundTransactions(returnId: string): Promise<RefundTransaction[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('refund_transactions')
      .select(`
        id,
        original_payment_id,
        refund_amount,
        refund_method,
        status,
        processed_at,
        failure_reason,
        bank_reference,
        check_number,
        created_at
      `)
      .eq('return_id', returnId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching refund transactions:', error)
      return []
    }

    return data.map(transaction => ({
      transaction_id: transaction.id,
      payment_id: transaction.original_payment_id,
      amount: transaction.refund_amount,
      method: transaction.refund_method,
      status: transaction.status,
      failure_reason: transaction.failure_reason,
      bank_reference: transaction.bank_reference,
      check_number: transaction.check_number
    }))
  } catch (error) {
    console.error('Error fetching refund transactions:', error)
    return []
  }
}

/**
 * Complete a refund transaction
 */
export async function completeRefundTransaction(
  transactionId: string,
  bankReference?: string,
  checkNumber?: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('complete_refund_transaction', {
      p_transaction_id: transactionId,
      p_bank_reference: bankReference || null,
      p_check_number: checkNumber || null
    })

    if (error) {
      console.error('Error completing refund transaction:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error completing refund transaction:', error)
    return false
  }
}

/**
 * Mark a refund transaction as failed
 */
export async function failRefundTransaction(
  transactionId: string,
  failureReason: string
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.rpc('fail_refund_transaction', {
      p_transaction_id: transactionId,
      p_failure_reason: failureReason
    })

    if (error) {
      console.error('Error failing refund transaction:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error failing refund transaction:', error)
    return false
  }
}

/**
 * Check if a return is eligible for refund (30-day rule)
 */
export async function checkRefundEligibility(purchaseId: string): Promise<{
  eligible: boolean
  reason?: string
  daysSincePurchase: number
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
        reason: 'Error checking eligibility',
        daysSincePurchase: 0
      }
    }

    // Get purchase date to calculate days
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .select('created_at')
      .eq('id', purchaseId)
      .single()

    if (purchaseError) {
      console.error('Error fetching purchase date:', purchaseError)
      return {
        eligible: data === true,
        reason: data === false ? 'Purchase exceeds 30-day refund limit' : undefined,
        daysSincePurchase: 0
      }
    }

    const daysSincePurchase = Math.floor(
      (new Date().getTime() - new Date(purchaseData.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      eligible: data === true,
      reason: data === false ? 'Purchase exceeds 30-day refund limit' : undefined,
      daysSincePurchase
    }
  } catch (error) {
    console.error('Error checking refund eligibility:', error)
    return {
      eligible: false,
      reason: 'Error checking eligibility',
      daysSincePurchase: 0
    }
  }
}

/**
 * Get all refund transactions with summary data
 */
export async function getAllRefundTransactions(): Promise<{
  transactions: RefundTransaction[]
  summary: {
    total_pending: number
    total_completed: number
    total_failed: number
    pending_amount: number
    completed_amount: number
    failed_amount: number
  }
}> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('refund_transactions')
      .select(`
        id,
        original_payment_id,
        refund_amount,
        refund_method,
        status,
        processed_at,
        failure_reason,
        bank_reference,
        check_number,
        created_at,
        return_id,
        purchase_returns!inner(
          return_number,
          purchase_id,
          purchases!inner(
            purchase_number,
            suppliers!inner(name)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all refund transactions:', error)
      return {
        transactions: [],
        summary: {
          total_pending: 0,
          total_completed: 0,
          total_failed: 0,
          pending_amount: 0,
          completed_amount: 0,
          failed_amount: 0
        }
      }
    }

    const transactions = data.map(transaction => ({
      transaction_id: transaction.id,
      payment_id: transaction.original_payment_id,
      amount: transaction.refund_amount,
      method: transaction.refund_method,
      status: transaction.status,
      failure_reason: transaction.failure_reason,
      bank_reference: transaction.bank_reference,
      check_number: transaction.check_number
    }))

    // Calculate summary
    const summary = data.reduce((acc, transaction) => {
      switch (transaction.status) {
        case 'pending':
        case 'processing':
          acc.total_pending++
          acc.pending_amount += transaction.refund_amount
          break
        case 'completed':
          acc.total_completed++
          acc.completed_amount += transaction.refund_amount
          break
        case 'failed':
          acc.total_failed++
          acc.failed_amount += transaction.refund_amount
          break
      }
      return acc
    }, {
      total_pending: 0,
      total_completed: 0,
      total_failed: 0,
      pending_amount: 0,
      completed_amount: 0,
      failed_amount: 0
    })

    return { transactions, summary }
  } catch (error) {
    console.error('Error fetching all refund transactions:', error)
    return {
      transactions: [],
      summary: {
        total_pending: 0,
        total_completed: 0,
        total_failed: 0,
        pending_amount: 0,
        completed_amount: 0,
        failed_amount: 0
      }
    }
  }
} 