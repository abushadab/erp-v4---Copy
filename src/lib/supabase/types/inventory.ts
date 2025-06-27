import { Json } from './base'

export interface InventoryTables {
  warehouses: {
    Row: {
      address: string | null
      capacity: number | null
      contact: string | null
      created_at: string | null
      id: string
      location: string | null
      manager: string | null
      name: string
      status: string | null
      updated_at: string | null
    }
    Insert: {
      address?: string | null
      capacity?: number | null
      contact?: string | null
      created_at?: string | null
      id: string
      location?: string | null
      manager?: string | null
      name: string
      status?: string | null
      updated_at?: string | null
    }
    Update: {
      address?: string | null
      capacity?: number | null
      contact?: string | null
      created_at?: string | null
      id?: string
      location?: string | null
      manager?: string | null
      name?: string
      status?: string | null
      updated_at?: string | null
    }
    Relationships: []
  }
  product_warehouse_stock: {
    Row: {
      available_stock: number | null
      bought_quantity: number | null
      buying_price: number | null
      created_at: string | null
      current_stock: number
      id: string
      last_movement_at: string | null
      product_id: string
      reserved_stock: number
      updated_at: string | null
      variation_id: string | null
      warehouse_id: string
    }
    Insert: {
      available_stock?: number | null
      bought_quantity?: number | null
      buying_price?: number | null
      created_at?: string | null
      current_stock?: number
      id?: string
      last_movement_at?: string | null
      product_id: string
      reserved_stock?: number
      updated_at?: string | null
      variation_id?: string | null
      warehouse_id: string
    }
    Update: {
      available_stock?: number | null
      bought_quantity?: number | null
      buying_price?: number | null
      created_at?: string | null
      current_stock?: number
      id?: string
      last_movement_at?: string | null
      product_id?: string
      reserved_stock?: number
      updated_at?: string | null
      variation_id?: string | null
      warehouse_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "product_warehouse_stock_product_id_fkey"
        columns: ["product_id"]
        isOneToOne: false
        referencedRelation: "products"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "product_warehouse_stock_variation_id_fkey"
        columns: ["variation_id"]
        isOneToOne: false
        referencedRelation: "product_variations"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "product_warehouse_stock_warehouse_id_fkey"
        columns: ["warehouse_id"]
        isOneToOne: false
        referencedRelation: "warehouses"
        referencedColumns: ["id"]
      },
    ]
  }
  packaging_warehouse_stock: {
    Row: {
      available_stock: number | null
      bought_quantity: number | null
      buying_price: number | null
      created_at: string | null
      current_stock: number
      id: string
      last_movement_at: string | null
      packaging_id: string
      reserved_stock: number
      updated_at: string | null
      variation_id: string | null
      warehouse_id: string
    }
    Insert: {
      available_stock?: number | null
      bought_quantity?: number | null
      buying_price?: number | null
      created_at?: string | null
      current_stock?: number
      id?: string
      last_movement_at?: string | null
      packaging_id: string
      reserved_stock?: number
      updated_at?: string | null
      variation_id?: string | null
      warehouse_id: string
    }
    Update: {
      available_stock?: number | null
      bought_quantity?: number | null
      buying_price?: number | null
      created_at?: string | null
      current_stock?: number
      id?: string
      last_movement_at?: string | null
      packaging_id?: string
      reserved_stock?: number
      updated_at?: string | null
      variation_id?: string | null
      warehouse_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "packaging_warehouse_stock_packaging_id_fkey"
        columns: ["packaging_id"]
        isOneToOne: false
        referencedRelation: "packaging"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "packaging_warehouse_stock_variation_id_fkey"
        columns: ["variation_id"]
        isOneToOne: false
        referencedRelation: "packaging_variations"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "packaging_warehouse_stock_warehouse_id_fkey"
        columns: ["warehouse_id"]
        isOneToOne: false
        referencedRelation: "warehouses"
        referencedColumns: ["id"]
      },
    ]
  }
  stock_movements: {
    Row: {
      created_at: string | null
      created_by: string | null
      direction: string
      id: string
      movement_type: string
      new_stock: number
      notes: string | null
      previous_stock: number
      product_id: string
      product_name: string
      quantity: number
      reason: string | null
      reference_id: string | null
      variation_id: string | null
      warehouse_id: string | null
    }
    Insert: {
      created_at?: string | null
      created_by?: string | null
      direction: string
      id: string
      movement_type: string
      new_stock: number
      notes?: string | null
      previous_stock: number
      product_id: string
      product_name: string
      quantity: number
      reason?: string | null
      reference_id?: string | null
      variation_id?: string | null
      warehouse_id?: string | null
    }
    Update: {
      created_at?: string | null
      created_by?: string | null
      direction?: string
      id?: string
      movement_type?: string
      new_stock?: number
      notes?: string | null
      previous_stock?: number
      product_id?: string
      product_name?: string
      quantity?: number
      reason?: string | null
      reference_id?: string | null
      variation_id?: string | null
      warehouse_id?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "stock_movements_product_id_fkey"
        columns: ["product_id"]
        isOneToOne: false
        referencedRelation: "products"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "stock_movements_variation_id_fkey"
        columns: ["variation_id"]
        isOneToOne: false
        referencedRelation: "product_variations"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "stock_movements_warehouse_id_fkey"
        columns: ["warehouse_id"]
        isOneToOne: false
        referencedRelation: "warehouses"
        referencedColumns: ["id"]
      },
    ]
  }
}

