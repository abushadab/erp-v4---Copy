import * as React from 'react'
import { type User as UserType } from '@/lib/types'
import { getAllUsersWithRoles } from '@/lib/supabase/users'
import type { ExtendedUser } from '@/lib/types/supabase-types'
import { useToast } from '@/hooks/use-toast'

// Global data cache and request deduplication to prevent multiple API calls
const dataCache = {
  users: null as UserType[] | null,
  lastFetch: 0,
  isLoading: false,
  currentRequest: null as Promise<void> | null
}

const CACHE_DURATION = 30000 // 30 seconds

// Convert ExtendedUser to UserType for compatibility
const convertSupabaseUser = (supabaseUser: ExtendedUser): UserType => {
  return {
    id: supabaseUser.id,
    name: supabaseUser.name,
    email: supabaseUser.email || '',
    // Use role ID (slug) instead of display name so it matches internal role enums
    role: (supabaseUser.roles[0]?.id || supabaseUser.primary_role?.toLowerCase() || 'sales') as UserType['role'],
    avatar: supabaseUser.avatar_url || undefined,
    status: supabaseUser.status as UserType['status'],
    department: supabaseUser.department || 'General',
    lastLogin: supabaseUser.last_login || undefined,
    joinDate: supabaseUser.created_at,
    permissions: supabaseUser.permissions.map(p => `${p.module}.${p.action}`)
  }
}

export function useUsersData() {
  const [users, setUsers] = React.useState<UserType[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const initialLoadTriggered = React.useRef(false)
  const { toast } = useToast()

  // Data loading function with enhanced request deduplication
  const loadUsersData = React.useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadUsersData called with forceRefresh:', forceRefresh)
    
    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        dataCache.users && 
        (now - dataCache.lastFetch) < CACHE_DURATION) {
      console.log('📦 Using cached users data')
      setUsers(dataCache.users)
      setLoading(false)
      return
    }

    // If there's already a request in progress, wait for it
    if (dataCache.currentRequest) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        await dataCache.currentRequest
        // After the request completes, update state with cached data
        if (dataCache.users) {
          console.log('📦 Using data from completed request')
          setUsers(dataCache.users)
          setLoading(false)
        }
      } catch (error) {
        console.error('⚠️ Error in concurrent request:', error)
      }
      return
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh users data from API')
        setLoading(true)
        
        // Load from Supabase
        const supabaseUsers = await getAllUsersWithRoles()
        const usersData = supabaseUsers.map(convertSupabaseUser)
        
        console.log('✅ Users data fetched successfully')
        
        // Update cache
        dataCache.users = usersData
        dataCache.lastFetch = now
        
        // Update state
        setUsers(usersData)
      } catch (error) {
        console.error('❌ Error loading users data:', error)
        toast({
          title: "Error",
          description: "Failed to load users data. Please try again.",
          variant: "destructive",
        })
        setUsers([])
      } finally {
        console.log('🏁 Request completed, setting loading to false')
        setLoading(false)
        setRefreshing(false)
        dataCache.currentRequest = null
      }
    })()

    // Store the request promise so other calls can wait for it
    dataCache.currentRequest = requestPromise
    
    // Wait for the request to complete
    await requestPromise
  }, [toast])

  // Load initial data only once
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering data fetch')
      initialLoadTriggered.current = true
      loadUsersData(false)
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, [loadUsersData])

  const refreshData = React.useCallback(async () => {
    setRefreshing(true)
    await loadUsersData(true) // Force refresh
  }, [loadUsersData])

  return {
    users,
    loading,
    refreshing,
    refreshData,
    loadUsersData
  }
} 