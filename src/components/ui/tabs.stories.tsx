import type { Meta, StoryObj } from '@storybook/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Input } from './input'
import { Alert, AlertDescription } from './alert'
import { mockCustomers, mockProducts, mockOrders, mockNotifications } from '@/lib/mock-data/erp-data'
import { User, Package, ShoppingCart, Bell, Settings, BarChart3 } from 'lucide-react'

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Make changes to your account here. Click save when you&apos;re done.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <label htmlFor="name">Name</label>
              <Input id="name" defaultValue="Pedro Duarte" />
            </div>
            <div className="space-y-1">
              <label htmlFor="username">Username</label>
              <Input id="username" defaultValue="@peduarte" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password here. After saving, you&apos;ll be logged out.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <label htmlFor="current">Current password</label>
              <Input id="current" type="password" />
            </div>
            <div className="space-y-1">
              <label htmlFor="new">New password</label>
              <Input id="new" type="password" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

export const CustomerDetails: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[800px]">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Customer Overview
            </CardTitle>
            <CardDescription>
              Complete customer information and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {mockCustomers[0].name}</div>
                    <div><strong>Email:</strong> {mockCustomers[0].email}</div>
                    <div><strong>Company:</strong> {mockCustomers[0].company}</div>
                    <div><strong>Phone:</strong> {mockCustomers[0].phone}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Statistics</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Total Orders:</strong> {mockCustomers[0].totalOrders}</div>
                    <div><strong>Total Spent:</strong> ${mockCustomers[0].totalSpent.toLocaleString()}</div>
                    <div><strong>Status:</strong> <span className="capitalize">{mockCustomers[0].status}</span></div>
                    <div><strong>Member Since:</strong> {mockCustomers[0].joinDate}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="orders" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Customer Orders
            </CardTitle>
            <CardDescription>
              All orders placed by this customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-semibold">Order #{order.id}</h5>
                      <p className="text-sm text-muted-foreground">
                        {order.orderDate} • {order.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${order.total.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{order.products.length} items</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="settings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Customer Settings
            </CardTitle>
            <CardDescription>
              Manage customer preferences and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="notifications">Email Notifications</label>
              <select id="notifications" className="w-full p-2 border rounded">
                <option>All notifications</option>
                <option>Order updates only</option>
                <option>Disabled</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="currency">Preferred Currency</label>
              <select id="currency" className="w-full p-2 border rounded">
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>
            <Button>Save Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="activity" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest customer activity and interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockNotifications.slice(0, 3).map((notification) => (
                <Alert key={notification.id} variant={notification.type === 'error' ? 'destructive' : notification.type}>
                  <AlertDescription>
                    <strong>{notification.title}</strong> - {notification.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

export const ProductCatalog: Story = {
  render: () => (
    <Tabs defaultValue="all" className="w-[900px]">
      <TabsList>
        <TabsTrigger value="all">All Products</TabsTrigger>
        <TabsTrigger value="electronics">Electronics</TabsTrigger>
        <TabsTrigger value="furniture">Furniture</TabsTrigger>
        <TabsTrigger value="appliances">Appliances</TabsTrigger>
      </TabsList>
      
      <TabsContent value="all" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              All Products
            </CardTitle>
            <CardDescription>
              Complete product catalog across all categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {mockProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <h5 className="font-semibold">{product.name}</h5>
                  <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">${product.price}</span>
                    <span className="text-sm text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="electronics" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Electronics</CardTitle>
            <CardDescription>Electronic devices and components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {mockProducts.filter(p => p.category === 'Electronics').map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <h5 className="font-semibold">{product.name}</h5>
                  <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">${product.price}</span>
                    <span className="text-sm text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="furniture" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Furniture</CardTitle>
            <CardDescription>Office and home furniture items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {mockProducts.filter(p => p.category === 'Furniture').map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <h5 className="font-semibold">{product.name}</h5>
                  <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">${product.price}</span>
                    <span className="text-sm text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="appliances" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Appliances</CardTitle>
            <CardDescription>Kitchen and office appliances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {mockProducts.filter(p => p.category === 'Appliances').map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <h5 className="font-semibold">{product.name}</h5>
                  <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">${product.price}</span>
                    <span className="text-sm text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

export const DashboardAnalytics: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[1000px]">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="sales">Sales</TabsTrigger>
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>This Month</span>
                  <span className="font-bold">$45,231</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Month</span>
                  <span>$38,420</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Growth</span>
                  <span>+17.7%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Active Customers</span>
                  <span className="font-bold">1,234</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Products</span>
                  <span className="font-bold">892</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Orders</span>
                  <span className="font-bold">156</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      
      <TabsContent value="sales" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales Analytics</CardTitle>
            <CardDescription>Detailed sales performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Sales charts and analytics would be displayed here...</p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="customers" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer Analytics</CardTitle>
            <CardDescription>Customer behavior and segmentation data</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Customer analytics and insights would be displayed here...</p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="products" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
            <CardDescription>Top-selling products and inventory insights</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Product performance metrics would be displayed here...</p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="reports" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Custom Reports</CardTitle>
            <CardDescription>Generate and download custom reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button variant="outline" className="w-full">Generate Sales Report</Button>
              <Button variant="outline" className="w-full">Generate Customer Report</Button>
              <Button variant="outline" className="w-full">Generate Inventory Report</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
} 