export interface InventoryFunctions {
  get_total_available_packaging_stock: {
    Args: { p_packaging_id: string; p_variation_id?: string }
    Returns: number
  }
  get_total_available_stock: {
    Args: { p_product_id: string; p_variation_id?: string }
    Returns: number
  }
  get_total_packaging_stock: {
    Args: { p_packaging_id: string; p_variation_id?: string }
    Returns: number
  }
  get_total_product_stock: {
    Args: { p_product_id: string; p_variation_id?: string }
    Returns: number
  }
  transfer_packaging_stock_between_warehouses: {
    Args: {
      p_packaging_id: string
      p_from_warehouse_id: string
      p_to_warehouse_id: string
      p_quantity: number
      p_variation_id?: string
      p_reference_id?: string
      p_reason?: string
      p_created_by?: string
      p_notes?: string
    }
    Returns: boolean
  }
  transfer_stock_between_warehouses: {
    Args: {
      p_product_id: string
      p_variation_id?: string
      p_from_warehouse_id: string
      p_to_warehouse_id: string
      p_quantity: number
      p_reference_id?: string
      p_reason?: string
      p_created_by?: string
      p_notes?: string
    }
    Returns: boolean
  }
  update_packaging_warehouse_stock: {
    Args: {
      p_packaging_id: string
      p_warehouse_id: string
      p_quantity_change: number
      p_variation_id?: string
      p_movement_type?: string
      p_reference_id?: string
      p_reason?: string
      p_created_by?: string
      p_notes?: string
    }
    Returns: boolean
  }
  update_warehouse_stock: {
    Args: {
      p_product_id: string
      p_warehouse_id: string
      p_variation_id?: string
      p_quantity_change: number
      p_movement_type?: string
      p_reference_id?: string
      p_reason?: string
      p_created_by?: string
      p_notes?: string
    }
    Returns: boolean
  }
}

// Convenience type exports
export type Warehouse = InventoryTables['warehouses']['Row']
export type ProductWarehouseStock = InventoryTables['product_warehouse_stock']['Row']
export type PackagingWarehouseStock = InventoryTables['packaging_warehouse_stock']['Row']
export type StockMovement = InventoryTables['stock_movements']['Row']

// Legacy compatibility
export type DatabasePackagingWarehouseStock = PackagingWarehouseStock 