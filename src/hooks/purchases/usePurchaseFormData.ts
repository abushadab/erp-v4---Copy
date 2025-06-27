import * as React from 'react'
import { toast } from 'sonner'
import { 
  getSuppliers, 
  getWarehouses, 
  type DatabaseSupplier, 
  type DatabaseWarehouse,
} from '@/lib/supabase/purchases'
import { 
  getProducts, 
  getPackaging, 
  type DatabaseProduct, 
  type DatabasePackaging,
} from '@/lib/supabase/queries'
import { apiCache } from '@/lib/supabase/cache'

export interface UsePurchaseFormDataReturn {
  // Data
  suppliers: DatabaseSupplier[]
  warehouses: DatabaseWarehouse[]
  products: DatabaseProduct[]
  packages: DatabasePackaging[]
  
  // Loading states
  dataLoading: boolean
  
  // Methods
  loadData: (forceRefresh?: boolean, isInitialLoad?: boolean) => Promise<void>
}

export function usePurchaseFormData(): UsePurchaseFormDataReturn {
  // State for data
  const [suppliers, setSuppliers] = React.useState<DatabaseSupplier[]>([])
  const [warehouses, setWarehouses] = React.useState<DatabaseWarehouse[]>([])
  const [products, setProducts] = React.useState<DatabaseProduct[]>([])
  const [packages, setPackages] = React.useState<DatabasePackaging[]>([])
  
  // Loading state
  const [dataLoading, setDataLoading] = React.useState(true)
  
  // Deduplication and initial load tracker
  const initialLoadTriggered = React.useRef(false)
  
  // Load data from Supabase with enhanced deduplication using global cache
  const loadData = React.useCallback(async (forceRefresh = false, isInitialLoad = false) => {
    console.log('🔍 loadData called with forceRefresh:', forceRefresh, 'isInitialLoad:', isInitialLoad)
    
    // For initial load, we're already in loading state, so don't check dataLoading
    // For subsequent calls, check if we're already loading to prevent overlapping requests
    if (!isInitialLoad && dataLoading && !forceRefresh) {
      console.log('⏳ Data already loading, skipping...')
      return
    }

    try {
      // Only set loading to true if not already true (for initial load)
      if (!dataLoading) {
        setDataLoading(true)
      }
      
      console.log('🔄 Fetching data using global cache')
      
      // Use global apiCache for all data fetching
      const [suppliersData, warehousesData, productsData, packagesData] = await Promise.all([
        apiCache.get('suppliers-active', () => getSuppliers()),
        apiCache.get('warehouses-all', () => getWarehouses()),
        apiCache.get('products-all', () => getProducts()),
        apiCache.get('packaging-all', () => getPackaging())
      ])
      
      const activeProducts = productsData.filter(p => p.status === 'active')
      const activePackages = packagesData.filter(p => p.status === 'active')
      
      console.log('✅ Data fetched successfully using global cache', {
        suppliers: suppliersData.length,
        warehouses: warehousesData.length,
        products: activeProducts.length,
        packages: activePackages.length
      })
      
      // Update state
      setSuppliers(suppliersData)
      setWarehouses(warehousesData)
      setProducts(activeProducts)
      setPackages(activePackages)
      
    } catch (error) {
      console.error('❌ Error loading data:', error)
      
      // Provide fallback data on error
      setSuppliers([])
      setWarehouses([])
      setProducts([])
      setPackages([])
      
      toast.error('Failed to load data. Please refresh the page.')
    } finally {
      console.log('🏁 Request completed, setting loading to false')
      setDataLoading(false)
    }
  }, []) // Remove dataLoading dependency to prevent circular re-creation

  // Load initial data only once with enhanced protection against React Strict Mode
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    
    // Double protection against React Strict Mode
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering data fetch')
      initialLoadTriggered.current = true
      loadData(false, true) // Pass isInitialLoad = true
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, []) // Empty dependency array to run only on mount

  return {
    // Data
    suppliers,
    warehouses,
    products,
    packages,
    
    // Loading states
    dataLoading,
    
    // Methods
    loadData
  }
} 