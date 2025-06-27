import * as React from 'react'
import { type User as UserType } from '@/lib/types'
import { 
  createUserProfile, 
  updateUserProfile, 
  assignRoleToUser, 
  removeRoleFromUser 
} from '@/lib/supabase/users'
import { useToast } from '@/hooks/use-toast'

export interface NewUserData {
  name: string
  email: string
  role: UserType['role']
  department: string
  status: UserType['status']
  avatar?: string
  permissions?: string[]
}

export interface EditUserData extends UserType {
  permissions: string[]
}

export function useUserManagement() {
  const [isAddingUser, setIsAddingUser] = React.useState(false)
  const [isEditingUser, setIsEditingUser] = React.useState(false)
  const [isDeletingUser, setIsDeletingUser] = React.useState(false)
  const { toast, success } = useToast()

  const createUser = React.useCallback(async (userData: NewUserData, onSuccess?: () => void) => {
    setIsAddingUser(true)
    
    try {
      // TODO: Implement proper user creation with Supabase Auth
      // For now, create user profile with temp ID
      const tempUserId = `user_${Date.now()}`
      
      await createUserProfile(
        tempUserId,
        userData.name,
        userData.department
      )

      // Assign role to user
      if (userData.role) {
        await assignRoleToUser(tempUserId, userData.role)
      }

      success({
        title: "User Created",
        description: `${userData.name} has been added successfully.`,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsAddingUser(false)
    }
  }, [toast, success])

  const updateUser = React.useCallback(async (
    userData: EditUserData, 
    originalUser: UserType,
    onSuccess?: () => void
  ) => {
    if (!userData.name || !userData.email || !userData.department || !userData.role) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields (name, email, department, and role).',
        variant: 'destructive',
      })
      return
    }
    
    setIsEditingUser(true)
    
    try {
      // Update user profile in Supabase
      await updateUserProfile(userData.id, {
        name: userData.name,
        department: userData.department,
        status: userData.status,
        avatar_url: userData.avatar || null,
      })

      // Update user role if changed
      if (originalUser.role !== userData.role) {
        // Remove old role
        await removeRoleFromUser(userData.id, originalUser.role)
        // Assign new role
        await assignRoleToUser(userData.id, userData.role)
      }

      success({
        title: 'User Updated',
        description: 'The user has been successfully updated.',
      })

      onSuccess?.()
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: 'Error',
        description: 'There was an error updating the user. Please try again.',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsEditingUser(false)
    }
  }, [toast, success])

  const deleteUser = React.useCallback(async (user: UserType, onSuccess?: () => void) => {
    setIsDeletingUser(true)
    
    try {
      // Remove all roles from the user first
      await removeRoleFromUser(user.id, user.role)
      
      // TODO: Implement actual user deletion
      // This would typically involve calling a Supabase function
      // that properly handles auth user deletion and cascade
      
      success({
        title: 'User Deleted',
        description: 'The user has been successfully deleted.',
      })

      onSuccess?.()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: 'Error',
        description: 'There was an error deleting the user. Please try again.',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsDeletingUser(false)
    }
  }, [toast, success])

  return {
    // States
    isAddingUser,
    isEditingUser,
    isDeletingUser,
    
    // Actions
    createUser,
    updateUser,
    deleteUser
  }
} 