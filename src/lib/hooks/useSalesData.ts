import * as React from 'react'
import { getSales, type SaleWithItems } from '@/lib/supabase/sales-client'

// Simple in-memory cache for sales data with ERP-optimized timing
let salesCache: {
  data: SaleWithItems[] | null
  timestamp: number
  isLoading: boolean
  promise: Promise<SaleWithItems[]> | null
} = {
  data: null,
  timestamp: 0,
  isLoading: false,
  promise: null
}

const CACHE_DURATION = 10 * 1000 // Reduced to 10 seconds for ERP real-time needs

// Global cache invalidation function
export function invalidateSalesCache() {
  console.log('🔄 Invalidating sales cache for ERP real-time update')
  salesCache.data = null
  salesCache.timestamp = 0
  salesCache.promise = null
  salesCache.isLoading = false
}

// Auto-invalidate when page becomes visible (user comes back to tab)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('👁️ Page visible - invalidating sales cache for fresh ERP data')
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
      console.log('Using cached sales data')
      setSales(salesCache.data)
      setIsLoading(false)
      return
    }

    // If there's already a promise in progress, wait for it with timeout
    if (salesCache.promise && salesCache.isLoading) {
      console.log('Sales data already being fetched, waiting for existing promise...')
      try {
        // Add timeout to prevent waiting forever for stuck promises
        const timeoutPromise = new Promise<SaleWithItems[]>((_, reject) => 
          setTimeout(() => reject(new Error('Sales data loading timeout')), 8000)
        );
        const data = await Promise.race([salesCache.promise, timeoutPromise]);
        setSales(data)
        setIsLoading(false)
        return
      } catch (err) {
        console.warn('⚠️ Sales promise timed out or failed, creating new request');
        // Clear the stuck promise and continue with new request
        salesCache.promise = null;
        salesCache.isLoading = false;
      }
    }

    try {
      console.log('Fetching fresh sales data from API')
      setIsLoading(true)
      setError(null)
      
      // Mark as loading and create timeout
      salesCache.isLoading = true
      const timeoutId = setTimeout(() => {
        console.log('⏰ Sales data loading timeout - clearing cache');
        salesCache.isLoading = false;
        salesCache.promise = null;
      }, 10000); // 10 second timeout
      
      // Create and store the promise
      salesCache.promise = getSales()
      const data = await salesCache.promise
      
      clearTimeout(timeoutId);
      
      // Update cache
      salesCache.data = data
      salesCache.timestamp = now
      salesCache.promise = null
      salesCache.isLoading = false
      
      setSales(data)
      setIsLoading(false)
      console.log('Sales data fetched and cached:', data.length, 'records')
    } catch (err) {
      console.error('Error fetching sales:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data')
      salesCache.promise = null
      salesCache.isLoading = false
      setIsLoading(false)
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
      (window as any).clearSalesCache = invalidateSalesCache
      console.log('🔧 Sales cache clearing available at window.clearSalesCache()')
    }
  }, [])

  return {
    sales,
    isLoading,
    error,
    refetch
  }
} 