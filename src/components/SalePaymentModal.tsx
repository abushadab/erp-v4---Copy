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
import { toast } from "sonner"
import { 
  type SaleWithItems, 
  createSalePayment, 
  calculateSalePaymentStatus,
  SALE_PAYMENT_METHODS,
  type CreateSalePaymentData,
  type SalePayment
} from "@/lib/supabase/sales-client"

interface SalePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  saleId: string
  customerName: string
  totalAmount: number
  amountPaid: number
  sale: SaleWithItems
  onPaymentCreated: () => void
}

export default function SalePaymentModal({
  isOpen,
  onClose,
  saleId,
  customerName,
  totalAmount,
  amountPaid,
  sale,
  onPaymentCreated
}: SalePaymentModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    amount: '',
    payment_method: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // Calculate payment status and amounts
  const paymentStatus = calculateSalePaymentStatus(sale, amountPaid)
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

    if (amount > maxPayment + 1) { // Allow slight overpayment
      toast.error(`Payment amount cannot exceed remaining balance of ৳${maxPayment.toLocaleString()}`)
      return
    }

    setIsLoading(true)
    
    try {
      const paymentData: CreateSalePaymentData = {
        sale_id: saleId,
        amount: amount,
        payment_method: formData.payment_method as any,
        payment_date: formData.payment_date,
        notes: formData.notes || undefined,
        created_by: 'admin' // TODO: Replace with actual user
      }

      await createSalePayment(paymentData)
      
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
            Record a payment for sale from <strong>{customerName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-semibold text-green-600">{formatCurrency(amountPaid)}</span>
            </div>
            
            <div className="border-t pt-2 flex justify-between">
              <span className="text-gray-600 font-medium">Remaining Balance:</span>
              <span className="font-bold text-red-600">{formatCurrency(remainingAmount)}</span>
            </div>
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
                min="0"
                max={maxPayment}
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter payment amount"
                required
                suppressHydrationWarning
              />
              {formData.amount && (
                <p className="text-sm text-gray-500">
                  Payment: {formatCurrency(parseFloat(formData.amount) || 0)}
                </p>
              )}
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
                required
              >
                <SelectTrigger suppressHydrationWarning>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent suppressHydrationWarning>
                  {SALE_PAYMENT_METHODS.map((method) => (
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
                required
                suppressHydrationWarning
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
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add payment notes..."
                rows={3}
                suppressHydrationWarning
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.amount || !formData.payment_method}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Record Payment'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 