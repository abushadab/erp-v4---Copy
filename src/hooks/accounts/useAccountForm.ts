'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { 
  createAccount,
  updateAccount,
  type CreateAccountData
} from '@/lib/supabase/accounts-client'
import { logAccountCreate, logAccountUpdate } from '@/lib/supabase/activity-logger'
import type { AccountWithCategory, AccountCategory } from '@/lib/supabase/types/accounting'

export interface UseAccountFormReturn {
  // Add Account Modal State
  isAddAccountDialogOpen: boolean
  setIsAddAccountDialogOpen: (open: boolean) => void
  newAccount: Partial<CreateAccountData>
  setNewAccount: (account: Partial<CreateAccountData> | ((prev: Partial<CreateAccountData>) => Partial<CreateAccountData>)) => void
  useAsPaymentMethod: boolean
  setUseAsPaymentMethod: (use: boolean) => void
  paymentMethodType: string
  setPaymentMethodType: (type: string) => void
  bankAccountNumber: string
  setBankAccountNumber: (number: string) => void
  isSubmitting: boolean
  
  // Edit Account Modal State
  isEditAccountDialogOpen: boolean
  setIsEditAccountDialogOpen: (open: boolean) => void
  editingAccount: AccountWithCategory | null
  setEditingAccount: (account: AccountWithCategory | null) => void
  editAccount: Partial<CreateAccountData>
  setEditAccount: (account: Partial<CreateAccountData> | ((prev: Partial<CreateAccountData>) => Partial<CreateAccountData>)) => void
  editUseAsPaymentMethod: boolean
  setEditUseAsPaymentMethod: (use: boolean) => void
  editPaymentMethodType: string
  setEditPaymentMethodType: (type: string) => void
  editBankAccountNumber: string
  setEditBankAccountNumber: (number: string) => void
  isEditSubmitting: boolean
  
  // Actions
  handleAddAccount: () => Promise<void>
  handleEditAccount: (account: AccountWithCategory) => void
  handleUpdateAccount: () => Promise<void>
  resetForms: () => void
  isSelectedCategoryAsset: (categoryId: string) => boolean
}

