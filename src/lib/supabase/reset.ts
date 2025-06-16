import { createClient } from './client'

/**
 * Reset warehouse stock to zero for all products and packaging
 */
export async function resetWarehouseStock(): Promise<void> {
  const supabase = createClient()

  try {
    // Reset product warehouse stock
    const { error: productError } = await supabase
      .from('product_warehouse_stock')
      .update({ 
        current_stock: 0, 
        reserved_stock: 0,
        bought_quantity: 0 
      })
      .neq('id', 'dummy')

    if (productError) {
      console.error('Error resetting product warehouse stock:', productError)
      throw new Error('Failed to reset product warehouse stock')
    }

    // Reset packaging warehouse stock
    const { error: packagingError } = await supabase
      .from('packaging_warehouse_stock')
      .update({ 
        current_stock: 0, 
        reserved_stock: 0,
        bought_quantity: 0 
      })
      .neq('id', 'dummy')

    if (packagingError) {
      console.error('Error resetting packaging warehouse stock:', packagingError)
      throw new Error('Failed to reset packaging warehouse stock')
    }

    console.log('✅ Warehouse stock reset successfully')
  } catch (error) {
    console.error('Reset warehouse stock failed:', error)
    throw error
  }
}

/**
 * Reset journal entries and transaction history (preserves accounts and categories)
 */
export async function resetAccountsData(): Promise<void> {
  const supabase = createClient()

  try {
    console.log('🔄 Starting journal entries reset...')

    // First, try to check if tables exist by doing a simple select
    const { error: testError } = await supabase
      .from('journal_entries')
      .select('id')
      .limit(1)

    if (testError && testError.message.includes('does not exist')) {
      console.log('⚠️ Journal entries table does not exist, skipping journal entries reset')
      return
    }

    // Use database function to properly handle foreign key constraints
    console.log('🗑️ Resetting journal entries and account balances...')
    const { data, error: resetError } = await supabase
      .rpc('reset_journal_entries_data')

    if (resetError) {
      const errorMsg = resetError.message || JSON.stringify(resetError)
      if (!errorMsg.includes('does not exist')) {
        console.error('Error resetting journal entries:', resetError)
        throw new Error(`Failed to reset journal entries: ${errorMsg}`)
      }
    }

    // NOTE: Accounts and account categories are preserved to maintain chart of accounts structure
    // but balances are reset to zero

    console.log('✅ Journal entries and account balances reset successfully (accounts preserved)')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Reset journal entries failed:', errorMsg)
    throw new Error(`Reset journal entries failed: ${errorMsg}`)
  }
}

/**
 * Reset all transaction data (sales, purchases, returns, movements, payments, expenses)
 */
