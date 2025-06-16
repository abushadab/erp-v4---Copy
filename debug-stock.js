// Debug script to check stock data
// Run this in your browser console or add it to a page temporarily

import { createClient } from '@/lib/supabase/client'

async function debugStockIssue() {
  const supabase = createClient()
  
  console.log('=== STOCK DEBUG SESSION ===')
  
  // 1. Find the punjabi set product
  console.log('1. Finding punjabi set product...')
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, sku')
    .ilike('name', '%punjabi%')
  
  if (productError) {
    console.error('Error finding product:', productError)
    return
  }
  
  console.log('Found products:', products)
  
  if (!products || products.length === 0) {
    console.log('No punjabi products found')
    return
  }
  
  const productId = products[0].id
  console.log(`Using product ID: ${productId}`)
  
  // 2. Check product_warehouse_stock table
  console.log('\n2. Checking product_warehouse_stock table...')
  const { data: stockData, error: stockError } = await supabase
    .from('product_warehouse_stock')
    .select('*')
    .eq('product_id', productId)
  
  if (stockError) {
    console.error('Error checking stock table:', stockError)
  } else {
    console.log('Stock data from product_warehouse_stock:', stockData)
  }
  
  // 3. Test the database function
  console.log('\n3. Testing get_total_product_stock function...')
  const { data: totalStock, error: functionError } = await supabase.rpc('get_total_product_stock', {
    p_product_id: productId,
    p_variation_id: null
  })
  
  if (functionError) {
    console.error('Error calling get_total_product_stock:', functionError)
  } else {
    console.log('Total stock from function:', totalStock)
  }
  
  // 4. Check if the function exists
  console.log('\n4. Checking if database function exists...')
  const { data: functions, error: funcListError } = await supabase.rpc('pg_get_functiondef', {
    func_oid: 'get_total_product_stock'
  })
  
  if (funcListError) {
    console.error('Function check error (this might be normal):', funcListError)
    console.log('The get_total_product_stock function might not exist in the database')
  } else {
    console.log('Function exists:', functions)
  }
  
  // 5. Check recent purchase orders
  console.log('\n5. Checking recent purchases for this product...')
  const { data: purchases, error: purchaseError } = await supabase
    .from('purchase_items')
    .select(`
      *,
      purchases!inner(id, status, purchase_date)
    `)
    .eq('item_id', productId)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (purchaseError) {
    console.error('Error checking purchases:', purchaseError)
  } else {
    console.log('Recent purchases for this product:', purchases)
  }
  
  // 6. Check stock movements
  console.log('\n6. Checking stock movements...')
  const { data: movements, error: movementError } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (movementError) {
    console.error('Error checking stock movements:', movementError)
  } else {
    console.log('Recent stock movements:', movements)
  }
  
  console.log('\n=== DEBUG SESSION COMPLETE ===')
}

// Export for use
if (typeof window !== 'undefined') {
  window.debugStockIssue = debugStockIssue
  console.log('Debug function available as window.debugStockIssue()')
}

export { debugStockIssue } 