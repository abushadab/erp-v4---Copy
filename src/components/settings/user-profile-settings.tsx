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
  const { user, loading, error, refreshUser } = useCurrentUser()
  const [isSaving, setIsSaving] = useState(false)
  
  // Debug logging
  console.log('👤 UserProfileSettings render:', { user: !!user, loading, error })
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

    console.log('💾 Starting profile update...')
    console.log('📝 Form data to save:', formData)
    console.log('👤 Current user data:', { id: user.id, name: user.name, department: user.department })

    setIsSaving(true)
    try {
      console.log('📤 Calling updateUserProfile with:', {
        userId: user.id,
        updates: {
          name: formData.name,
          department: formData.department || null
        }
      })
      
      await updateUserProfile(user.id, {
        name: formData.name,
        department: formData.department || null
      })
      
      console.log('✅ updateUserProfile completed successfully')
      
      // Refresh user data to update the profile bar
      if (refreshUser) {
        console.log('🔄 Refreshing user data after profile update...')
        await refreshUser()
        console.log('✅ refreshUser completed')
      } else {
        console.warn('⚠️ refreshUser function not available')
      }
      
      toast.success('Profile updated successfully!')
      console.log('🎉 Profile update process completed successfully')
    } catch (error) {
      console.error('❌ Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
      console.log('🏁 Profile update process finished (saving state reset)')
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
            {error 
              ? `Error loading profile: ${error}` 
              : 'Unable to load profile information. Please try refreshing the page.'
            }
          </p>
          {error && (
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh Page
            </button>
          )}
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
              <CardContent className="space-y-4" suppressHydrationWarning>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input 
              id="fullName" 
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              suppressHydrationWarning
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
              suppressHydrationWarning
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
              suppressHydrationWarning
            />
          </div>

        {user.roles && user.roles.length > 0 && (
          <div className="space-y-2">
            <Label>Role</Label>
            <Input 
              value={user.roles[0]?.name || 'No role assigned'}
              disabled
              className="bg-muted"
              suppressHydrationWarning
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
            suppressHydrationWarning
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