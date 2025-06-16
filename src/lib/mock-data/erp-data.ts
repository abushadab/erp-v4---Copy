// Mock data for ERP system with Bangladeshi context

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

// Mock Customers
export const mockCustomers: Customer[] = [
  {
    id: 'CUST001',
    name: 'John Doe',
    email: 'john.doe@email.com',
    company: 'Acme Corp',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, New York, NY 10001',
    status: 'active',
    totalOrders: 15,
    totalSpent: 12450.00,
    joinDate: '2023-01-15'
  },
  {
    id: 'CUST002',
    name: 'Sarah Johnson',
    email: 'sarah@techsolutions.com',
    company: 'Tech Solutions Inc',
    phone: '+1 (555) 987-6543',
    address: '456 Oak Ave, San Francisco, CA 94102',
    status: 'active',
    totalOrders: 8,
    totalSpent: 8920.00,
    joinDate: '2023-03-22'
  },
  {
    id: 'CUST003',
    name: 'Mike Chen',
    email: 'mike.chen@startup.io',
    company: 'Innovation Startup',
    phone: '+1 (555) 456-7890',
    address: '789 Pine St, Austin, TX 78701',
    status: 'pending',
    totalOrders: 2,
    totalSpent: 1540.00,
    joinDate: '2024-01-10'
  },
  {
    id: 'CUST004',
    name: 'Karim Ahmed',
    email: 'karim.ahmed@gmail.com',
    company: 'Ahmed Textiles',
    phone: '+880 1812-345678',
    address: 'House 25, Road 8, Dhanmondi, Dhaka-1205',
    status: 'active',
    totalOrders: 5,
    totalSpent: 4700.00,
    joinDate: '2023-08-10'
  },
  {
    id: 'CUST005',
    name: 'Rashida Begum',
    email: 'rashida.begum@yahoo.com',
    company: 'Begum Fashion House',
    phone: '+880 1756-789123',
    address: 'Flat 3B, Green Tower, Chittagong-4000',
    status: 'active',
    totalOrders: 3,
    totalSpent: 3000.00,
    joinDate: '2023-10-15'
  },
  {
    id: 'CUST006',
    name: 'Nazrul Islam',
    email: 'nazrul.islam@outlook.com',
    company: 'Islam Brothers',
    phone: '+880 1923-456789',
    address: 'Shop 15, New Market, Sylhet-3100',
    status: 'active',
    totalOrders: 4,
    totalSpent: 3500.00,
    joinDate: '2023-09-20'
  }
]

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ahmed Rahman',
    email: 'ahmed.rahman@company.com',
    role: 'admin',
    status: 'active',
    department: 'Administration',
    lastLogin: '2024-01-15T10:30:00Z',
    joinDate: '2022-01-15T00:00:00Z',
    permissions: ['users.create', 'users.read', 'users.update', 'users.delete', 'products.create', 'products.read', 'products.update', 'products.delete', 'sales.create', 'sales.read', 'sales.update', 'sales.delete', 'purchases.create', 'purchases.read', 'purchases.update', 'purchases.delete', 'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'reports.create', 'reports.read', 'reports.update', 'reports.delete', 'settings.create', 'settings.read', 'settings.update', 'settings.delete', 'accounting.create', 'accounting.read', 'accounting.update', 'accounting.delete']
  },
  {
    id: '2',
    name: 'Fatima Khatun',
    email: 'fatima.khatun@company.com',
    role: 'manager',
    status: 'active',
    department: 'Operations',
    lastLogin: '2024-01-14T16:45:00Z',
    joinDate: '2022-03-10T00:00:00Z',
    permissions: ['products.create', 'products.read', 'products.update', 'products.delete', 'sales.create', 'sales.read', 'sales.update', 'sales.delete', 'purchases.create', 'purchases.read', 'purchases.update', 'purchases.delete', 'inventory.create', 'inventory.read', 'inventory.update', 'inventory.delete', 'reports.read', 'reports.export', 'users.read']
  },
  {
    id: '3',
    name: 'Mohammad Hasan',
    email: 'mohammad.hasan@company.com',
    role: 'sales',
    status: 'active',
    department: 'Sales',
    lastLogin: '2024-01-15T09:15:00Z',
    joinDate: '2023-06-01T00:00:00Z',
    permissions: ['sales.create', 'sales.read', 'sales.update', 'products.read', 'inventory.read']
  },
  {
    id: '4',
    name: 'Rashida Begum',
    email: 'rashida.begum@company.com',
    role: 'warehouse',
    status: 'active',
    department: 'Warehouse',
    lastLogin: '2024-01-15T08:00:00Z',
    joinDate: '2023-02-15T00:00:00Z',
    permissions: ['inventory.create', 'inventory.read', 'inventory.update', 'purchases.read', 'products.read']
  },
  {
    id: '5',
    name: 'Karim Uddin',
    email: 'karim.uddin@company.com',
    role: 'accountant',
    status: 'active',
    department: 'Finance',
    lastLogin: '2024-01-14T17:30:00Z',
    joinDate: '2022-08-20T00:00:00Z',
    permissions: ['accounting.create', 'accounting.read', 'accounting.update', 'accounting.delete', 'reports.read', 'reports.export', 'purchases.read', 'sales.read']
  },
  {
    id: '6',
    name: 'Nasir Ahmed',
    email: 'nasir.ahmed@company.com',
    role: 'sales',
    status: 'inactive',
    department: 'Sales',
    lastLogin: '2024-01-10T14:20:00Z',
    joinDate: '2023-09-01T00:00:00Z',
    permissions: ['sales.create', 'sales.read', 'sales.update', 'products.read', 'inventory.read']
  }
]

// Mock Warehouses - Bangladeshi locations
export const mockWarehouses: Warehouse[] = [
  {
    id: 'WH001',
    name: 'Dhaka Main Warehouse',
    location: 'Dhanmondi, Dhaka',
    manager: 'Ahmed Rahman',
    status: 'active',
    capacity: 10000,
    currentStock: 7500,
    contact: '+880 1712-345678',
    address: 'House 45, Road 12A, Dhanmondi, Dhaka-1209'
  },
  {
    id: 'WH002',
    name: 'Chittagong Distribution Center',
    location: 'Agrabad, Chittagong',
    manager: 'Fatima Khatun',
    status: 'active',
    capacity: 8000,
    currentStock: 6200,
    contact: '+880 1823-456789',
    address: '89 Agrabad Commercial Area, Chittagong-4100'
  },
  {
    id: 'WH003',
    name: 'Sylhet Regional Store',
    location: 'Zindabazar, Sylhet',
    manager: 'Mohammad Hasan',
    status: 'active',
    capacity: 5000,
    currentStock: 3800,
    contact: '+880 1934-567890',
    address: '23 Zindabazar Main Road, Sylhet-3100'
  },
  {
    id: 'WH004',
    name: 'Rajshahi Branch',
    location: 'New Market, Rajshahi',
    manager: 'Nasir Ahmed',
    status: 'inactive',
    capacity: 4000,
    currentStock: 0,
    contact: '+880 1745-678901',
    address: '56 New Market Complex, Rajshahi-6000'
  }
]

