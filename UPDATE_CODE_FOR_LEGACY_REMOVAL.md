# Code Updates Required After Removing Legacy Columns

## Summary
The following legacy columns have been removed from the `products` table:
- `warehouse_id` 
- `buying_price`
- `stock` 
- `bought_quantity`

All stock tracking is now handled through the `product_warehouse_stock` table in the multi-warehouse system.

## Files That Need Updates

### 1. TypeScript Types
**File**: `src/lib/supabase/types.ts`
- Remove `warehouse_id`, `buying_price`, `stock`, `bought_quantity` from `products` table type definitions
- Update the generated types to match the new schema

### 2. Database Queries
**File**: `src/lib/supabase/queries.ts`
- Remove `warehouse_id`, `buying_price`, `stock`, `bought_quantity` from `DatabaseProduct` interface
- Update `getProductsByWarehouse()` function to use `product_warehouse_stock` table instead

### 3. Database Mutations
**File**: `src/lib/supabase/mutations.ts`
- Remove legacy column references from product creation/update functions
- Update to use multi-warehouse stock functions instead

### 4. Transform Functions
**File**: `src/lib/supabase/transforms.ts`
- Remove legacy column mappings
- Update to get stock data from warehouse stock system

### 5. Product Forms
**Files**: 
- `src/app/products/add/page.tsx`
- `src/app/products/edit/[id]/page.tsx`

Updates needed:
- Remove warehouse selection (products are no longer tied to single warehouse)
- Remove direct stock input (stock managed per warehouse)
- Remove buying price from product form (managed per warehouse)

### 6. Product Display Components
**Files**:
- `src/components/products/ViewProductModal.tsx`
- `src/app/products/page.tsx`
- `src/app/dashboard/page.tsx`

Updates needed:
- Get stock from multi-warehouse system
- Show warehouse-specific stock information
- Calculate total stock across warehouses

### 7. Sales Components
**File**: `src/components/sales/AddSale.tsx`
- Update stock checking to use warehouse-specific stock
- Consider which warehouse the sale is from

### 8. Warehouse-specific queries
**File**: `src/app/warehouses/[id]/page.tsx`
- Remove fallback to legacy columns (already done)
- Use only `product_warehouse_stock` table

### 9. Purchase System Integration
**File**: `src/lib/supabase/purchases.ts`
- Ensure purchase receipt updates use warehouse stock system (already done)

## Action Plan

### Phase 1: Update Type Definitions (Critical)
1. Update `src/lib/supabase/types.ts`
2. Regenerate TypeScript types from Supabase

### Phase 2: Update Core Functions
1. Update database query functions
2. Update mutation functions  
3. Update transform functions

### Phase 3: Update UI Components
1. Fix product forms (add/edit)
2. Update product display components
3. Update sales components

### Phase 4: Test and Verify
1. Test product creation
2. Test stock management
3. Test purchase receipts
4. Test sales functionality

## New Workflow for Stock Management

### Creating Products
1. Create product without warehouse assignment
2. Add initial stock using multi-warehouse stock functions
3. Stock can be distributed across multiple warehouses

### Managing Stock
1. Use warehouse-specific stock functions
2. Track movements per warehouse
3. Support stock transfers between warehouses

### Viewing Stock
1. Show total stock across all warehouses
2. Show warehouse-specific breakdown
3. Support filtering by warehouse

## Benefits After Migration
✅ True multi-warehouse support
✅ Better stock tracking and auditing  
✅ Stock transfers between warehouses
✅ Warehouse-specific pricing
✅ Reserved stock management
✅ Comprehensive stock movement history 