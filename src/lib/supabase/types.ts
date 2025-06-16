export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_balance_history: {
        Row: {
          account_id: string
          change_amount: number
          change_type: string
          created_at: string | null
          entry_date: string
          id: string
          journal_entry_id: string | null
          new_balance: number
          previous_balance: number
        }
        Insert: {
          account_id: string
          change_amount: number
          change_type: string
          created_at?: string | null
          entry_date: string
          id?: string
          journal_entry_id?: string | null
          new_balance: number
          previous_balance: number
        }
        Update: {
          account_id?: string
          change_amount?: number
          change_type?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          journal_entry_id?: string | null
          new_balance?: number
          previous_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balance_history_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      account_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_id: string | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_code: string | null
          account_name: string
          account_number: string
          balance: number | null
          category_id: string
          created_at: string | null
          credit_balance: number | null
          debit_balance: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          opening_balance: number | null
          updated_at: string | null
        }
        Insert: {
          account_code?: string | null
          account_name: string
          account_number: string
          balance?: number | null
          category_id: string
          created_at?: string | null
          credit_balance?: number | null
          debit_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string | null
          account_name?: string
          account_number?: string
          balance?: number | null
          category_id?: string
          created_at?: string | null
          credit_balance?: number | null
          debit_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_values: {
        Row: {
          attribute_id: string
          created_at: string | null
          id: string
          label: string
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          id: string
          label: string
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          id?: string
          label?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          required: boolean | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          required?: boolean | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          required?: boolean | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          name: string
          parent_id?: string | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      expense_types: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string
          description: string | null
          expense_date: string
          expense_type_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by: string
          description?: string | null
          expense_date?: string
          expense_type_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string
          description?: string | null
          expense_date?: string
          expense_type_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string
          description: string
          entry_date: string
          entry_number: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description: string
          entry_date?: string
          entry_number: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          journal_entry_id: string
          line_number: number
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
          line_number: number
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          sku: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          sku?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          sku?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      packaging_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string | null
          id: string
          label: string
          slug: string
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          id: string
          label: string
          slug: string
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          id?: string
          label?: string
          slug?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "packaging_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_attributes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          slug: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      packaging_packaging_attributes: {
        Row: {
          attribute_id: string
          packaging_id: string
        }
        Insert: {
          attribute_id: string
          packaging_id: string
        }
        Update: {
          attribute_id?: string
          packaging_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_packaging_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "packaging_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_packaging_attributes_packaging_id_fkey"
            columns: ["packaging_id"]
            isOneToOne: false
            referencedRelation: "packaging"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_variation_attributes: {
        Row: {
          attribute_id: string
          attribute_value_id: string
          variation_id: string
        }
        Insert: {
          attribute_id: string
          attribute_value_id: string
          variation_id: string
        }
        Update: {
          attribute_id?: string
          attribute_value_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_variation_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "packaging_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_variation_attributes_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "packaging_attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_variation_attributes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "packaging_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_variations: {
        Row: {
          created_at: string | null
          id: string
          packaging_id: string
          sku: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          packaging_id: string
          sku: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          packaging_id?: string
          sku?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_variations_packaging_id_fkey"
            columns: ["packaging_id"]
            isOneToOne: false
            referencedRelation: "packaging"
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
      product_attributes: {
        Row: {
          attribute_id: string
          product_id: string
        }
        Insert: {
          attribute_id: string
          product_id: string
        }
        Update: {
          attribute_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variation_attributes: {
        Row: {
          attribute_id: string
          attribute_value_id: string
          variation_id: string
        }
        Insert: {
          attribute_id: string
          attribute_value_id: string
          variation_id: string
        }
        Update: {
          attribute_id?: string
          attribute_value_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variation_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variation_attributes_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variation_attributes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: string
          price: number
          product_id: string
          sku: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          price: number
          product_id: string
          sku: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          price?: number
          product_id?: string
          sku?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_sku: string | null
          price: number | null
          sku: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          image_url?: string | null
          name: string
          parent_sku?: string | null
          price?: number | null
          sku?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_sku?: string | null
          price?: number | null
          sku?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          p_variation_id: string
          p_from_warehouse_id: string
          p_to_warehouse_id: string
          p_quantity: number
          p_reference_id: string
          p_reason: string
          p_created_by: string
          p_notes: string
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
          p_variation_id: string
          p_quantity_change: number
          p_movement_type: string
          p_reference_id: string
          p_reason: string
          p_created_by: string
          p_notes: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export type DatabasePackaging = Tables<'packaging'>;
export type DatabasePackagingVariation = Tables<'packaging_variations'>;
export type DatabasePackagingWarehouseStock = Tables<'packaging_warehouse_stock'>;
export type DatabaseProductVariation = Tables<'product_variations'>;

// Custom types for the application
export type Customer = Tables<'customers'>;
export type Sale = Tables<'sales'>;
export type SaleItem = Tables<'sale_items'>;
export type Return = Tables<'returns'>;
export type ReturnItem = Tables<'return_items'>;

// Accounting types
export type AccountCategory = Tables<'account_categories'>;
export type Account = Tables<'accounts'>;
export type JournalEntry = Tables<'journal_entries'>;
export type JournalEntryLine = Tables<'journal_entry_lines'>;
export type AccountBalanceHistory = Tables<'account_balance_history'>;

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

// Extended types for relationships
export type SaleWithItems = Sale & {
  sale_items: SaleItem[]
}

export type ReturnWithItems = Return & {
  return_items: ReturnItemWithVariation[]
}

// Extended accounting types
export type AccountWithCategory = Account & {
  account_categories: AccountCategory
}

export type JournalEntryWithLines = JournalEntry & {
  journal_entry_lines: (JournalEntryLine & {
    accounts: Account
  })[]
}

export type TrialBalanceRow = {
  account_id: string
  account_number: string
  account_name: string
  account_type: string
  debit_balance: number
  credit_balance: number
} 