// Mock Products - Updated to start with 0 stock
export const mockProducts: Product[] = [
  // Simple Products - Men's Clothing
  {
    id: 'PROD001',
    name: 'Premium Cotton Punjabi',
    sku: 'PUN-COT-001',
    description: 'High quality cotton punjabi for men, comfortable fit',
    price: 2500,
    buyingPrice: 1800,
    stock: 45, // Updated through stock movements: 50 purchased - 5 returned = 45
    boughtQuantity: 50, // Total purchased quantity
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD002',
    name: 'Formal Shirt - White',
    sku: 'SHT-FOR-002',
    description: 'Classic white formal shirt, 100% cotton',
    price: 1800,
    buyingPrice: 1200,
    stock: 35, // Increased stock
    boughtQuantity: 40,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD003',
    name: 'Casual T-Shirt',
    sku: 'TSH-CAS-003',
    description: 'Comfortable cotton t-shirt for daily wear',
    price: 800,
    buyingPrice: 500,
    stock: 25, // Added stock
    boughtQuantity: 30,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD004',
    name: 'Formal Pant - Black',
    sku: 'PNT-FOR-004',
    description: 'Black formal pant, slim fit design',
    price: 2200,
    buyingPrice: 1500,
    stock: 18, // Added stock
    boughtQuantity: 25,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD005',
    name: 'Denim Jeans',
    sku: 'JNS-DEN-005',
    description: 'Premium denim jeans, regular fit',
    price: 3200,
    buyingPrice: 2200,
    stock: 12, // Added stock
    boughtQuantity: 20,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'simple'
  },

  // Women's Clothing
  {
    id: 'PROD006',
    name: 'Ladies Kurti',
    sku: 'KUR-LAD-006',
    description: 'Elegant cotton kurti for women',
    price: 1500,
    buyingPrice: 1000,
    stock: 25, // Updated through stock movements: 25 partially received
    boughtQuantity: 25, // 40 ordered, 25 received so far
    category: 'Women\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH002',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD007',
    name: 'Saree - Cotton',
    sku: 'SAR-COT-007',
    description: 'Traditional cotton saree with border',
    price: 4500,
    buyingPrice: 3000,
    stock: 8, // Added stock
    boughtQuantity: 12,
    category: 'Women\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH002',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD008',
    name: 'Ladies T-Shirt',
    sku: 'TSH-LAD-008',
    description: 'Soft cotton t-shirt for women',
    price: 900,
    buyingPrice: 600,
    stock: 15, // Added stock
    boughtQuantity: 20,
    category: 'Women\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH002',
    status: 'active',
    type: 'simple'
  },

  // Chittagong warehouse products
  {
    id: 'PROD009',
    name: 'Cotton Shirt - Blue',
    sku: 'SHT-COT-009',
    description: 'Comfortable cotton shirt in blue color',
    price: 1600,
    buyingPrice: 1100,
    stock: 22, // Added stock
    boughtQuantity: 30,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH002',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD010',
    name: 'Polo Shirt',
    sku: 'PLO-SHT-010',
    description: 'Classic polo shirt for men',
    price: 1200,
    buyingPrice: 800,
    stock: 14, // Added stock
    boughtQuantity: 20,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH002',
    status: 'active',
    type: 'simple'
  },

  // Sylhet warehouse products
  {
    id: 'PROD011',
    name: 'Linen Punjabi',
    sku: 'PUN-LIN-011',
    description: 'Premium linen punjabi, perfect for summer',
    price: 3000,
    buyingPrice: 2100,
    stock: 6, // Added stock
    boughtQuantity: 10,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH003',
    status: 'active',
    type: 'simple'
  },
  {
    id: 'PROD012',
    name: 'Cargo Pant',
    sku: 'PNT-CAR-012',
    description: 'Comfortable cargo pant with multiple pockets',
    price: 2800,
    buyingPrice: 1900,
    stock: 9, // Added stock
    boughtQuantity: 15,
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH003',
    status: 'active',
    type: 'simple'
  },

  // Variation Product Example - Premium T-Shirt with Size and Color variants
  {
    id: 'PROD013',
    name: 'Premium Cotton T-Shirt',
    description: 'High-quality cotton t-shirt available in multiple sizes and colors',
    category: 'Men\'s Clothing',
    categoryId: 'CAT002',
    warehouse: 'WH001',
    status: 'active',
    type: 'variation',
    attributes: ['ATTR001', 'ATTR002'], // Size and Color attributes
    variations: [
      {
        id: 'VAR013001',
        productId: 'PROD013',
        sku: 'TSH-PREM-S-BLACK',
        attributeValues: {
          'ATTR001': 'SIZE_S',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 25,
        boughtQuantity: 30
      },
      {
        id: 'VAR013002',
        productId: 'PROD013',
        sku: 'TSH-PREM-M-BLACK',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 18,
        boughtQuantity: 25
      },
      {
        id: 'VAR013003',
        productId: 'PROD013',
        sku: 'TSH-PREM-L-BLACK',
        attributeValues: {
          'ATTR001': 'SIZE_L',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 12,
        boughtQuantity: 20
      },
      {
        id: 'VAR013004',
        productId: 'PROD013',
        sku: 'TSH-PREM-S-WHITE',
        attributeValues: {
          'ATTR001': 'SIZE_S',
          'ATTR002': 'COLOR_WHITE'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 15,
        boughtQuantity: 20
      },
      {
        id: 'VAR013005',
        productId: 'PROD013',
        sku: 'TSH-PREM-M-WHITE',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_WHITE'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 8,
        boughtQuantity: 15
      },
      {
        id: 'VAR013006',
        productId: 'PROD013',
        sku: 'TSH-PREM-L-WHITE',
        attributeValues: {
          'ATTR001': 'SIZE_L',
          'ATTR002': 'COLOR_WHITE'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 22,
        boughtQuantity: 25
      },
      {
        id: 'VAR013007',
        productId: 'PROD013',
        sku: 'TSH-PREM-S-BLUE',
        attributeValues: {
          'ATTR001': 'SIZE_S',
          'ATTR002': 'COLOR_BLUE'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 5,
        boughtQuantity: 10
      },
      {
        id: 'VAR013008',
        productId: 'PROD013',
        sku: 'TSH-PREM-M-BLUE',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_BLUE'
        },
        price: 1200,
        buyingPrice: 800,
        stock: 8, // Added stock
        boughtQuantity: 12
      }
    ]
  },

  // Variation Products - Converted from Package to regular variation products
  {
    id: 'PROD014',
    name: 'Formal Office Set - Men',
    sku: 'PROD-OFF-014',
    description: 'Complete office wear set with formal shirt and pant combination',
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'variation',
    attributes: ['ATTR001', 'ATTR002'], // Size and Color attributes
    variations: [
      {
        id: 'PROD014-V1',
        productId: 'PROD014',
        sku: 'PROD-OFF-014-V1',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 3500,
        buyingPrice: 2700,
        stock: 8, // Added stock
        boughtQuantity: 12
      },
      {
        id: 'PROD014-V2',
        productId: 'PROD014',
        sku: 'PROD-OFF-014-V2',
        attributeValues: {
          'ATTR001': 'SIZE_L',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 3500,
        buyingPrice: 2700,
        stock: 6, // Added stock
        boughtQuantity: 10
      }
    ]
  },
  {
    id: 'PROD015',
    name: 'Casual Combo - Men',
    sku: 'PROD-CAS-015',
    description: 'Casual wear combo with t-shirts and jeans',
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'variation',
    attributes: ['ATTR001', 'ATTR002'], // Size and Color attributes
    variations: [
      {
        id: 'PROD015-V1',
        productId: 'PROD015',
        sku: 'PROD-CAS-015-V1',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 4500,
        buyingPrice: 3200,
        stock: 5, // Added stock
        boughtQuantity: 8
      },
      {
        id: 'PROD015-V2',
        productId: 'PROD015',
        sku: 'PROD-CAS-015-V2',
        attributeValues: {
          'ATTR001': 'SIZE_L',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 4500,
        buyingPrice: 3200,
        stock: 7, // Added stock
        boughtQuantity: 10
      },
      {
        id: 'PROD015-V3',
        productId: 'PROD015',
        sku: 'PROD-CAS-015-V3',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_BLUE'
        },
        price: 4500,
        buyingPrice: 3200,
        stock: 4, // Added stock
        boughtQuantity: 6
      },
      {
        id: 'PROD015-V4',
        productId: 'PROD015',
        sku: 'PROD-CAS-015-V4',
        attributeValues: {
          'ATTR001': 'SIZE_L',
          'ATTR002': 'COLOR_BLUE'
        },
        price: 4500,
        buyingPrice: 3200,
        stock: 6, // Added stock
        boughtQuantity: 8
      }
    ]
  },
  {
    id: 'PROD016',
    name: 'Traditional Wear Set',
    sku: 'PROD-TRA-016',
    description: 'Traditional combo with premium punjabi and formal pant',
    category: 'Men\'s Clothing',
    categoryId: 'CLOTHING',
    warehouse: 'WH001',
    status: 'active',
    type: 'variation',
    attributes: ['ATTR001', 'ATTR002'], // Size and Color attributes
    variations: [
      {
        id: 'PROD016-V1',
        productId: 'PROD016',
        sku: 'PROD-TRA-016-V1',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 4200,
        buyingPrice: 3300,
        stock: 3, // Added stock
        boughtQuantity: 5
      },
      {
        id: 'PROD016-V2',
        productId: 'PROD016',
        sku: 'PROD-TRA-016-V2',
        attributeValues: {
          'ATTR001': 'SIZE_L',
          'ATTR002': 'COLOR_BLACK'
        },
        price: 4200,
        buyingPrice: 3300,
        stock: 4, // Added stock
        boughtQuantity: 6
      },
      {
        id: 'PROD016-V3',
        productId: 'PROD016',
        sku: 'PROD-TRA-016-V3',
        attributeValues: {
          'ATTR001': 'SIZE_M',
          'ATTR002': 'COLOR_WHITE'
        },
        price: 4200,
        buyingPrice: 3300,
        stock: 5, // Added stock
        boughtQuantity: 7
      },
      {
        id: 'PROD016-V4',
        productId: 'PROD016',
        sku: 'PROD-TRA-016-V4',
        attributeValues: {
          'ATTR001': 'SIZE_L',
          'ATTR002': 'COLOR_WHITE'
        },
        price: 4200,
        buyingPrice: 3300,
        stock: 2, // Added stock
        boughtQuantity: 4
      }
    ]
  }
]

// Mock Sales with BDT amounts
export const mockSales: Sale[] = [
  {
    id: 'SALE001',
    customerName: 'Karim Ahmed',
    items: [
      {
        productId: 'PROD001',
        productName: 'Premium Cotton Punjabi',
        quantity: 1,
        returnedQuantity: 0,
        price: 2500,
        discount: 100, // Per-item discount
        tax: 0,
        total: 2400
      },
      {
        productId: 'PROD004',
        productName: 'Formal Pant - Black',
        quantity: 1,
        returnedQuantity: 1,
        price: 2200,
        discount: 200, // Per-item discount
        tax: 0,
        total: 2000
      }
    ],
    subtotal: 4400, // Before any total discounts
    totalDiscount: 5, // 5% total discount
    totalDiscountType: 'percentage',
    afterDiscount: 4180, // After 5% discount
    taxRate: 7.5, // 7.5% tax
    taxAmount: 313.5, // Tax on discounted amount
    totalAmount: 4493.5, // Final total
    profit: 1400,
    commission: 470,
    salesperson: 'Ahmed Rahman',
    warehouse: 'WH001',
    date: '2024-01-15',
    status: 'partially returned',
    returnReason: 'Size issue with pants'
  },
  {
    id: 'SALE002',
    customerName: 'Rashida Begum',
    items: [
      {
        productId: 'PROD006',
        productName: 'Ladies Kurti',
        quantity: 2,
        returnedQuantity: 2,
        price: 1500,
        discount: 0,
        tax: 0,
        total: 3000
      }
    ],
    subtotal: 3000,
    totalDiscount: 0,
    totalDiscountType: undefined,
    afterDiscount: 3000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 3000,
    profit: 1000,
    commission: 300,
    salesperson: 'Fatima Khatun',
    warehouse: 'WH002',
    date: '2024-01-16',
    status: 'returned',
    returnReason: 'Defective items'
  },
  {
    id: 'SALE003',
    customerName: 'Nazrul Islam',
    items: [
      {
        productId: 'PROD014',
        productName: 'Formal Office Set - Men',
        quantity: 1,
        returnedQuantity: 0,
        price: 3500,
        discount: 0,
        tax: 0,
        total: 3500
      }
    ],
    subtotal: 3500,
    totalDiscount: 0,
    totalDiscountType: undefined,
    afterDiscount: 3500,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 3500,
    profit: 800,
    commission: 350,
    salesperson: 'Mohammad Hasan',
    warehouse: 'WH001',
    date: '2024-01-17',
    status: 'completed'
  },
  {
    id: 'SALE004',
    customerName: 'John Doe',
    items: [
      {
        productId: 'PROD002',
        productName: 'Formal Shirt - White',
        quantity: 3,
        returnedQuantity: 1,
        price: 1800,
        discount: 150,
        tax: 247.5,
        total: 5547.5
      },
      {
        productId: 'PROD003',
        productName: 'Casual T-Shirt',
        quantity: 2,
        returnedQuantity: 0,
        price: 800,
        discount: 0,
        tax: 120,
        total: 1720
      }
    ],
    subtotal: 7267.5,
    totalDiscount: 150,
    totalDiscountType: 'fixed',
    afterDiscount: 7117.5,
    taxRate: 7.5,
    taxAmount: 538.3125,
    totalAmount: 7655.8125,
    profit: 2300,
    commission: 700,
    salesperson: 'Ahmed Rahman',
    warehouse: 'WH001',
    date: '2024-01-18',
    status: 'partially returned',
    returnReason: 'One shirt had stain'
  },
  {
    id: 'SALE005',
    customerName: 'Sarah Johnson',
    items: [
      {
        productId: 'PROD007',
        productName: 'Saree - Cotton',
        quantity: 1,
        returnedQuantity: 0,
        price: 4500,
        discount: 0,
        tax: 0,
        total: 4500
      },
      {
        productId: 'PROD005',
        productName: 'Denim Jeans',
        quantity: 1,
        returnedQuantity: 0,
        price: 3200,
        discount: 0,
        tax: 0,
        total: 3200
      }
    ],
    subtotal: 7700,
    totalDiscount: 0,
    totalDiscountType: undefined,
    afterDiscount: 7700,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 7700,
    profit: 2800,
    commission: 770,
    salesperson: 'Fatima Khatun',
    warehouse: 'WH001',
    date: '2024-01-19',
    status: 'completed'
  },
  {
    id: 'SALE006',
    customerName: 'Mike Chen',
    items: [
      {
        productId: 'PROD009',
        productName: 'Cotton Shirt - Blue',
        quantity: 2,
        returnedQuantity: 0,
        price: 1600,
        discount: 0,
        tax: 0,
        total: 3200
      },
      {
        productId: 'PROD010',
        productName: 'Polo Shirt',
        quantity: 1,
        returnedQuantity: 0,
        price: 1200,
        discount: 0,
        tax: 0,
        total: 1200
      }
    ],
    subtotal: 4400,
    totalDiscount: 0,
    totalDiscountType: undefined,
    afterDiscount: 4400,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 4400,
    profit: 1300,
    commission: 440,
    salesperson: 'Mohammad Hasan',
    warehouse: 'WH002',
    date: '2024-01-20',
    status: 'completed'
  },
  // Example with percentage total discount and tax
  {
    id: 'SALE007',
    customerName: 'Alex Rodriguez',
    items: [
      {
        productId: 'PROD001',
        productName: 'Premium Cotton Punjabi',
        quantity: 1,
        returnedQuantity: 0,
        price: 2500,
        discount: 250, // 10% per-item discount
        tax: 0,
        total: 2250
      },
      {
        productId: 'PROD008',
        productName: 'Traditional Panjabi',
        quantity: 2,
        returnedQuantity: 0,
        price: 2800,
        discount: 0, // No per-item discount
        tax: 0,
        total: 5600
      }
    ],
    subtotal: 7850, // Total before sale-level discount
    totalDiscount: 5, // 5% total discount
    totalDiscountType: 'percentage',
    afterDiscount: 7457.5, // After 5% discount
    taxRate: 7.5, // 7.5% tax
    taxAmount: 559.3125, // Tax on discounted amount
    totalAmount: 8016.8125, // Final total
    profit: 2200,
    commission: 650,
    salesperson: 'Ahmed Rahman',
    warehouse: 'WH001',
    date: '2024-01-21',
    status: 'completed'
  },
  // Example with fixed total discount and no tax
  {
    id: 'SALE008',
    customerName: 'Maria Garcia',
    items: [
      {
        productId: 'PROD002',
        productName: 'Formal Shirt - White',
        quantity: 4,
        returnedQuantity: 0,
        price: 1800,
        discount: 100, // Fixed per-item discount
        tax: 0,
        total: 6800 // (1800-100) * 4
      }
    ],
    subtotal: 6800,
    totalDiscount: 500, // Fixed ৳500 total discount
    totalDiscountType: 'fixed',
    afterDiscount: 6300,
    taxRate: 0, // No tax
    taxAmount: 0,
    totalAmount: 6300,
    profit: 1800,
    commission: 630,
    salesperson: 'Fatima Khatun',
    warehouse: 'WH001',
    date: '2024-01-22',
    status: 'completed'
  },
  // Example with only per-item discounts, no total discount, with tax
  {
    id: 'SALE009',
    customerName: 'David Kim',
    items: [
      {
        productId: 'PROD003',
        productName: 'Casual T-Shirt',
        quantity: 3,
        returnedQuantity: 0,
        price: 800,
        discount: 80, // 10% per-item discount
        tax: 0,
        total: 2160 // (800-80) * 3
      },
      {
        productId: 'PROD005',
        productName: 'Denim Jeans',
        quantity: 1,
        returnedQuantity: 0,
        price: 3200,
        discount: 200, // Fixed per-item discount
        tax: 0,
        total: 3000
      }
    ],
    subtotal: 5160, // Only per-item discounts applied
    totalDiscount: 0, // No total discount
    totalDiscountType: undefined,
    afterDiscount: 5160,
    taxRate: 10, // 10% tax
    taxAmount: 516, // Tax on final amount
    totalAmount: 5676,
    profit: 1500,
    commission: 516,
    salesperson: 'Mohammad Hasan',
    warehouse: 'WH002',
    date: '2024-01-23',
    status: 'completed'
  },
  // Example with no discounts but high tax
  {
    id: 'SALE010',
    customerName: 'Lisa Wong',
    items: [
      {
        productId: 'PROD014',
        productName: 'Formal Office Set - Men',
        quantity: 2,
        returnedQuantity: 0,
        price: 3500,
        discount: 0, // No discount
        tax: 0,
        total: 7000
      }
    ],
    subtotal: 7000,
    totalDiscount: 0,
    totalDiscountType: undefined,
    afterDiscount: 7000,
    taxRate: 15, // High tax rate
    taxAmount: 1050,
    totalAmount: 8050,
    profit: 2000,
    commission: 805,
    salesperson: 'Ahmed Rahman',
    warehouse: 'WH001',
    date: '2024-01-24',
    status: 'completed'
  }
]

// Mock Returns
export const mockReturns: Return[] = [
  {
    id: 'RET001',
    saleId: 'SALE001',
    customerName: 'Karim Ahmed',
    items: [
      {
        productId: 'PROD004',
        productName: 'Formal Pant - Black',
        quantity: 1,
        price: 2200,
        total: 2200
      }
    ],
    totalAmount: 2200,
    reason: 'Size issue with pants',
    date: '2024-01-18',
    status: 'approved'
  },
  {
    id: 'RET002',
    saleId: 'SALE002',
    customerName: 'Rashida Begum',
    items: [
      {
        productId: 'PROD006',
        productName: 'Ladies Kurti',
        quantity: 2,
        price: 1500,
        total: 3000
      }
    ],
    totalAmount: 3000,
    reason: 'Defective items',
    date: '2024-01-19',
    status: 'approved'
  },
  {
    id: 'RET003',
    saleId: 'SALE004',
    customerName: 'John Doe',
    items: [
      {
        productId: 'PROD002',
        productName: 'Formal Shirt - White',
        quantity: 1,
        price: 1800,
        total: 1800
      }
    ],
    totalAmount: 1800,
    reason: 'One shirt had stain',
    date: '2024-01-21',
    status: 'approved'
  }
]

// Mock Accounts with BDT amounts
export const mockAccounts: Account[] = [
  {
    id: 'ACC001',
    accountNumber: '1234567890',
    accountName: 'Cash',
    type: 'asset',
    balance: 500000,
    description: 'Cash on hand',
    isActive: true
  },
  {
    id: 'ACC002',
    accountNumber: '2345678901',
    accountName: 'Bank Account - Dutch Bangla',
    type: 'asset',
    balance: 2500000,
    description: 'Main business account at Dutch Bangla Bank',
    isActive: true
  },
  {
    id: 'ACC003',
    accountNumber: '3456789012',
    accountName: 'Inventory',
    type: 'asset',
    balance: 1800000,
    description: 'Stock inventory value',
    isActive: true
  },
  {
    id: 'ACC004',
    accountNumber: '4567890123',
    accountName: 'Sales Revenue',
    type: 'revenue',
    balance: 850000,
    description: 'Revenue from clothing sales',
    isActive: true
  },
  {
    id: 'ACC005',
    accountNumber: '5678901234',
    accountName: 'Cost of Goods Sold',
    type: 'expense',
    balance: 550000,
    description: 'Direct cost of sold products',
    isActive: true
  },
  {
    id: 'ACC006',
    accountNumber: '6789012345',
    accountName: 'Rent Expense',
    type: 'expense',
    balance: 45000,
    description: 'Monthly warehouse rent',
    isActive: true
  },
  {
    id: 'ACC007',
    accountNumber: '7890123456',
    accountName: 'Accounts Payable',
    type: 'liability',
    balance: 280000,
    description: 'Amount owed to suppliers',
    isActive: true
  }
]

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'TXN001',
    description: 'Cash sale of punjabis',
    amount: 7500,
    debitAccount: 'Cash',
    creditAccount: 'Sales Revenue',
    date: '2024-01-20',
    reference: 'REF001',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'TXN002',
    description: 'Purchase of inventory from supplier',
    amount: 50000,
    debitAccount: 'Inventory',
    creditAccount: 'Accounts Payable',
    date: '2024-01-19',
    reference: 'REF002',
    createdBy: 'Fatima Khatun'
  },
  {
    id: 'TXN003',
    description: 'Bank deposit of cash sales',
    amount: 25000,
    debitAccount: 'Bank Account - Dutch Bangla',
    creditAccount: 'Cash',
    date: '2024-01-18',
    reference: 'REF003',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'TXN004',
    description: 'Monthly warehouse rent payment',
    amount: 15000,
    debitAccount: 'Rent Expense',
    creditAccount: 'Bank Account - Dutch Bangla',
    date: '2024-01-17',
    reference: 'REF004',
    createdBy: 'Mohammad Hasan'
  },
  {
    id: 'TXN005',
    description: 'Payment to supplier for inventory',
    amount: 30000,
    debitAccount: 'Accounts Payable',
    creditAccount: 'Bank Account - Dutch Bangla',
    date: '2024-01-16',
    reference: 'REF005',
    createdBy: 'Fatima Khatun'
  },
  {
    id: 'TXN006',
    description: 'Cost of goods sold for recent sales',
    amount: 12000,
    debitAccount: 'Cost of Goods Sold',
    creditAccount: 'Inventory',
    date: '2024-01-15',
    reference: 'REF006',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'TXN007',
    description: 'Credit sale to wholesale customer',
    amount: 18000,
    debitAccount: 'Accounts Receivable',
    creditAccount: 'Sales Revenue',
    date: '2024-01-14',
    reference: 'REF007',
    createdBy: 'Mohammad Hasan'
  },
  {
    id: 'TXN008',
    description: 'Cash received from customer payment',
    amount: 8500,
    debitAccount: 'Cash',
    creditAccount: 'Accounts Receivable',
    date: '2024-01-13',
    reference: 'REF008',
    createdBy: 'Ahmed Rahman'
  }
]

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'NOT001',
    type: 'success',
    title: 'Order Completed',
    message: 'Order #ORD001 has been successfully processed and shipped.',
    timestamp: '2024-01-20T10:30:00Z',
    read: false,
    actionUrl: '/orders/ORD001'
  },
  {
    id: 'NOT002',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Standing Desk (SKU: DSK-STD-003) is out of stock.',
    timestamp: '2024-01-19T14:45:00Z',
    read: false,
    actionUrl: '/products/PROD003'
  },
  {
    id: 'NOT003',
    type: 'info',
    title: 'New Customer Registration',
    message: 'Mike Chen has registered and is pending approval.',
    timestamp: '2024-01-19T09:15:00Z',
    read: true,
    actionUrl: '/customers/CUST003'
  },
  {
    id: 'NOT004',
    type: 'error',
    title: 'Payment Failed',
    message: 'Payment for order #ORD003 could not be processed.',
    timestamp: '2024-01-18T16:20:00Z',
    read: false,
    actionUrl: '/orders/ORD003'
  }
]

// Dropdown Options
export const statusOptions: DropdownOption[] = [
  { value: 'active', label: 'Active', description: 'Currently active' },
  { value: 'inactive', label: 'Inactive', description: 'Temporarily disabled' },
  { value: 'pending', label: 'Pending', description: 'Awaiting approval' },
]

export const categoryOptions: DropdownOption[] = [
  { value: 'electronics', label: 'Electronics', description: 'Electronic devices and components' },
  { value: 'furniture', label: 'Furniture', description: 'Office and home furniture' },
  { value: 'appliances', label: 'Appliances', description: 'Kitchen and office appliances' },
  { value: 'stationery', label: 'Stationery', description: 'Office supplies and stationery' },
]

export const orderStatusOptions: DropdownOption[] = [
  { value: 'pending', label: 'Pending', description: 'Order received, awaiting processing' },
  { value: 'processing', label: 'Processing', description: 'Order is being prepared' },
  { value: 'shipped', label: 'Shipped', description: 'Order has been shipped' },
  { value: 'delivered', label: 'Delivered', description: 'Order successfully delivered' },
  { value: 'cancelled', label: 'Cancelled', description: 'Order has been cancelled' },
]

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: 'ORD001',
    customerId: 'CUST001',
    customerName: 'John Doe',
    products: [
      {
        productId: 'PROD001',
        productName: 'Professional Laptop',
        quantity: 2,
        price: 1299.99,
        total: 2599.98
      },
      {
        productId: 'PROD002',
        productName: 'Wireless Mouse',
        quantity: 2,
        price: 29.99,
        total: 59.98
      }
    ],
    total: 2659.96,
    status: 'processing',
    orderDate: '2024-01-20',
    shippingAddress: '123 Main St, New York, NY 10001',
    paymentMethod: 'Credit Card'
  },
  {
    id: 'ORD002',
    customerId: 'CUST002',
    customerName: 'Sarah Johnson',
    products: [
      {
        productId: 'PROD004',
        productName: 'Coffee Machine',
        quantity: 1,
        price: 899.99,
        total: 899.99
      }
    ],
    total: 899.99,
    status: 'shipped',
    orderDate: '2024-01-18',
    shippingAddress: '456 Oak Ave, San Francisco, CA 94102',
    paymentMethod: 'PayPal'
  }
]

