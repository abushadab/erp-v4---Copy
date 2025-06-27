"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { AccountCategory } from "@/lib/supabase/types/accounting"
import type { CreateAccountData } from "@/lib/supabase/accounts-client"
import { PAYMENT_METHOD_TYPE_OPTIONS } from "@/lib/constants/payment-methods"

export interface AccountFormState {
  account: Partial<CreateAccountData>
  useAsPaymentMethod: boolean
  paymentMethodType: string
  bankAccountNumber: string
}

export interface AccountFormHandlers {
  setAccount: (account: Partial<CreateAccountData> | ((prev: Partial<CreateAccountData>) => Partial<CreateAccountData>)) => void
  setUseAsPaymentMethod: (use: boolean) => void
  setPaymentMethodType: (type: string) => void
  setBankAccountNumber: (number: string) => void
}

interface AccountFormProps {
  mode: 'add' | 'edit'
  categories: AccountCategory[]
  formState: AccountFormState
  handlers: AccountFormHandlers
  isSelectedCategoryAsset: (categoryId: string) => boolean
}

export function AccountForm({
  mode,
  categories,
  formState,
  handlers,
  isSelectedCategoryAsset
}: AccountFormProps) {
  const { account, useAsPaymentMethod, paymentMethodType, bankAccountNumber } = formState
  const { setAccount, setUseAsPaymentMethod, setPaymentMethodType, setBankAccountNumber } = handlers

  const isAddMode = mode === 'add'

  return (
    <div className="grid gap-4 py-4">
      {/* Account Number and Code Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isAddMode && (
          <div className="grid gap-2">
            <Label htmlFor={`${mode}-account-number`} className="font-medium">
              Account Number *
            </Label>
            <Input
              id={`${mode}-account-number`}
              placeholder="e.g., 1004"
              value={account.account_number || ''}
              onChange={(e) => setAccount(prev => ({ ...prev, account_number: e.target.value }))}
            />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor={`${mode}-account-code`} className="font-medium">
            Account Code {isAddMode ? '' : '*'}
          </Label>
          <Input
            id={`${mode}-account-code`}
            placeholder="e.g., CASH-01"
            value={account.account_code || ''}
            onChange={(e) => setAccount(prev => ({ ...prev, account_code: e.target.value }))}
          />
        </div>
      </div>
      
      {/* Account Name */}
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-account-name`} className="font-medium">
          Account Name *
        </Label>
        <Input
          id={`${mode}-account-name`}
          placeholder={isAddMode ? "e.g., Petty Cash" : "e.g., Cash in Hand"}
          value={account.account_name || ''}
          onChange={(e) => setAccount(prev => ({ ...prev, account_name: e.target.value }))}
        />
      </div>
      
      {/* Category Selection */}
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-category`} className="font-medium">
          {isAddMode ? 'Category *' : 'Account Category *'}
        </Label>
        <Select
          value={account.category_id || ''}
          onValueChange={(value) => {
            setAccount(prev => ({ ...prev, category_id: value }))
            // Reset toggle if category is not asset
            if (!isSelectedCategoryAsset(value)) {
              setUseAsPaymentMethod(false)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={isAddMode ? "Select a category" : "Select category"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center space-x-2">
                  <span>{category.name} ({category.type})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-description`} className="font-medium">
          Description
        </Label>
        <Input
          id={`${mode}-description`}
          placeholder="Optional description"
          value={account.description || ''}
          onChange={(e) => setAccount(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      {/* Payment Method Section */}
      {isSelectedCategoryAsset(account.category_id || '') && (
        <div className="grid gap-2">
          <Label htmlFor={`${mode}-use-as-payment-method`} className="font-medium">
            Use as Payment Method
          </Label>
          <div className="flex items-center space-x-2">
            <Switch
              id={`${mode}-use-as-payment-method`}
              checked={useAsPaymentMethod}
              onCheckedChange={(checked) => {
                setUseAsPaymentMethod(checked)
                if (!checked) {
                  setPaymentMethodType('')
                  setBankAccountNumber('')
                }
              }}
            />
            <Label htmlFor={`${mode}-use-as-payment-method`} className="text-sm text-gray-600 cursor-pointer">
              Enable this account for payment transactions
            </Label>
          </div>
        </div>
      )}

      {/* Payment Method Details */}
      {isSelectedCategoryAsset(account.category_id || '') && useAsPaymentMethod && (
        <>
          <div className="grid gap-2">
            <Label htmlFor={`${mode}-payment-method-type`} className="font-medium">
              Payment Method Type *
            </Label>
            <Select
              value={paymentMethodType}
              onValueChange={(value) => {
                setPaymentMethodType(value)
                // Reset bank account number if not bank type
                if (value !== 'bank') {
                  setBankAccountNumber('')
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method type" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_TYPE_OPTIONS.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-gray-500">{option.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {paymentMethodType === 'bank' && (
            <div className="grid gap-2">
              <Label htmlFor={`${mode}-bank-account-number`} className="font-medium">
                Bank Account Number *
              </Label>
              <Input
                id={`${mode}-bank-account-number`}
                placeholder="Enter bank account number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
} 