import { Json } from './base'

export interface SystemTables {
  activity_logs: {
    Row: {
      action: string
      created_at: string | null
      description: string
      id: string
      ip_address: unknown | null
      new_values: Json | null
      old_values: Json | null
      resource_id: string | null
      resource_name: string | null
      resource_type: string
      session_id: string | null
      user_agent: string | null
      user_email: string | null
      user_id: string | null
      user_name: string | null
    }
    Insert: {
      action: string
      created_at?: string | null
      description: string
      id?: string
      ip_address?: unknown | null
      new_values?: Json | null
      old_values?: Json | null
      resource_id?: string | null
      resource_name?: string | null
      resource_type: string
      session_id?: string | null
      user_agent?: string | null
      user_email?: string | null
      user_id?: string | null
      user_name?: string | null
    }
    Update: {
      action?: string
      created_at?: string | null
      description?: string
      id?: string
      ip_address?: unknown | null
      new_values?: Json | null
      old_values?: Json | null
      resource_id?: string | null
      resource_name?: string | null
      resource_type?: string
      session_id?: string | null
      user_agent?: string | null
      user_email?: string | null
      user_id?: string | null
      user_name?: string | null
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
}

export interface SystemViews {
  activity_summary: {
    Row: {
      action: string | null
      activity_count: number | null
      activity_date: string | null
      resource_type: string | null
      unique_users: number | null
    }
    Relationships: []
  }
}

// Convenience type exports
export type ActivityLog = SystemTables['activity_logs']['Row']
export type Expense = SystemTables['expenses']['Row']
export type ExpenseType = SystemTables['expense_types']['Row']
export type ActivitySummary = SystemViews['activity_summary']['Row'] 