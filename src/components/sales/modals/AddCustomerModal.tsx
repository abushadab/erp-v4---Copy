'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Import Supabase functions for customers
import { createCustomer, type Customer } from '@/lib/supabase/sales-client'

// Customer form schema
const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerAdded: (customer: Customer) => void
}

export const AddCustomerModal = ({ 
  isOpen, 
  onClose, 
  onCustomerAdded 
}: AddCustomerModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { control: customerControl, handleSubmit: handleCustomerSubmit, formState: { errors: customerErrors }, reset: resetCustomer } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    }
  })

  const onSubmitCustomer = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    
    try {
      // Create new customer using Supabase
      const newCustomer = await createCustomer({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: null,
        address: data.address || null,
        status: 'active',
        total_orders: 0,
        total_spent: 0,
        join_date: new Date().toISOString().split('T')[0]
      })
      
      // Call parent callback
      onCustomerAdded(newCustomer)
      
      // Reset form and close modal
      resetCustomer()
      onClose()
      toast.success('Customer added successfully!')
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Failed to add customer. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter customer details to add them to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCustomerSubmit(onSubmitCustomer)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Name *</Label>
            <Controller
              name="name"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerName"
                  {...field}
                  placeholder="Enter customer name"
                />
              )}
            />
            {customerErrors.name && (
              <p className="text-sm text-red-500">{customerErrors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email *</Label>
            <Controller
              name="email"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerEmail"
                  {...field}
                  type="email"
                  placeholder="Enter email address"
                />
              )}
            />
            {customerErrors.email && (
              <p className="text-sm text-red-500">{customerErrors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone *</Label>
            <Controller
              name="phone"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerPhone"
                  {...field}
                  placeholder="Enter phone number"
                />
              )}
            />
            {customerErrors.phone && (
              <p className="text-sm text-red-500">{customerErrors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address *</Label>
            <Controller
              name="address"
              control={customerControl}
              render={({ field }) => (
                <Input
                  id="customerAddress"
                  {...field}
                  placeholder="Enter address"
                />
              )}
            />
            {customerErrors.address && (
              <p className="text-sm text-red-500">{customerErrors.address.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddCustomerModal