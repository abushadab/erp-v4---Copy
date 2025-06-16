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
    const request = fetcher()
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