import * as React from 'react'
import { getCustomers, getWarehouses, getProducts, getProductsByWarehouse, type Customer } from '@/lib/supabase/sales-client'

// Global promises to prevent duplicate API calls across ALL component instances
let globalPromises: {
  customers: Promise<any> | null
  warehouses: Promise<any> | null
  products: Promise<any> | null
} = {
  customers: null,
  warehouses: null,
  products: null
}

// Global data cache
let globalData: {
  customers: Customer[]
  warehouses: any[]
  products: any[]
} = {
  customers: [],
  warehouses: [],
  products: []
}

export function useAddSaleData() {
  const [customers, setCustomers] = React.useState<Customer[]>(globalData.customers)
  const [warehouses, setWarehouses] = React.useState<any[]>(globalData.warehouses)
  const [products, setProducts] = React.useState<any[]>(globalData.products)
  const [loadingCustomers, setLoadingCustomers] = React.useState(true)
  const [loadingWarehouses, setLoadingWarehouses] = React.useState(true)
  const [loadingProducts, setLoadingProducts] = React.useState(true)
  const [errors, setErrors] = React.useState<{ customers?: string; warehouses?: string; products?: string }>({})

  // Load customers with global deduplication
  const loadCustomers = React.useCallback(async () => {
    if (globalData.customers.length > 0) {
      console.log('📋 Using cached customers')
      setCustomers(globalData.customers)
      setLoadingCustomers(false)
      return
    }

    if (globalPromises.customers) {
      console.log('📋 Customers already loading, waiting...')
      try {
        const data = await globalPromises.customers
        setCustomers(data)
        setLoadingCustomers(false)
      } catch (error) {
        console.error('Error waiting for customers:', error)
        setLoadingCustomers(false)
      }
      return
    }

    console.log('📋 Loading customers...')
    globalPromises.customers = getCustomers()
    
    try {
      const data = await globalPromises.customers
      globalData.customers = data
      setCustomers(data)
      setLoadingCustomers(false)
      console.log('✅ Customers loaded:', data.length)
    } catch (error) {
      console.error('❌ Error loading customers:', error)
      setLoadingCustomers(false)
    } finally {
      globalPromises.customers = null
    }
  }, [])

  // Load warehouses with global deduplication
  const loadWarehouses = React.useCallback(async () => {
    if (globalData.warehouses.length > 0) {
      console.log('🏭 Using cached warehouses')
      setWarehouses(globalData.warehouses)
      setLoadingWarehouses(false)
      return
    }

    if (globalPromises.warehouses) {
      console.log('🏭 Warehouses already loading, waiting...')
      try {
        const data = await globalPromises.warehouses
        setWarehouses(data)
        setLoadingWarehouses(false)
      } catch (error) {
        console.error('Error waiting for warehouses:', error)
        setLoadingWarehouses(false)
      }
      return
    }

    console.log('🏭 Loading warehouses...')
    globalPromises.warehouses = getWarehouses()
    
    try {
      const data = await globalPromises.warehouses
      globalData.warehouses = data
      setWarehouses(data)
      setLoadingWarehouses(false)
      console.log('✅ Warehouses loaded:', data.length)
    } catch (error) {
      console.error('❌ Error loading warehouses:', error)
      setLoadingWarehouses(false)
    } finally {
      globalPromises.warehouses = null
    }
  }, [])

  // Load initial products with global deduplication
  const loadInitialProducts = React.useCallback(async () => {
    if (globalData.products.length > 0) {
      console.log('📦 Using cached products')
      setProducts(globalData.products)
      setLoadingProducts(false)
      return
    }

    if (globalPromises.products) {
      console.log('📦 Products already loading, waiting...')
      try {
        const data = await globalPromises.products
        setProducts(data)
        setLoadingProducts(false)
      } catch (error) {
        console.error('Error waiting for products:', error)
        setLoadingProducts(false)
      }
      return
    }

    console.log('📦 Loading products...')
    globalPromises.products = getProducts()
    
    try {
      const data = await globalPromises.products
      globalData.products = data
      setProducts(data)
      setLoadingProducts(false)
      console.log('✅ Products loaded:', data.length)
    } catch (error) {
      console.error('❌ Error loading products:', error)
      setLoadingProducts(false)
    } finally {
      globalPromises.products = null
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
    // Simple refresh - just reload all data
    setLoadingCustomers(true)
    setLoadingWarehouses(true)
    setLoadingProducts(true)
    
    // Trigger useEffect to reload
    window.location.reload()
  }, [])

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