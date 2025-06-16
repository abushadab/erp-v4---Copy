import type { Meta, StoryObj } from '@storybook/react'
import { AnimatedCard } from '@/components/animations/animated-card'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Users, Package } from 'lucide-react'

const meta: Meta<typeof AnimatedCard> = {
  title: 'Animations/AnimatedCard',
  component: AnimatedCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A card component with hover animations using Framer Motion.'
      }
    }
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disable hover animations'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    }
  }
}

export default meta
type Story = StoryObj<typeof AnimatedCard>

export const Default: Story = {
  args: {
    disabled: false,
    className: 'w-80'
  },
  render: (args) => (
    <AnimatedCard {...args}>
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
  )
}

export const StatCards: Story = {
  args: {
    disabled: false
  },
  render: (args) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full max-w-4xl">
      <AnimatedCard {...args} className="w-full">
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

      <AnimatedCard {...args} className="w-full">
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

      <AnimatedCard {...args} className="w-full">
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

      <AnimatedCard {...args} className="w-full">
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
    </div>
  )
}

export const Disabled: Story = {
  args: {
    disabled: true,
    className: 'w-80'
  },
  render: (args) => (
    <AnimatedCard {...args}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Disabled Card</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">No Animation</div>
        <p className="text-xs text-muted-foreground">
          This card has animations disabled
        </p>
      </CardContent>
    </AnimatedCard>
  )
} 