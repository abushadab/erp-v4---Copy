import { createBrowserClient } from '@supabase/ssr'

// Global client instance with session management
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create new client with automatic session refresh
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Set up automatic session refresh on focus/visibility change
  if (typeof window !== 'undefined') {
    // Refresh session when page becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Page became visible - refreshing session')
        try {
          await supabaseInstance?.auth.getSession()
        } catch (error) {
          console.error('Error refreshing session on visibility change:', error)
        }
      }
    }

    // Refresh session when page gains focus
    const handleFocus = async () => {
      console.log('🔄 Page gained focus - refreshing session')
      try {
        await supabaseInstance?.auth.getSession()
      } catch (error) {
        console.error('Error refreshing session on focus:', error)
      }
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Set up periodic session refresh (every 30 minutes)
    setInterval(async () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Periodic session refresh')
        try {
          await supabaseInstance?.auth.getSession()
        } catch (error) {
          console.error('Error in periodic session refresh:', error)
        }
      }
    }, 30 * 60 * 1000) // 30 minutes
  }

  return supabaseInstance
} 