// 🔄 REFACTORED: This file now re-exports from modular domain-specific type files
// Original types.ts has been moved to types.ts.backup
// New structure: src/lib/supabase/types/[domain].ts

export * from './types'

// The types are now organized by domain:
// - types/base.ts - Core Supabase types and utilities
// - types/accounting.ts - Accounts, journal entries, etc.
// - types/products.ts - Products, categories, attributes, variations
// - types/packaging.ts - Packaging and packaging variations
// - types/sales.ts - Sales, customers, returns
// - types/purchases.ts - Purchases, suppliers
// - types/inventory.ts - Warehouses, stock management
// - types/system.ts - Activity logs, expenses, system tables
// - types/index.ts - Barrel exports and unified Database type 