// Dashboard Statistics
export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenueGrowth: number
  orderGrowth: number
  customerGrowth: number
  productGrowth: number
}

export const mockDashboardStats: DashboardStats = {
  totalRevenue: 245000,
  totalOrders: 1247,
  totalCustomers: 856,
  totalProducts: 324,
  revenueGrowth: 15.3,
  orderGrowth: 8.7,
  customerGrowth: 12.1,
  productGrowth: 5.2
}

// Utility functions for mock data
export const getCustomerById = (id: string): Customer | undefined => {
  return mockCustomers.find(customer => customer.id === id)
}

export const getProductById = (id: string): Product | undefined => {
  return mockProducts.find(product => product.id === id)
}

export const getOrderById = (id: string): Order | undefined => {
  return mockOrders.find(order => order.id === id)
}

export const getUnreadNotifications = (): Notification[] => {
  return mockNotifications.filter(notification => !notification.read)
}

export const getNotificationsByType = (type: Notification['type']): Notification[] => {
  return mockNotifications.filter(notification => notification.type === type)
}

// Mock Suppliers
export const mockSuppliers: Supplier[] = [
  {
    id: 'SUP001',
    name: 'Dhaka Textile Mills',
    email: 'orders@dhakatextile.com',
    phone: '+88017XXXXXXX',
    address: 'Savar, Dhaka-1340, Bangladesh',
    status: 'active',
    totalPurchases: 15,
    totalSpent: 450000,
    joinDate: '2023-06-15'
  },
  {
    id: 'SUP002',
    name: 'Bengal Fabrics Ltd',
    email: 'supply@bengalfabrics.bd',
    phone: '+88018XXXXXXX',
    address: 'Chittagong Export Processing Zone, Chittagong',
    status: 'active',
    totalPurchases: 8,
    totalSpent: 320000,
    joinDate: '2023-08-20'
  },
  {
    id: 'SUP003',
    name: 'Sylhet Cotton Works',
    email: 'info@sylhetcotton.com',
    phone: '+88019XXXXXXX',
    address: 'Sylhet-3100, Bangladesh',
    status: 'active',
    totalPurchases: 12,
    totalSpent: 280000,
    joinDate: '2023-07-10'
  },
  {
    id: 'SUP004',
    name: 'Rangpur Garments',
    email: 'sales@rangpurgarments.bd',
    phone: '+88016XXXXXXX',
    address: 'Rangpur-5400, Bangladesh',
    status: 'inactive',
    totalPurchases: 5,
    totalSpent: 150000,
    joinDate: '2023-09-05'
  }
]

