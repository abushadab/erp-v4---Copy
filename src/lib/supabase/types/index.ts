// Base types
export * from './base'

// Domain-specific types
export * from './accounting'
export * from './products'
export * from './packaging'
export * from './sales'
export * from './purchases'
export * from './inventory'
export * from './system'

// Re-create the unified Database interface for compatibility
import { AccountingTables } from './accounting'
import { ProductTables } from './products'
import { PackagingTables } from './packaging'
import { SalesTables } from './sales'
import { PurchaseTables } from './purchases'
import { InventoryTables, InventoryFunctions } from './inventory'
import { SystemTables, SystemViews } from './system'
import { Json } from './base'

export type Database = {
  public: {
    Tables: AccountingTables & 
             ProductTables & 
             PackagingTables & 
             SalesTables & 
             PurchaseTables & 
             InventoryTables & 
             SystemTables
    Views: SystemViews
    Functions: InventoryFunctions
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Additional composed types for backward compatibility  
export type { 
  AccountWithCategory,
  JournalEntryWithLines,
  TrialBalanceRow
} from './accounting'

export type {
  SaleWithItems,
  ReturnWithItems,
  ReturnItemWithVariation
} from './sales'

// Legacy compatibility - make sure all original exports are available
export type { Json } from './base'
export type { Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from './base'

// Export constants
export { Constants } from './base'

// Legacy type definitions for backward compatibility
// These were previously in the main types.ts file
import type { 
  Packaging, 
  PackagingVariation 
} from './packaging'
import type { 
  ProductVariation 
} from './products'
import type { 
  PackagingWarehouseStock 
} from './inventory'

export type DatabasePackaging = Packaging;
export type DatabasePackagingVariation = PackagingVariation;
export type DatabasePackagingWarehouseStock = PackagingWarehouseStock;
export type DatabaseProductVariation = ProductVariation; 