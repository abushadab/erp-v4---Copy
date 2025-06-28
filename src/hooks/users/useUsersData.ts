import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getAllUsersWithRoles } from '@/lib/supabase/users'
import type { User } from '@/lib/types'
import type { ExtendedUser } from '@/lib/types/supabase-types'

// Simple cache for user data
let dataCache: {
  data: User[] | null
  timestamp: number
  currentRequest: Promise<User[]> | null
} = {
  data: null,
  timestamp: 0,
  currentRequest: null
}

const CACHE_DURATION = 30 * 1000 // 30 seconds
const REQUEST_TIMEOUT = 10000 // 10 seconds

// Convert ExtendedUser to User for compatibility
const convertSupabaseUser = (supabaseUser: ExtendedUser): User => {
  return {
    id: supabaseUser.id,
    name: supabaseUser.name,
    email: supabaseUser.email || '',
    role: (supabaseUser.roles[0]?.id || supabaseUser.primary_role?.toLowerCase() || 'sales') as User['role'],
    avatar: supabaseUser.avatar_url || undefined,
    status: supabaseUser.status as User['status'],
    department: supabaseUser.department || 'General',
    lastLogin: supabaseUser.last_login || undefined,
    joinDate: supabaseUser.created_at,
    permissions: supabaseUser.permissions.map(p => `${p.module}.${p.action}`)
  }
}

export interface UseUsersDataReturn {
  users: User[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

export function useUsersData(): UseUsersDataReturn {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    const now = Date.now()

    // Check cache first unless force refresh
    if (!forceRefresh && dataCache.data && (now - dataCache.timestamp) < CACHE_DURATION) {
      setUsers(dataCache.data)
      setLoading(false)
      return
    }

    // If there's already a request in progress, wait for it
    if (dataCache.currentRequest) {
      try {
        const timeoutPromise = new Promise<User[]>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
        )
        const result = await Promise.race([dataCache.currentRequest, timeoutPromise])
        setUsers(result)
        setLoading(false)
        return
      } catch (error) {
        console.warn('Existing request timed out, creating new one')
        dataCache.currentRequest = null
      }
    }

    try {
      setLoading(true)
      setError(null)

             const requestPromise = (async () => {
         const supabaseUsers = await getAllUsersWithRoles()
         const data = supabaseUsers.map(convertSupabaseUser)
         
         // Update cache
         dataCache.data = data
         dataCache.timestamp = now
         
         return data
       })()

      dataCache.currentRequest = requestPromise
      
      await requestPromise
      
      setUsers(dataCache.data || [])
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Failed to load users. Please try again.')
      toast.error('Failed to load users')
      
      // Fallback to cached data if available
      if (dataCache.data) {
        setUsers(dataCache.data)
      }
    } finally {
      setLoading(false)
      dataCache.currentRequest = null
    }
  }, [])

  const refreshData = useCallback(async () => {
    await loadData(true)
    toast.success('Users data refreshed successfully')
  }, [loadData])

  // Load initial data on mount
  useEffect(() => {
    loadData(false)
  }, [])

  return {
    users,
    loading,
    error,
    refreshData
  }
} 