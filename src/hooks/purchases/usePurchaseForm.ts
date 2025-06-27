import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  createPurchase,
  type DatabaseSupplier, 
  type DatabaseWarehouse,
  type CreatePurchaseData,
  type CreatePurchaseItemData
} from '@/lib/supabase/purchases'
import { logPurchaseCreate } from '@/lib/supabase/activity-logger'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface PurchaseItem {
  itemId: string
  itemType: 'product' | 'package'
  itemName: string
  quantity: number
  purchasePrice: number
  total: number
  variationId?: string
}

interface PurchaseForm {
  supplierId: string
  warehouse: string
  date: string
  items: PurchaseItem[]
}

interface SelectedItem {
  id: string
  type: 'product' | 'package'
  name: string
  sku?: string
  variationId?: string
  variationName?: string
}

export interface UsePurchaseFormReturn {
  // Form state
  form: PurchaseForm
  isLoading: boolean
  
  // Setters
  setForm: React.Dispatch<React.SetStateAction<PurchaseForm>>
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  
  // Methods
  validateForm: () => boolean
  addSelectedItemsToPurchase: (selectedItems: SelectedItem[]) => void
  updateItemQuantity: (index: number, quantity: string) => void
  updateItemPrice: (index: number, price: string) => void
  removeItem: (index: number) => void
  handleSubmit: (e: React.FormEvent, suppliers: DatabaseSupplier[], warehouses: DatabaseWarehouse[]) => Promise<void>
  getItemNameById: (id: string, type: 'product' | 'package', products: any[], packages: any[]) => string
}

export function usePurchaseForm(): UsePurchaseFormReturn {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const { user } = useCurrentUser()
  
  const [form, setForm] = React.useState<PurchaseForm>({
    supplierId: '',
    warehouse: '',
    date: new Date().toISOString().split('T')[0],
    items: []
  })

  const validateForm = () => {
    if (!form.supplierId) {
      toast.error('Please select a supplier')
      return false
    }
    if (!form.warehouse) {
      toast.error('Please select a warehouse')
      return false
    }
    if (!form.date) {
      toast.error('Please select a date')
      return false
    }
    if (form.items.length === 0) {
      toast.error('Please add at least one item')
      return false
    }

    // Validate all items have quantity and price
    for (const item of form.items) {
      if (item.quantity <= 0) {
        toast.error(`Please enter a valid quantity for ${item.itemName}`)
        return false
      }
      if (item.purchasePrice <= 0) {
        toast.error(`Please enter a valid purchase price for ${item.itemName}`)
        return false
      }
    }

    return true
  }

  const addSelectedItemsToPurchase = (selectedItems: SelectedItem[]) => {
    const newItems: PurchaseItem[] = selectedItems.map(selected => ({
      itemId: selected.id,
      itemType: selected.type,
      itemName: selected.name,
      quantity: 1,
      purchasePrice: 0,
      total: 0,
      variationId: selected.variationId,
    }))

    setForm(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }))

    toast.success(`Added ${newItems.length} item${newItems.length !== 1 ? 's' : ''} to purchase`)
  }

  const updateItemQuantity = (index: number, quantity: string) => {
    const qty = parseInt(quantity) || 0
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { ...item, quantity: qty, total: qty * item.purchasePrice }
          : item
      )
    }))
  }

  const updateItemPrice = (index: number, price: string) => {
    const purchasePrice = parseFloat(price) || 0
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { ...item, purchasePrice, total: item.quantity * purchasePrice }
          : item
      )
    }))
  }

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent, suppliers: DatabaseSupplier[], warehouses: DatabaseWarehouse[]) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Check if user is authenticated
    if (!user?.id) {
      toast.error('You must be logged in to create a purchase order')
      return
    }

    setIsLoading(true)
    
    try {
      const selectedSupplier = suppliers.find(s => s.id === form.supplierId)
      const selectedWarehouse = warehouses.find(w => w.id === form.warehouse)
      
      if (!selectedSupplier || !selectedWarehouse) {
        throw new Error('Invalid supplier or warehouse selection')
      }

      const purchaseData: CreatePurchaseData = {
        supplier_id: form.supplierId,
        supplier_name: selectedSupplier.name,
        warehouse_id: form.warehouse,
        warehouse_name: selectedWarehouse.name,
        purchase_date: form.date,
        created_by: user?.id || 'unknown' // Use authenticated user ID
      }

      const items: CreatePurchaseItemData[] = form.items.map(item => ({
        item_id: item.itemId,
        item_type: item.itemType,
        item_name: item.itemName,
        variation_id: item.variationId,
        quantity: item.quantity,
        purchase_price: item.purchasePrice,
        total: item.total
      }))

      const createdPurchase = await createPurchase(purchaseData, items)
      
      // Log the purchase creation activity
      const totalAmount = form.items.reduce((sum, item) => sum + item.total, 0)
      await logPurchaseCreate(
        createdPurchase.id,
        selectedSupplier.name,
        totalAmount,
        {
          items: form.items.length,
          warehouse: selectedWarehouse.name,
          date: form.date
        }
      ).catch(error => {
        console.warn('Failed to log purchase creation:', error)
      })
      
      toast.success('Purchase order created successfully!')
      router.push(`/purchases/${createdPurchase.id}`)
      
    } catch (error) {
      console.error('Error creating purchase:', error)
      toast.error('Failed to create purchase order. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getItemNameById = (id: string, type: 'product' | 'package', products: any[], packages: any[]) => {
    if (type === 'product') {
      const product = products.find(p => p.id === id)
      return product ? product.name : 'Unknown Product'
    } else {
      const packaging = packages.find(p => p.id === id)
      return packaging ? packaging.title : 'Unknown Package'
    }
  }

  return {
    // Form state
    form,
    isLoading,
    
    // Setters
    setForm,
    setIsLoading,
    
    // Methods
    validateForm,
    addSelectedItemsToPurchase,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    handleSubmit,
    getItemNameById
  }
} 