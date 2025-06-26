'use client'

import React from 'react'
import { Plus, X, Edit, Save } from 'lucide-react'
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
          
          <div className="space-y-3">
            <Label>Values</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {form.values.map((value, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Attribute value"
                    value={value}
                    onChange={(e) => onUpdateValue(index, e.target.value)}
                    className="flex-1"
                  />
                  {form.values.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveValue(index)}
                      className="h-10 w-10 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddValue}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Value
            </Button>
          </div>
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