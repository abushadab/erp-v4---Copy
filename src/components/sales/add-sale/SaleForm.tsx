'use client'

import React from 'react'
import { Control, FieldErrors, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Building2, User, UserPlus, CreditCard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

import { type Customer, type Warehouse } from '@/lib/types'
import { type AccountWithCategory } from '@/lib/supabase/types'

// Form data type definition
export interface SaleFormData {
  warehouseId: string
  customerId: string
  paymentMethod: string
  saleDate: string
  items: Array<{
    productId: string
    variationId?: string
    quantity: number
    discount: number
    discountType: 'percentage' | 'fixed'
  }>
  totalDiscount: number
  totalDiscountType: 'percentage' | 'fixed'
  taxRate: number
}

interface SaleFormProps {
  // Form control props
  control: Control<SaleFormData>
  errors: FieldErrors<SaleFormData>
  watch: UseFormWatch<SaleFormData>
  
  // Data props
  warehouses: Warehouse[]
  customers: Customer[]
  paymentMethodAccounts: AccountWithCategory[]
  
  // Loading states
  loadingPaymentMethods: boolean
  
  // State management
  selectedWarehouse: string
  selectedCustomer: string
  selectedPaymentMethod: string
  validationAttempted: boolean
  
  // Event handlers
  onWarehouseChange: (warehouseId: string) => void
  onCustomerChange: (customerId: string) => void
  onPaymentMethodChange: (paymentMethodId: string) => void
  onShowAddCustomerModal: () => void
}

export function SaleForm({
  control,
  errors,
  watch,
  warehouses,
  customers,
  paymentMethodAccounts,
  loadingPaymentMethods,
  selectedWarehouse,
  selectedCustomer,
  selectedPaymentMethod,
  validationAttempted,
  onWarehouseChange,
  onCustomerChange,
  onPaymentMethodChange,
  onShowAddCustomerModal
}: SaleFormProps) {
  return (
    <div className="space-y-6">
      {/* Warehouse and Customer Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="warehouse">Warehouse *</Label>
          <Controller
            name="warehouseId"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4 z-10 pointer-events-none" />
                <Select 
                  onValueChange={(value: string) => { 
                    field.onChange(value) 
                    onWarehouseChange(value) 
                  }} 
                  value={field.value}
                >
                  <SelectTrigger className={`pl-10 ${validationAttempted && !selectedWarehouse ? 'border-red-300 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder="Select warehouse" className="truncate pr-2" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        <div className="flex items-center w-full">
                          <span className="truncate">
                            {warehouse.name} - {warehouse.location}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          {errors.warehouseId && (
            <p className="text-sm text-red-500">{errors.warehouseId.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-0">
            <Label htmlFor="customer">Customer *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShowAddCustomerModal}
              className="h-6 px-2 text-xs"
              style={{ position: 'relative', top: '-4px' }}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4 z-10 pointer-events-none" />
                <Select 
                  onValueChange={(value: string) => { 
                    field.onChange(value) 
                    onCustomerChange(value) 
                  }} 
                  value={field.value}
                >
                  <SelectTrigger className={`pl-10 ${validationAttempted && !selectedCustomer ? 'border-red-300 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder="Select customer" className="truncate pr-2" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers
                      .filter(c => c.status === 'active')
                      .map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <span className="truncate">{customer.name}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          {errors.customerId && (
            <p className="text-sm text-red-500">{errors.customerId.message}</p>
          )}
        </div>
      </div>

      {/* Sale Date and Payment Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="saleDate">Sale Date *</Label>
          <Controller
            name="saleDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                date={field.value ? new Date(field.value) : undefined}
                onDateChange={(date) => {
                  if (date) {
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const day = String(date.getDate()).padStart(2, '0')
                    const formattedDate = `${year}-${month}-${day}`
                    field.onChange(formattedDate)
                  } else {
                    field.onChange('')
                  }
                }}
                placeholder="Select sale date"
              />
            )}
          />
          {errors.saleDate && (
            <p className="text-sm text-red-500">{errors.saleDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method *</Label>
          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black h-4 w-4 z-10 pointer-events-none" />
                <Select 
                  onValueChange={(value: string) => { 
                    field.onChange(value) 
                    onPaymentMethodChange(value) 
                  }} 
                  value={field.value}
                >
                  <SelectTrigger className={`pl-10 ${validationAttempted && !selectedPaymentMethod ? 'border-red-300 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder="Select payment method" className="truncate pr-2" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPaymentMethods ? (
                      <SelectItem value="loading" disabled>Loading payment methods...</SelectItem>
                    ) : paymentMethodAccounts.length === 0 ? (
                      <SelectItem value="none" disabled>No payment methods available</SelectItem>
                    ) : (
                      paymentMethodAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <span className="truncate">{account.account_name}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          {errors.paymentMethod && (
            <p className="text-sm text-red-500">{errors.paymentMethod.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}