# Multi-Warehouse Stock Management System

## Overview

This document outlines the implementation of a true multi-warehouse stock management system for the ERP application. The system allows tracking inventory across multiple warehouses, managing stock movements, transfers, and reservations on a per-warehouse basis.

## Database Schema

### New Tables

#### `product_warehouse_stock`
The core table for tracking stock levels per product per warehouse.

```sql
CREATE TABLE product_warehouse_stock (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    variation_id TEXT REFERENCES product_variations(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER NOT NULL DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    buying_price NUMERIC,
    bought_quantity INTEGER DEFAULT 0,
    last_movement_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE(product_id, warehouse_id, variation_id),
    CHECK (current_stock >= 0),
    CHECK (reserved_stock >= 0),
    CHECK (reserved_stock <= current_stock)
);
```

### Modified Tables

#### `stock_movements`
Added `warehouse_id` field to track which warehouse each movement occurred in.

```sql
ALTER TABLE stock_movements 
ADD COLUMN warehouse_id TEXT REFERENCES warehouses(id);
```

## Database Functions

### Core Functions

#### `update_warehouse_stock()`
Updates stock levels for a specific product in a specific warehouse and records the movement.

```sql
SELECT update_warehouse_stock(
    p_product_id TEXT,
    p_warehouse_id TEXT,
    p_variation_id TEXT,
    p_quantity_change INTEGER,
    p_movement_type TEXT,
    p_reference_id TEXT,
    p_reason TEXT,
    p_created_by TEXT,
    p_notes TEXT
);
```

#### `transfer_stock_between_warehouses()`
Transfers stock from one warehouse to another with proper movement tracking.

```sql
SELECT transfer_stock_between_warehouses(
    p_product_id TEXT,
    p_variation_id TEXT,
    p_from_warehouse_id TEXT,
    p_to_warehouse_id TEXT,
    p_quantity INTEGER,
    p_reference_id TEXT,
    p_reason TEXT,
    p_created_by TEXT,
    p_notes TEXT
);
```

#### `get_total_product_stock()`
Gets the total stock across all warehouses for a product.

```sql
SELECT get_total_product_stock(p_product_id TEXT, p_variation_id TEXT);
```

#### `get_total_available_stock()`
Gets the total available (non-reserved) stock across all warehouses.

```sql
SELECT get_total_available_stock(p_product_id TEXT, p_variation_id TEXT);
```

## TypeScript Utilities

### Main Utility File: `src/lib/utils/multi-warehouse-stock.ts`

#### Key Functions

- **`getProductStockSummary()`** - Get comprehensive stock summary across all warehouses
- **`getWarehouseStock()`** - Get stock for specific product in specific warehouse
- **`updateWarehouseStock()`** - Update stock using database function
- **`transferStockBetweenWarehouses()`** - Transfer stock between warehouses
- **`getStockMovements()`** - Get stock movement history
- **`reserveStock()`** - Reserve stock for orders
- **`releaseReservedStock()`** - Release reserved stock

#### Types

```typescript
export interface StockSummary {
  totalStock: number
  availableStock: number
  reservedStock: number
  warehouseStocks: Array<{
    warehouse: Warehouse
    currentStock: number
    availableStock: number
    reservedStock: number
  }>
}

export interface StockUpdateParams {
  productId: string
  warehouseId: string
  variationId?: string | null
  quantityChange: number
  movementType: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return'
  referenceId?: string | null
  reason?: string | null
  createdBy?: string | null
  notes?: string | null
}
```

## React Component

### `MultiWarehouseStock` Component
Located at `src/components/MultiWarehouseStock.tsx`

Features:
- Display stock summary across all warehouses
- Warehouse-specific stock breakdown
- Stock adjustment modal
- Inter-warehouse transfer modal
- Stock movement history
- Real-time updates

## Key Features

### 1. **Multi-Warehouse Inventory Tracking**
- Each product can have different stock levels across multiple warehouses
- Supports both simple products and product variations
- Real-time calculation of available stock (current - reserved)

### 2. **Stock Movements & Audit Trail**
- Complete audit trail of all stock movements
- Tracks movement type, reason, created by, and notes
- Links movements to specific warehouses
- Supports various movement types: purchase, sale, adjustment, transfer, return

### 3. **Stock Reservations**
- Reserve stock for pending orders
- Prevents overselling while maintaining accurate available stock counts
- Easy reservation and release mechanisms

### 4. **Inter-Warehouse Transfers**
- Transfer stock between warehouses
- Atomic operations ensure data integrity
- Complete audit trail for transfers

### 5. **Comprehensive Reporting**
- Total stock across all warehouses
- Available stock calculations
- Warehouse-specific breakdowns
- Historical movement data

## Data Migration

The system automatically migrates existing stock data from the old single-warehouse setup:

1. **Simple Products**: Migrates stock from `products.stock` to `product_warehouse_stock`
2. **Product Variations**: Migrates stock from `product_variations.stock` to `product_warehouse_stock`
3. **Warehouse Assignment**: Uses existing `warehouse_id` or assigns to the first active warehouse

## Usage Examples

### Get Stock Summary
```typescript
import { getProductStockSummary } from '@/lib/utils/multi-warehouse-stock'

const summary = await getProductStockSummary('PROD123', null)
console.log(`Total stock: ${summary.totalStock}`)
console.log(`Available: ${summary.availableStock}`)
```

### Update Stock
```typescript
import { updateWarehouseStock } from '@/lib/utils/multi-warehouse-stock'

await updateWarehouseStock({
  productId: 'PROD123',
  warehouseId: 'WH001',
  variationId: null,
  quantityChange: 50,
  movementType: 'purchase',
  reason: 'New stock received',
  createdBy: 'user123'
})
```

### Transfer Stock
```typescript
import { transferStockBetweenWarehouses } from '@/lib/utils/multi-warehouse-stock'

await transferStockBetweenWarehouses({
  productId: 'PROD123',
  variationId: null,
  fromWarehouseId: 'WH001',
  toWarehouseId: 'WH002',
  quantity: 10,
  reason: 'Rebalancing inventory',
  createdBy: 'user123'
})
```

## Benefits

1. **Scalability**: Supports unlimited warehouses
2. **Data Integrity**: Database constraints prevent negative stock and inconsistent reservations
3. **Audit Trail**: Complete history of all stock movements
4. **Flexibility**: Supports both simple and variable products
5. **Performance**: Optimized queries with proper indexing
6. **Real-time**: Accurate stock levels with reservation support

## Integration Points

### With Purchase System
- Stock updates when purchases are received
- Automatic warehouse assignment for incoming stock

### With Sales System
- Stock reservations when orders are placed
- Stock deductions when orders are fulfilled
- Support for partial fulfillments from multiple warehouses

### With Reports
- Warehouse-specific stock reports
- Stock movement reports
- Inventory valuation by warehouse

## Future Enhancements

1. **Stock Reorder Points**: Per-warehouse minimum stock levels
2. **Automated Transfers**: Auto-transfer when stock is low in one warehouse
3. **Barcode Integration**: Warehouse-specific barcoding
4. **Pick List Optimization**: Optimize picking routes across warehouses
5. **Integration with WMS**: Warehouse Management System integration

## Conclusion

The multi-warehouse stock management system provides a robust, scalable foundation for managing inventory across multiple locations. It maintains data integrity, provides comprehensive audit trails, and supports complex inventory operations while remaining easy to use and integrate with existing systems. 