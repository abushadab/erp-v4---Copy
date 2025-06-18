import * as React from 'react'
import { getCustomers, getWarehouses, getProducts, getProductsByWarehouse, type Customer } from '@/lib/supabase/sales-client'

export function useAddSaleData() {
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [warehouses, setWarehouses] = React.useState<any[]>([])
  const [products, setProducts] = React.useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = React.useState(true)
  const [loadingWarehouses, setLoadingWarehouses] = React.useState(true)
  const [loadingProducts, setLoadingProducts] = React.useState(true)
  const [errors, setErrors] = React.useState<{ customers?: string; warehouses?: string; products?: string }>({})

  // Load customers
  const loadCustomers = React.useCallback(async () => {
    console.log('👥 Loading customers...')
    setLoadingCustomers(true)

    try {
      const data = await getCustomers()
      setCustomers(data)
      console.log('✅ Customers loaded:', data.length)
    } catch (error) {
      console.error('❌ Error loading customers:', error)
      setErrors(prev => ({ ...prev, customers: 'Failed to load customers' }))
    } finally {
      setLoadingCustomers(false)
    }
  }, [])

  // Load warehouses - now uses cached version from queries
  const loadWarehouses = React.useCallback(async () => {
    console.log('🏭 Loading warehouses...')
    setLoadingWarehouses(true)

    try {
      const data = await getWarehouses()
      setWarehouses(data)
      console.log('✅ Warehouses loaded:', data.length)
    } catch (error) {
      console.error('❌ Error loading warehouses:', error)
    } finally {
      setLoadingWarehouses(false)
    }
  }, [])

  // Load initial products
  const loadInitialProducts = React.useCallback(async () => {
    console.log('📦 Loading products...')
    setLoadingProducts(true)

    try {
      const data = await getProducts()
      setProducts(data)
      console.log('✅ Products loaded:', data.length)
    } catch (error) {
      console.error('❌ Error loading products:', error)
      setErrors(prev => ({ ...prev, products: 'Failed to load products' }))
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  // Initial data load
  React.useEffect(() => {
    Promise.all([
      loadCustomers(),
      loadWarehouses(),
      loadInitialProducts()
    ])
  }, [loadCustomers, loadWarehouses, loadInitialProducts])

  // Load products for specific warehouse
  const loadProducts = React.useCallback(async (warehouseId?: string) => {
    console.log('📦 Loading products for warehouse:', warehouseId || 'all')
    setLoadingProducts(true)
    
    try {
      const data = warehouseId ? await getProductsByWarehouse(warehouseId) : await getProducts()
      setProducts(data)
      setLoadingProducts(false)
      console.log('✅ Products loaded:', data.length)
    } catch (error) {
      console.error('❌ Error loading products:', error)
      setLoadingProducts(false)
    }
  }, [])

  const clearCache = React.useCallback(() => {
    // Reload all data
    console.log('🔄 Clearing cache and reloading data...')
    Promise.all([
      loadCustomers(),
      loadWarehouses(),
      loadInitialProducts()
    ])
  }, [loadCustomers, loadWarehouses, loadInitialProducts])

  return {
    customers,
    warehouses,
    products,
    loadingCustomers,
    loadingWarehouses,
    loadingProducts,
    errors,
    loadProducts,
    clearCache
  }
} 