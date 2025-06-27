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

interface EditAccountModalProps {
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

export function EditAccountModal({
  isOpen,
  onOpenChange,
  categories,
  formState,
  handlers,
  isSubmitting,
  onSubmit,
  onReset,
  isSelectedCategoryAsset
}: EditAccountModalProps) {
  const handleClose = () => {
    onOpenChange(false)
    onReset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose()
      }
    }}>
      <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the account information below.
          </DialogDescription>
        </DialogHeader>
        
        <AccountForm
          mode="edit"
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
            Update Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 