// Base utilities
export * from './base'

// Domain-specific mutations
export * from './products'
export * from './categories'
export * from './attributes'
export * from './warehouses'
export * from './packaging'
export * from './suppliers'

// Note: The mutations have been organized by domain:
// - base.ts - Common utilities and helpers
// - products.ts - Product CRUD and variations
// - categories.ts - Product categories
// - attributes.ts - Product attributes and values
// - warehouses.ts - Warehouse management
// - packaging.ts - Packaging and packaging variations
// - suppliers.ts - Supplier management 