// Mock Purchases
export const mockPurchases: Purchase[] = [
  {
    id: 'PUR001',
    supplierId: 'SUP001',
    supplierName: 'Dhaka Textile Mills',
    items: [
      {
        itemId: 'PROD001',
        itemType: 'product',
        itemName: 'Premium Cotton Punjabi',
        quantity: 50,
        receivedQuantity: 50,
        purchasePrice: 1800,
        total: 90000
      },
      {
        itemId: 'PROD002',
        itemType: 'product',
        itemName: 'Formal Shirt - White',
        quantity: 30,
        receivedQuantity: 30,
        purchasePrice: 1200,
        total: 36000
      }
    ],
    totalAmount: 126000,
    warehouse: 'WH001',
    date: '2024-01-15',
    status: 'received',
    createdBy: 'Mohammad Hasan',
    lastUpdated: '2024-01-17',
    notes: 'All items received in good condition'
  },
  {
    id: 'PUR002',
    supplierId: 'SUP002',
    supplierName: 'Bengal Fabrics Ltd',
    items: [
      {
        itemId: 'PROD006',
        itemType: 'product',
        itemName: 'Ladies Kurti',
        quantity: 40,
        receivedQuantity: 25,
        purchasePrice: 1000,
        total: 40000
      },
      {
        itemId: 'PROD007',
        itemType: 'product',
        itemName: 'Saree - Cotton',
        quantity: 20,
        receivedQuantity: 20,
        purchasePrice: 3000,
        total: 60000
      }
    ],
    totalAmount: 100000,
    warehouse: 'WH002',
    date: '2024-01-18',
    status: 'partially_received',
    createdBy: 'Ahmed Rahman',
    lastUpdated: '2024-01-20',
    notes: '15 Kurtis still pending delivery'
  },
  {
    id: 'PUR003',
    supplierId: 'SUP003',
    supplierName: 'Sylhet Cotton Works',
    items: [
      {
        itemId: 'PROD003',
        itemType: 'product',
        itemName: 'Casual T-Shirt',
        quantity: 100,
        receivedQuantity: 0,
        purchasePrice: 500,
        total: 50000
      }
    ],
    totalAmount: 50000,
    warehouse: 'WH003',
    date: '2024-01-20',
    status: 'pending',
    createdBy: 'Fatima Khatun',
    notes: 'Awaiting delivery confirmation from supplier'
  },
  {
    id: 'PUR004',
    supplierId: 'SUP001',
    supplierName: 'Dhaka Textile Mills',
    items: [
      {
        itemId: 'PROD004',
        itemType: 'product',
        itemName: 'Formal Pant - Black',
        quantity: 35,
        receivedQuantity: 35,
        purchasePrice: 1500,
        total: 52500
      },
      {
        itemId: 'PROD005',
        itemType: 'product',
        itemName: 'Denim Jeans',
        quantity: 25,
        receivedQuantity: 25,
        purchasePrice: 2200,
        total: 55000
      }
    ],
    totalAmount: 107500,
    warehouse: 'WH001',
    date: '2024-01-22',
    status: 'received',
    createdBy: 'Mohammad Hasan',
    lastUpdated: '2024-01-23',
    notes: 'Received complete order'
  },
  {
    id: 'PUR005',
    supplierId: 'SUP002',
    supplierName: 'Bengal Fabrics Ltd',
    items: [
      {
        itemId: 'PROD009',
        itemType: 'product',
        itemName: 'Cotton Shirt - Blue',
        quantity: 50,
        receivedQuantity: 30,
        purchasePrice: 1100,
        total: 55000
      }
    ],
    totalAmount: 55000,
    warehouse: 'WH002',
    date: '2024-01-24',
    status: 'partially_received',
    createdBy: 'Ahmed Rahman',
    lastUpdated: '2024-01-25',
    notes: '20 shirts still pending, supplier confirmed delay'
  },
  {
    id: 'PUR006',
    supplierId: 'SUP004',
    supplierName: 'Rangpur Garments',
    items: [
      {
        itemId: 'PROD010',
        itemType: 'product',
        itemName: 'Polo Shirt',
        quantity: 30,
        receivedQuantity: 0,
        purchasePrice: 800,
        total: 24000
      }
    ],
    totalAmount: 24000,
    warehouse: 'WH002',
    date: '2024-01-19',
    status: 'cancelled',
    createdBy: 'Fatima Khatun',
    lastUpdated: '2024-01-21',
    notes: 'Cancelled due to supplier quality issues'
  },
  {
    id: 'PUR007',
    supplierId: 'SUP003',
    supplierName: 'Sylhet Cotton Works',
    items: [
      {
        itemId: 'PROD011',
        itemType: 'product',
        itemName: 'Linen Punjabi',
        quantity: 20,
        receivedQuantity: 0, // Changed from 15 to 0 since entire order was returned
        purchasePrice: 2100,
        total: 42000
      }
    ],
    totalAmount: 42000,
    warehouse: 'WH003',
    date: '2024-01-16',
    status: 'returned',
    createdBy: 'Mohammad Hasan',
    lastUpdated: '2024-01-18',
    notes: 'Entire order returned due to quality issues'
  },
  {
    id: 'PUR009',
    supplierId: 'SUP003',
    supplierName: 'Packaging Solutions Ltd',
    items: [
      {
        itemId: 'PKG001',
        itemType: 'package',
        itemName: 'Standard Shipping Box',
        quantity: 200,
        receivedQuantity: 200,
        purchasePrice: 1.20,
        total: 240.00
      },
      {
        itemId: 'PKG003',
        itemType: 'package',
        itemName: 'Eco-Friendly Mailer',
        quantity: 300,
        receivedQuantity: 300,
        purchasePrice: 0.90,
        total: 270.00
      }
    ],
    totalAmount: 510.00,
    warehouse: 'WH001',
    date: '2024-01-28',
    status: 'received',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'PUR010',
    supplierId: 'SUP004',
    supplierName: 'Mixed Suppliers',
    items: [
      {
        itemId: 'PROD008',
        itemType: 'product',
        itemName: 'Designer Kurti',
        quantity: 20,
        receivedQuantity: 15,
        purchasePrice: 1800,
        total: 36000.00
      },
      {
        itemId: 'PKG002',
        itemType: 'package',
        itemName: 'Premium Gift Box',
        quantity: 50,
        receivedQuantity: 50,
        purchasePrice: 2.80,
        total: 140.00
      },
      {
        itemId: 'PKG004',
        itemType: 'package',
        itemName: 'Variable Gift Wrap Package',
        variationId: 'PKG004-V1',
        quantity: 100,
        receivedQuantity: 100,
        purchasePrice: 1.75,
        total: 175.00
      }
    ],
    totalAmount: 36315.00,
    warehouse: 'WH002',
    date: '2024-01-30',
    status: 'partially_received',
    createdBy: 'Mohammad Hasan',
    notes: 'Some designer kurtis pending delivery'
  },
  {
    id: 'PUR011',
    supplierId: 'SUP005',
    supplierName: 'Mixed Suppliers',
    items: [
      {
        itemId: 'PKG003',
        itemType: 'package',
        itemName: 'Variable Gift Wrap Package (Large, Heavy Duty)',
        quantity: 100,
        receivedQuantity: 100,
        purchasePrice: 1.75,
        total: 175,
        variationId: 'PACK003-V2'
      }
    ],
    totalAmount: 175,
    warehouse: 'WH001',
    date: '2024-01-28',
    status: 'received',
    createdBy: 'Ahmed Rahman',
    lastUpdated: '2024-01-29',
    notes: 'Premium gift wrap packages received'
  },
  {
    id: 'PUR012',
    supplierId: 'SUP001',
    supplierName: 'Dhaka Textile Mills',
    items: [
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Small, Black)',
        quantity: 20,
        receivedQuantity: 20,
        purchasePrice: 800,
        total: 16000,
        variationId: 'VAR013001'
      },
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Medium, Black)',
        quantity: 15,
        receivedQuantity: 15,
        purchasePrice: 800,
        total: 12000,
        variationId: 'VAR013002'
      },
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Large, Black)',
        quantity: 25,
        receivedQuantity: 20,
        purchasePrice: 800,
        total: 20000,
        variationId: 'VAR013003'
      }
    ],
    totalAmount: 48000,
    warehouse: 'WH001',
    date: '2024-01-30',
    status: 'partially_received',
    createdBy: 'Mohammad Hasan',
    lastUpdated: '2024-02-01',
    notes: '5 large size t-shirts still pending delivery'
  },
  {
    id: 'PUR013',
    supplierId: 'SUP002',
    supplierName: 'Bengal Fabrics Ltd',
    items: [
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Small, White)',
        quantity: 10,
        receivedQuantity: 10,
        purchasePrice: 800,
        total: 8000,
        variationId: 'VAR013004'
      },
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Medium, White)',
        quantity: 12,
        receivedQuantity: 12,
        purchasePrice: 800,
        total: 9600,
        variationId: 'VAR013005'
      },
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Large, White)',
        quantity: 8,
        receivedQuantity: 8,
        purchasePrice: 800,
        total: 6400,
        variationId: 'VAR013006'
      }
    ],
    totalAmount: 24000,
    warehouse: 'WH001',
    date: '2024-02-02',
    status: 'received',
    createdBy: 'Ahmed Rahman',
    lastUpdated: '2024-02-03',
    notes: 'All white t-shirt variations received successfully'
  },
  {
    id: 'PUR014',
    supplierId: 'SUP003',
    supplierName: 'Sylhet Cotton Works',
    items: [
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Small, Blue)',
        quantity: 8,
        receivedQuantity: 0,
        purchasePrice: 800,
        total: 6400,
        variationId: 'VAR013007'
      },
      {
        itemId: 'PROD013',
        itemType: 'product',
        itemName: 'Premium Cotton T-Shirt (Medium, Blue)',
        quantity: 10,
        receivedQuantity: 0,
        purchasePrice: 800,
        total: 8000,
        variationId: 'VAR013008'
      },
      {
        itemId: 'PROD001',
        itemType: 'product',
        itemName: 'Premium Cotton Punjabi',
        quantity: 15,
        receivedQuantity: 0,
        purchasePrice: 1800,
        total: 27000
      }
    ],
    totalAmount: 41400,
    warehouse: 'WH001',
    date: '2024-02-05',
    status: 'pending',
    createdBy: 'Fatima Khatun',
    notes: 'Waiting for supplier confirmation on blue t-shirts and punjabi order'
  },
  {
    id: 'PUR015',
    supplierId: 'SUP005',
    supplierName: 'Mixed Suppliers',
    items: [
      {
        itemId: 'PKG003',
        itemType: 'package',
        itemName: 'Variable Gift Wrap Package (Large, Heavy Duty)',
        quantity: 100,
        receivedQuantity: 100,
        purchasePrice: 1.75,
        total: 175,
        variationId: 'PACK003-V2'
      }
    ],
    totalAmount: 175,
    warehouse: 'WH001',
    date: '2024-01-28',
    status: 'received',
    createdBy: 'Ahmed Rahman',
    lastUpdated: '2024-01-29',
    notes: 'Premium gift wrap packages received'
  },
  {
    id: 'PUR016',
    supplierId: 'SUP001',
    supplierName: 'Dhaka Textile Mills',
    items: [
      {
        itemId: 'PROD001',
        itemType: 'product',
        itemName: 'Premium Cotton Punjabi',
        quantity: 20,
        receivedQuantity: 20,
        purchasePrice: 1800,
        total: 36000
      },
      {
        itemId: 'PROD002',
        itemType: 'product',
        itemName: 'Classic Men\'s Shirt',
        quantity: 15,
        receivedQuantity: 15,
        purchasePrice: 1200,
        total: 18000
      }
    ],
    totalAmount: 54000,
    warehouse: 'WH001',
    date: '2024-01-10',
    status: 'returned',
    createdBy: 'Mohammad Hasan',
    lastUpdated: '2024-01-18',
    notes: 'Full order returned due to quality issues with entire batch'
  },
  {
    id: 'PUR017',
    supplierId: 'SUP002',
    supplierName: 'Bengal Fabrics Ltd',
    items: [
      {
        itemId: 'PROD006',
        itemType: 'product',
        itemName: 'Ladies Kurti',
        quantity: 25,
        receivedQuantity: 25,
        purchasePrice: 1000,
        total: 25000
      },
      {
        itemId: 'PROD007',
        itemType: 'product',
        itemName: 'Casual T-Shirt',
        quantity: 30,
        receivedQuantity: 30,
        purchasePrice: 600,
        total: 18000
      }
    ],
    totalAmount: 43000,
    warehouse: 'WH002',
    date: '2024-01-25',
    status: 'returned',
    createdBy: 'Fatima Khatun',
    lastUpdated: '2024-02-02',
    notes: 'Returned entire shipment - fabric quality below standards'
  },
  {
    id: 'PUR018',
    supplierId: 'SUP003',
    supplierName: 'Packaging Solutions Ltd',
    items: [
      {
        itemId: 'PKG001',
        itemType: 'package',
        itemName: 'Standard Shipping Box',
        quantity: 500,
        receivedQuantity: 500,
        purchasePrice: 1.20,
        total: 600
      },
      {
        itemId: 'PKG002',
        itemType: 'package',
        itemName: 'Express Delivery Package',
        quantity: 200,
        receivedQuantity: 200,
        purchasePrice: 2.50,
        total: 500
      }
    ],
    totalAmount: 1100,
    warehouse: 'WH001',
    date: '2024-02-01',
    status: 'returned',
    createdBy: 'Ahmed Rahman',
    lastUpdated: '2024-02-05',
    notes: 'Packaging boxes damaged during shipment - full return processed'
  }
]

