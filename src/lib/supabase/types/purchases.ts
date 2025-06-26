import { Json } from './base'

export interface PurchaseTables {
  purchases: {
    Row: {
      created_at: string | null
      created_by: string
      id: string
      last_updated: string | null
      notes: string | null
      purchase_date: string
      status: string | null
      supplier_id: string
      supplier_name: string
      total_amount: number
      updated_at: string | null
      warehouse_id: string
      warehouse_name: string
    }
    Insert: {
      created_at?: string | null
      created_by: string
      id?: string
      last_updated?: string | null
      notes?: string | null
      purchase_date?: string
      status?: string | null
      supplier_id: string
      supplier_name: string
      total_amount?: number
      updated_at?: string | null
      warehouse_id: string
      warehouse_name: string
    }
    Update: {
      created_at?: string | null
      created_by?: string
      id?: string
      last_updated?: string | null
      notes?: string | null
      purchase_date?: string
      status?: string | null
      supplier_id?: string
      supplier_name?: string
      total_amount?: number
      updated_at?: string | null
      warehouse_id?: string
      warehouse_name?: string
    }
    Relationships: [
      {
        foreignKeyName: "purchases_supplier_id_fkey"
        columns: ["supplier_id"]
        isOneToOne: false
        referencedRelation: "suppliers"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "purchases_warehouse_id_fkey"
        columns: ["warehouse_id"]
        isOneToOne: false
        referencedRelation: "warehouses"
        referencedColumns: ["id"]
      },
    ]
  }
  purchase_items: {
    Row: {
      created_at: string | null
      id: string
      item_id: string
      item_name: string
      item_type: string
      purchase_id: string
      purchase_price: number
      quantity: number
      received_quantity: number | null
      returned_quantity: number
      total: number
      updated_at: string | null
      variation_id: string | null
    }
    Insert: {
      created_at?: string | null
      id?: string
      item_id: string
      item_name: string
      item_type: string
      purchase_id: string
      purchase_price: number
      quantity: number
      received_quantity?: number | null
      returned_quantity?: number
      total: number
      updated_at?: string | null
      variation_id?: string | null
    }
    Update: {
      created_at?: string | null
      id?: string
      item_id?: string
      item_name?: string
      item_type?: string
      purchase_id?: string
      purchase_price?: number
      quantity?: number
      received_quantity?: number | null
      returned_quantity?: number
      total?: number
      updated_at?: string | null
      variation_id?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "purchase_items_purchase_id_fkey"
        columns: ["purchase_id"]
        isOneToOne: false
        referencedRelation: "purchases"
        referencedColumns: ["id"]
      },
    ]
  }
  purchase_events: {
    Row: {
      affected_items_count: number | null
      created_at: string | null
      created_by: string | null
      event_date: string | null
      event_description: string | null
      event_title: string
      event_type: string
      id: string
      metadata: Json | null
      new_status: string | null
      previous_status: string | null
      purchase_id: string
      return_amount: number | null
      return_reason: string | null
      total_items_count: number | null
    }
    Insert: {
      affected_items_count?: number | null
      created_at?: string | null
      created_by?: string | null
      event_date?: string | null
      event_description?: string | null
      event_title: string
      event_type: string
      id?: string
      metadata?: Json | null
      new_status?: string | null
      previous_status?: string | null
      purchase_id: string
      return_amount?: number | null
      return_reason?: string | null
      total_items_count?: number | null
    }
    Update: {
      affected_items_count?: number | null
      created_at?: string | null
      created_by?: string | null
      event_date?: string | null
      event_description?: string | null
      event_title?: string
      event_type?: string
      id?: string
      metadata?: Json | null
      new_status?: string | null
      previous_status?: string | null
      purchase_id?: string
      return_amount?: number | null
      return_reason?: string | null
      total_items_count?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "purchase_events_purchase_id_fkey"
        columns: ["purchase_id"]
        isOneToOne: false
        referencedRelation: "purchases"
        referencedColumns: ["id"]
      },
    ]
  }
  suppliers: {
    Row: {
      address: string | null
      created_at: string | null
      email: string | null
      id: string
      join_date: string | null
      name: string
      phone: string | null
      status: string | null
      total_purchases: number | null
      total_spent: number | null
      updated_at: string | null
    }
    Insert: {
      address?: string | null
      created_at?: string | null
      email?: string | null
      id?: string
      join_date?: string | null
      name: string
      phone?: string | null
      status?: string | null
      total_purchases?: number | null
      total_spent?: number | null
      updated_at?: string | null
    }
    Update: {
      address?: string | null
      created_at?: string | null
      email?: string | null
      id?: string
      join_date?: string | null
      name?: string
      phone?: string | null
      status?: string | null
      total_purchases?: number | null
      total_spent?: number | null
      updated_at?: string | null
    }
    Relationships: []
  }
}

// Convenience type exports
export type Purchase = PurchaseTables['purchases']['Row']
export type PurchaseItem = PurchaseTables['purchase_items']['Row']
export type PurchaseEvent = PurchaseTables['purchase_events']['Row']
export type Supplier = PurchaseTables['suppliers']['Row'] 