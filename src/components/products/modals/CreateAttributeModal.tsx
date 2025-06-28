'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AttributeValuesEditor } from '@/components/products/ui/AttributeValuesEditor'
import { useAttributeManagement } from '@/lib/hooks/useAttributeManagement'
import { toast } from 'sonner'

interface CreateAttributeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (attributeId: string) => void
}

export function CreateAttributeModal({
  open,
  onOpenChange,
  onSuccess
}: CreateAttributeModalProps) {
  const attributeManagement = useAttributeManagement()

  const handleCreateAttribute = async () => {
    const validation = attributeManagement.validateCreateForm()
    if (!validation.isValid) {
      toast.error(validation.error)
      return
    }

    try {
      await attributeManagement.createNewAttribute(onSuccess ? (attributeId: string) => {
        onSuccess(attributeId)
        onOpenChange(false)
      } : () => {
        onOpenChange(false)
      })
    } catch (error) {
      console.error('Error creating attribute:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Attribute</DialogTitle>
          <DialogDescription>
            Create a new attribute that can be used for product variations
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attribute-name">Attribute Name *</Label>
            <Input
              id="attribute-name"
              value={attributeManagement.createForm.name}
              onChange={(e) => attributeManagement.updateCreateName(e.target.value)}
              placeholder="e.g., Size, Color, Material"
            />
          </div>

          <AttributeValuesEditor
            values={attributeManagement.createForm.values}
            onAddValue={attributeManagement.addCreateValue}
            onUpdateValue={attributeManagement.updateCreateValue}
            onRemoveValue={attributeManagement.removeCreateValue}
            label="Attribute Values *"
            disabled={attributeManagement.isCreating}
            showAddButton={false} // We'll show the add button at the bottom only
          />

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> After creating this attribute, it will be automatically selected and you can immediately use it to create variations.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={attributeManagement.isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateAttribute}
            disabled={attributeManagement.isCreating}
          >
            {attributeManagement.isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Attribute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}