// Mock Purchase Returns
export const mockPurchaseReturns: PurchaseReturn[] = [
  {
    id: 'PRET001',
    purchaseId: 'PUR001',
    supplierName: 'Dhaka Textile Mills',
    items: [
      {
        itemId: 'PROD001',
        itemType: 'product',
        itemName: 'Premium Cotton Punjabi',
        quantity: 5,
        purchasePrice: 1800,
        total: 9000
      }
    ],
    totalAmount: 9000,
    reason: 'Defective stitching',
    date: '2024-01-17',
    status: 'approved',
    createdBy: 'Mohammad Hasan'
  },
  {
    id: 'PRET002',
    purchaseId: 'PUR002',
    supplierName: 'Bengal Fabrics Ltd',
    items: [
      {
        itemId: 'PROD006',
        itemType: 'product',
        itemName: 'Ladies Kurti',
        quantity: 3,
        purchasePrice: 1000,
        total: 3000
      }
    ],
    totalAmount: 3000,
    reason: 'Color mismatch',
    date: '2024-01-21',
    status: 'pending',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'PRET003',
    purchaseId: 'PUR009',
    supplierName: 'Packaging Solutions Ltd',
    items: [
      {
        itemId: 'PKG001',
        itemType: 'package',
        itemName: 'Standard Shipping Box',
        quantity: 20,
        purchasePrice: 1.20,
        total: 24.00
      }
    ],
    totalAmount: 24.00,
    reason: 'Damaged during transport',
    date: '2024-01-29',
    status: 'approved',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'PRET004',
    purchaseId: 'PUR010',
    supplierName: 'Mixed Suppliers',
    items: [
      {
        itemId: 'PKG004',
        itemType: 'package',
        itemName: 'Variable Gift Wrap Package',
        variationId: 'PKG004-V1',
        quantity: 10,
        purchasePrice: 1.75,
        total: 17.50
      }
    ],
    totalAmount: 17.50,
    reason: 'Wrong color variation',
    date: '2024-01-31',
    status: 'pending',
    createdBy: 'Mohammad Hasan'
  }
]

