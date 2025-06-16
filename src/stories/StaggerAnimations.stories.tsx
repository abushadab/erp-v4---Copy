import type { Meta, StoryObj } from '@storybook/react'
import { StaggerContainer, StaggerItem } from '@/components/animations/stagger-container'
import { AnimatedCard } from '@/components/animations/animated-card'
import { AnimatedButton } from '@/components/animations/animated-button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Users, Package, Plus, Download } from 'lucide-react'

const meta: Meta<typeof StaggerContainer> = {
  title: 'Animations/StaggerAnimations',
  component: StaggerContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Stagger animations for lists and grids using Framer Motion.'
      }
    }
  },
  argTypes: {
    delay: {
      control: { type: 'range', min: 0.01, max: 0.5, step: 0.01 },
      description: 'Delay between staggered items'
    }
  }
}

export default meta
type Story = StoryObj<typeof StaggerContainer>

export const BasicStagger: Story = {
  args: {
    delay: 0.1
  },
  render: (args) => (
    <div className="p-8">
      <StaggerContainer {...args} className="space-y-4">
        <StaggerItem>
          <div className="p-4 bg-primary/10 rounded-lg">Item 1</div>
        </StaggerItem>
        <StaggerItem>
          <div className="p-4 bg-primary/10 rounded-lg">Item 2</div>
        </StaggerItem>
        <StaggerItem>
          <div className="p-4 bg-primary/10 rounded-lg">Item 3</div>
        </StaggerItem>
        <StaggerItem>
          <div className="p-4 bg-primary/10 rounded-lg">Item 4</div>
        </StaggerItem>
        <StaggerItem>
          <div className="p-4 bg-primary/10 rounded-lg">Item 5</div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  )
}

export const StatisticsCards: Story = {
  args: {
    delay: 0.05
  },
  render: (args) => (
    <div className="p-8">
      <StaggerContainer {...args}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <AnimatedCard>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  +20.1% from last month
                </p>
              </CardContent>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem>
            <AnimatedCard>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,543</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  +12.5% from last month
                </p>
              </CardContent>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem>
            <AnimatedCard>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  +5.2% from last month
                </p>
              </CardContent>
            </AnimatedCard>
          </StaggerItem>

          <StaggerItem>
            <AnimatedCard>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,234</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  +19% from last month
                </p>
              </CardContent>
            </AnimatedCard>
          </StaggerItem>
        </div>
      </StaggerContainer>
    </div>
  )
}

export const RecentSales: Story = {
  args: {
    delay: 0.08
  },
  render: (args) => (
    <div className="p-8 max-w-2xl">
      <AnimatedCard>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Latest sales transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <StaggerContainer {...args} className="space-y-4">
            {[
              { id: 'SALE001', customer: 'John Doe', amount: 1250.00, status: 'completed' },
              { id: 'SALE002', customer: 'Sarah Johnson', amount: 890.50, status: 'pending' },
              { id: 'SALE003', customer: 'Mike Chen', amount: 2150.00, status: 'completed' },
              { id: 'SALE004', customer: 'Emily Davis', amount: 675.25, status: 'completed' },
              { id: 'SALE005', customer: 'Alex Wilson', amount: 1890.00, status: 'pending' }
            ].map((sale) => (
              <StaggerItem key={sale.id}>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Sale #{sale.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.customer} • Today
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${sale.amount.toFixed(2)}</div>
                    <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                      {sale.status}
                    </Badge>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </CardContent>
      </AnimatedCard>
    </div>
  )
}

export const QuickActions: Story = {
  args: {
    delay: 0.1
  },
  render: (args) => (
    <div className="p-8 max-w-4xl">
      <AnimatedCard>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <StaggerContainer {...args}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <StaggerItem>
                <AnimatedButton variant="outline" className="h-20 flex-col">
                  <Plus className="h-6 w-6 mb-2" />
                  Add Product
                </AnimatedButton>
              </StaggerItem>
              <StaggerItem>
                <AnimatedButton variant="outline" className="h-20 flex-col">
                  <DollarSign className="h-6 w-6 mb-2" />
                  New Sale
                </AnimatedButton>
              </StaggerItem>
              <StaggerItem>
                <AnimatedButton variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  Export Data
                </AnimatedButton>
              </StaggerItem>
              <StaggerItem>
                <AnimatedButton variant="outline" className="h-20 flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  Add Customer
                </AnimatedButton>
              </StaggerItem>
            </div>
          </StaggerContainer>
        </CardContent>
      </AnimatedCard>
    </div>
  )
} 