"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { AccountCategory } from "@/lib/supabase/types/accounting"
import { AccountForm, type AccountFormState, type AccountFormHandlers } from "../forms/AccountForm"

interface AccountModalProps {
  mode: 'add' | 'edit'
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  categories: AccountCategory[]
  formState: AccountFormState
  handlers: AccountFormHandlers
  isSubmitting: boolean
  onSubmit: () => Promise<void>
  onReset: () => void
  isSelectedCategoryAsset: (categoryId: string) => boolean
}

export function AccountModal({ 
  mode, 
  isOpen,
  onOpenChange,
  categories,
  formState,
  handlers,
  isSubmitting,
  onSubmit,
  onReset,
  isSelectedCategoryAsset
}: AccountModalProps) {
  // Mode-specific configuration
  const config = {
    add: {
      title: 'Add New Account',
      description: 'Create a new account in your chart of accounts.',
      submitText: 'Create Account',
      loadingText: 'Creating...'
    },
    edit: {
      title: 'Edit Account',
      description: 'Update the account information below.',
      submitText: 'Update Account',
      loadingText: 'Updating...'
    }
  }[mode]

  const handleClose = () => {
    onOpenChange(false)
    onReset()
  }

  const handleSubmit = async () => {
    try {
      await onSubmit()
    } catch (error) {
      console.error(`Failed to ${mode} account:`, error)
      toast.error(`Failed to ${mode} account. Please try again.`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>
        
        <AccountForm
          mode={mode}
          categories={categories}
          formState={formState}
          handlers={handlers}
          isSelectedCategoryAsset={isSelectedCategoryAsset}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {config.loadingText}
              </>
            ) : (
              config.submitText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Convenience components for backward compatibility and cleaner imports
export const AddAccountModal = (props: Omit<AccountModalProps, 'mode'>) => 
  <AccountModal mode="add" {...props} />
  
export const EditAccountModal = (props: Omit<AccountModalProps, 'mode'>) => 
  <AccountModal mode="edit" {...props} /> 