// Utility functions for purchase data
export const getSupplierById = (id: string): Supplier | undefined => {
  return mockSuppliers.find(supplier => supplier.id === id)
}

export const getPurchaseById = (id: string): Purchase | undefined => {
  return mockPurchases.find(purchase => purchase.id === id)
}

export const getPurchaseReturnById = (id: string): PurchaseReturn | undefined => {
  return mockPurchaseReturns.find(returnItem => returnItem.id === id)
}

// Mock Attributes Data
export const mockAttributes: Attribute[] = [
  {
    id: 'ATTR001',
    name: 'Size',
    slug: 'size',
    values: [
      { id: 'SIZE_S', value: 'Small', slug: 's' },
      { id: 'SIZE_M', value: 'Medium', slug: 'm' },
      { id: 'SIZE_L', value: 'Large', slug: 'l' },
      { id: 'SIZE_XL', value: 'Extra Large', slug: 'xl' },
    ],
    status: 'active',
    createdAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'ATTR002',
    name: 'Color',
    slug: 'color',
    values: [
      { id: 'COLOR_BLACK', value: 'Black', slug: 'black' },
      { id: 'COLOR_WHITE', value: 'White', slug: 'white' },
      { id: 'COLOR_BLUE', value: 'Blue', slug: 'blue' },
      { id: 'COLOR_RED', value: 'Red', slug: 'red' },
      { id: 'COLOR_GREEN', value: 'Green', slug: 'green' },
    ],
    status: 'active',
    createdAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'ATTR003',
    name: 'Material',
    slug: 'material',
    values: [
      { id: 'MAT_COTTON', value: 'Cotton', slug: 'cotton' },
      { id: 'MAT_POLYESTER', value: 'Polyester', slug: 'polyester' },
      { id: 'MAT_DENIM', value: 'Denim', slug: 'denim' },
      { id: 'MAT_SILK', value: 'Silk', slug: 'silk' },
    ],
    status: 'active',
    createdAt: '2024-01-15T10:00:00.000Z'
  }
]

// Mock Categories Data
export const mockCategories: Category[] = [
  {
    id: 'CAT001',
    name: 'Clothing',
    slug: 'clothing',
    description: 'All types of clothing items',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z'
  },
  {
    id: 'CAT002',
    name: "Men's Clothing",
    slug: 'mens-clothing',
    description: 'Clothing items for men',
    parentId: 'CAT001',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z'
  },
  {
    id: 'CAT003',
    name: "Women's Clothing",
    slug: 'womens-clothing',
    description: 'Clothing items for women',
    parentId: 'CAT001',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z'
  },
  {
    id: 'CAT004',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z'
  },
  {
    id: 'CAT005',
    name: 'Package',
    slug: 'package',
    description: 'Product bundles and packages',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z'
  },
  // Additional categories to match product categoryId values
  {
    id: 'CLOTHING',
    name: 'Clothing',
    slug: 'clothing-general',
    description: 'General clothing category',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z'
  },
  {
    id: 'PACKAGE',
    name: 'Package Products',
    slug: 'package-products',
    description: 'Product packages and bundles',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z'
  }
]

