// Global cache and request deduplication to prevent duplicate API calls
class APICache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private pendingRequests = new Map<string, Promise<any>>()
  private readonly CACHE_DURATION = 15 * 1000 // Reduced to 15 seconds for ERP system
  private readonly CRITICAL_DATA_CACHE_DURATION = 5 * 1000 // 5 seconds for critical ERP data

  // Define which data types need ultra-fresh caching
  private readonly CRITICAL_CACHE_KEYS = [
    'sales-', 'purchases-', 'inventory-', 'stock-', 'accounts-', 'transactions-'
  ]

  private isCriticalData(key: string): boolean {
    return this.CRITICAL_CACHE_KEYS.some(prefix => key.startsWith(prefix))
  }

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request for this key with timeout protection
    if (this.pendingRequests.has(key)) {
      console.log('🔄 Request already pending for:', key)
      try {
        // Add timeout to prevent waiting forever for stuck promises
        const existingRequest = this.pendingRequests.get(key)!
        const timeoutPromise = new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error(`Request timeout for key: ${key}`)), 8000)
        );
        return await Promise.race([existingRequest, timeoutPromise]);
      } catch (error) {
        console.warn('⚠️ Pending request timed out or failed for:', key, 'creating new request');
        // Clear the stuck promise and continue with new request
        this.pendingRequests.delete(key);
      }
    }

    // Check cache first with different durations for critical vs non-critical data
    const cached = this.cache.get(key)
    const cacheDuration = this.isCriticalData(key) ? this.CRITICAL_DATA_CACHE_DURATION : this.CACHE_DURATION
    
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      // console.log(`✅ Cache hit for: ${key} (${this.isCriticalData(key) ? 'critical' : 'standard'} data)`)
      return cached.data
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(key)
    }

    // console.log(`🔍 Cache miss - fetching: ${key} (${this.isCriticalData(key) ? 'critical' : 'standard'} data)`)
    
    // Create timeout for the entire operation
    const timeoutId = setTimeout(() => {
      console.log('⏰ Request timeout - clearing pending request for:', key);
      this.pendingRequests.delete(key);
    }, 10000); // 10 second timeout
    
    // Create and store the pending request
    const request = this.executeWithRetry(fetcher)
    this.pendingRequests.set(key, request)

    try {
      const data = await request
      clearTimeout(timeoutId);
      // Cache the result
      this.cache.set(key, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
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
  
  // Debug method to show current cache state
  debug() {
    console.log('🔍 Cache debug info:', {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pendingRequests.keys())
    })
  }

  // Auto-invalidate cache for ERP data types
  invalidateByPattern(pattern: string) {
    const keysToInvalidate = Array.from(this.cache.keys()).filter(key => key.includes(pattern))
    keysToInvalidate.forEach(key => {
      this.cache.delete(key)
      this.pendingRequests.delete(key)
    })
    console.log(`🗑️ Pattern cache invalidation for "${pattern}": ${keysToInvalidate.length} keys cleared`)
  }


}

// Export a singleton instance
export const apiCache = new APICache()

// Expose cache debugging globally
if (typeof window !== 'undefined') {
  (window as any).debugApiCache = {
    clear: () => apiCache.clear(),
    debug: () => apiCache.debug(),
    invalidate: (key: string) => apiCache.invalidate(key),
    invalidateByPattern: (pattern: string) => apiCache.invalidateByPattern(pattern)
  }
  // console.log('🔧 API cache debugging available at window.debugApiCache')
  // console.log('✅ ERP low-caching system initialized')
} 