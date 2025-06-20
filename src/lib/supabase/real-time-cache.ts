// Real-time cache invalidation system for ERP data freshness
import { createClient } from './client'
import { apiCache } from './cache'
import { invalidateSalesCache } from '../hooks/useSalesData'

class RealTimeCacheManager {
  private supabase = createClient()
  private subscriptions: { [key: string]: any } = {}

  // Initialize real-time subscriptions for ERP data
  initialize() {
    console.log('🔄 Initializing real-time cache invalidation for ERP system')

    // Sales data changes
    this.subscriptions.sales = this.supabase
      .channel('sales-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sales' }, 
        (payload: any) => {
          console.log('💰 Sales data changed, invalidating caches:', payload)
          this.invalidateSalesRelatedCaches()
        }
      )
      .subscribe()

    // Purchase data changes
    this.subscriptions.purchases = this.supabase
      .channel('purchases-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        (payload: any) => {
          console.log('📦 Purchase data changed, invalidating caches:', payload)
          this.invalidatePurchaseRelatedCaches()
        }
      )
      .subscribe()

    // Inventory/Stock changes
    this.subscriptions.stock = this.supabase
      .channel('stock-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'product_warehouse_stock' },
        (payload: any) => {
          console.log('📊 Stock data changed, invalidating caches:', payload)
          this.invalidateStockRelatedCaches()
        }
      )
      .subscribe()

    // Account/Financial changes
    this.subscriptions.accounts = this.supabase
      .channel('accounts-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        (payload: any) => {
          console.log('💼 Account data changed, invalidating caches:', payload)
          this.invalidateFinancialCaches()
        }
      )
      .subscribe()

    // Transaction changes
    this.subscriptions.transactions = this.supabase
      .channel('transactions-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'journal_entries' },
        (payload: any) => {
          console.log('📝 Transaction data changed, invalidating caches:', payload)
          this.invalidateFinancialCaches()
        }
      )
      .subscribe()
  }

  // Invalidate sales-related caches
  private invalidateSalesRelatedCaches() {
    invalidateSalesCache()
    apiCache.invalidateByPattern('sales-')
    apiCache.invalidateByPattern('dashboard')
    
    // Trigger re-render of components that depend on sales data
    this.dispatchCacheUpdate('sales')
  }

  // Invalidate purchase-related caches
  private invalidatePurchaseRelatedCaches() {
    apiCache.invalidateByPattern('purchases-')
    apiCache.invalidateByPattern('dashboard')
    
    this.dispatchCacheUpdate('purchases')
  }

  // Invalidate stock-related caches
  private invalidateStockRelatedCaches() {
    apiCache.invalidateByPattern('stock-')
    apiCache.invalidateByPattern('inventory-')
    apiCache.invalidateByPattern('warehouse')
    apiCache.invalidateByPattern('products')
    
    this.dispatchCacheUpdate('inventory')
  }

  // Invalidate financial caches
  private invalidateFinancialCaches() {
    apiCache.invalidateByPattern('accounts-')
    apiCache.invalidateByPattern('transactions-')
    apiCache.invalidateByPattern('financial')
    apiCache.invalidateByPattern('dashboard')
    
    this.dispatchCacheUpdate('financial')
  }

  // Dispatch custom events for cache updates
  private dispatchCacheUpdate(dataType: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp-cache-invalidated', {
        detail: { dataType, timestamp: Date.now() }
      }))
    }
  }

  // Clean up subscriptions
  cleanup() {
    Object.values(this.subscriptions).forEach(subscription => {
      if (subscription) {
        this.supabase.removeChannel(subscription)
      }
    })
    this.subscriptions = {}
    console.log('🧹 Real-time cache subscriptions cleaned up')
  }

  // Manual invalidation for specific data types
  invalidateDataType(dataType: 'sales' | 'purchases' | 'inventory' | 'financial') {
    switch (dataType) {
      case 'sales':
        this.invalidateSalesRelatedCaches()
        break
      case 'purchases':
        this.invalidatePurchaseRelatedCaches()
        break
      case 'inventory':
        this.invalidateStockRelatedCaches()
        break
      case 'financial':
        this.invalidateFinancialCaches()
        break
    }
  }
}

// Export singleton instance
export const realTimeCacheManager = new RealTimeCacheManager()

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  // Initialize after a short delay to allow app to load
  setTimeout(() => {
    realTimeCacheManager.initialize()
  }, 2000)

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    realTimeCacheManager.cleanup()
  })

  // Expose for debugging
  (window as any).realTimeCacheManager = realTimeCacheManager
  console.log('🔧 Real-time cache manager available at window.realTimeCacheManager')
}

// Hook for components to listen to cache updates
export function useRealTimeCacheUpdates(callback: (dataType: string) => void): () => void {
  if (typeof window !== 'undefined') {
    const handleCacheUpdate = (event: CustomEvent) => {
      callback(event.detail.dataType)
    }

    window.addEventListener('erp-cache-invalidated', handleCacheUpdate as EventListener)
    
    return () => {
      window.removeEventListener('erp-cache-invalidated', handleCacheUpdate as EventListener)
    }
  }
  
  return () => {}
} 