export async function resetTransactionData(): Promise<void> {
  const supabase = createClient()

  try {
    console.log('🔄 Starting transaction data reset...')

    // Delete in proper order to avoid foreign key constraints

    // 1. Delete purchase return items first (child table)
    console.log('🗑️ Deleting purchase return items...')
    const { error: purchaseReturnItemsError } = await supabase
      .from('purchase_return_items')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all records using a date condition that matches all

    if (purchaseReturnItemsError) {
      const errorMsg = purchaseReturnItemsError.message || JSON.stringify(purchaseReturnItemsError)
      if (!errorMsg.includes('does not exist')) {
        console.error('Error deleting purchase return items:', purchaseReturnItemsError)
        throw new Error(`Failed to delete purchase return items: ${errorMsg}`)
      }
    }

    // 2. Delete purchase returns
    console.log('🗑️ Deleting purchase returns...')
    const { error: purchaseReturnsError } = await supabase
      .from('purchase_returns')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all records using a date condition that matches all

    if (purchaseReturnsError) {
      const errorMsg = purchaseReturnsError.message || JSON.stringify(purchaseReturnsError)
      if (!errorMsg.includes('does not exist')) {
      console.error('Error deleting purchase returns:', purchaseReturnsError)
        throw new Error(`Failed to delete purchase returns: ${errorMsg}`)
      }
    }

    // 3. Delete purchase events first (they reference payments via foreign key)
    console.log('🗑️ Deleting purchase events...')
    const { error: purchaseEventsError } = await supabase
      .from('purchase_events')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all records using a condition that matches all

    if (purchaseEventsError) {
      const errorMsg = purchaseEventsError.message || JSON.stringify(purchaseEventsError)
      if (!errorMsg.includes('does not exist')) {
        console.error('Error deleting purchase events:', purchaseEventsError)
        throw new Error(`Failed to delete purchase events: ${errorMsg}`)
      }
    }

    // 4. Delete purchase payments (clear journal_entry_id first if needed)
    console.log('🗑️ Clearing journal references in purchase payments...')
    const { error: clearRefsError } = await supabase
      .from('purchase_payments')
      .update({ journal_entry_id: null })
      .not('journal_entry_id', 'is', null)

    if (clearRefsError) {
      const errorMsg = clearRefsError.message || JSON.stringify(clearRefsError)
      if (!errorMsg.includes('does not exist')) {
        console.error('Error clearing journal references in payments:', clearRefsError)
        // Don't throw - continue with deletion
      }
    }

    console.log('🗑️ Deleting purchase payments...')
    const { error: purchasePaymentsError } = await supabase
      .from('purchase_payments')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all records using a date condition that matches all

    if (purchasePaymentsError) {
      const errorMsg = purchasePaymentsError.message || JSON.stringify(purchasePaymentsError)
      if (!errorMsg.includes('does not exist')) {
        console.error('Error deleting purchase payments:', purchasePaymentsError)
        throw new Error(`Failed to delete purchase payments: ${errorMsg}`)
      }
    }

    // 5. Delete purchase items (child table)
    console.log('🗑️ Deleting purchase items...')
    const { error: purchaseItemsError } = await supabase
      .from('purchase_items')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all records using a date condition that matches all

    if (purchaseItemsError) {
      const errorMsg = purchaseItemsError.message || JSON.stringify(purchaseItemsError)
      if (!errorMsg.includes('does not exist')) {
      console.error('Error deleting purchase items:', purchaseItemsError)
        throw new Error(`Failed to delete purchase items: ${errorMsg}`)
      }
    }

    // 6. Delete purchases (parent table)
    console.log('🗑️ Deleting purchases...')
    const { error: purchasesError } = await supabase
      .from('purchases')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all records using a date condition that matches all

    if (purchasesError) {
      const errorMsg = purchasesError.message || JSON.stringify(purchasesError)
      if (!errorMsg.includes('does not exist')) {
      console.error('Error deleting purchases:', purchasesError)
        throw new Error(`Failed to delete purchases: ${errorMsg}`)
      }
    }

    // 7. Delete sale return items (if exists)
    const { error: saleReturnItemsError } = await supabase
      .from('sale_return_items')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (saleReturnItemsError && !saleReturnItemsError.message.includes('does not exist')) {
      console.error('Error deleting sale return items:', saleReturnItemsError)
      throw new Error('Failed to delete sale return items')
    }

    // 8. Delete sale returns (if exists)
    const { error: saleReturnsError } = await supabase
      .from('sale_returns')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (saleReturnsError && !saleReturnsError.message.includes('does not exist')) {
      console.error('Error deleting sale returns:', saleReturnsError)
      throw new Error('Failed to delete sale returns')
    }

    // 9. Delete sale items (if exists)
    const { error: saleItemsError } = await supabase
      .from('sale_items')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (saleItemsError && !saleItemsError.message.includes('does not exist')) {
      console.error('Error deleting sale items:', saleItemsError)
      throw new Error('Failed to delete sale items')
    }

    // 10. Delete sales (if exists)
    const { error: salesError } = await supabase
      .from('sales')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (salesError && !salesError.message.includes('does not exist')) {
      console.error('Error deleting sales:', salesError)
      throw new Error('Failed to delete sales')
    }

    // 11. Delete expenses (if exists)
    const { error: expensesError } = await supabase
      .from('expenses')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (expensesError && !expensesError.message.includes('does not exist')) {
      console.error('Error deleting expenses:', expensesError)
      throw new Error('Failed to delete expenses')
    }

    // 12. Delete stock movements (no foreign key dependencies)
    const { error: movementsError } = await supabase
      .from('stock_movements')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (movementsError && !movementsError.message.includes('does not exist')) {
      console.error('Error deleting stock movements:', movementsError)
      throw new Error('Failed to delete stock movements')
    }

    // 13. Reset journal entries and account balances (since transactions are tied to accounting)
    console.log('🔄 Resetting journal entries and account balances...')
    await resetAccountsData()

    console.log('✅ Transaction data and accounting balances reset successfully')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Reset transaction data failed:', errorMsg)
    throw new Error(`Reset transaction data failed: ${errorMsg}`)
  }
}

