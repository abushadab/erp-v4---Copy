// TypeScript interfaces for ERP system

export interface Customer {
  id: string
  name: string
  email: string
  company: string
  phone: string
  address: string
  status: 'active' | 'inactive' | 'pending'
  totalOrders: number
  totalSpent: number
  joinDate: string
}

export interface Product {
  id: string
  name: string
  sku?: string
  description: string
  price?: number // For simple products
  buyingPrice?: number // For simple products - legacy field for compatibility
  stock?: number // For simple products - legacy field for compatibility
  boughtQuantity?: number // Track total quantity purchased for simple products - legacy field for compatibility
  category: string
  categoryId?: string
  status: 'active' | 'inactive'
  type: 'simple' | 'variation'
  image?: string
  parentSku?: string // For variation products - parent SKU
  variations?: ProductVariation[]
  attributes?: string[] // Array of attribute IDs for variation products
}

export interface ProductVariation {
  id: string
  productId: string
  sku: string
  attributeValues: { [attributeId: string]: string } // e.g., { "size": "L", "color": "Red" }
  price: number
  buyingPrice: number
  stock: number
  boughtQuantity: number
  // Raw attribute data for display purposes
  attribute_values?: {
    attribute_id: string
    attribute_name: string
    value_id: string
    value_label: string
  }[]
}

export interface Attribute {
  id: string
  name: string
  slug: string
  values: AttributeValue[]
  status: 'active' | 'inactive'
  createdAt: string
}

export interface AttributeValue {
  id: string
  value: string
  slug: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface PackageItem {
  productId: string
  quantity: number
}

export interface PackagingVariation {
  id: string
  sku: string
  attributeValues: { [attributeId: string]: string }
  price: number
  buyingPrice: number
  stock: number
  boughtQuantity: number
}

export interface Packaging {
  id: string
  title: string
  description: string
  type: 'simple' | 'variable'
  sku?: string // For simple packages
  price?: number // For simple packages
  buyingPrice?: number // For simple packages - legacy field for compatibility
  stock?: number // For simple packages - legacy field for compatibility
  boughtQuantity?: number // Track total quantity purchased for simple packages - legacy field for compatibility
  status: 'active' | 'inactive'
  createdAt: string
  selectedAttributes?: string[] // For variable packages
  variations?: PackagingVariation[] // For variable packages
}

export interface Warehouse {
  id: string
  name: string
  location: string
  manager: string
  status: 'active' | 'inactive'
  capacity: number
  currentStock: number
  contact?: string
  address?: string
}

export interface Sale {
  id: string
  customerName: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    returnedQuantity?: number
    price: number
    discount?: number
    tax?: number
    total: number
  }>
  subtotal: number // Subtotal before any discounts
  totalDiscount?: number // Total sale-level discount amount
  totalDiscountType?: 'percentage' | 'fixed' // Type of total discount
  afterDiscount: number // Amount after applying total discount
  taxRate?: number // Tax percentage rate
  taxAmount?: number // Calculated tax amount
  totalAmount: number // Final total after all calculations
  profit: number
  commission: number
  salesperson: string
  warehouse: string
  date: string
  status: 'completed' | 'pending' | 'cancelled' | 'returned' | 'partially returned'
  returnReason?: string
}

export interface Return {
  id: string
  saleId: string
  customerName: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
    total: number
  }>
  totalAmount: number
  reason: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
  status: 'active' | 'inactive'
  totalPurchases: number
  totalSpent: number
  joinDate: string
}

export interface Purchase {
  id: string
  supplierId: string
  supplierName: string
  items: Array<{
    itemId: string // Can be productId or packageId
    itemType: 'product' | 'package'
    itemName: string
    quantity: number
    receivedQuantity: number // Track how much has been received
    purchasePrice: number
    total: number
    variationId?: string // For variation products/packages
  }>
  totalAmount: number
  warehouse: string
  date: string
  status: 'pending' | 'partially_received' | 'received' | 'returned' | 'cancelled'
  createdBy: string
  lastUpdated?: string
  notes?: string
}

export interface PurchaseReturn {
  id: string
  purchaseId: string
  supplierName: string
  items: Array<{
    itemId: string // Can be productId or packageId
    itemType: 'product' | 'package'
    itemName: string
    quantity: number
    purchasePrice: number
    total: number
    variationId?: string // For variation products/packages
  }>
  totalAmount: number
  reason: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
  createdBy: string
}

export interface Account {
  id: string
  accountNumber: string
  accountName: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  balance: number
  description: string
  isActive: boolean
}

export interface Transaction {
  id: string
  description: string
  amount: number
  debitAccount: string
  creditAccount: string
  date: string
  reference: string
  createdBy: string
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

export interface DropdownOption {
  value: string
  label: string
  description?: string
  icon?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'manager' | 'sales' | 'warehouse' | 'accountant'
  avatar?: string
  status: 'active' | 'inactive' | 'pending'
  department: string
  lastLogin?: string
  joinDate: string
  permissions: string[]
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  products: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
    total: number
  }>
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  orderDate: string
  shippingAddress: string
  paymentMethod: string
}

export interface StockMovement {
  id: string
  productId: string
  productName: string
  variationId?: string // For variation products
  movementType: 'purchase' | 'return' | 'adjustment' | 'sale'
  direction: 'in' | 'out' // Stock increase or decrease
  quantity: number
  previousStock: number
  newStock: number
  referenceId: string // Purchase ID, Sale ID, etc.
  reason: string
  createdBy: string
  createdAt: string
  notes?: string
}

export interface ExpenseType {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  createdAt: string
  createdBy: string
}

export interface Expense {
  id: string
  expenseTypeId: string
  expenseTypeName: string
  amount: number
  date: string
  description?: string
  createdBy: string
  createdAt: string
}