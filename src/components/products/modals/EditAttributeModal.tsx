'use client'

import React from 'react'
import { Edit, Save } from 'lucide-react'
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

interface EditAttributeForm {
  id: string
  name: string
  values: string[]
}

interface EditAttributeModalProps {
  isOpen: boolean
  onClose: () => void
  form: EditAttributeForm
  onFormChange: (form: EditAttributeForm) => void
  isEditing: boolean
  onUpdateAttribute: () => void
  onAddValue: () => void
  onUpdateValue: (index: number, value: string) => void
  onRemoveValue: (index: number) => void
}

export function EditAttributeModal({
  isOpen,
  onClose,
  form,
  onFormChange,
  isEditing,
  onUpdateAttribute,
  onAddValue,
  onUpdateValue,
  onRemoveValue
}: EditAttributeModalProps) {
  const handleNameChange = (value: string) => {
    onFormChange({
      ...form,
      name: value
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Attribute
          </DialogTitle>
          <DialogDescription>
            Update the attribute name and values
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-attribute-name">Name</Label>
            <Input
              id="edit-attribute-name"
              placeholder="e.g., Size"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          
          <AttributeValuesEditor
            values={form.values}
            onAddValue={onAddValue}
            onUpdateValue={onUpdateValue}
            onRemoveValue={onRemoveValue}
            label="Values"
            placeholder={(index) => "Attribute value"}
            disabled={isEditing}
            maxHeight="max-h-32"
            addButtonText="Add Value"
          />
        </div>
        
        <DialogFooter className="flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isEditing}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={onUpdateAttribute}
            disabled={isEditing}
          >
            {isEditing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? 'Updating...' : 'Update Attribute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}