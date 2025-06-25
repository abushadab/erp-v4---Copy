'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type Customer } from '@/lib/supabase/sales-client'
import { type DiscountType, type CartCalculations } from '@/hooks/sales/useCartManagement'

// Sale result interface
interface SaleResult {
  success: boolean
  message: string
  saleId?: string
  revenue?: number
  profit?: number
  items?: any[]
}

// Props for the SaleSuccessPage component
interface SaleSuccessPageProps {
  saleResult: SaleResult
  calculations: CartCalculations
  totalDiscount: number
  totalDiscountType: DiscountType
  taxRate: number
  selectedCustomer: string
  selectedPaymentMethod: string
  customers: Customer[]
  paymentMethodAccounts: Array<{ id: string; name: string }>
  onStartNewSale: () => void
  onPrintReceipt?: () => void
}

export default function SaleSuccessPage({
  saleResult,
  calculations,
  totalDiscount,
  totalDiscountType,
  taxRate,
  selectedCustomer,
  selectedPaymentMethod,
  customers,
  paymentMethodAccounts,
  onStartNewSale,
  onPrintReceipt
}: SaleSuccessPageProps) {
  const { subtotal, totalDiscountAmount, taxAmount } = calculations

  const handlePrintReceipt = () => {
    if (onPrintReceipt) {
      onPrintReceipt()
      return
    }

    // Default print receipt implementation
    const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
    const selectedPaymentMethodData = paymentMethodAccounts.find(account => account.id === selectedPaymentMethod)
    
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt</title>
        <style>
          @page { size: 70mm auto; margin: 0; }
          @media print { body { margin: 0; padding: 0; width: 70mm !important; } .no-print { display: none !important; } }
          body { font-family: 'Courier New', monospace; font-size: 9px; line-height: 1.1; margin: 0; padding: 3mm; width: 70mm; color: #000; background: #fff; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 4px; }
          .company-name { font-size: 12px; font-weight: bold; margin-bottom: 2px; letter-spacing: 1px; }
          .company-info { font-size: 8px; margin-bottom: 1px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">ERP STORE</div>
          <div class="company-info">123 Business St, Dhaka</div>
          <div class="company-info">Phone: +880 1234-567890</div>
        </div>
        <div>Date: ${new Date().toLocaleDateString()}</div>
        <div>Customer: ${selectedCustomerData?.name || 'N/A'}</div>
        <div>Payment: ${selectedPaymentMethodData?.name || 'N/A'}</div>
        <div>Total: ৳${(saleResult.revenue || 0).toFixed(2)}</div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (printWindow) {
      printWindow.document.write(receiptContent)
      printWindow.document.close()
      printWindow.focus()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card className="max-w-2xl w-full mx-4">
        <CardContent className="text-center p-8">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
          >
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Sale Completed Successfully!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your transaction has been processed and recorded.
            </p>
          </motion.div>

          {/* Sale Summary */}
          {saleResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-muted rounded-lg p-6 mb-6 text-left"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-lg">Sale Summary</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">৳{(subtotal || 0).toFixed(2)}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount ({totalDiscountType === 'percentage' 
                      ? `${totalDiscount}%` 
                      : `৳${totalDiscount.toFixed(2)}`
                    }):</span>
                    <span className="font-medium text-green-600">-৳{(totalDiscountAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-medium text-blue-600">+৳{(taxAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-3">
                  <span>Total:</span>
                  <span className="text-green-600">৳{(saleResult.revenue || 0).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            <Button
              onClick={onStartNewSale}
              size="lg"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Sale
            </Button>
            
            <Button
              variant="outline"
              onClick={handlePrintReceipt}
              className="w-full"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}