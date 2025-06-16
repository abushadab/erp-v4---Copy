import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from '@storybook/test'
import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import AddSale from '@/components/sales/AddSale'

const meta = {
  title: 'Sales/AddSale',
  component: AddSale,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## AddSale Component

A comprehensive Point of Sale (POS) interface for clothing retail in Bangladesh. Features include:

- **Warehouse Selection**: Choose from active warehouses across Bangladesh
- **Product Search & Grid**: Responsive display of clothing items (punjabi, shirts, t-shirts, pants)
- **Cart Management**: Add/remove items with quantity controls
- **Stock Management**: Real-time stock tracking with virtual stock for package products
- **Success Page**: Beautiful success confirmation with sale summary in BDT
- **Responsive Design**: Mobile-first approach with sidebar cart on desktop
- **Animations**: Smooth Framer Motion transitions
- **Form Validation**: React Hook Form with Zod schema validation

### Product Types
- **Simple Products**: Individual clothing items (punjabi, shirts, t-shirts, pants)
- **Package Products**: Clothing bundles with virtual stock calculation

### Key Features
- Virtual stock calculation for package products
- Revenue and profit calculations in BDT (৳)
- Mobile-responsive design with collapsible cart
- Success page with print receipt option
- Form validation and error handling
- Smooth animations and transitions
- Bangladeshi warehouse locations (Dhaka, Chittagong, Sylhet, Rajshahi)
        `
      }
    }
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AddSale>

export default meta
type Story = StoryObj<typeof meta>

// Default story
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default state of the AddSale component. Select a warehouse to begin adding products to the cart.'
      }
    }
  }
}

// Story with warehouse selected
export const WithWarehouseSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Select warehouse
    const warehouseSelect = canvas.getByRole('combobox')
    await userEvent.click(warehouseSelect)
    
    // Wait for options to appear
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const warehouseOption = canvas.getByText(/Main Warehouse/)
    await userEvent.click(warehouseOption)
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the component with a warehouse selected, displaying available products in a responsive grid.'
      }
    }
  }
}

// Story with search functionality
export const WithProductSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Select warehouse first
    const warehouseSelect = canvas.getByRole('combobox')
    await userEvent.click(warehouseSelect)
    await new Promise(resolve => setTimeout(resolve, 100))
    const warehouseOption = canvas.getByText(/Main Warehouse/)
    await userEvent.click(warehouseOption)
    
    // Wait for products to load
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Search for products
    const searchInput = canvas.getByPlaceholderText(/Search products/)
    await userEvent.type(searchInput, 'coffee')
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the product search functionality. Type in the search box to filter products by name, SKU, or description.'
      }
    }
  }
}

// Story with package products
export const WithPackageProducts: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Select warehouse
    const warehouseSelect = canvas.getByRole('combobox')
    await userEvent.click(warehouseSelect)
    await new Promise(resolve => setTimeout(resolve, 100))
    const warehouseOption = canvas.getByText(/Main Warehouse/)
    await userEvent.click(warehouseOption)
    
    // Wait for products to load
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Search for package products
    const searchInput = canvas.getByPlaceholderText(/Search products/)
    await userEvent.type(searchInput, 'package')
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows package products with virtual stock calculation. Package products show "virtual" stock based on the minimum available quantity of included items.'
      }
    }
  }
}

// Story with items in cart
export const WithItemsInCart: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Select warehouse
    const warehouseSelect = canvas.getByRole('combobox')
    await userEvent.click(warehouseSelect)
    await new Promise(resolve => setTimeout(resolve, 100))
    const warehouseOption = canvas.getByText(/Main Warehouse/)
    await userEvent.click(warehouseOption)
    
    // Wait for products to load
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Add items to cart
    const addButtons = canvas.getAllByText(/Add to Cart/)
    if (addButtons.length > 0) {
      await userEvent.click(addButtons[0])
      await new Promise(resolve => setTimeout(resolve, 100))
      if (addButtons.length > 1) {
        await userEvent.click(addButtons[1])
      }
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the cart functionality with items added. The cart sidebar (desktop) shows item details, quantities, and totals.'
      }
    }
  }
}

// Story for form validation
export const FormValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Try to submit without selecting warehouse
    const completeButton = canvas.queryByText(/Complete Sale/)
    if (completeButton) {
      await userEvent.click(completeButton)
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates form validation. Try submitting the form without selecting a warehouse or adding items to see validation errors.'
      }
    }
  }
}

// Story for mobile responsive design
export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Mobile responsive view showing the compact cart summary above products and optimized layout for small screens.'
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Select warehouse
    const warehouseSelect = canvas.getByRole('combobox')
    await userEvent.click(warehouseSelect)
    await new Promise(resolve => setTimeout(resolve, 100))
    const warehouseOption = canvas.getByText(/Main Warehouse/)
    await userEvent.click(warehouseOption)
  }
}

// Story with animations
export const WithAnimations: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Select warehouse to trigger animations
    const warehouseSelect = canvas.getByRole('combobox')
    await userEvent.click(warehouseSelect)
    await new Promise(resolve => setTimeout(resolve, 100))
    const warehouseOption = canvas.getByText(/Main Warehouse/)
    await userEvent.click(warehouseOption)
    
    // Wait to see product grid animation
    await new Promise(resolve => setTimeout(resolve, 500))
  },
  parameters: {
    docs: {
      description: {
        story: 'Showcases the smooth Framer Motion animations when products load and items are added to cart.'
      }
    }
  }
}

// Story for stock management
export const StockManagement: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Select warehouse
    const warehouseSelect = canvas.getByRole('combobox')
    await userEvent.click(warehouseSelect)
    await new Promise(resolve => setTimeout(resolve, 100))
    const warehouseOption = canvas.getByText(/Main Warehouse/)
    await userEvent.click(warehouseOption)
    
    // Wait for products to load
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Add multiple quantities to demonstrate stock limits
    const addButtons = canvas.getAllByText(/Add to Cart/)
    if (addButtons.length > 0) {
      await userEvent.click(addButtons[0])
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Try to add more to test stock limits
      const plusButtons = canvas.getAllByLabelText(/Increase quantity/)
      if (plusButtons.length > 0) {
        await userEvent.click(plusButtons[0])
        await userEvent.click(plusButtons[0])
      }
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates stock management features. Add multiple quantities to see stock limits and how package products calculate virtual stock.'
      }
    }
  }
}

// New Story for Success State
export const SuccessState: Story = {
  render: () => {
    // Mock a successful sale by directly showing success state
    const MockAddSaleWithSuccess = () => {
      const [showSuccess, setShowSuccess] = React.useState(true)
      const [saleResult] = React.useState({
        success: true,
        message: 'Sale completed successfully!',
        revenue: 12999.99,
        profit: 2999.99,
        items: [
          { productId: '1', quantity: 1, product: { name: 'Premium Cotton Punjabi' }, total: 8999.99 },
          { productId: '2', quantity: 2, product: { name: 'Formal Office Set - Men' }, total: 4000.00 }
        ]
      })

      const SuccessPage = () => (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center min-h-[60vh]"
        >
          {/* Success page content would go here */}
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Sale Completed Successfully!
            </h2>
            <p className="text-muted-foreground mb-6">
              Revenue: ৳{saleResult.revenue?.toFixed(2)} | Profit: ৳{saleResult.profit?.toFixed(2)}
            </p>
          </div>
        </motion.div>
      )

      return showSuccess ? <SuccessPage /> : <AddSale />
    }

    return <MockAddSaleWithSuccess />
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the beautiful success page that appears after completing a sale, with animated icons and sale summary.'
      }
    }
  }
} 