// Utility functions for attributes and categories
export const getAttributeById = (id: string): Attribute | undefined => {
  return mockAttributes.find(attr => attr.id === id)
}

export const getCategoryById = (id: string): Category | undefined => {
  return mockCategories.find(cat => cat.id === id)
}

// Mock Stock Movements
export const mockStockMovements: StockMovement[] = [
  {
    id: 'STK001',
    productId: 'PROD001',
    productName: 'Premium Cotton Punjabi',
    movementType: 'purchase',
    direction: 'in',
    quantity: 50,
    previousStock: 0,
    newStock: 50,
    referenceId: 'PUR001',
    reason: 'Initial stock purchase from Dhaka Textile Mills',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-17T10:00:00.000Z',
    notes: 'All items received in good condition'
  },
  {
    id: 'STK002',
    productId: 'PROD001',
    productName: 'Premium Cotton Punjabi',
    movementType: 'return',
    direction: 'out',
    quantity: 5,
    previousStock: 50,
    newStock: 45,
    referenceId: 'PRET001',
    reason: 'Return to supplier - defective stitching',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-17T14:30:00.000Z',
    notes: 'Defective batch returned to supplier'
  },
  {
    id: 'STK003',
    productId: 'PROD002',
    productName: 'Formal Shirt - White',
    movementType: 'purchase',
    direction: 'in',
    quantity: 30,
    previousStock: 0,
    newStock: 30,
    referenceId: 'PUR001',
    reason: 'Initial stock purchase from Dhaka Textile Mills',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-17T10:00:00.000Z'
  },
  {
    id: 'STK004',
    productId: 'PROD006',
    productName: 'Ladies Kurti',
    movementType: 'purchase',
    direction: 'in',
    quantity: 25,
    previousStock: 0,
    newStock: 25,
    referenceId: 'PUR002',
    reason: 'Partial delivery from Bengal Fabrics Ltd',
    createdBy: 'Ahmed Rahman',
    createdAt: '2024-01-20T09:15:00.000Z',
    notes: '15 pieces still pending delivery'
  },
  // Stock movements for variation product - Premium Cotton T-Shirt
  {
    id: 'STK005',
    productId: 'PROD013',
    productName: 'Premium Cotton T-Shirt',
    variationId: 'VAR013001',
    movementType: 'purchase',
    direction: 'in',
    quantity: 30,
    previousStock: 0,
    newStock: 30,
    referenceId: 'PUR003',
    reason: 'Initial stock purchase - Size S, Black',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-22T11:00:00.000Z',
    notes: 'Premium cotton t-shirts - good quality'
  },
  {
    id: 'STK006',
    productId: 'PROD013',
    productName: 'Premium Cotton T-Shirt',
    variationId: 'VAR013001',
    movementType: 'sale',
    direction: 'out',
    quantity: 5,
    previousStock: 30,
    newStock: 25,
    referenceId: 'SALE003',
    reason: 'Sale to customer',
    createdBy: 'Sales Team',
    createdAt: '2024-01-23T14:30:00.000Z'
  },
  {
    id: 'STK007',
    productId: 'PROD013',
    productName: 'Premium Cotton T-Shirt',
    variationId: 'VAR013002',
    movementType: 'purchase',
    direction: 'in',
    quantity: 25,
    previousStock: 0,
    newStock: 25,
    referenceId: 'PUR003',
    reason: 'Initial stock purchase - Size M, Black',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-22T11:00:00.000Z'
  },
  {
    id: 'STK008',
    productId: 'PROD013',
    productName: 'Premium Cotton T-Shirt',
    variationId: 'VAR013002',
    movementType: 'sale',
    direction: 'out',
    quantity: 7,
    previousStock: 25,
    newStock: 18,
    referenceId: 'SALE004',
    reason: 'Bulk sale to corporate client',
    createdBy: 'Sales Team',
    createdAt: '2024-01-24T10:15:00.000Z'
  },
  {
    id: 'STK009',
    productId: 'PROD013',
    productName: 'Premium Cotton T-Shirt',
    variationId: 'VAR013005',
    movementType: 'purchase',
    direction: 'in',
    quantity: 15,
    previousStock: 0,
    newStock: 15,
    referenceId: 'PUR004',
    reason: 'Restock - Size M, White',
    createdBy: 'Ahmed Rahman',
    createdAt: '2024-01-25T09:30:00.000Z'
  },
  {
    id: 'STK010',
    productId: 'PROD013',
    productName: 'Premium Cotton T-Shirt',
    variationId: 'VAR013005',
    movementType: 'sale',
    direction: 'out',
    quantity: 7,
    previousStock: 15,
    newStock: 8,
    referenceId: 'SALE005',
    reason: 'Regular sales',
    createdBy: 'Sales Team',
    createdAt: '2024-01-26T16:45:00.000Z'
  }
]

// Utility functions for stock movements
export const getStockMovementsByProductId = (productId: string): StockMovement[] => {
  return mockStockMovements.filter(movement => movement.productId === productId)
}

export const calculateCurrentStock = (productId: string): number => {
  const movements = getStockMovementsByProductId(productId)
  return movements.reduce((stock, movement) => {
    return movement.direction === 'in' ? stock + movement.quantity : stock - movement.quantity
  }, 0)
}

export const createStockMovement = (
  productId: string,
  productName: string,
  movementType: StockMovement['movementType'],
  direction: StockMovement['direction'],
  quantity: number,
  referenceId: string,
  reason: string,
  createdBy: string,
  notes?: string,
  variationId?: string
): StockMovement => {
  const previousStock = calculateCurrentStock(productId)
  const newStock = direction === 'in' ? previousStock + quantity : previousStock - quantity
  
  return {
    id: `STK${Date.now()}`,
    productId,
    productName,
    variationId,
    movementType,
    direction,
    quantity,
    previousStock,
    newStock,
    referenceId,
    reason,
    createdBy,
    createdAt: new Date().toISOString(),
    notes
  }
}

// Function to update product stock when purchase is received
export const processPurchaseReceival = (
  purchaseId: string,
  items: Array<{
    productId: string
    productName: string
    quantityReceived: number
  }>,
  createdBy: string
): StockMovement[] => {
  return items.map(item => 
    createStockMovement(
      item.productId,
      item.productName,
      'purchase',
      'in',
      item.quantityReceived,
      purchaseId,
      `Stock received from purchase order ${purchaseId}`,
      createdBy
    )
  )
}

// Function to process purchase returns
export const processPurchaseReturn = (
  returnId: string,
  items: Array<{
    productId: string
    productName: string
    quantityReturned: number
  }>,
  reason: string,
  createdBy: string
): StockMovement[] => {
  return items.map(item => 
    createStockMovement(
      item.productId,
      item.productName,
      'return',
      'out',
      item.quantityReturned,
      returnId,
      `Return: ${reason}`,
      createdBy
    )
  )
}

