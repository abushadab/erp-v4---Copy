"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Calendar,
  RefreshCw,
  ArrowUpDown,
  Plus,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react"
import { 
  getJournalEntriesWithLines,
  getAccountsWithCategories,
  createJournalEntry,
  type CreateJournalEntryData
} from "@/lib/supabase/accounts-client"
import type { JournalEntryWithLines, AccountWithCategory } from "@/lib/supabase/types"
import TransactionLayoutTable from '@/components/transactions/TransactionLayoutTable'
import { transformTransactionData } from '@/components/transactions/utils'

// Global data cache and request deduplication to prevent multiple API calls
const dataCache = {
  journalEntries: null as JournalEntryWithLines[] | null,
  accounts: null as AccountWithCategory[] | null,
  lastFetch: 0,
  isLoading: false,
  currentRequest: null as Promise<void> | null
}

const CACHE_DURATION = 30000 // 30 seconds

// Global debugging utility for transactions cache
if (typeof window !== 'undefined') {
  (window as any).clearTransactionsCache = () => {
    dataCache.journalEntries = null
    dataCache.accounts = null
    dataCache.lastFetch = 0
    dataCache.isLoading = false
    dataCache.currentRequest = null
    console.log('🧹 Transactions cache cleared')
  }
  
  (window as any).debugTransactionsCache = () => {
    console.log('🔍 Transactions Cache Debug:', {
      hasJournalEntries: !!dataCache.journalEntries,
      entriesCount: dataCache.journalEntries?.length || 0,
      hasAccounts: !!dataCache.accounts,
      accountsCount: dataCache.accounts?.length || 0,
      lastFetch: new Date(dataCache.lastFetch).toISOString(),
      isLoading: dataCache.isLoading,
      hasCurrentRequest: !!dataCache.currentRequest,
      cacheAge: Date.now() - dataCache.lastFetch
    })
  }
}

