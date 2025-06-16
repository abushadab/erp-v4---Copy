export interface TransactionJournalEntry {
  id: string
  description: string
  reference_type: string | null
  reference_id: string | null
  entry_date: string
  total_amount: number
  status: string
  journal_entry_lines: Array<{
    id: string
    account_id: string
    accounts: {
      account_name: string
    }
    description: string
    debit_amount: number
    credit_amount: number
  }>
}

export interface TransactionLayoutProps {
  transactions: TransactionJournalEntry[]
} 