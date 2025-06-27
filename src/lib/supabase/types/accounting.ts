import { Json, Tables } from './base'

export interface AccountingTables {
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
      is_payment_method: boolean | null
      is_system: boolean | null
      opening_balance: number | null
      payment_method_type: string | null
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
      is_payment_method?: boolean | null
      is_system?: boolean | null
      opening_balance?: number | null
      payment_method_type?: string | null
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
      is_payment_method?: boolean | null
      is_system?: boolean | null
      opening_balance?: number | null
      payment_method_type?: string | null
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
}

// Convenience type exports
export type AccountCategory = AccountingTables['account_categories']['Row']
export type Account = AccountingTables['accounts']['Row']
export type JournalEntry = AccountingTables['journal_entries']['Row']
export type JournalEntryLine = AccountingTables['journal_entry_lines']['Row']
export type AccountBalanceHistory = AccountingTables['account_balance_history']['Row']

// Composed types
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