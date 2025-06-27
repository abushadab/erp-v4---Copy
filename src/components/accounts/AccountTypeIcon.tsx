"use client"

import * as React from "react"
import {
  Building,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Banknote
} from "lucide-react"

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

interface AccountTypeIconProps {
  type: AccountType
  className?: string
}

export function AccountTypeIcon({ type, className = "h-4 w-4" }: AccountTypeIconProps) {
  const getIconComponent = () => {
    switch (type) {
      case 'asset':
        return <Building className={`${className} text-green-600`} />
      case 'liability':
        return <CreditCard className={`${className} text-red-600`} />
      case 'equity':
        return <DollarSign className={`${className} text-blue-600`} />
      case 'revenue':
        return <TrendingUp className={`${className} text-purple-600`} />
      case 'expense':
        return <TrendingDown className={`${className} text-orange-600`} />
      default:
        return <Banknote className={`${className} text-gray-600`} />
    }
  }

  return getIconComponent()
} 