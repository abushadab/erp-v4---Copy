import * as React from 'react'
import { type User as UserType } from '@/lib/types'
import { getUserWithPermissions } from '@/lib/supabase/users'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export interface UserPermissions {
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canViewUsers: boolean
  canAssignRoles: boolean
  canManagePermissions: boolean
  canEditOwnProfile: boolean
  canViewUserDetails: boolean
}

export interface UserAction {
  canEdit: boolean
  canDelete: boolean
  canView: boolean
  canChangeRole: boolean
  reason?: string
}

export function useUserPermissions() {
  const { user: currentUser } = useCurrentUser()
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null)
  const [error, setError] = React.useState<Error | null>(null)

  // Set current user context
  React.useEffect(() => {
    const supabase = createClient()
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setCurrentUserId(session.user.id)
        setError(null)
        try {
          const userData = await getUserWithPermissions(session.user.id)
          if (userData) {
            setCurrentUserRole(userData.roles?.[0]?.name || null)
          }
        } catch (error) {
          console.error('Error fetching current user data:', error)
          setCurrentUserRole(null)
          setError(error instanceof Error ? error : new Error('Failed to fetch user data'))
        }
      } else {
        setCurrentUserId(null)
        setCurrentUserRole(null)
        setError(null)
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  // Calculate user permissions based on role hierarchy
  const permissions: UserPermissions = React.useMemo(() => {
    const role = currentUserRole?.toLowerCase()
    
    return {
      canCreateUsers: ['super_admin', 'admin'].includes(role || ''),
      canEditUsers: ['super_admin', 'admin', 'manager'].includes(role || ''),
      canDeleteUsers: ['super_admin', 'admin'].includes(role || ''),
      canViewUsers: ['super_admin', 'admin', 'manager'].includes(role || ''),
      canAssignRoles: ['super_admin', 'admin'].includes(role || ''),
      canManagePermissions: ['super_admin'].includes(role || ''),
      canEditOwnProfile: true, // Everyone can edit their own profile
      canViewUserDetails: ['super_admin', 'admin', 'manager'].includes(role || ''),
    }
  }, [currentUserRole])

  // Check specific user action permissions
  const getUserActionPermissions = React.useCallback((targetUser: UserType): UserAction => {
    const currentRole = currentUserRole?.toLowerCase()
    const targetRole = targetUser.role.toLowerCase()
    const isSelfAction = currentUserId === targetUser.id

    // Self-action restrictions
    if (isSelfAction) {
      return {
        canEdit: true, // Can edit own profile (limited fields)
        canDelete: false,
        canView: true,
        canChangeRole: false,
        reason: "Cannot perform this action on yourself"
      }
    }

    // Super admin restrictions
    if (targetRole === 'super_admin') {
      return {
        canEdit: currentRole === 'super_admin',
        canDelete: false, // Never allow deleting super admin
        canView: ['super_admin', 'admin', 'manager'].includes(currentRole || ''),
        canChangeRole: false, // Never allow changing super admin role
        reason: currentRole !== 'super_admin' ? `Cannot manage ${targetUser.role}` : 'Super admin role cannot be changed'
      }
    }

    // Admin restrictions
    if (targetRole === 'admin' || targetRole === 'administrator') {
      return {
        canEdit: currentRole === 'super_admin',
        canDelete: false, // Only super admin can delete admin (but disabled for safety)
        canView: ['super_admin', 'admin', 'manager'].includes(currentRole || ''),
        canChangeRole: currentRole === 'super_admin',
        reason: currentRole !== 'super_admin' ? `Cannot manage ${targetUser.role}` : undefined
      }
    }

    // Regular user permissions
    const hasPermission = ['super_admin', 'admin', 'manager'].includes(currentRole || '')
    
    return {
      canEdit: hasPermission,
      canDelete: ['super_admin', 'admin'].includes(currentRole || ''),
      canView: hasPermission,
      canChangeRole: ['super_admin', 'admin'].includes(currentRole || ''),
      reason: !hasPermission ? 'Insufficient permissions' : undefined
    }
  }, [currentUserId, currentUserRole])

  // Check if current user can perform bulk operations
  const canPerformBulkActions = React.useMemo(() => {
    return ['super_admin', 'admin'].includes(currentUserRole?.toLowerCase() || '')
  }, [currentUserRole])

  // Check role hierarchy for role assignment
  const canAssignRole = React.useCallback((targetRole: UserType['role']): boolean => {
    const currentRole = currentUserRole?.toLowerCase()
    
    // Super admin can assign any role except super admin
    if (currentRole === 'super_admin') {
      return targetRole !== 'super_admin'
    }
    
    // Admin can assign roles below admin level
    if (currentRole === 'admin') {
      return !['super_admin', 'admin', 'administrator'].includes(targetRole.toLowerCase())
    }
    
    return false
  }, [currentUserRole])

  // Get available roles for assignment
  const getAvailableRoles = React.useCallback((): UserType['role'][] => {
    const currentRole = currentUserRole?.toLowerCase()
    
    if (currentRole === 'super_admin') {
      return ['admin', 'manager', 'sales', 'warehouse', 'accountant']
    }
    
    if (currentRole === 'admin') {
      return ['manager', 'sales', 'warehouse', 'accountant']
    }
    
    return []
  }, [currentUserRole])

  return {
    // Current user context
    currentUserId,
    currentUserRole,
    currentUser,
    error,
    
    // Permission checks
    permissions,
    getUserActionPermissions,
    canPerformBulkActions,
    canAssignRole,
    getAvailableRoles,
    
    // Utility functions
    isCurrentUser: (userId: string) => currentUserId === userId,
    hasRole: (role: string) => currentUserRole?.toLowerCase() === role.toLowerCase(),
    hasAnyRole: (roles: string[]) => roles.some(role => currentUserRole?.toLowerCase() === role.toLowerCase()),
  }
} 