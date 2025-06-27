import * as React from 'react'
import { type User as UserType } from '@/lib/types'

export interface UserFilters {
  searchTerm: string
  selectedRoles: string[]
  selectedStatuses: string[]
}

export function useUserFilters() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([
    'super_admin', 'admin', 'manager', 'sales', 'warehouse', 'accountant'
  ])
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([
    'active', 'inactive', 'pending', 'suspended'
  ])

  // Memoized filter function for performance
  const filteredUsers = React.useCallback((users: UserType[]) => {
    return users.filter(user => {
      const matchesSearch = searchTerm === "" || (
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      )
      
      const matchesRole = selectedRoles.includes(user.role)
      const matchesStatus = selectedStatuses.includes(user.status)
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [searchTerm, selectedRoles, selectedStatuses])

  // Toggle role selection
  const toggleRole = React.useCallback((role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }, [])

  // Toggle status selection
  const toggleStatus = React.useCallback((status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }, [])

  // Clear all filters
  const clearFilters = React.useCallback(() => {
    setSearchTerm('')
    setSelectedRoles(['super_admin', 'admin', 'manager', 'sales', 'warehouse', 'accountant'])
    setSelectedStatuses(['active', 'inactive', 'pending', 'suspended'])
  }, [])

  // Check if any filters are active
  const hasActiveFilters = React.useMemo(() => {
    return searchTerm !== '' || 
           selectedRoles.length < 6 || 
           selectedStatuses.length < 4
  }, [searchTerm, selectedRoles.length, selectedStatuses.length])

  // Get filter summary for display
  const getFilterSummary = React.useCallback((totalUsers: number, filteredCount: number) => {
    if (!hasActiveFilters) {
      return `Showing all ${totalUsers} users`
    }
    
    const filters: string[] = []
    if (searchTerm) filters.push(`search: "${searchTerm}"`)
    if (selectedRoles.length < 6) filters.push(`${selectedRoles.length} roles`)
    if (selectedStatuses.length < 4) filters.push(`${selectedStatuses.length} statuses`)
    
    return `Showing ${filteredCount} of ${totalUsers} users (${filters.join(', ')})`
  }, [searchTerm, selectedRoles.length, selectedStatuses.length, hasActiveFilters])

  return {
    // Filter state
    searchTerm,
    selectedRoles,
    selectedStatuses,
    hasActiveFilters,
    
    // Filter actions
    setSearchTerm,
    setSelectedRoles,
    setSelectedStatuses,
    toggleRole,
    toggleStatus,
    clearFilters,
    
    // Filter utilities
    filteredUsers,
    getFilterSummary,
    
    // Constants
    availableRoles: ['super_admin', 'admin', 'manager', 'sales', 'warehouse', 'accountant'] as const,
    availableStatuses: ['active', 'inactive', 'pending', 'suspended'] as const,
  }
} 