// 🔄 REFACTORED: This file now re-exports from modular domain-specific mutation files
// Original mutations.ts has been moved to mutations.ts.backup
// New structure: src/lib/supabase/mutations/[domain].ts

export * from './mutations/'

// The mutations are now organized by domain:
// - mutations/base.ts - Common utilities and SKU validation
// - mutations/products.ts - Product CRUD, variations, and complete product operations
// - mutations/categories.ts - Category management
// - mutations/attributes.ts - Attribute and attribute value management
// - mutations/warehouses.ts - Warehouse CRUD and activation
// - mutations/packaging.ts - Packaging, packaging variations, and packaging attributes
// - mutations/suppliers.ts - Supplier management
// - mutations/index.ts - Barrel exports from all domain files

// 📈 Benefits:
// ✅ Improved maintainability - smaller, focused files
// ✅ Better developer experience - easier navigation
// ✅ Domain separation - logical grouping by business function
// ✅ Reduced cognitive load - ~200-300 lines per file vs 1,564 lines
// ✅ Backwards compatibility - all existing imports continue to work 