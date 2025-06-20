import * as React from 'react'
import { getSales, type SaleWithItems } from '@/lib/supabase/sales-client'

// Enhanced cache with request deduplication for ERP real-time needs
let salesCache: {
  data: SaleWithItems[] | null
  timestamp: number
  loadingPromise: Promise<SaleWithItems[]> | null
} = {
  data: null,
  timestamp: 0,
  loadingPromise: null
}

const CACHE_DURATION = 30 * 1000 // 30 seconds cache for better UX
const REQUEST_TIMEOUT = 15000 // Reduced to 15 seconds to match getSales optimization
const PROMISE_WAIT_TIMEOUT = 8000 // 8 second timeout for waiting on existing promises

// Global cache invalidation function
export function invalidateSalesCache() {
  console.log('🔄 Invalidating sales cache for ERP real-time update')
  salesCache.data = null
  salesCache.timestamp = 0
  salesCache.loadingPromise = null
}

// Auto-invalidate when page becomes visible (user comes back to tab)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('👁️ Page visible - invalidating sales cache for fresh ERP data')
      invalidateSalesCache()
    }
  })

  // Handle page focus for session recovery
  window.addEventListener('focus', () => {
    const cacheAge = salesCache.timestamp ? Date.now() - salesCache.timestamp : Infinity
    if (cacheAge > CACHE_DURATION) {
      console.log('🔄 Page focus - cache expired, invalidating sales cache')
      invalidateSalesCache()
    }
  })
}

export function useSalesData() {
  const [sales, setSales] = React.useState<SaleWithItems[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchSales = React.useCallback(async () => {
    const now = Date.now()
    
    // Check if we have valid cached data
    if (
      salesCache.data && 
      now - salesCache.timestamp < CACHE_DURATION
    ) {
      console.log('📦 Using cached sales data')
      setSales(salesCache.data)
      setIsLoading(false)
      return
    }

    // If there's already a promise in progress, wait for it with timeout
    if (salesCache.loadingPromise) {
      console.log('⏳ Sales data already being fetched, waiting for existing promise...')
      try {
        // Add timeout to prevent waiting forever for stuck promises
        const timeoutPromise = new Promise<SaleWithItems[]>((_, reject) => 
          setTimeout(() => reject(new Error('Existing promise timeout')), PROMISE_WAIT_TIMEOUT)
        );
        const data = await Promise.race([salesCache.loadingPromise, timeoutPromise]);
        setSales(data)
        setIsLoading(false)
        return
      } catch (err) {
        console.warn('⚠️ Existing sales promise timed out or failed, creating new request');
        // Clear the stuck promise and continue with new request
        salesCache.loadingPromise = null;
      }
    }

    try {
      console.log('🚀 Fetching fresh sales data from API (timeout: 15 seconds)')
      setIsLoading(true)
      setError(null)
      
      // Create promise with timeout protection (reduced to 15 seconds)
      const fetchPromise = Promise.race([
        getSales(),
        new Promise<SaleWithItems[]>((_, reject) => 
          setTimeout(() => reject(new Error('Sales data request timeout after 15 seconds')), REQUEST_TIMEOUT)
        )
      ]);
      
      // Store the promise to prevent concurrent requests
      salesCache.loadingPromise = fetchPromise;
      
      const data = await fetchPromise
      
      // Update cache with fresh data
      salesCache.data = data
      salesCache.timestamp = now
      
      setSales(data)
      setIsLoading(false)
      console.log('✅ Sales data fetched and cached:', data.length, 'records')
    } catch (err: any) {
      console.error('❌ Error fetching sales:', err)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to fetch sales data'
      
      if (err.message?.includes('timeout')) {
        errorMessage = 'Sales data is taking too long to load. Please try again.'
      } else if (err.message?.includes('Permission denied')) {
        errorMessage = 'You do not have permission to view sales data.'
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (err.message?.includes('Database query timeout')) {
        errorMessage = 'Database is overloaded. Please try again in a moment.'
      }
      
      setError(errorMessage)
      
      // Fallback to cached data if available
      if (salesCache.data) {
        console.log('🔄 Using stale cached data as fallback')
        setSales(salesCache.data)
      } else {
        setSales([]) // Empty state
      }
      
      setIsLoading(false)
    } finally {
      // Always cleanup the loading promise and ensure loading state is cleared
      salesCache.loadingPromise = null
      
      // Extra safety: ensure loading is false even on unexpected errors
      setTimeout(() => {
        setIsLoading(false)
      }, 100)
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      if (isMounted) {
        await fetchSales()
      }
    }
    
    loadData()
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false
    }
  }, [fetchSales])

  const refetch = React.useCallback(() => {
    // Clear cache and refetch
    invalidateSalesCache()
    fetchSales()
  }, [fetchSales])

  // Expose cache clearing function globally for debugging
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearSalesCache = invalidateSalesCache;
      (window as any).debugSalesCache = () => ({
        hasData: !!salesCache.data,
        cacheAge: salesCache.timestamp ? Date.now() - salesCache.timestamp : 'No cache',
        dataCount: salesCache.data?.length || 0,
        hasLoadingPromise: !!salesCache.loadingPromise
      });
      console.log('🔧 Sales cache debugging available: window.clearSalesCache() and window.debugSalesCache()')
    }
  }, [])

  return {
    sales,
    isLoading,
    error,
    refetch
  }
} 