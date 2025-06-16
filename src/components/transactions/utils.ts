import type { JournalEntryWithLines } from "@/lib/supabase/types"
import { TransactionJournalEntry } from './types'

export function transformTransactionData(entries: JournalEntryWithLines[]): TransactionJournalEntry[] {
  return entries.map(entry => ({
    id: entry.id,
    description: entry.description || 'No description',
    reference_type: entry.reference_type,
    reference_id: entry.reference_id,
    entry_date: entry.entry_date,
    total_amount: entry.total_amount || 0,
    status: entry.status || 'unknown',
    journal_entry_lines: (entry.journal_entry_lines || []).map(line => ({
      id: line.id || '',
      account_id: line.account_id || '',
      accounts: line.accounts ? {
        account_name: line.accounts.account_name || 'Unknown Account'
      } : { account_name: 'Unknown Account' },
      description: line.description || 'No description',
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0
    }))
  }))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function getReferenceDisplay(refType: string | null, refId: string | null): string {
  if (!refType || !refId) return '#UNKNOWN'
  
  const typeMap: Record<string, string> = {
    'purchase_receipt': 'JE-RECEIPT',
    'purchase_return': 'RETURN',
    'sale': 'SALE',
    'expense': 'EXPENSE'
  }
  
  const prefix = typeMap[refType] || refType.toUpperCase()
  
  // Handle cases where refId already contains the appropriate prefix
  if (refType === 'purchase_receipt' && refId.startsWith('RECEIPT-')) {
    // For purchase receipts, if refId already starts with RECEIPT-, just use JE- prefix
    return `#JE-${refId}`
  }
  
  // For other cases, use the standard format
  return `#${prefix}-${refId}`
} 