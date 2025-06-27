"use client"

import * as React from "react"
import { Edit3, CreditCard } from "lucide-react"
import type { AccountWithCategory } from "@/lib/supabase/types/accounting"
import { AccountTypeIcon } from "./AccountTypeIcon"
import { Button } from "@/components/ui/button"

interface PaymentMethodTypeOption {
  value: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface AccountCardProps {
  account: AccountWithCategory
  onEdit: (account: AccountWithCategory) => void
  getDisplayBalance: (account: AccountWithCategory) => string
  paymentMethodTypeOptions: PaymentMethodTypeOption[]
}

// Helper function to determine if account should be considered active based on type and balance
const getAccountActiveStatus = (account: AccountWithCategory): boolean => {
  // First check if the account has an explicit is_active field
  if (typeof account.is_active === 'boolean') {
    return account.is_active
  }

  // Fall back to balance-based logic, but consider account type
  const balance = parseFloat(account.balance || '0')
  const accountType = account.account_categories?.type

  switch (accountType) {
    case 'asset':
      // Assets are typically active when they have positive balance
      return balance > 0
    case 'liability':
    case 'equity':
      // Liabilities and equity can be active with any balance (positive is normal)
      return balance !== 0
    case 'revenue':
      // Revenue accounts are typically active with positive balance
      return balance > 0
    case 'expense':
      // Expense accounts are typically active with positive balance
      return balance > 0
    default:
      // Default case: consider active if balance is not zero
      return balance !== 0
  }
}

export function AccountCard({ account, onEdit, getDisplayBalance, paymentMethodTypeOptions }: AccountCardProps) {
  const isActive = getAccountActiveStatus(account)
  
  return (
    <div className="bg-white border rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      {/* Account name with icon */}
      <div className="flex items-center space-x-2 mb-2 sm:mb-3">
        <div className="text-black text-sm flex-shrink-0">
          <AccountTypeIcon type={account.account_categories?.type || ''} />
        </div>
        <h3 className="text-black text-base sm:text-lg font-semibold truncate">
          {account.account_name}
        </h3>
      </div>

      {/* Account details */}
      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span className="font-medium">Number:</span>
          <span className="text-black font-mono">{account.account_number}</span>
        </div>
        
        {account.account_code && (
          <div className="flex justify-between items-center">
            <span className="font-medium">Code:</span>
            <span className="text-black font-mono">{account.account_code}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="font-medium">Category:</span>
          <span className="text-black capitalize">
            {account.account_categories?.name} ({account.account_categories?.type})
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-medium">Balance:</span>
          <span className="text-black font-semibold">
            {getDisplayBalance(account)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="font-medium">Status:</span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Payment Method Badge */}
        {account.is_payment_method && account.payment_method_type && (
          <div className="flex justify-between items-center">
            <span className="font-medium">Payment Method:</span>
            <div className="flex items-center space-x-1">
              {(() => {
                const option = paymentMethodTypeOptions.find(opt => opt.value === account.payment_method_type)
                if (option) {
                  const IconComponent = option.icon
                  return (
                    <>
                      <IconComponent className="h-3 w-3 text-blue-600" />
                      <span className="text-blue-600 text-xs font-medium">{option.label}</span>
                    </>
                  )
                }
                return <span className="text-blue-600 text-xs font-medium">{account.payment_method_type}</span>
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="mt-3 sm:mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(account)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-auto"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 