export function useAccountForm(
  categories: AccountCategory[],
  onAccountCreated?: () => void,
  onAccountUpdated?: () => void
): UseAccountFormReturn {
  // Add Account Modal State
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false)
  const [newAccount, setNewAccount] = useState<Partial<CreateAccountData>>({})
  const [useAsPaymentMethod, setUseAsPaymentMethod] = useState(false)
  const [paymentMethodType, setPaymentMethodType] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Edit Account Modal State
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountWithCategory | null>(null)
  const [editAccount, setEditAccount] = useState<Partial<CreateAccountData>>({})
  const [editUseAsPaymentMethod, setEditUseAsPaymentMethod] = useState(false)
  const [editPaymentMethodType, setEditPaymentMethodType] = useState('')
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('')
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)

  // Helper function to check if selected category is an asset
  const isSelectedCategoryAsset = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.type === 'asset'
  }, [categories])

  // Handle adding new account
  const handleAddAccount = useCallback(async () => {
    if (!newAccount.account_number || !newAccount.account_name || !newAccount.category_id) {
      toast.error("Please fill in all required fields.")
      return
    }

    // Validate payment method requirements
    if (useAsPaymentMethod && !paymentMethodType) {
      toast.error("Please select a payment method type.")
      return
    }

    // Validate bank account number for bank payment methods
    if (useAsPaymentMethod && paymentMethodType === 'bank' && !bankAccountNumber) {
      toast.error("Please provide a bank account number.")
      return
    }

    setIsSubmitting(true)
    try {
      const accountData: CreateAccountData = {
        account_number: newAccount.account_number,
        account_name: newAccount.account_name,
        account_code: newAccount.account_code,
        category_id: newAccount.category_id,
        description: newAccount.description,
        opening_balance: newAccount.opening_balance || 0,
        is_payment_method: useAsPaymentMethod,
        payment_method_type: useAsPaymentMethod ? paymentMethodType : undefined,
        bank_account_number: useAsPaymentMethod && paymentMethodType === 'bank' ? bankAccountNumber : undefined
      }

      const createdAccount = await createAccount(accountData)
      
      // Log the creation
      await logAccountCreate(createdAccount.id, createdAccount.account_name)
      
      toast.success("Account created successfully!")
      
      // Reset form
      setNewAccount({})
      setUseAsPaymentMethod(false)
      setPaymentMethodType('')
      setBankAccountNumber('')
      setIsAddAccountDialogOpen(false)
      
      // Notify parent of successful creation
      onAccountCreated?.()
      
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error("Failed to create account. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [newAccount, useAsPaymentMethod, paymentMethodType, bankAccountNumber, onAccountCreated])

  // Handle editing account
  const handleEditAccount = useCallback((account: AccountWithCategory) => {
    setEditingAccount(account)
    setEditAccount({
      account_number: account.account_number,
      account_code: account.account_code || '',
      account_name: account.account_name,
      category_id: account.category_id,
      description: account.description || ''
    })
    setEditUseAsPaymentMethod(account.is_payment_method || false)
    setEditPaymentMethodType(account.payment_method_type || '')
    setEditBankAccountNumber('')
    setIsEditAccountDialogOpen(true)
  }, [])

  // Handle updating account
  const handleUpdateAccount = useCallback(async () => {
    if (!editingAccount || !editAccount.account_name || !editAccount.category_id) {
      toast.error("Please fill in all required fields.")
      return
    }

    // Validate payment method requirements
    if (editUseAsPaymentMethod && !editPaymentMethodType) {
      toast.error("Please select a payment method type.")
      return
    }

    // Validate bank account number for bank payment methods
    if (editUseAsPaymentMethod && editPaymentMethodType === 'bank' && !editBankAccountNumber) {
      toast.error("Please provide a bank account number.")
      return
    }

    setIsEditSubmitting(true)
    try {
      const updateData: Partial<CreateAccountData> = {
        account_code: editAccount.account_code,
        account_name: editAccount.account_name,
        category_id: editAccount.category_id,
        description: editAccount.description,
        is_payment_method: editUseAsPaymentMethod,
        payment_method_type: editUseAsPaymentMethod ? editPaymentMethodType : undefined,
        bank_account_number: editUseAsPaymentMethod && editPaymentMethodType === 'bank' ? editBankAccountNumber : undefined
      }

      await updateAccount(editingAccount.id, updateData)
      
      // Log the update
      await logAccountUpdate(editingAccount.id, editingAccount.account_name)
      
      toast.success("Account updated successfully!")
      
      // Reset form
      setEditingAccount(null)
      setEditAccount({})
      setEditUseAsPaymentMethod(false)
      setEditPaymentMethodType('')
      setEditBankAccountNumber('')
      setIsEditAccountDialogOpen(false)
      
      // Notify parent of successful update
      onAccountUpdated?.()
      
    } catch (error) {
      console.error('Error updating account:', error)
      toast.error("Failed to update account. Please try again.")
    } finally {
      setIsEditSubmitting(false)
    }
  }, [editingAccount, editAccount, editUseAsPaymentMethod, editPaymentMethodType, editBankAccountNumber, onAccountUpdated])

  // Reset all forms
  const resetForms = useCallback(() => {
    // Reset add form
    setNewAccount({})
    setUseAsPaymentMethod(false)
    setPaymentMethodType('')
    setBankAccountNumber('')
    setIsAddAccountDialogOpen(false)
    
    // Reset edit form
    setEditingAccount(null)
    setEditAccount({})
    setEditUseAsPaymentMethod(false)
    setEditPaymentMethodType('')
    setEditBankAccountNumber('')
    setIsEditAccountDialogOpen(false)
  }, [])

  return {
    // Add Account Modal State
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
    
    // Edit Account Modal State
    isEditAccountDialogOpen,
    setIsEditAccountDialogOpen,
    editingAccount,
    setEditingAccount,
    editAccount,
    setEditAccount,
    editUseAsPaymentMethod,
    setEditUseAsPaymentMethod,
    editPaymentMethodType,
    setEditPaymentMethodType,
    editBankAccountNumber,
    setEditBankAccountNumber,
    isEditSubmitting,
    
    // Actions
    handleAddAccount,
    handleEditAccount,
    handleUpdateAccount,
    resetForms,
    isSelectedCategoryAsset
  }
} 