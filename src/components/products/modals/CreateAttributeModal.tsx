'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attribute Values *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddValue}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Value
              </Button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {form.values.map((value, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={value}
                    onChange={(e) => onUpdateValue(index, e.target.value)}
                    placeholder={`Value ${index + 1}`}
                    className="flex-1"
                  />
                  {form.values.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveValue(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

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