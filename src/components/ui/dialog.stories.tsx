import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Button } from './button'
import { Input } from './input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import { mockCustomers, mockProducts } from '@/lib/mock-data/erp-data'

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a basic dialog example with standard content.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p>This is the main content area of the dialog.</p>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const AddCustomer: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add New Customer</Button>
      </DialogTrigger>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter customer information to create a new customer record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right">
              Name
            </label>
            <Input id="name" placeholder="Customer name" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="email" className="text-right">
              Email
            </label>
            <Input id="email" type="email" placeholder="customer@email.com" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="company" className="text-right">
              Company
            </label>
            <Input id="company" placeholder="Company name" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="phone" className="text-right">
              Phone
            </label>
            <Input id="phone" placeholder="+1 (555) 123-4567" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Create Customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const ProductDetails: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">View Product Details</Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{mockProducts[0].name}</DialogTitle>
          <DialogDescription>
            SKU: {mockProducts[0].sku} | Category: {mockProducts[0].category}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Product Information</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Price:</strong> ${mockProducts[0].price}</div>
                <div><strong>Stock:</strong> {mockProducts[0].stock} units</div>
                <div><strong>Status:</strong> {mockProducts[0].status}</div>
                <div><strong>Supplier:</strong> {mockProducts[0].supplier}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {mockProducts[0].description}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Edit Product</Button>
          <Button>Add to Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const ConfirmationDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Customer</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the customer
            &quot;{mockCustomers[0].name}&quot; and remove all associated data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete Customer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const LargeContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">View Order Details</Button>
      </DialogTrigger>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Order Details - ORD001</DialogTitle>
          <DialogDescription>
            Complete order information and product breakdown
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Customer Information</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {mockCustomers[0].name}</div>
                <div><strong>Email:</strong> {mockCustomers[0].email}</div>
                <div><strong>Company:</strong> {mockCustomers[0].company}</div>
                <div><strong>Phone:</strong> {mockCustomers[0].phone}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Order Information</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Order Date:</strong> January 20, 2024</div>
                <div><strong>Status:</strong> Processing</div>
                <div><strong>Payment:</strong> Credit Card</div>
                <div><strong>Total:</strong> $2,659.96</div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Products</h4>
            <div className="border rounded-lg">
              <div className="grid grid-cols-4 gap-4 p-3 border-b bg-muted/50 font-medium text-sm">
                <div>Product</div>
                <div>Quantity</div>
                <div>Price</div>
                <div>Total</div>
              </div>
              <div className="grid grid-cols-4 gap-4 p-3 text-sm">
                <div>Professional Laptop</div>
                <div>2</div>
                <div>$1,299.99</div>
                <div>$2,599.98</div>
              </div>
              <div className="grid grid-cols-4 gap-4 p-3 text-sm border-t">
                <div>Wireless Mouse</div>
                <div>2</div>
                <div>$29.99</div>
                <div>$59.98</div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Print Invoice</Button>
          <Button variant="outline">Update Status</Button>
          <Button>Process Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const FullScreen: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Full Screen</Button>
      </DialogTrigger>
      <DialogContent size="full">
        <DialogHeader>
          <DialogTitle>Full Screen Dialog</DialogTitle>
          <DialogDescription>
            This dialog takes up most of the screen real estate
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 py-4">
          <p>This is a full-screen dialog that can be used for complex forms or detailed views.</p>
          <p className="mt-4">Content here would typically be a complex form, data table, or detailed view that requires maximum screen space.</p>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} 