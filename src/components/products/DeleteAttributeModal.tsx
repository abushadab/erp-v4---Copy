import * as React from "react"
import { AlertTriangle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DeleteAttributeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  attributeName: string
  isLoading?: boolean
  valueCount?: number
}

export function DeleteAttributeModal({
  isOpen,
  onClose,
  onConfirm,
  attributeName,
  isLoading = false,
  valueCount = 0
}: DeleteAttributeModalProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Attribute
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the attribute:
            </p>
            <p className="font-semibold text-foreground">
              "{attributeName}"
            </p>
            {valueCount > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-800">
                  This attribute has {valueCount} value{valueCount !== 1 ? 's' : ''}. 
                  Deleting this attribute will also remove all its values and any product associations.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              This will permanently remove the attribute from your catalog and may affect products using this attribute.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Attribute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 