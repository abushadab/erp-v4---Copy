import * as React from 'react'
import { getSales, type SaleWithItems } from '@/lib/supabase/sales-client'

// Simple in-memory cache for sales data
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

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Global cache invalidation function
export function invalidateSalesCache() {
  console.log('🔄 Invalidating sales cache')
  salesCache.data = null
  salesCache.timestamp = 0
  salesCache.promise = null
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

    // If there's already a promise in progress, wait for it
    if (salesCache.promise) {
      console.log('Sales data already being fetched, waiting for existing promise...')
      try {
        const data = await salesCache.promise
        setSales(data)
        setIsLoading(false)
        return
      } catch (err) {
        console.error('Error waiting for existing promise:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch sales data')
        setIsLoading(false)
        return
      }
    }

    try {
      console.log('Fetching fresh sales data from API')
      setIsLoading(true)
      setError(null)
      
      // Create and store the promise
      salesCache.promise = getSales()
      const data = await salesCache.promise
      
      // Update cache
      salesCache.data = data
      salesCache.timestamp = now
      salesCache.promise = null
      
      setSales(data)
      setIsLoading(false)
      console.log('Sales data fetched and cached:', data.length, 'records')
    } catch (err) {
      console.error('Error fetching sales:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data')
      salesCache.promise = null
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
    salesCache.data = null
    salesCache.timestamp = 0
    salesCache.promise = null
    fetchSales()
  }, [fetchSales])

  return {
    sales,
    isLoading,
    error,
    refetch
  }
} 