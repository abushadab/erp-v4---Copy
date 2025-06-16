// Debug script for modal stock issue
// Run this in your browser console when viewing the products page

console.log('=== MODAL STOCK DEBUG ===')

// Test the stock function directly
async function testModalStock() {
  try {
    // Import the function
    const stockModule = await import('/src/lib/utils/multi-warehouse-stock.js')
    console.log('✅ Successfully imported stock module')
    
    // Test with the punjabi set product ID
    const productId = 'PROD_1'
    console.log('🔍 Testing with product ID:', productId)
    
    const stockSummary = await stockModule.getProductStockSummary(productId)
    console.log('📊 Stock summary result:', stockSummary)
    
    console.log('📦 Total stock:', stockSummary.totalStock)
    console.log('🏭 Warehouse stocks:', stockSummary.warehouseStocks)
    
  } catch (error) {
    console.error('❌ Error in modal stock test:', error)
  }
}

// Test the Supabase client directly
async function testSupabaseClient() {
  try {
    const supabaseModule = await import('/src/lib/supabase/client.js')
    const supabase = supabaseModule.createClient()
    console.log('✅ Supabase client created')
    
    // Test the exact query from getProductStockSummary
    const { data, error } = await supabase
      .from('product_warehouse_stock')
      .select(`
        *,
        warehouses:warehouse_id (*)
      `)
      .eq('product_id', 'PROD_1')
    
    console.log('🔍 Direct Supabase query result:', { data, error })
    
  } catch (error) {
    console.error('❌ Error in Supabase test:', error)
  }
}

// Run the tests
testModalStock()
testSupabaseClient() 