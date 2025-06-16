import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Alert, AlertTitle, AlertDescription } from './alert'
import { mockNotifications } from '@/lib/mock-data/erp-data'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'success', 'warning', 'info'],
    },
    dismissible: {
      control: 'boolean',
    },
  },
  args: { 
    onDismiss: fn(),
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>Default Alert</AlertTitle>
      <AlertDescription>
        This is a default alert message for general information.
      </AlertDescription>
    </Alert>
  ),
}

export const Success: Story = {
  render: (args) => (
    <Alert variant="success" {...args}>
      <AlertTitle>Success!</AlertTitle>
      <AlertDescription>
        {mockNotifications[0].message}
      </AlertDescription>
    </Alert>
  ),
}

export const Error: Story = {
  render: (args) => (
    <Alert variant="destructive" {...args}>
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {mockNotifications[3].message}
      </AlertDescription>
    </Alert>
  ),
}

export const Warning: Story = {
  render: (args) => (
    <Alert variant="warning" {...args}>
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        {mockNotifications[1].message}
      </AlertDescription>
    </Alert>
  ),
}

export const Info: Story = {
  render: (args) => (
    <Alert variant="info" {...args}>
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        {mockNotifications[2].message}
      </AlertDescription>
    </Alert>
  ),
}

export const Dismissible: Story = {
  render: (args) => (
    <Alert variant="success" dismissible {...args}>
      <AlertTitle>Dismissible Alert</AlertTitle>
      <AlertDescription>
        This alert can be dismissed by clicking the X button.
      </AlertDescription>
    </Alert>
  ),
}

export const WithoutTitle: Story = {
  render: (args) => (
    <Alert variant="info" {...args}>
      <AlertDescription>
        This is an alert without a title, just a description.
      </AlertDescription>
    </Alert>
  ),
}

export const LongContent: Story = {
  render: (args) => (
    <Alert variant="warning" dismissible {...args}>
      <AlertTitle>System Maintenance Notice</AlertTitle>
      <AlertDescription>
        We will be performing scheduled maintenance on our servers from 2:00 AM to 4:00 AM EST on Sunday, January 28th. 
        During this time, you may experience temporary interruptions in service. We apologize for any inconvenience and 
        appreciate your patience as we work to improve our system performance.
      </AlertDescription>
    </Alert>
  ),
}

export const ERPNotifications: Story = {
  render: () => (
    <div className="space-y-4 w-[500px]">
      {mockNotifications.map((notification) => (
        <Alert 
          key={notification.id} 
          variant={notification.type === 'error' ? 'destructive' : notification.type} 
          dismissible
        >
          <AlertTitle>{notification.title}</AlertTitle>
          <AlertDescription>
            {notification.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  ),
} 