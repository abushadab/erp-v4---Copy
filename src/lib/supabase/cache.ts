// Global cache and request deduplication to prevent duplicate API calls
class APICache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private pendingRequests = new Map<string, Promise<any>>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      console.log('🔄 Request already pending for:', key)
      return this.pendingRequests.get(key)!
    }

    // Check cache first
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('✅ Cache hit for:', key)
      return cached.data
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(key)
    }

    console.log('🔍 Cache miss - fetching:', key)
    
    // Create and store the pending request
    const request = this.executeWithRetry(fetcher)
    this.pendingRequests.set(key, request)

    try {
      const data = await request
      // Cache the result
      this.cache.set(key, { data, timestamp: Date.now() })
      return data
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(key)
    }
  }

  private async executeWithRetry<T>(fetcher: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
      return await fetcher()
    } catch (error: any) {
      // Check if it's an authentication error
      const isAuthError = error?.message?.includes('JWT') || 
                         error?.message?.includes('session') ||
                         error?.code === 'PGRST301' || // Supabase auth error
                         error?.code === 'invalid_grant'

      // Retry once for auth errors
      if (isAuthError && retryCount === 0) {
        console.log('🔐 Authentication error detected, clearing cache and retrying:', error.message)
        
        // Clear all cache on auth error
        this.clear()
        
        // Try to refresh session
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          await supabase.auth.getSession()
          console.log('✅ Session refreshed, retrying request')
        } catch (sessionError) {
          console.error('❌ Failed to refresh session:', sessionError)
          // If session refresh fails, redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          throw error
        }

        // Retry the request
        return this.executeWithRetry(fetcher, retryCount + 1)
      }

      throw error
    }
  }

  invalidate(key: string) {
    this.cache.delete(key)
    this.pendingRequests.delete(key)
    console.log('🗑️ Cache invalidated for:', key)
  }

  clear() {
    this.cache.clear()
    this.pendingRequests.clear()
    console.log('🧹 Cache cleared')
  }
}

// Export a singleton instance
export const apiCache = new APICache() 