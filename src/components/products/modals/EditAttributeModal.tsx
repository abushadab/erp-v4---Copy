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
import { useAttributeManagement } from '@/lib/hooks/useAttributeManagement'
import { toast } from 'sonner'

interface EditAttributeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attribute: any
  onSuccess?: () => void
}

export function EditAttributeModal({
  open,
  onOpenChange,
  attribute,
  onSuccess
}: EditAttributeModalProps) {
  const attributeManagement = useAttributeManagement()

  // Open the edit modal when attribute is provided
  React.useEffect(() => {
    if (attribute && open) {
      attributeManagement.openEditModal(attribute)
    }
  }, [attribute, open, attributeManagement])
  const handleUpdateAttribute = async () => {
    const validation = attributeManagement.validateEditForm()
    if (!validation.isValid) {
      toast.error(validation.error)
      return
    }

    try {
      await attributeManagement.updateExistingAttribute(onSuccess)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating attribute:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={attributeManagement.editForm.name}
              onChange={(e) => attributeManagement.updateEditName(e.target.value)}
            />
          </div>
          
          <AttributeValuesEditor
            values={attributeManagement.editForm.values}
            onAddValue={attributeManagement.addEditValue}
            onUpdateValue={attributeManagement.updateEditValue}
            onRemoveValue={attributeManagement.removeEditValue}
            label="Values"
            placeholder={(index) => "Attribute value"}
            disabled={attributeManagement.isEditing}
            maxHeight="max-h-32"
            addButtonText="Add Value"
          />
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={attributeManagement.isEditing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateAttribute}
            disabled={attributeManagement.isEditing}
          >
            {attributeManagement.isEditing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}