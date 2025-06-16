"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { X, CreditCard, Calendar, DollarSign, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createPurchasePayment, PAYMENT_METHODS, calculateNetPaymentAmount, calculatePaymentStatus, type CreatePurchasePaymentData, type PurchaseWithItems } from "@/lib/supabase/purchases"
import { toast } from "sonner"

interface PurchasePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseId: string
  supplierName: string
  totalAmount: number
  amountPaid: number
  purchase: PurchaseWithItems
  onPaymentCreated: () => void
}

export default function PurchasePaymentModal({
  isOpen,
  onClose,
  purchaseId,
  supplierName,
  totalAmount,
  amountPaid,
  purchase,
  onPaymentCreated
}: PurchasePaymentModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    amount: '',
    payment_method: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // Calculate net payment amounts
  const netAmounts = calculateNetPaymentAmount(purchase)
  const paymentStatus = calculatePaymentStatus(purchase, amountPaid)
  
  const remainingAmount = paymentStatus.remainingAmount
  const maxPayment = Math.max(0, remainingAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.amount || !formData.payment_method || !formData.payment_date) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (amount > maxPayment) {
      toast.error(`Payment amount cannot exceed remaining balance of ৳${maxPayment.toLocaleString()}`)
      return
    }

    setIsLoading(true)
    
    try {
      const paymentData: CreatePurchasePaymentData = {
        purchase_id: purchaseId,
        amount: amount,
        payment_method: formData.payment_method as any,
        payment_date: formData.payment_date,
        notes: formData.notes || undefined,
        created_by: 'admin' // TODO: Replace with actual user
      }

      await createPurchasePayment(paymentData)
      
      toast.success(`Payment of ৳${amount.toLocaleString()} recorded successfully!`)
      
      // Reset form
      setFormData({
        amount: '',
        payment_method: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      
      onPaymentCreated()
      onClose()
      
    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error('Failed to record payment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for purchase from <strong>{supplierName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original Amount:</span>
              <span className="font-semibold">{formatCurrency(netAmounts.originalAmount)}</span>
            </div>
            
            {netAmounts.returnAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Return Amount:</span>
                <span className="font-semibold text-orange-600">-{formatCurrency(netAmounts.returnAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-600 font-medium">Net Amount:</span>
              <span className="font-bold text-blue-600">{formatCurrency(netAmounts.netAmount)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-semibold text-green-600">{formatCurrency(amountPaid)}</span>
            </div>
            
            {paymentStatus.status === 'overpaid' ? (
              <div className="border-t pt-2 flex justify-between">
                <span className="text-gray-600 font-medium">Overpaid Amount:</span>
                <span className="font-bold text-purple-600">{formatCurrency(paymentStatus.overpaidAmount)}</span>
              </div>
            ) : (
              <div className="border-t pt-2 flex justify-between">
                <span className="text-gray-600 font-medium">Remaining Balance:</span>
                <span className="font-bold text-red-600">{formatCurrency(remainingAmount)}</span>
              </div>
            )}
            
            {netAmounts.returnAmount > 0 && (
              <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                💡 Payment amount adjusted for returned items
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Amount *
                </Label>
                {remainingAmount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, amount: remainingAmount.toString() }))}
                    className="text-sm h-8 px-3"
                  >
                    Pay Full Amount
                  </Button>
                )}
              </div>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxPayment}
                placeholder="Enter payment amount"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="text-right"
              />
              
              {/* Quick Amount Buttons */}
              {remainingAmount > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {remainingAmount >= 1000 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, amount: Math.min(remainingAmount / 2, remainingAmount).toString() }))}
                      className="text-sm h-7 px-3"
                    >
                      50%
                    </Button>
                  )}
                  {[1000, 5000, 10000].map(amount => (
                    amount <= remainingAmount && (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, amount: amount.toString() }))}
                        className="text-sm h-7 px-3"
                      >
                        ৳{(amount / 1000)}k
                      </Button>
                    )
                  ))}
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                Maximum: {formatCurrency(maxPayment)}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Method *
              </Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="payment_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Payment Date *
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this payment..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !formData.amount || !formData.payment_method}
              >
                {isLoading ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 