"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Loader2 } from "lucide-react"

interface AccountsHeaderProps {
  refreshing: boolean
  onRefresh: () => void
  onAddAccount: () => void
}

export function AccountsHeader({ refreshing, onRefresh, onAddAccount }: AccountsHeaderProps) {
  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your chart of accounts and track financial transactions
        </p>
      </div>
      <div className="flex flex-row space-x-2">
        <Button 
          variant="outline" 
          onClick={onRefresh} 
          disabled={refreshing} 
          className="flex-1 sm:w-auto sm:flex-initial"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
        <Button onClick={onAddAccount} className="flex-1 sm:w-auto sm:flex-initial">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>
    </div>
  )
} 