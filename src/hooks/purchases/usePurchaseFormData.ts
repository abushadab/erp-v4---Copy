import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { 
  getSuppliers,
  type DatabaseSupplier, 
  type DatabaseWarehouse,
} from '@/lib/supabase/purchases'
import { 
  getProducts,
  getPackaging, 
  type DatabaseProduct, 
  type DatabasePackaging,
  getWarehouses
} from '@/lib/supabase/queries'
import { apiCache } from '@/lib/supabase/cache'

export interface PurchaseFormData {
  suppliers: DatabaseSupplier[]
  warehouses: DatabaseWarehouse[]
  products: DatabaseProduct[]
  packaging: DatabasePackaging[]
}

export interface UsePurchaseFormDataReturn {
  data: PurchaseFormData
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

export function usePurchaseFormData(): UsePurchaseFormDataReturn {
  const [data, setData] = useState<PurchaseFormData>({
    suppliers: [],
    warehouses: [],
    products: [],
    packaging: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Use global apiCache for all data fetching
      const [suppliers, warehouses, products, packaging] = await Promise.all([
        apiCache.get('suppliers-active', () => getSuppliers()),
        apiCache.get('warehouses-all', () => getWarehouses()),
        apiCache.get('products-all', () => getProducts()),
        apiCache.get('packaging-all', () => getPackaging())
      ])

      setData({
        suppliers,
        warehouses,
        products,
        packaging
      })
    } catch (err) {
      console.error('Error loading purchase form data:', err)
      setError('Failed to load form data. Please refresh the page.')
      toast.error('Failed to load purchase form data')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await loadData(true)
    toast.success('Form data refreshed successfully')
  }, [loadData])

  // Load initial data on mount
  useEffect(() => {
    loadData(false)
  }, [])

  return {
    data,
    loading,
    error,
    refreshData
  }
} 