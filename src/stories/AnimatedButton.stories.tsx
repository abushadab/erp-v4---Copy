import type { Meta, StoryObj } from '@storybook/react'
import { AnimatedButton } from '@/components/animations/animated-button'
import { Plus, Download, Settings, Trash2 } from 'lucide-react'

const meta: Meta<typeof AnimatedButton> = {
  title: 'Animations/AnimatedButton',
  component: AnimatedButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A button component with hover and tap animations using Framer Motion.'
      }
    }
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disable button and animations'
    },
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Button variant'
    },
    size: {
      control: 'select', 
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Button size'
    }
  }
}

export default meta
type Story = StoryObj<typeof AnimatedButton>

export const Default: Story = {
  args: {
    disabled: false,
    variant: 'default',
    size: 'default',
    children: 'Animated Button'
  }
}

export const WithIcon: Story = {
  args: {
    disabled: false,
    variant: 'default',
    size: 'default',
    children: (
      <>
        <Plus className="mr-2 h-4 w-4" />
        Add Item
      </>
    )
  }
}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <AnimatedButton variant="default">
        <Plus className="mr-2 h-4 w-4" />
        Default
      </AnimatedButton>
      <AnimatedButton variant="destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        Destructive
      </AnimatedButton>
      <AnimatedButton variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Outline
      </AnimatedButton>
      <AnimatedButton variant="secondary">
        <Settings className="mr-2 h-4 w-4" />
        Secondary
      </AnimatedButton>
      <AnimatedButton variant="ghost">
        Ghost
      </AnimatedButton>
      <AnimatedButton variant="link">
        Link
      </AnimatedButton>
    </div>
  )
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <AnimatedButton size="sm">
        Small
      </AnimatedButton>
      <AnimatedButton size="default">
        Default
      </AnimatedButton>
      <AnimatedButton size="lg">
        Large
      </AnimatedButton>
      <AnimatedButton size="icon">
        <Settings className="h-4 w-4" />
      </AnimatedButton>
    </div>
  )
}

export const Disabled: Story = {
  args: {
    disabled: true,
    variant: 'default',
    size: 'default',
    children: (
      <>
        <Plus className="mr-2 h-4 w-4" />
        Disabled Button
      </>
    )
  }
}

export const QuickActions: Story = {
  render: () => (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 max-w-4xl">
      <AnimatedButton variant="outline" className="h-20 flex-col">
        <Plus className="h-6 w-6 mb-2" />
        Add Product
      </AnimatedButton>
      <AnimatedButton variant="outline" className="h-20 flex-col">
        <Download className="h-6 w-6 mb-2" />
        Export Data
      </AnimatedButton>
      <AnimatedButton variant="outline" className="h-20 flex-col">
        <Settings className="h-6 w-6 mb-2" />
        Settings
      </AnimatedButton>
      <AnimatedButton variant="outline" className="h-20 flex-col">
        <Trash2 className="h-6 w-6 mb-2" />
        Delete Items
      </AnimatedButton>
    </div>
  )
} 