/**
 * Reset all products and catalog data
 */
export async function resetProductsCatalog(): Promise<void> {
  const supabase = createClient()

  try {
    // Delete product variation attributes
    const { error: variationAttrsError } = await supabase
      .from('product_variation_attributes')
      .delete()
      .gte('variation_id', '') // Delete all records (using variation_id which exists)

    if (variationAttrsError) {
      console.error('Error deleting product variation attributes:', variationAttrsError)
      throw new Error('Failed to delete product variation attributes')
    }

    // Delete product variations
    const { error: variationsError } = await supabase
      .from('product_variations')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (variationsError) {
      console.error('Error deleting product variations:', variationsError)
      throw new Error('Failed to delete product variations')
    }

    // Delete product attributes
    const { error: productAttrsError } = await supabase
      .from('product_attributes')
      .delete()
      .gte('product_id', '') // Delete all records (using product_id which exists)

    if (productAttrsError) {
      console.error('Error deleting product attributes:', productAttrsError)
      throw new Error('Failed to delete product attributes')
    }

    // Delete product warehouse stock
    const { error: stockError } = await supabase
      .from('product_warehouse_stock')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (stockError) {
      console.error('Error deleting product warehouse stock:', stockError)
      throw new Error('Failed to delete product warehouse stock')
    }

    // Delete products
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (productsError) {
      console.error('Error deleting products:', productsError)
      throw new Error('Failed to delete products')
    }

    // Delete attribute values
    const { error: attrValuesError } = await supabase
      .from('attribute_values')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (attrValuesError) {
      console.error('Error deleting attribute values:', attrValuesError)
      throw new Error('Failed to delete attribute values')
    }

    // Delete attributes
    const { error: attributesError } = await supabase
      .from('attributes')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (attributesError) {
      console.error('Error deleting attributes:', attributesError)
      throw new Error('Failed to delete attributes')
    }

    // Delete categories
    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (categoriesError) {
      console.error('Error deleting categories:', categoriesError)
      throw new Error('Failed to delete categories')
    }

    console.log('✅ Products and catalog reset successfully')
  } catch (error) {
    console.error('Reset products catalog failed:', error)
    throw error
  }
}

/**
 * Reset packaging data
 */
