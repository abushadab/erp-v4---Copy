"use client"

import { useState, useEffect } from 'react'
import { User, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { updateUserProfile } from '@/lib/supabase/users'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from 'sonner'

export function UserProfileSettings() {
  const { user, loading } = useCurrentUser()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: ''
  })

  // Update form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || ''
      })
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      await updateUserProfile(user.id, {
        name: formData.name,
        department: formData.department || null
      })
      
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = user && (
    formData.name !== user.name ||
    formData.department !== (user.department || '')
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-18" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load profile information. Please try refreshing the page.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="mr-2 h-5 w-5" />
          Profile Information
        </CardTitle>
        <CardDescription>
          Update your personal account information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input 
            id="fullName" 
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email" 
            value={formData.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed from this interface
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input 
            id="department" 
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            placeholder="Enter your department"
          />
        </div>

        {user.roles && user.roles.length > 0 && (
          <div className="space-y-2">
            <Label>Role</Label>
            <Input 
              value={user.roles[0]?.name || 'No role assigned'}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Role assignments are managed by administrators
            </p>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          
          {hasChanges && (
            <p className="text-xs text-muted-foreground">
              You have unsaved changes
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 