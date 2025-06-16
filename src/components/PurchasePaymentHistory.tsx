"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { CreditCard, Plus, Calendar, DollarSign, FileText, Trash2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  getPurchasePayments, 
  voidPurchasePayment,
  PAYMENT_METHODS,
  calculateNetPaymentAmount,
  calculatePaymentStatus,
  calculateCompletePaymentStatus,
  getPurchaseReturns,
  calculateRefundBreakdown,
  processAutomaticRefund,
  checkRefundEligibility,
  type PurchasePayment,
  type PurchaseWithItems,
  type PurchaseReturn,
  type PurchaseEvent,
  type RefundTransaction
} from "@/lib/supabase/purchases"
import PurchasePaymentModal from "./PurchasePaymentModal"
import VoidPaymentModal from "./VoidPaymentModal"
import RefundConfirmationModal from "./RefundConfirmationModal"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface PurchasePaymentHistoryProps {
  purchaseId: string
  supplierName: string
  totalAmount: number
  amountPaid: number
  paymentStatus: string
  purchase: PurchaseWithItems
  payments: PurchasePayment[]
  timeline?: PurchaseEvent[]
  onPaymentUpdate: () => void
}

export default function PurchasePaymentHistory({
  purchaseId,
  supplierName,
  totalAmount,
  amountPaid,
  paymentStatus,
  purchase,
  payments: initialPayments,
  timeline,
  onPaymentUpdate
}: PurchasePaymentHistoryProps) {
  const [payments, setPayments] = React.useState<PurchasePayment[]>(initialPayments)
  const [loading, setLoading] = React.useState(false)
  const [showPaymentModal, setShowPaymentModal] = React.useState(false)
  const [showVoidModal, setShowVoidModal] = React.useState(false)
  const [selectedPayment, setSelectedPayment] = React.useState<{id: string, amount: number} | null>(null)
  const [isVoiding, setIsVoiding] = React.useState(false)
  
  // Refund-related state
  const [returns, setReturns] = React.useState<PurchaseReturn[]>([])
  const [returnsLoading, setReturnsLoading] = React.useState(false)
  const [showRefundModal, setShowRefundModal] = React.useState(false)
  const [selectedReturn, setSelectedReturn] = React.useState<PurchaseReturn | null>(null)
  const [refundBreakdown, setRefundBreakdown] = React.useState<RefundTransaction[]>([])
  const [isProcessingRefund, setIsProcessingRefund] = React.useState(false)

  React.useEffect(() => {
    setPayments(initialPayments)
  }, [initialPayments])

  const fetchPayments = React.useCallback(async () => {
    try {
      setLoading(true)
      const paymentData = await getPurchasePayments(purchaseId)
      setPayments(paymentData)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }, [purchaseId])

  const fetchReturns = React.useCallback(async () => {
    try {
      setReturnsLoading(true)
      const allReturns = await getPurchaseReturns()
      const purchaseReturns = allReturns.filter(ret => ret.purchase_id === purchaseId)
      setReturns(purchaseReturns)
    } catch (error) {
      console.error('Error fetching returns:', error)
      toast.error('Failed to load return history')
    } finally {
      setReturnsLoading(false)
    }
  }, [purchaseId])

  React.useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  const handlePaymentCreated = () => {
    fetchPayments()
    onPaymentUpdate()
  }

  const handleVoidPayment = (paymentId: string, amount: number) => {
    setSelectedPayment({ id: paymentId, amount })
    setShowVoidModal(true)
  }

  const handleConfirmVoid = async (reason: string) => {
    if (!selectedPayment) return

    setIsVoiding(true)
    try {
      await voidPurchasePayment(selectedPayment.id, reason || undefined)
      toast.success('Payment voided successfully')
      fetchPayments()
      onPaymentUpdate()
      setShowVoidModal(false)
      setSelectedPayment(null)
    } catch (error: any) {
      console.error('Error voiding payment:', error)
      toast.error(error?.message || 'Failed to void payment')
    } finally {
      setIsVoiding(false)
    }
  }

  const handleCloseVoidModal = () => {
    if (!isVoiding) {
      setShowVoidModal(false)
      setSelectedPayment(null)
    }
  }

  const handleProcessRefund = async (returnItem: PurchaseReturn) => {
    try {
      setSelectedReturn(returnItem)
      
      // Calculate refund breakdown
      const breakdown = await calculateRefundBreakdown(returnItem.id)
      if (!breakdown.success) {
        toast.error(breakdown.errors[0] || 'Failed to calculate refund breakdown')
        return
      }
      
      setRefundBreakdown(breakdown.refunds)
      setShowRefundModal(true)
    } catch (error) {
      console.error('Error calculating refund:', error)
      toast.error('Failed to calculate refund breakdown')
    }
  }

  const handleConfirmRefund = async () => {
    if (!selectedReturn) return

    try {
      setIsProcessingRefund(true)
      
      // Get current user
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('You must be logged in to process refunds')
        return
      }

      const result = await processAutomaticRefund(selectedReturn.id, user.id)
      
      if (result.success) {
        toast.success('Refund processed successfully!')
        setShowRefundModal(false)
        setSelectedReturn(null)
        setRefundBreakdown([])
        fetchReturns() // Refresh returns to show updated status
        onPaymentUpdate() // Refresh parent data
      } else {
        toast.error(result.errors[0] || 'Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('Failed to process refund')
    } finally {
      setIsProcessingRefund(false)
    }
  }

  const handleCloseRefundModal = () => {
    if (!isProcessingRefund) {
      setShowRefundModal(false)
      setSelectedReturn(null)
      setRefundBreakdown([])
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPaymentMethodLabel = (method: string) => {
    const paymentMethod = PAYMENT_METHODS.find(pm => pm.value === method)
    return paymentMethod?.label || method
  }

  const getPaymentStatusBadge = (status: string, netPaymentStatus?: { status: string; overpaidAmount: number }) => {
    // If we have net payment status and it shows overpaid, prioritize that
    if (netPaymentStatus?.status === 'overpaid') {
      return <Badge className="bg-purple-100 text-purple-800">Refund Due</Badge>
    }
    
    switch (status) {
      case 'fully_paid':
        return <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>
      case 'partially_paid':
        return <Badge className="bg-blue-100 text-blue-800">Partially Paid</Badge>
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>
      case 'overpaid':
        return <Badge className="bg-purple-100 text-purple-800">Refund Due</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRefundStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Refunded</Badge>
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Processing</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Pending</Badge>
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Failed</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const canProcessRefund = (returnItem: PurchaseReturn) => {
    return returnItem.refund_status === 'pending' && returnItem.auto_refund_eligible
  }

  // Calculate payment status using new business logic with returns data
      const completeStatus = calculateCompletePaymentStatus(purchase, amountPaid, returns, timeline)
  
  const remainingAmount = completeStatus.remainingAmount
  const progressPercentage = completeStatus.progressPercentage

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              Track payments made for this purchase order
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowPaymentModal(true)}
            disabled={remainingAmount <= 0}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Original Amount</div>
            <div className="text-lg font-semibold">{formatCurrency(purchase.total_amount)}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Amount Paid</div>
            <div className="text-lg font-semibold text-green-600">{formatCurrency(amountPaid)}</div>
          </div>
          
          {completeStatus.remainingAmount > 0 ? (
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Remaining Balance</div>
              <div className="text-lg font-semibold text-red-600">{formatCurrency(completeStatus.remainingAmount)}</div>
            </div>
          ) : completeStatus.overpaidAmount > 0 && !completeStatus.hasReturns ? (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Overpaid Amount</div>
              <div className="text-lg font-semibold text-purple-600">{formatCurrency(completeStatus.overpaidAmount)}</div>
            </div>
          ) : null}
          
          {completeStatus.hasReturns && (
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Items Returned</div>
              <div className="text-lg font-semibold text-orange-600">{formatCurrency(completeStatus.returnAmount)}</div>
            </div>
          )}
          
          {(completeStatus.refundDue > 0 || completeStatus.refundedAmount > 0) && (
            <div className={`rounded-lg p-4 ${
              completeStatus.refundedAmount > 0 && completeStatus.refundDue === 0 
                ? 'bg-green-50' 
                : 'bg-purple-50'
            }`}>
              <div className="text-sm text-gray-600 mb-1">
                {completeStatus.refundedAmount > 0 && completeStatus.refundDue === 0 ? 'Refunded' : 'Refund Due'}
              </div>
              <div className={`text-lg font-semibold ${
                completeStatus.refundedAmount > 0 && completeStatus.refundDue === 0 
                  ? 'text-green-600' 
                  : 'text-purple-600'
              }`}>
                {formatCurrency(
                  completeStatus.refundedAmount > 0 && completeStatus.refundDue === 0 
                    ? completeStatus.refundedAmount 
                    : completeStatus.refundDue
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Payment Progress</span>
            <div className="flex items-center gap-2">
              <span>{progressPercentage}%</span>
              <Badge variant="secondary" className={`text-xs ${
                completeStatus.displayBadgeColor === 'green' ? 'bg-green-100 text-green-800' :
                completeStatus.displayBadgeColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                completeStatus.displayBadgeColor === 'red' ? 'bg-red-100 text-red-800' :
                completeStatus.displayBadgeColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                completeStatus.displayBadgeColor === 'purple' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {completeStatus.displayStatus}
              </Badge>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div 
              className={`h-2 rounded-full ${progressPercentage >= 100 ? 'bg-green-600' : 'bg-blue-600'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>



        {/* Payment History Table */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading payment history...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Yet</h3>
            <p className="text-gray-500 mb-4">No payments have been recorded for this purchase.</p>
            <div className="flex justify-center">
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Record First Payment
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(payment.payment_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className={`h-4 w-4 ${payment.status === 'void' ? 'text-red-600' : 'text-green-600'}`} />
                        <div className="flex flex-col">
                          <span className={`font-semibold ${payment.status === 'void' ? 'text-red-600 line-through' : 'text-green-600'}`}>
                            {formatCurrency(Number(payment.amount))}
                          </span>
                          {payment.status === 'void' && (
                            <span className="text-xs text-red-500">VOIDED</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.notes ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 truncate max-w-[200px]" title={payment.notes}>
                            {payment.notes}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No notes</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.status === 'active' && Number(payment.amount) > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVoidPayment(payment.id, Number(payment.amount))}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          title="Void Payment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          {payment.status === 'void' ? 'Voided' : 'N/A'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Returns & Refunds Section */}
        {completeStatus.showRefundSection && (
          <div className="space-y-4">
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                Returns & Refunds
              </h3>
              
              {returnsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading returns...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {returns.map((returnItem) => (
                    <div key={returnItem.id} className="border rounded-lg p-4 bg-orange-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-gray-900">{returnItem.return_number}</div>
                          <div className="text-sm text-gray-600">
                            Returned on {formatDate(returnItem.return_date)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Reason: {returnItem.reason}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-orange-600 text-lg">
                            {formatCurrency(returnItem.total_amount)}
                          </div>
                          <div className="mt-1">
                            {getRefundStatusBadge(returnItem.refund_status)}
                          </div>
                        </div>
                      </div>
                      
                      {returnItem.refund_status === 'pending' && (
                        <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                          <div className="text-sm text-gray-600">
                            {returnItem.auto_refund_eligible ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Eligible for automatic refund
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-amber-600">
                                <AlertCircle className="h-4 w-4" />
                                Manual refund required
                              </div>
                            )}
                          </div>
                          
                          {canProcessRefund(returnItem) && (
                            <Button
                              size="sm"
                              onClick={() => handleProcessRefund(returnItem)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Process Refund
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {returnItem.refund_status === 'completed' && returnItem.refund_processed_at && (
                        <div className="pt-3 border-t border-orange-200">
                          <div className="text-sm text-green-600">
                            ✅ Refund processed on {formatDate(returnItem.refund_processed_at)}
                          </div>
                        </div>
                      )}
                      
                      {returnItem.refund_status === 'failed' && returnItem.refund_failure_reason && (
                        <div className="pt-3 border-t border-orange-200">
                          <div className="text-sm text-red-600">
                            ❌ Refund failed: {returnItem.refund_failure_reason}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <PurchasePaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          purchaseId={purchaseId}
          supplierName={supplierName}
          totalAmount={totalAmount}
          amountPaid={amountPaid}
          purchase={purchase}
          onPaymentCreated={handlePaymentCreated}
        />

        {/* Void Payment Modal */}
        <VoidPaymentModal
          isOpen={showVoidModal}
          onClose={handleCloseVoidModal}
          paymentAmount={selectedPayment?.amount || 0}
          onConfirm={handleConfirmVoid}
          isLoading={isVoiding}
        />

        {/* Refund Confirmation Modal */}
        {selectedReturn && (
          <RefundConfirmationModal
            isOpen={showRefundModal}
            onClose={handleCloseRefundModal}
            onConfirm={handleConfirmRefund}
            returnData={{
              return_number: selectedReturn.return_number,
              total_amount: selectedReturn.total_amount,
              return_date: selectedReturn.return_date,
              reason: selectedReturn.reason
            }}
            refundBreakdown={refundBreakdown}
            isProcessing={isProcessingRefund}
          />
        )}
      </CardContent>
    </Card>
  )
} 