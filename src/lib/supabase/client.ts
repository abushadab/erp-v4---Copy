import { createBrowserClient } from '@supabase/ssr'

// Global client instance with session management
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null
let lastSessionRefresh = 0
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function createClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create new client with automatic session refresh and production optimizations
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        // Production-optimized settings
        flowType: 'pkce',
        debug: false
      },
      global: {
        headers: {
          'x-client-info': 'erp-v4-production'
        }
      }
    }
  )

  // Set up automatic session refresh on focus/visibility change (optimized for production)
  if (typeof window !== 'undefined') {
    // Refresh session when page becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        // Only refresh if it's been more than 5 minutes since last refresh
        if (now - lastSessionRefresh > SESSION_REFRESH_INTERVAL) {
          console.log('🔄 Page became visible - refreshing session')
          try {
            const { data, error } = await supabaseInstance?.auth.getSession()
            if (!error && data.session) {
              lastSessionRefresh = now
              console.log('✅ Session refresh successful')
            }
          } catch (error) {
            console.error('Error refreshing session on visibility change:', error)
          }
        }
      }
    }

    // Refresh session when page gains focus
    const handleFocus = async () => {
      const now = Date.now()
      // Only refresh if it's been more than 5 minutes since last refresh
      if (now - lastSessionRefresh > SESSION_REFRESH_INTERVAL) {
        console.log('🔄 Page gained focus - refreshing session')
        try {
          const { data, error } = await supabaseInstance?.auth.getSession()
          if (!error && data.session) {
            lastSessionRefresh = now
            console.log('✅ Session refresh on focus successful')
          }
        } catch (error) {
          console.error('Error refreshing session on focus:', error)
        }
      }
    }

    // Handle connection errors and retry logic
    const handleConnectionError = () => {
      console.warn('🔗 Network connection issues detected, will retry on next user action')
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('offline', handleConnectionError)
    window.addEventListener('online', handleVisibilityChange) // Refresh when coming back online

    // Set up periodic session refresh (reduced frequency for production)
    setInterval(async () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        if (now - lastSessionRefresh > SESSION_REFRESH_INTERVAL) {
          console.log('🔄 Periodic session refresh')
          try {
            const { data, error } = await supabaseInstance?.auth.getSession()
            if (!error && data.session) {
              lastSessionRefresh = now
              console.log('✅ Periodic session refresh successful')
            }
          } catch (error) {
            console.error('Error in periodic session refresh:', error)
          }
        }
      }
    }, SESSION_REFRESH_INTERVAL) // Every 5 minutes
  }

  return supabaseInstance
} 