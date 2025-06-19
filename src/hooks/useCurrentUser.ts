"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserWithPermissions, clearUserPermissionsCache } from '@/lib/supabase/users'
import { logLogin } from '@/lib/supabase/activity-logger'
import type { ExtendedUser } from '@/lib/types/supabase-types'

// Global state to prevent duplicate initial session handling across component remounts
let globalInitialSessionHandled = false
let globalCurrentUserId: string | null = null
let globalUserData: ExtendedUser | null = null
let globalLoadingState = true
let globalSafetyTimeout: NodeJS.Timeout | null = null
let globalRefreshCounter = 0

export function useCurrentUser() {
  const [user, setUser] = useState<ExtendedUser | null>(globalUserData)
  const [loading, setLoading] = useState(globalLoadingState)
  const [error, setError] = useState<string | null>(null)
  const [isSessionValid, setIsSessionValid] = useState(true)
  const [lastRefreshCounter, setLastRefreshCounter] = useState(globalRefreshCounter)
  const currentUserIdRef = useRef<string | null>(null)
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const initialLoadHandled = useRef(false)
  
  // Sync with global state changes
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (globalUserData !== user) {
        setUser(globalUserData)
      }
      if (globalLoadingState !== loading) {
        setLoading(globalLoadingState)
      }
      if (globalRefreshCounter !== lastRefreshCounter) {
        console.log('🔄 Refresh counter changed, updating local state')
        setLastRefreshCounter(globalRefreshCounter)
        setUser(globalUserData)
        setLoading(globalLoadingState)
      }
    }, 100) // Check every 100ms for state changes
    
    return () => clearInterval(syncInterval)
  }, [user, loading, lastRefreshCounter])

  useEffect(() => {
    const supabase = createClient()
    
    // Add a global safety timeout to prevent infinite loading (only one timeout across all instances)
    if (!globalSafetyTimeout && globalLoadingState) {
      globalSafetyTimeout = setTimeout(() => {
        console.warn('⚠️ Global safety timeout: Setting loading to false after 15 seconds')
        globalLoadingState = false
        setLoading(false)
        setError('Loading timeout - please refresh the page')
        globalSafetyTimeout = null
      }, 15000) // 15 second safety timeout
    }

    const fetchUser = async (userId: string, retryCount = 0) => {
      // Prevent duplicate calls for the same user
      if (currentUserIdRef.current === userId && user) {
        console.log('👤 User data already loaded for:', userId)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log('👤 Fetching user data for:', userId)
        const userData = await getUserWithPermissions(userId)

        // Only update if this is still the current user
        if (currentUserIdRef.current === userId) {
          setUser(userData)
          globalUserData = userData
          globalLoadingState = false
          setIsSessionValid(true)
          
          // Clear the global safety timeout since we loaded successfully
          if (globalSafetyTimeout) {
            clearTimeout(globalSafetyTimeout)
            globalSafetyTimeout = null
          }
          
          console.log('✅ User data loaded for:', userId)
        }
      } catch (err: any) {
        console.error('Error fetching user data:', err)
        
        // Check if it's a session/auth error
        const isAuthError = err?.message?.includes('JWT') || 
                           err?.message?.includes('session') ||
                           err?.message?.includes('timeout') ||
                           err?.code === 'PGRST301'
        
        if (isAuthError && retryCount === 0) {
          console.log('🔄 Auth error detected, refreshing session and retrying...')
          try {
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError) {
              // Retry once after session refresh
              return await fetchUser(userId, 1)
            }
          } catch (refreshErr) {
            console.error('Failed to refresh session:', refreshErr)
          }
        }
        
        if (isAuthError) {
          setIsSessionValid(false)
          console.log('🔐 Session appears invalid, will redirect to login')
          // Clear user data on auth error
          setUser(null)
          currentUserIdRef.current = null
          // Redirect to login after a short delay
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          }, 1000)
        }
        
        if (currentUserIdRef.current === userId) {
          setError('Failed to load user data')
        }
      } finally {
        if (currentUserIdRef.current === userId) {
          setLoading(false)
          globalLoadingState = false
        }
      }
    }

    const checkSessionValidity = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          console.log('⚠️ Session check failed or no session found')
          setIsSessionValid(false)
          return false
        }
        
        // Check if session is close to expiring (within 5 minutes)
        const expiresAt = session.expires_at
        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = expiresAt - now
        
        if (timeUntilExpiry < 300) { // Less than 5 minutes
          console.log('⏰ Session expiring soon, refreshing...')
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('❌ Failed to refresh session:', refreshError)
            setIsSessionValid(false)
            return false
          }
        }
        
        setIsSessionValid(true)
        return true
      } catch (error) {
        console.error('Error checking session:', error)
        setIsSessionValid(false)
        return false
      }
    }

    // Check initial session validity but let onAuthStateChange handle the user loading
    const checkInitialSession = async () => {
      const isValid = await checkSessionValidity()
      if (!isValid) {
        setUser(null)
        globalUserData = null
        setLoading(false)
        globalLoadingState = false
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        currentUserIdRef.current = null
        setUser(null)
        globalUserData = null
        setLoading(false)
        globalLoadingState = false
      }
      // If session exists, onAuthStateChange will handle loading the user data
    }

    checkInitialSession()

    // Set up periodic session checking (every 5 minutes)
    sessionCheckInterval.current = setInterval(async () => {
      if (currentUserIdRef.current) {
        const isValid = await checkSessionValidity()
        if (!isValid && typeof window !== 'undefined') {
          // Session became invalid, redirect to login
          setTimeout(() => window.location.href = '/login', 1000)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('🔄 Auth state changed:', event)

        if (session?.user) {
          const newUserId = session.user.id

          // Handle INITIAL_SESSION - this is the primary way to load user data
          if (event === 'INITIAL_SESSION') {
            if (!globalInitialSessionHandled || globalCurrentUserId !== newUserId) {
              console.log('👤 Handling INITIAL_SESSION, loading user data for:', newUserId)
              globalInitialSessionHandled = true
              globalCurrentUserId = newUserId
              initialLoadHandled.current = true
              currentUserIdRef.current = newUserId
              await fetchUser(newUserId)
            } else {
              console.log('👤 Skipping duplicate INITIAL_SESSION for:', newUserId, '(already handled globally)')
            }
            setIsSessionValid(true)
            return
          }

          // For other events (SIGNED_IN, TOKEN_REFRESHED, etc.)
          if (currentUserIdRef.current !== newUserId) {
            console.log('👤 New user detected on', event, ', fetching data for:', newUserId)
            currentUserIdRef.current = newUserId
            await fetchUser(newUserId)
          } else if (currentUserIdRef.current === newUserId && !user) {
            console.log('👤 Same user but no data loaded on', event, ', fetching data for:', newUserId)
            await fetchUser(newUserId)
          } else {
            console.log('👤 Auth state changed but user data already loaded for:', newUserId)
          }
          setIsSessionValid(true)
        } else {
          currentUserIdRef.current = null
          setUser(null)
          globalUserData = null
          setError(null)
          setLoading(false)
          globalLoadingState = false
          setIsSessionValid(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
      if (globalSafetyTimeout) {
        clearTimeout(globalSafetyTimeout) // Clear the global safety timeout
        globalSafetyTimeout = null
      }
      // Note: We intentionally don't reset initialLoadHandled.current here
      // to prevent duplicate loads during React Strict Mode remounts
    }
  }, []) // Remove user dependency to prevent unnecessary re-runs

  // Function to refresh current user data
  const refreshUser = async () => {
    // Get user ID from current user data or ref
    const userId = user?.id || currentUserIdRef.current || globalCurrentUserId
    
    if (userId) {
      console.log('🔄 Manually refreshing user data for:', userId)
      console.log('🔍 User ID source:', {
        fromUser: user?.id,
        fromRef: currentUserIdRef.current,
        fromGlobal: globalCurrentUserId,
        selected: userId
      })
      
      try {
        // Clear both cache and global state
        console.log('🗑️ Clearing cache in refreshUser...')
        clearUserPermissionsCache(userId)
        
        // Set loading state
        console.log('⏳ Setting loading state to true...')
        setLoading(true)
        globalLoadingState = true
        
        // Trigger fresh fetch - force a new request by clearing cache again
        console.log('🔄 Fetching fresh user data after manual refresh...')
        console.log('🔍 About to call getUserWithPermissions for:', userId)
        const userData = await getUserWithPermissions(userId)
        console.log('📥 getUserWithPermissions returned:', userData)
        
        // Update both local and global state
        console.log('💾 Updating local and global state with fresh data...')
        setUser(userData)
        globalUserData = userData
        setLoading(false)
        globalLoadingState = false
        
        // Update the ref for consistency
        currentUserIdRef.current = userId
        
        // Increment refresh counter to trigger updates in all hook instances
        globalRefreshCounter++
        console.log('✅ User data refreshed successfully:', userData?.name, '- refresh counter:', globalRefreshCounter)
        console.log('🔄 Global state updated - all components should refresh now')
      } catch (error) {
        console.error('❌ Error refreshing user data:', error)
        setLoading(false)
        globalLoadingState = false
      }
    } else {
      console.warn('⚠️ refreshUser called but no user ID available:', {
        userExists: !!user,
        currentUserIdRef: currentUserIdRef.current,
        globalCurrentUserId
      })
    }
  }

  return { user, loading, error, isSessionValid, refreshUser }
}