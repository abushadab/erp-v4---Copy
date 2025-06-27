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

interface CreateAttributeForm {
  name: string
  values: string[]
}

interface CreateAttributeModalProps {
  isOpen: boolean
  onClose: () => void
  form: CreateAttributeForm
  onFormChange: (form: CreateAttributeForm) => void
  isCreating: boolean
  onCreateAttribute: () => void
  onAddValue: () => void
  onUpdateValue: (index: number, value: string) => void
  onRemoveValue: (index: number) => void
}

export function CreateAttributeModal({
  isOpen,
  onClose,
  form,
  onFormChange,
  isCreating,
  onCreateAttribute,
  onAddValue,
  onUpdateValue,
  onRemoveValue
}: CreateAttributeModalProps) {
  const handleNameChange = (value: string) => {
    onFormChange({
      ...form,
      name: value
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Size, Color, Material"
            />
          </div>

          <AttributeValuesEditor
            values={form.values}
            onAddValue={onAddValue}
            onUpdateValue={onUpdateValue}
            onRemoveValue={onRemoveValue}
            label="Attribute Values *"
            disabled={isCreating}
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
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateAttribute}
            disabled={isCreating}
          >
            {isCreating ? (
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