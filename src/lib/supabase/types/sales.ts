import { Json } from './base'

export interface SalesTables {
  sales: {
    Row: {
      after_discount: number
      created_at: string | null
      customer_id: string | null
      customer_name: string
      id: string
      profit: number | null
      return_reason: string | null
      sale_date: string | null
      salesperson: string
      status: string | null
      subtotal: number
      tax_amount: number | null
      tax_rate: number | null
      total_amount: number
      total_discount: number | null
      total_discount_type: string | null
      updated_at: string | null
      warehouse_id: string | null
      warehouse_name: string | null
    }
    Insert: {
      after_discount?: number
      created_at?: string | null
      customer_id?: string | null
      customer_name: string
      id?: string
      profit?: number | null
      return_reason?: string | null
      sale_date?: string | null
      salesperson: string
      status?: string | null
      subtotal?: number
      tax_amount?: number | null
      tax_rate?: number | null
      total_amount?: number
      total_discount?: number | null
      total_discount_type?: string | null
      updated_at?: string | null
      warehouse_id?: string | null
      warehouse_name?: string | null
    }
    Update: {
      after_discount?: number
      created_at?: string | null
      customer_id?: string | null
      customer_name?: string
      id?: string
      profit?: number | null
      return_reason?: string | null
      sale_date?: string | null
      salesperson?: string
      status?: string | null
      subtotal?: number
      tax_amount?: number | null
      tax_rate?: number | null
      total_amount?: number
      total_discount?: number | null
      total_discount_type?: string | null
      updated_at?: string | null
      warehouse_id?: string | null
      warehouse_name?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "sales_customer_id_fkey"
        columns: ["customer_id"]
        isOneToOne: false
        referencedRelation: "customers"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "sales_warehouse_id_fkey"
        columns: ["warehouse_id"]
        isOneToOne: false
        referencedRelation: "warehouses"
        referencedColumns: ["id"]
      },
    ]
  }
  sale_items: {
    Row: {
      created_at: string | null
      discount: number | null
      id: string
      packaging_id: string | null
      packaging_name: string | null
      packaging_variation_id: string | null
      price: number
      product_id: string | null
      product_name: string
      quantity: number
      returned_quantity: number | null
      sale_id: string | null
      tax: number | null
      total: number
      updated_at: string | null
      variation_id: string | null
    }
    Insert: {
      created_at?: string | null
      discount?: number | null
      id?: string
      packaging_id?: string | null
      packaging_name?: string | null
      packaging_variation_id?: string | null
      price: number
      product_id?: string | null
      product_name: string
      quantity: number
      returned_quantity?: number | null
      sale_id?: string | null
      tax?: number | null
      total: number
      updated_at?: string | null
      variation_id?: string | null
    }
    Update: {
      created_at?: string | null
      discount?: number | null
      id?: string
      packaging_id?: string | null
      packaging_name?: string | null
      packaging_variation_id?: string | null
      price?: number
      product_id?: string | null
      product_name?: string
      quantity?: number
      returned_quantity?: number | null
      sale_id?: string | null
      tax?: number | null
      total?: number
      updated_at?: string | null
      variation_id?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "sale_items_packaging_id_fkey"
        columns: ["packaging_id"]
        isOneToOne: false
        referencedRelation: "packaging"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "sale_items_packaging_variation_id_fkey"
        columns: ["packaging_variation_id"]
        isOneToOne: false
        referencedRelation: "packaging_variations"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "sale_items_product_id_fkey"
        columns: ["product_id"]
        isOneToOne: false
        referencedRelation: "products"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "sale_items_sale_id_fkey"
        columns: ["sale_id"]
        isOneToOne: false
        referencedRelation: "sales"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "sale_items_variation_id_fkey"
        columns: ["variation_id"]
        isOneToOne: false
        referencedRelation: "product_variations"
        referencedColumns: ["id"]
      },
    ]
  }
  customers: {
    Row: {
      address: string | null
      company: string | null
      created_at: string | null
      email: string | null
      id: string
      join_date: string | null
      name: string
      phone: string | null
      status: string | null
      total_orders: number | null
      total_spent: number | null
      updated_at: string | null
    }
    Insert: {
      address?: string | null
      company?: string | null
      created_at?: string | null
      email?: string | null
      id?: string
      join_date?: string | null
      name: string
      phone?: string | null
      status?: string | null
      total_orders?: number | null
      total_spent?: number | null
      updated_at?: string | null
    }
    Update: {
      address?: string | null
      company?: string | null
      created_at?: string | null
      email?: string | null
      id?: string
      join_date?: string | null
      name?: string
      phone?: string | null
      status?: string | null
      total_orders?: number | null
      total_spent?: number | null
      updated_at?: string | null
    }
    Relationships: []
  }
  returns: {
    Row: {
      created_at: string | null
      customer_id: string | null
      customer_name: string
      id: string
      notes: string | null
      processed_by: string | null
      reason: string
      return_date: string | null
      sale_id: string | null
      status: string | null
      total_amount: number
      updated_at: string | null
    }
    Insert: {
      created_at?: string | null
      customer_id?: string | null
      customer_name: string
      id?: string
      notes?: string | null
      processed_by?: string | null
      reason: string
      return_date?: string | null
      sale_id?: string | null
      status?: string | null
      total_amount?: number
      updated_at?: string | null
    }
    Update: {
      created_at?: string | null
      customer_id?: string | null
      customer_name?: string
      id?: string
      notes?: string | null
      processed_by?: string | null
      reason?: string
      return_date?: string | null
      sale_id?: string | null
      status?: string | null
      total_amount?: number
      updated_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "returns_customer_id_fkey"
        columns: ["customer_id"]
        isOneToOne: false
        referencedRelation: "customers"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "returns_sale_id_fkey"
        columns: ["sale_id"]
        isOneToOne: false
        referencedRelation: "sales"
        referencedColumns: ["id"]
      },
    ]
  }
  return_items: {
    Row: {
      created_at: string | null
      id: string
      price: number
      product_id: string | null
      product_name: string
      quantity: number
      return_id: string | null
      total: number
      updated_at: string | null
      variation_id: string | null
    }
    Insert: {
      created_at?: string | null
      id?: string
      price: number
      product_id?: string | null
      product_name: string
      quantity: number
      return_id?: string | null
      total: number
      updated_at?: string | null
      variation_id?: string | null
    }
    Update: {
      created_at?: string | null
      id?: string
      price?: number
      product_id?: string | null
      product_name?: string
      quantity?: number
      return_id?: string | null
      total?: number
      updated_at?: string | null
      variation_id?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "return_items_product_id_fkey"
        columns: ["product_id"]
        isOneToOne: false
        referencedRelation: "products"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "return_items_return_id_fkey"
        columns: ["return_id"]
        isOneToOne: false
        referencedRelation: "returns"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "return_items_variation_id_fkey"
        columns: ["variation_id"]
        isOneToOne: false
        referencedRelation: "product_variations"
        referencedColumns: ["id"]
      },
    ]
  }
}

// Convenience type exports
export type Sale = SalesTables['sales']['Row']
export type SaleItem = SalesTables['sale_items']['Row']
export type Customer = SalesTables['customers']['Row']
export type Return = SalesTables['returns']['Row']
export type ReturnItem = SalesTables['return_items']['Row']

// Composed types
export type ReturnItemWithVariation = ReturnItem & {
  product_sku?: string | null;
  product_variations?: {
    id: string;
    sku: string;
    product_variation_attributes: {
      attribute_id: string;
      attribute_value_id: string;
      attributes: { name: string };
      attribute_values: { value: string };
    }[];
  }[];
};

export type SaleWithItems = Sale & {
  sale_items: SaleItem[]
}

export type ReturnWithItems = Return & {
  return_items: ReturnItemWithVariation[]
} 