export default function TransactionsPage() {
  // Ref to track if initial load has been triggered
  const initialLoadTriggered = React.useRef(false)
  
  // Data state
  const [journalEntries, setJournalEntries] = React.useState<JournalEntryWithLines[]>([])
  const [accounts, setAccounts] = React.useState<AccountWithCategory[]>([])
  
  // Loading states
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  
  // UI state
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = React.useState(false)

  // Form states
  const [newTransaction, setNewTransaction] = React.useState<Partial<CreateJournalEntryData>>({
    lines: [
      { account_id: '', debit_amount: 0, credit_amount: 0 },
      { account_id: '', debit_amount: 0, credit_amount: 0 }
    ]
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false)
  
  // Data loading function with enhanced request deduplication and timeout protection
  const loadTransactionsData = async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadTransactionsData called with forceRefresh:', forceRefresh)
    
    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        dataCache.journalEntries && 
        dataCache.accounts &&
        (now - dataCache.lastFetch) < CACHE_DURATION) {
      console.log('📦 Using cached data')
      setJournalEntries(dataCache.journalEntries)
      setAccounts(dataCache.accounts)
      setLoading(false)
      return
    }

    // If there's already a request in progress, wait for it with timeout
    if (dataCache.currentRequest) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        // Wait for existing promise with 8-second timeout
        await Promise.race([
          dataCache.currentRequest,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout waiting for existing request')), 8000)
          )
        ])
        
        // After the request completes, update state with cached data
        if (dataCache.journalEntries && dataCache.accounts) {
          console.log('📦 Using data from completed request')
          setJournalEntries(dataCache.journalEntries)
          setAccounts(dataCache.accounts)
          setLoading(false)
        }
      } catch (error) {
        console.error('⚠️ Error or timeout in concurrent request:', error)
        // Clear stuck promise and proceed with fresh request
        dataCache.currentRequest = null
      }
      
      // If we successfully used cached data, return
      if (dataCache.journalEntries && dataCache.accounts) {
        return
      }
    }

    // Create a new request promise with timeout protection
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh data from API')
        setLoading(true)
        
        // Create timeout controller
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => {
          console.log('⏰ Request timeout after 10 seconds')
          timeoutController.abort()
        }, 10000)
        
                 try {
           const [journalEntriesData, accountsData] = await Promise.race([
             Promise.all([
               getJournalEntriesWithLines(),
               getAccountsWithCategories()
             ]),
             new Promise<never>((_, reject) => 
               setTimeout(() => reject(new Error('API request timeout')), 10000)
             )
           ]) as [JournalEntryWithLines[], AccountWithCategory[]]
          
          clearTimeout(timeoutId)
          
          console.log('✅ Data fetched successfully')
          console.log('📊 Journal entries:', journalEntriesData?.length || 0)
          console.log('🏦 Accounts:', accountsData?.length || 0)
          
          // Update cache
          dataCache.journalEntries = journalEntriesData
          dataCache.accounts = accountsData
          dataCache.lastFetch = now
          
          // Update state
          setJournalEntries(journalEntriesData)
          setAccounts(accountsData)
        } catch (apiError) {
          clearTimeout(timeoutId)
          console.error('❌ API request failed or timed out:', apiError)
          
          // Fallback to cached data if available
          if (dataCache.journalEntries && dataCache.accounts) {
            console.log('🔄 Using stale cached data as fallback')
            setJournalEntries(dataCache.journalEntries)
            setAccounts(dataCache.accounts)
          } else {
            // Set empty data as fallback
            setJournalEntries([])
            setAccounts([])
          }
          
          toast.error("Failed to load transactions data. Please try refreshing.")
        }
      } catch (error) {
        console.error('❌ Error loading transactions data:', error)
        
        // Fallback to cached data if available
        if (dataCache.journalEntries && dataCache.accounts) {
          console.log('🔄 Using cached data as fallback after error')
          setJournalEntries(dataCache.journalEntries)
          setAccounts(dataCache.accounts)
        } else {
          setJournalEntries([])
          setAccounts([])
        }
        
        toast.error("Failed to load transactions data. Please try again.")
      } finally {
        console.log('🏁 Request completed, setting loading to false')
        setLoading(false)
        setRefreshing(false)
        dataCache.currentRequest = null
      }
    })()

    // Store the request promise so other calls can wait for it
    dataCache.currentRequest = requestPromise
    
    // Wait for the request to complete with overall timeout
    try {
      await Promise.race([
        requestPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Overall operation timeout')), 12000)
        )
      ])
    } catch (error) {
      console.error('⚠️ Overall operation timeout or error:', error)
      // Ensure loading is false and promise is cleared
      setLoading(false)
      setRefreshing(false)
      dataCache.currentRequest = null
    }
  }

  // Load initial data only once
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    
    if (!initialLoadTriggered.current) {
      console.log('✨ Initial load not triggered yet, calling loadTransactionsData')
      initialLoadTriggered.current = true
      loadTransactionsData()
    }
  }, [])

  const refreshData = async () => {
    setRefreshing(true)
    await loadTransactionsData(true)
  }

  const handleAddTransaction = async () => {
    setHasAttemptedSubmit(true)

    if (!newTransaction.description || !newTransaction.lines?.length) {
      toast.error("Please fill in all required fields.")
      return
    }

    // Validate that all journal lines have accounts selected
    const hasUnselectedAccounts = newTransaction.lines.some(line => !line.account_id)
    if (hasUnselectedAccounts) {
      toast.error("Please select an account for each journal entry line.")
      return
    }

    // Validate that each line has either a debit or credit amount
    const hasInvalidAmounts = newTransaction.lines.some(line => 
      (line.debit_amount || 0) === 0 && (line.credit_amount || 0) === 0
    )
    if (hasInvalidAmounts) {
      toast.error("Each journal entry line must have either a debit or credit amount.")
      return
    }

    // Validate that debits equal credits
    const totalDebits = newTransaction.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
    const totalCredits = newTransaction.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast.error("Debits must equal credits in a journal entry.")
      return
    }

    try {
      setIsSubmitting(true)
      await createJournalEntry({
        ...newTransaction,
        created_by: 'current-user' // TODO: Replace with actual user ID
      } as CreateJournalEntryData)
      
      // Invalidate cache and refresh
      dataCache.lastFetch = 0
      await loadTransactionsData(true)
      
      setIsAddTransactionDialogOpen(false)
      setNewTransaction({
        lines: [
          { account_id: '', debit_amount: 0, credit_amount: 0 },
          { account_id: '', debit_amount: 0, credit_amount: 0 }
        ]
      })
      setHasAttemptedSubmit(false)
      toast.success("Transaction recorded successfully.")
    } catch (error) {
      console.error('Error creating transaction:', error)
      toast.error("Failed to record transaction. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateTransactionLine = React.useCallback((index: number, field: string, value: any) => {
    setNewTransaction(prev => ({
      ...prev,
      lines: prev.lines?.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      ) || []
    }))
  }, [])

  const addTransactionLine = React.useCallback(() => {
    setNewTransaction(prev => ({
      ...prev,
      lines: [...(prev.lines || []), { account_id: '', debit_amount: 0, credit_amount: 0 }]
    }))
  }, [])

  const removeTransactionLine = React.useCallback((index: number) => {
    if ((newTransaction.lines?.length || 0) <= 2) return // Keep at least 2 lines
    setNewTransaction(prev => ({
      ...prev,
      lines: prev.lines?.filter((_, i) => i !== index) || []
    }))
  }, [newTransaction.lines])

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">Record and manage journal entries</p>
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Loading Table */}
        <div className="space-y-4">
          {/* Filter Controls Skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="border rounded-lg bg-white">
            <div className="border-b bg-muted/50">
              <div className="grid grid-cols-5 gap-4 p-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
            <div className="divide-y bg-white">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 p-4 bg-white">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
                      <p className="text-muted-foreground">Record and manage journal entries</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isAddTransactionDialogOpen} onOpenChange={(open) => {
            setIsAddTransactionDialogOpen(open)
            if (!open) {
              setHasAttemptedSubmit(false)
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Record Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Journal Entry</DialogTitle>
                <DialogDescription>
                  Record a new journal entry. Debits must equal credits.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description *
                  </Label>
                  <Input
                    id="description"
                    placeholder="e.g., Cash payment for office supplies"
                    className="col-span-3"
                    value={newTransaction.description || ''}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Journal Entry Lines *</Label>
                  {newTransaction.lines?.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded">
                      <div className="col-span-4">
                        <Select
                          value={line.account_id || ''}
                          onValueChange={(value) => updateTransactionLine(index, 'account_id', value)}
                          required
                        >
                          <SelectTrigger className={hasAttemptedSubmit && !line.account_id ? 'border-red-300' : ''}>
                            <SelectValue placeholder="Select account *" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_number} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Debit"
                          step="0.01"
                          value={line.debit_amount || ''}
                          onChange={(e) => updateTransactionLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Credit"
                          step="0.01"
                          value={line.credit_amount || ''}
                          onChange={(e) => updateTransactionLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        {(newTransaction.lines?.length || 0) > 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTransactionLine(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addTransactionLine}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsAddTransactionDialogOpen(false)
                  setHasAttemptedSubmit(false)
                }}>
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Transaction
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Transactions Table */}
      {journalEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowUpDown className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No transactions recorded yet</p>
          <p className="text-sm">Start by recording your first journal entry using the button above.</p>
        </div>
      ) : (
        <TransactionLayoutTable transactions={transformTransactionData(journalEntries)} />
      )}
    </div>
  )
} 