// Mock Packaging Data
export const mockPackagings: Packaging[] = [
  {
    id: 'PKG001',
    title: 'Standard Shipping Box',
    description: 'Medium-sized corrugated shipping box for general products',
    type: 'simple',
    sku: 'SBOX-MD-001',
    price: 2.50,
    buyingPrice: 1.20,
    stock: 25,
    boughtQuantity: 1000,
    warehouse: 'WH001',
    status: 'active',
    createdAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 'PKG002',
    title: 'Gift Wrap Packaging',
    description: 'Elegant gift wrapping options with ribbons',
    type: 'variable',
    warehouse: 'WH001',
    status: 'active',
    createdAt: '2024-01-10T10:00:00.000Z',
    selectedAttributes: ['PATTR001', 'PATTR003'], // Size and Color
    variations: [
      {
        id: 'PKG002-V1',
        sku: 'GIFT-SM-BLU',
        attributeValues: { 'PATTR001': 'SIZE_SMALL', 'PATTR003': 'COLOR_BLUE' },
        price: 3.50,
        buyingPrice: 1.75,
        stock: 8,
        boughtQuantity: 50
      },
      {
        id: 'PKG002-V2',
        sku: 'GIFT-SM-RED',
        attributeValues: { 'PATTR001': 'SIZE_SMALL', 'PATTR003': 'COLOR_RED' },
        price: 3.50,
        buyingPrice: 1.75,
        stock: 6,
        boughtQuantity: 50
      },
      {
        id: 'PKG002-V3',
        sku: 'GIFT-LG-BLU',
        attributeValues: { 'PATTR001': 'SIZE_LARGE', 'PATTR003': 'COLOR_BLUE' },
        price: 5.50,
        buyingPrice: 2.75,
        stock: 12,
        boughtQuantity: 50
      }
    ]
  },
  {
    id: 'PKG003',
    title: 'Eco-Friendly Mailer',
    description: 'Biodegradable mailer for sustainable shipping',
    type: 'simple',
    sku: 'ECO-MAIL-001',
    price: 1.80,
    buyingPrice: 0.90,
    stock: 15,
    boughtQuantity: 100,
    warehouse: 'WH001',
    status: 'active',
    createdAt: '2024-01-08T10:00:00.000Z'
  },
  {
    id: 'PKG004',
    title: 'Premium Gift Box',
    description: 'Luxury packaging for special occasions',
    type: 'variable',
    warehouse: 'WH002',
    status: 'active',
    createdAt: '2024-01-12T10:00:00.000Z',
    selectedAttributes: ['PATTR001', 'PATTR002'], // Size and Material
    variations: [
      {
        id: 'PKG004-V1',
        sku: 'PREM-SM-CARD',
        attributeValues: { 'PATTR001': 'SIZE_SMALL', 'PATTR002': 'MAT_CARDBOARD' },
        price: 4.50,
        buyingPrice: 2.25,
        stock: 15,
        boughtQuantity: 30
      },
      {
        id: 'PKG004-V2',
        sku: 'PREM-LG-CARD',
        attributeValues: { 'PATTR001': 'SIZE_LARGE', 'PATTR002': 'MAT_CARDBOARD' },
        price: 6.50,
        buyingPrice: 3.25,
        stock: 10,
        boughtQuantity: 20
      }
    ]
      },
      {
    id: 'PKG005',
    title: 'Express Envelope',
    description: 'Fast delivery envelope for documents and small items',
    type: 'simple',
    sku: 'EXP-ENV-001',
    price: 1.20,
    buyingPrice: 0.60,
    stock: 50,
    boughtQuantity: 200,
    warehouse: 'WH001',
    status: 'active',
    createdAt: '2024-01-20T10:00:00.000Z'
  },
  {
    id: 'PKG006',
    title: 'Bubble Wrap Package',
    description: 'Extra protection packaging with bubble wrap',
    type: 'simple',
    sku: 'BWR-PKG-001',
    price: 3.80,
    buyingPrice: 1.90,
    stock: 30,
    boughtQuantity: 100,
    warehouse: 'WH001',
    status: 'active',
    createdAt: '2024-01-18T10:00:00.000Z'
  },
  {
    id: 'PKG007',
    title: 'Customizable Box Set',
    description: 'Variable size boxes for different product types',
    type: 'variable',
    warehouse: 'WH001',
    status: 'active',
    createdAt: '2024-01-16T10:00:00.000Z',
    selectedAttributes: ['PATTR001', 'PATTR002'], // Size and Material
    variations: [
      {
        id: 'PKG007-V1',
        sku: 'CUST-SM-CORR',
        attributeValues: { 'PATTR001': 'SIZE_SMALL', 'PATTR002': 'MAT_CORRUGATED' },
        price: 2.80,
        buyingPrice: 1.40,
        stock: 25,
        boughtQuantity: 50
      },
      {
        id: 'PKG007-V2',
        sku: 'CUST-MD-CORR',
        attributeValues: { 'PATTR001': 'SIZE_MEDIUM', 'PATTR002': 'MAT_CORRUGATED' },
        price: 3.50,
        buyingPrice: 1.75,
        stock: 20,
        boughtQuantity: 40
      },
      {
        id: 'PKG007-V3',
        sku: 'CUST-LG-CORR',
        attributeValues: { 'PATTR001': 'SIZE_LARGE', 'PATTR002': 'MAT_CORRUGATED' },
        price: 4.20,
        buyingPrice: 2.10,
        stock: 18,
        boughtQuantity: 35
      }
    ]
  }
]

// Utility functions for packaging
export const getPackagingById = (id: string): Packaging | undefined => {
  return mockPackagings.find(pkg => pkg.id === id)
}

export const getActivePackagings = (): Packaging[] => {
  return mockPackagings.filter(pkg => pkg.status === 'active')
}

export const getPackagingsByWarehouse = (warehouseId: string): Packaging[] => {
  return mockPackagings.filter(pkg => pkg.warehouse === warehouseId && pkg.status === 'active')
}

// Mock Expense Types
export const mockExpenseTypes: ExpenseType[] = [
  {
    id: 'EXP_TYPE_001',
    name: 'Utilities',
    description: 'Electricity, water, gas bills',
    status: 'active',
    createdAt: '2024-01-01T10:00:00.000Z',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'EXP_TYPE_002',
    name: 'Transport',
    description: 'Vehicle fuel, maintenance, transportation costs',
    status: 'active',
    createdAt: '2024-01-01T10:00:00.000Z',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'EXP_TYPE_003',
    name: 'Office Supplies',
    description: 'Stationery, printing, office equipment',
    status: 'active',
    createdAt: '2024-01-01T10:00:00.000Z',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'EXP_TYPE_004',
    name: 'Marketing',
    description: 'Advertising, promotional materials, marketing campaigns',
    status: 'active',
    createdAt: '2024-01-01T10:00:00.000Z',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'EXP_TYPE_005',
    name: 'Rent',
    description: 'Office rent, warehouse rent',
    status: 'active',
    createdAt: '2024-01-01T10:00:00.000Z',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'EXP_TYPE_006',
    name: 'Communication',
    description: 'Internet, phone bills, communication services',
    status: 'active',
    createdAt: '2024-01-01T10:00:00.000Z',
    createdBy: 'Ahmed Rahman'
  },
  {
    id: 'EXP_TYPE_007',
    name: 'Maintenance',
    description: 'Equipment maintenance, repairs, servicing',
    status: 'inactive',
    createdAt: '2024-01-01T10:00:00.000Z',
    createdBy: 'Ahmed Rahman'
  }
]

// Mock Expenses
export const mockExpenses: Expense[] = [
  {
    id: 'EXP_001',
    expenseTypeId: 'EXP_TYPE_001',
    expenseTypeName: 'Utilities',
    amount: 15000,
    date: '2024-01-15',
    description: 'Monthly electricity bill for Dhaka warehouse',
    createdBy: 'Ahmed Rahman',
    createdAt: '2024-01-15T10:30:00.000Z'
  },
  {
    id: 'EXP_002',
    expenseTypeId: 'EXP_TYPE_002',
    expenseTypeName: 'Transport',
    amount: 8500,
    date: '2024-01-12',
    description: 'Fuel for delivery vehicles',
    createdBy: 'Fatima Khatun',
    createdAt: '2024-01-12T14:20:00.000Z'
  },
  {
    id: 'EXP_003',
    expenseTypeId: 'EXP_TYPE_003',
    expenseTypeName: 'Office Supplies',
    amount: 3200,
    date: '2024-01-10',
    description: 'Stationery and printing materials',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-10T09:15:00.000Z'
  },
  {
    id: 'EXP_004',
    expenseTypeId: 'EXP_TYPE_004',
    expenseTypeName: 'Marketing',
    amount: 25000,
    date: '2024-01-08',
    description: 'Facebook advertising campaign for new products',
    createdBy: 'Ahmed Rahman',
    createdAt: '2024-01-08T11:45:00.000Z'
  },
  {
    id: 'EXP_005',
    expenseTypeId: 'EXP_TYPE_005',
    expenseTypeName: 'Rent',
    amount: 45000,
    date: '2024-01-01',
    description: 'Monthly rent for Dhaka main warehouse',
    createdBy: 'Ahmed Rahman',
    createdAt: '2024-01-01T08:00:00.000Z'
  },
  {
    id: 'EXP_006',
    expenseTypeId: 'EXP_TYPE_006',
    expenseTypeName: 'Communication',
    amount: 4500,
    date: '2024-01-20',
    description: 'Internet and phone bills',
    createdBy: 'Fatima Khatun',
    createdAt: '2024-01-20T16:30:00.000Z'
  },
  {
    id: 'EXP_007',
    expenseTypeId: 'EXP_TYPE_002',
    expenseTypeName: 'Transport',
    amount: 12000,
    date: '2024-01-18',
    description: 'Vehicle maintenance and repairs',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-18T13:20:00.000Z'
  },
  {
    id: 'EXP_008',
    expenseTypeId: 'EXP_TYPE_001',
    expenseTypeName: 'Utilities',
    amount: 8200,
    date: '2024-01-22',
    description: 'Water bill for office premises',
    createdBy: 'Ahmed Rahman',
    createdAt: '2024-01-22T10:15:00.000Z'
  },
  {
    id: 'EXP_009',
    expenseTypeId: 'EXP_TYPE_003',
    expenseTypeName: 'Office Supplies',
    amount: 1850,
    date: '2024-01-25',
    description: 'Office equipment repair',
    createdBy: 'Fatima Khatun',
    createdAt: '2024-01-25T12:45:00.000Z'
  },
  {
    id: 'EXP_010',
    expenseTypeId: 'EXP_TYPE_004',
    expenseTypeName: 'Marketing',
    amount: 18000,
    date: '2024-01-28',
    description: 'Print advertising in local newspapers',
    createdBy: 'Mohammad Hasan',
    createdAt: '2024-01-28T15:30:00.000Z'
  }
]

// Utility functions for expenses
export const getExpenseById = (id: string): Expense | undefined => {
  return mockExpenses.find(expense => expense.id === id)
}

export const getExpenseTypeById = (id: string): ExpenseType | undefined => {
  return mockExpenseTypes.find(type => type.id === id)
}

export const getActiveExpenseTypes = (): ExpenseType[] => {
  return mockExpenseTypes.filter(type => type.status === 'active')
}

export const getExpensesByType = (expenseTypeId: string): Expense[] => {
  return mockExpenses.filter(expense => expense.expenseTypeId === expenseTypeId)
}

export const getExpensesByDateRange = (startDate: string, endDate: string): Expense[] => {
  return mockExpenses.filter(expense => expense.date >= startDate && expense.date <= endDate)
}

export const getTotalExpensesByType = (expenseTypeId: string): number => {
  return mockExpenses
    .filter(expense => expense.expenseTypeId === expenseTypeId)
    .reduce((total, expense) => total + expense.amount, 0)
}

export const getTotalExpenses = (): number => {
  return mockExpenses.reduce((total, expense) => total + expense.amount, 0)
}