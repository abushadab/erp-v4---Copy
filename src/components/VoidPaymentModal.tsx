"use client"

import * as React from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface VoidPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentAmount: number
  onConfirm: (reason: string) => void
  isLoading?: boolean
}

export default function VoidPaymentModal({
  isOpen,
  onClose,
  paymentAmount,
  onConfirm,
  isLoading = false
}: VoidPaymentModalProps) {
  const [reason, setReason] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(reason.trim())
  }

  const handleClose = () => {
    if (!isLoading) {
      setReason('')
      onClose()
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Void Payment
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The payment will be reversed with a negative entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-800">Payment Amount:</span>
              <span className="text-lg font-bold text-orange-900">
                {formatCurrency(paymentAmount)}
              </span>
            </div>
            <p className="text-xs text-orange-700 mt-2">
              A reversal entry of -{formatCurrency(paymentAmount)} will be created
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Void Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Voiding <span className="text-gray-500">(Optional)</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for voiding this payment..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                This reason will be recorded in the payment history for audit purposes.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-black hover:bg-gray-800 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Voiding...' : 'Void Payment'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 