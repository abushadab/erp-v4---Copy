'use client'

import * as React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Loader2, Plus } from "lucide-react"
import { type NewUserData, useUserManagement } from '@/hooks/users'
import { useUserPermissions } from '@/hooks/users'
import { validateUserForm, checkEmailUniqueness } from '@/lib/utils/userValidators'
import { type User as UserType } from '@/lib/types'

interface AddUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  existingUsers: UserType[]
}

export function AddUserModal({ open, onOpenChange, onSuccess, existingUsers }: AddUserModalProps) {
  const { createUser, isAddingUser } = useUserManagement()
  const { permissions, getAvailableRoles } = useUserPermissions()
  
  const [formData, setFormData] = React.useState<NewUserData>({
    name: '',
    email: '',
    role: 'manager',
    department: 'Operations',
    status: 'active',
    avatar: '',
    permissions: []
  })
  
  const [validationErrors, setValidationErrors] = React.useState<string[]>([])
  const [isValidating, setIsValidating] = React.useState(false)

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        email: '',
        role: 'manager',
        department: 'Operations',
        status: 'active',
        avatar: '',
        permissions: []
      })
      setValidationErrors([])
    }
  }, [open])

  const handleInputChange = (field: keyof NewUserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const validateForm = async () => {
    setIsValidating(true)
    
    // Basic validation
    const basicValidation = validateUserForm(formData)
    if (!basicValidation.isValid) {
      setValidationErrors(basicValidation.errors)
      setIsValidating(false)
      return false
    }
    
    // Check email uniqueness
    const emailValidation = await checkEmailUniqueness(formData.email, existingUsers)
    if (!emailValidation.isValid) {
      setValidationErrors(emailValidation.errors)
      setIsValidating(false)
      return false
    }
    
    setValidationErrors([])
    setIsValidating(false)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isValid = await validateForm()
    if (!isValid) return
    
    try {
      await createUser(formData, () => {
        onSuccess()
        onOpenChange(false)
      })
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const availableRoles = getAvailableRoles()

  // Check if user can create users
  if (!permissions.canCreateUsers) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with appropriate roles and permissions.
          </DialogDescription>
        </DialogHeader>
        
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-700">
              <strong>Please fix the following errors:</strong>
              <ul className="mt-1 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="col-span-3"
              placeholder="Full Name"
              required
              suppressHydrationWarning
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="col-span-3"
              placeholder="email@company.com"
              required
              suppressHydrationWarning
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="department" className="text-right">
              Department *
            </Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="col-span-3"
              placeholder="Department"
              required
              suppressHydrationWarning
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role *
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange('role', value as UserType['role'])}
            >
              <SelectTrigger className="col-span-3" suppressHydrationWarning>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status *
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value as UserType['status'])}
            >
              <SelectTrigger className="col-span-3" suppressHydrationWarning>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="avatar" className="text-right">
              Avatar URL
            </Label>
            <Input
              id="avatar"
              value={formData.avatar || ''}
              onChange={(e) => handleInputChange('avatar', e.target.value)}
              className="col-span-3"
              placeholder="https://example.com/avatar.jpg"
              suppressHydrationWarning
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isAddingUser || isValidating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isAddingUser || isValidating}
              suppressHydrationWarning
            >
              {isAddingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 