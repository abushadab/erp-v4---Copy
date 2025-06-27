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
import type { AccountCategory } from "@/lib/supabase/types/accounting"
import { AccountForm, type AccountFormState, type AccountFormHandlers } from "../forms/AccountForm"

interface AddAccountModalProps {
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

export function AddAccountModal({
  isOpen,
  onOpenChange,
  categories,
  formState,
  handlers,
  isSubmitting,
  onSubmit,
  onReset,
  isSelectedCategoryAsset
}: AddAccountModalProps) {
  const handleClose = () => {
    onOpenChange(false)
    onReset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Create a new account in your chart of accounts.
          </DialogDescription>
        </DialogHeader>
        
        <AccountForm
          mode="add"
          categories={categories}
          formState={formState}
          handlers={handlers}
          isSelectedCategoryAsset={isSelectedCategoryAsset}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 