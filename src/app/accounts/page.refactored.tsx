"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { toast } from "sonner"
import { 
  Plus, 
  Search, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  CreditCard,
  Banknote,
  Loader2,
  RefreshCw,
  Edit3,
  Smartphone,
  Wallet
} from "lucide-react"
import { Switch } from "@/components/ui/switch"

// Import our custom hooks
import { useAccountsData, useAccountForm, useAccountFiltering } from "@/hooks/accounts"

// Import our UI components
import { AccountsHeader } from "@/components/accounts/AccountsHeader"
import { FinancialSummaryCards } from "@/components/accounts/FinancialSummaryCards"
import { AccountCard } from "@/components/accounts/AccountCard"
import { AccountsLoadingSkeleton } from "@/components/accounts/AccountsLoadingSkeleton"

// Import types
import type { AccountWithCategory, AccountCategory } from "@/lib/supabase/types/accounting"
import type { CreateAccountData } from "@/lib/supabase/accounts-client"

// Payment method type options (perfect for Bangladesh)
// (other imports…)
import { PAYMENT_METHOD_TYPE_OPTIONS } from "@/lib/constants/payment-methods"
// (the rest of your code…)
export default function AccountsPageRefactored() {
  // Use our custom hooks for clean separation of concerns
  const { 
    accounts, 
    categories, 
    financialSummary, 
    loading, 
    refreshing, 
    refreshData,
    loadData 
  } = useAccountsData()

  const {
    isAddAccountDialogOpen,
    setIsAddAccountDialogOpen,
    newAccount,
    setNewAccount,
    useAsPaymentMethod,
    setUseAsPaymentMethod,
    paymentMethodType,
    setPaymentMethodType,
    bankAccountNumber,
    setBankAccountNumber,
    isSubmitting,
    isEditAccountDialogOpen,
    setIsEditAccountDialogOpen,
    editingAccount,
    editAccount,
    setEditAccount,
    editUseAsPaymentMethod,
    setEditUseAsPaymentMethod,
    editPaymentMethodType,
    setEditPaymentMethodType,
    editBankAccountNumber,
    setEditBankAccountNumber,
    isEditSubmitting,
    handleAddAccount,
    handleEditAccount,
    handleUpdateAccount,
    resetForms,
    isSelectedCategoryAsset
  } = useAccountForm(categories, loadData, loadData)

  const {
    activeTab,
    setActiveTab,
    searchTerms,
    updateSearchTerm,
    getFilteredAccounts,
    getAccountTypeIcon,
    getAccountTypeColor,
    getDisplayBalance,
    getBalanceColor
  } = useAccountFiltering()

  // Show loading skeleton while data is being fetched
  if (loading) {
    return <AccountsLoadingSkeleton />
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header Component */}
      <AccountsHeader 
        refreshing={refreshing}
        onRefresh={refreshData}
        onAddAccount={() => setIsAddAccountDialogOpen(true)}
      />

      {/* Financial Summary Component */}
      {financialSummary && (
        <FinancialSummaryCards financialSummary={financialSummary} />
      )}

      {/* Chart of Accounts with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Chart of Accounts</CardTitle>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 sm:px-6">
            <TabsList className="flex flex-wrap justify-start bg-transparent p-0 h-auto gap-1 w-full">
              {['asset', 'liability', 'equity', 'revenue', 'expense'].map((tabType) => {
                const count = accounts.filter((a: AccountWithCategory) => a.account_categories?.type === tabType && a.is_active).length
                const iconMap = {
                  asset: Building,
                  liability: CreditCard,
                  equity: DollarSign,
                  revenue: TrendingUp,
                  expense: TrendingDown
                }
                const IconComponent = iconMap[tabType as keyof typeof iconMap]

                return (
                  <TabsTrigger 
                    key={tabType}
                    value={tabType} 
                    className="flex items-center space-x-1 cursor-pointer bg-transparent data-[state=active]:bg-black data-[state=active]:text-white text-xs px-2 py-1.5 flex-shrink-0"
                  >
                    <IconComponent className="h-3 w-3" />
                    <span className="capitalize">{tabType}s</span>
                    <span className="ml-1 h-5 w-5 flex items-center justify-center bg-white text-black text-xs font-medium rounded-full border">
                      {count}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {['asset', 'liability', 'equity', 'revenue', 'expense'].map((tabType) => {
            const filteredAccounts = getFilteredAccounts(accounts, tabType)

            return (
              <TabsContent key={tabType} value={tabType} className="mt-0">
                <CardContent className="pt-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${tabType} accounts...`}
                      value={searchTerms[tabType] || ''}
                      onChange={(e) => updateSearchTerm(tabType, e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredAccounts.map((account: AccountWithCategory) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onEdit={handleEditAccount}
                        getDisplayBalance={getDisplayBalance}
                        paymentMethodTypeOptions={PAYMENT_METHOD_TYPE_OPTIONS}
                      />
                    ))}
                    {filteredAccounts.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        <p>No {tabType} accounts found{searchTerms[tabType] ? ' matching your search' : ''}.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </TabsContent>
            )
          })}
        </Tabs>
      </Card>

      {/* Add Account Dialog - Simplified inline version for now */}
      <Dialog open={isAddAccountDialogOpen} onOpenChange={(open) => {
        setIsAddAccountDialogOpen(open)
        if (!open) resetForms()
      }}>
        <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account in your chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category" className="font-medium">
                Category *
              </Label>
              <Select
                value={newAccount.category_id || ''}
                onValueChange={(value) => {
                  setNewAccount((prev: Partial<CreateAccountData>) => ({ ...prev, category_id: value }))
                  // Reset toggle if category is not asset
                  if (!isSelectedCategoryAsset(value)) {
                    setUseAsPaymentMethod(false)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: AccountCategory) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <span>{category.name} ({category.type})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditAccountDialogOpen} onOpenChange={(open) => {
        setIsEditAccountDialogOpen(open)
        if (!open) resetForms()
      }}>
        <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the account information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-account-name">Account Name *</Label>
              <Input
                id="edit-account-name"
                value={editAccount.account_name || ''}
                onChange={(e) => setEditAccount((prev: Partial<CreateAccountData>) => ({ ...prev, account_name: e.target.value }))}
                placeholder="e.g., Cash in Hand"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAccount} disabled={isEditSubmitting}>
              {isEditSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 