export async function resetPackagingData(): Promise<void> {
  const supabase = createClient()

  try {
    // Delete packaging warehouse stock first (has foreign keys to packaging and variations)
    const { error: packagingStockError } = await supabase
      .from('packaging_warehouse_stock')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (packagingStockError) {
      console.error('Error deleting packaging warehouse stock:', packagingStockError)
      throw new Error('Failed to delete packaging warehouse stock')
    }

    // Delete packaging variation attributes
    const { error: packagingVariationAttrsError } = await supabase
      .from('packaging_variation_attributes')
      .delete()
      .gte('variation_id', '') // Delete all records (using variation_id which exists)

    if (packagingVariationAttrsError) {
      console.error('Error deleting packaging variation attributes:', packagingVariationAttrsError)
      throw new Error('Failed to delete packaging variation attributes')
    }

    // Delete packaging variations
    const { error: packagingVariationsError } = await supabase
      .from('packaging_variations')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (packagingVariationsError) {
      console.error('Error deleting packaging variations:', packagingVariationsError)
      throw new Error('Failed to delete packaging variations')
    }

    // Delete packaging packaging attributes (junction table)
    const { error: packagingPackagingAttrsError } = await supabase
      .from('packaging_packaging_attributes')
      .delete()
      .gte('packaging_id', '') // Delete all records (using packaging_id which exists)

    if (packagingPackagingAttrsError) {
      console.error('Error deleting packaging packaging attributes:', packagingPackagingAttrsError)
      throw new Error('Failed to delete packaging packaging attributes')
    }

    // Delete packaging
    const { error: packagingError } = await supabase
      .from('packaging')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (packagingError) {
      console.error('Error deleting packaging:', packagingError)
      throw new Error('Failed to delete packaging')
    }

    // Delete packaging attribute values
    const { error: packagingAttrValuesError } = await supabase
      .from('packaging_attribute_values')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (packagingAttrValuesError) {
      console.error('Error deleting packaging attribute values:', packagingAttrValuesError)
      throw new Error('Failed to delete packaging attribute values')
    }

    // Delete packaging attributes
    const { error: packagingAttributesError } = await supabase
      .from('packaging_attributes')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (packagingAttributesError) {
      console.error('Error deleting packaging attributes:', packagingAttributesError)
      throw new Error('Failed to delete packaging attributes')
    }

    console.log('✅ Packaging data reset successfully')
  } catch (error) {
    console.error('Reset packaging data failed:', error)
    throw error
  }
}

/**
 * Complete factory reset - removes all data
 */
export async function factoryReset(): Promise<void> {
  try {
    console.log('🔄 Starting factory reset...')
    
    // Reset in proper order to avoid foreign key conflicts
    // 1. First reset all transaction data (includes journal entries via foreign keys)
    await resetTransactionData()
    
    // 2. Reset accounts data (journal entries, accounts, categories)
    await resetAccountsData()
    
    // 3. Reset product and packaging data
    await resetPackagingData()
    await resetProductsCatalog()
    
    // 4. Reset suppliers (no dependencies)
    const supabase = createClient()
    const { error: suppliersError } = await supabase
      .from('suppliers')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (suppliersError && !suppliersError.message.includes('does not exist')) {
      console.error('Error deleting suppliers:', suppliersError)
      throw new Error('Failed to delete suppliers')
    }

    // 5. Reset warehouses (should be last to avoid dependencies)
    const { error: warehousesError } = await supabase
      .from('warehouses')
      .delete()
      .neq('id', 'dummy') // Delete all records

    if (warehousesError && !warehousesError.message.includes('does not exist')) {
      console.error('Error deleting warehouses:', warehousesError)
      throw new Error('Failed to delete warehouses')
    }

    console.log('✅ Factory reset completed successfully')
    console.log('🔄 System has been reset to factory defaults')
  } catch (error) {
    console.error('Factory reset failed:', error)
    throw error
  }
}

/**
 * Export current data for backup before reset
 */
export async function exportDataBackup(): Promise<string> {
  const supabase = createClient()

  try {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      data: {} as any
    }

    // Export products
    const { data: products } = await supabase.from('products').select('*')
    backup.data.products = products

    // Export product variations
    const { data: productVariations } = await supabase.from('product_variations').select('*')
    backup.data.productVariations = productVariations

    // Export categories
    const { data: categories } = await supabase.from('categories').select('*')
    backup.data.categories = categories

    // Export warehouses
    const { data: warehouses } = await supabase.from('warehouses').select('*')
    backup.data.warehouses = warehouses

    // Export warehouse stock
    const { data: warehouseStock } = await supabase.from('product_warehouse_stock').select('*')
    backup.data.warehouseStock = warehouseStock

    // Export packaging
    const { data: packaging } = await supabase.from('packaging').select('*')
    backup.data.packaging = packaging

    // Export packaging warehouse stock
    const { data: packagingStock } = await supabase.from('packaging_warehouse_stock').select('*')
    backup.data.packagingStock = packagingStock

    // Export purchases
    const { data: purchases } = await supabase.from('purchases').select('*')
    backup.data.purchases = purchases

    console.log('✅ Data backup created successfully')
    return JSON.stringify(backup, null, 2)
  } catch (error) {
    console.error('Export data backup failed:', error)
    throw error
  }
} 