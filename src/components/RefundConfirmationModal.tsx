"use client"

import * as React from "react"
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, AlertCircle, CheckCircle, DollarSign, Calendar, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type RefundTransaction } from "@/lib/supabase/purchases"

interface RefundConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  returnData: {
    return_number: string
    total_amount: number
    return_date: string
    reason: string
  }
  refundBreakdown: RefundTransaction[]
  isProcessing: boolean
}

export default function RefundConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  returnData,
  refundBreakdown,
  isProcessing
}: RefundConfirmationModalProps) {
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

  const getMethodBadge = (method: string) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      bank_transfer: 'bg-blue-100 text-blue-800',
      check: 'bg-orange-100 text-orange-800',
      credit_card: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={colors[method as keyof typeof colors] || colors.other}>
        {method.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const totalRefundAmount = refundBreakdown.reduce((sum, refund) => sum + refund.refund_amount, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Confirm Refund Processing
          </DialogTitle>
          <DialogDescription>
            Review the refund breakdown before processing. Refunds will be allocated using FIFO (First-In, First-Out) method.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Return Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Return Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Return Number:</span>
                <div className="font-medium">{returnData.return_number}</div>
              </div>
              <div>
                <span className="text-gray-600">Return Date:</span>
                <div className="font-medium">{formatDate(returnData.return_date)}</div>
              </div>
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <div className="font-semibold text-lg text-blue-600">{formatCurrency(returnData.total_amount)}</div>
              </div>
              <div>
                <span className="text-gray-600">Reason:</span>
                <div className="font-medium">{returnData.reason}</div>
              </div>
            </div>
          </div>

          {/* Refund Breakdown */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Refund Breakdown (FIFO Allocation)
            </h3>
            
            {refundBreakdown.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <h4 className="font-medium text-yellow-800 mb-2">No Payments to Refund</h4>
                <p className="text-yellow-700 text-sm">
                  This return cannot be automatically refunded because no payments have been made for this purchase.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Original Method</TableHead>
                      <TableHead>Refund Amount</TableHead>
                      <TableHead>Refund Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundBreakdown.map((refund, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {refund.payment_date ? formatDate(refund.payment_date) : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getMethodBadge(refund.refund_method)}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(refund.refund_amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {refund.refund_method === 'bank_transfer' ? (
                              <div className="text-sm">
                                <div className="font-medium">Bank Transfer</div>
                                <div className="text-gray-500">→ Check if failed</div>
                              </div>
                            ) : (
                              <div className="font-medium">
                                {refund.refund_method.replace('_', ' ').toUpperCase()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Total Summary */}
          {refundBreakdown.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-800">Total Refund Amount:</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(totalRefundAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <div className="font-semibold mb-2">Important Notes:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Refunds are processed using FIFO (First-In, First-Out) method</li>
                  <li>Bank transfers will automatically fallback to checks if they fail</li>
                  <li>Cash payments will be refunded as cash</li>
                  <li>This action cannot be undone once processed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing || refundBreakdown.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing Refund...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Process Refund
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 