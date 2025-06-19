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

// Production-optimized timeouts for Vercel deployment
const PRODUCTION_SAFETY_TIMEOUT = 8000 // Reduced from 15 seconds to 8 seconds
const SESSION_CHECK_INTERVAL = 10 * 60 * 1000 // Check every 10 minutes instead of 5

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
    
    // Add a global safety timeout to prevent infinite loading (optimized for production)
    if (!globalSafetyTimeout && globalLoadingState) {
      globalSafetyTimeout = setTimeout(() => {
        console.warn('⚠️ Global safety timeout: Setting loading to false after', PRODUCTION_SAFETY_TIMEOUT / 1000, 'seconds')
        globalLoadingState = false
        setLoading(false)
        setError('Connection timeout - please refresh the page or check your internet connection')
        globalSafetyTimeout = null
      }, PRODUCTION_SAFETY_TIMEOUT)
    }

    const fetchUser = async (userId: string, retryCount = 0) => {
      // Prevent duplicate calls for the same user
      if (currentUserIdRef.current === userId && user && !loading) {
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
                           err?.message?.includes('login again') ||
                           err?.code === 'PGRST301'
        
        if (isAuthError && retryCount === 0) {
          console.log('🔄 Auth error detected, refreshing session and retrying...')
          try {
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError) {
              // Retry once after session refresh with small delay
              setTimeout(() => fetchUser(userId, 1), 500)
              return
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
          globalUserData = null
          currentUserIdRef.current = null
          
          // Redirect to login after a short delay
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          }, 1000)
        } else {
          // For non-auth errors, provide user-friendly message
          if (currentUserIdRef.current === userId) {
            setError(err?.message || 'Failed to load user data - please refresh the page')
          }
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
        
        // Check if session is close to expiring (within 10 minutes for production)
        const expiresAt = session.expires_at
        const now = Math.floor(Date.now() / 1000)
        const timeUntilExpiry = expiresAt - now
        
        if (timeUntilExpiry < 600) { // Less than 10 minutes
          console.log('⏰ Session expiring soon, refreshing...')
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('❌ Failed to refresh session:', refreshError)
            setIsSessionValid(false)
            return false
          }
          console.log('✅ Session refreshed successfully')
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
      try {
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
      } catch (error) {
        console.error('Error in initial session check:', error)
        setLoading(false)
        globalLoadingState = false
        setError('Failed to verify session - please refresh the page')
      }
    }

    checkInitialSession()

    // Set up periodic session checking (reduced frequency for production)
    sessionCheckInterval.current = setInterval(async () => {
      if (currentUserIdRef.current) {
        const isValid = await checkSessionValidity()
        if (!isValid && typeof window !== 'undefined') {
          // Clear all data and redirect to login on session failure
          setUser(null)
          globalUserData = null
          currentUserIdRef.current = null
          setTimeout(() => {
            window.location.href = '/login'
          }, 1000)
        }
      }
    }, SESSION_CHECK_INTERVAL)

    // Listen for auth state changes with better error handling
    const {
      data: { subscription }
         } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
       console.log('🔄 Auth state changed:', event, session?.user?.id ? 'User ID: ' + session.user.id : 'No user')
      
      try {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const userId = session.user.id
          
          // Only fetch new data if user changed or we don't have data
          if (globalCurrentUserId !== userId || !globalUserData) {
            console.log('👤 New user detected on', event, ', fetching data for:', userId)
            currentUserIdRef.current = userId
            globalCurrentUserId = userId
            await fetchUser(userId)
            
                         // Log the login (only on actual sign in, not initial session)
             if (event === 'SIGNED_IN') {
               try {
                 await logLogin()
               } catch (loginLogError) {
                 console.warn('Failed to log login:', loginLogError)
               }
             }
          } else {
            console.log('👤 Same user, using existing data')
            setLoading(false)
            globalLoadingState = false
          }
        } else if (event === 'SIGNED_OUT' || !session) {
          console.log('👤 User signed out, clearing data')
          currentUserIdRef.current = null
          globalCurrentUserId = null
          setUser(null)
          globalUserData = null
          setLoading(false)
          globalLoadingState = false
          setError(null)
          
          // Clear cache
          clearUserPermissionsCache()
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token refreshed for user:', session.user.id)
          // Don't refetch user data on token refresh, just ensure we're still valid
          setIsSessionValid(true)
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
        setLoading(false)
        globalLoadingState = false
        setError('Authentication error - please refresh the page')
      }
    })

    return () => {
      subscription.unsubscribe()
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
    }
  }, [])

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