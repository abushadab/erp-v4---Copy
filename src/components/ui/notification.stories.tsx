import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Button } from './button'
import { Notification, NotificationContainer, useNotifications } from './notification'
import { mockNotifications } from '@/lib/mock-data/erp-data'

const meta = {
  title: 'UI/Notification',
  component: Notification,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
    },
    position: {
      control: 'select',
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
    duration: {
      control: 'number',
    },
  },
  args: {
    onDismiss: fn(),
    onAction: fn(),
  },
} satisfies Meta<typeof Notification>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    type: 'success',
    title: 'Order Created Successfully',
    message: 'Your order #ORD-123 has been created and is being processed.',
  },
}

export const Error: Story = {
  args: {
    type: 'error',
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please check your payment details and try again.',
  },
}

export const Warning: Story = {
  args: {
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Product "Professional Laptop" is running low on stock. Only 3 units remaining.',
  },
}

export const Info: Story = {
  args: {
    type: 'info',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will begin at 2:00 AM EST. Expected downtime: 30 minutes.',
  },
}

export const WithAction: Story = {
  args: {
    type: 'warning',
    title: 'Unsaved Changes',
    message: 'You have unsaved changes that will be lost if you leave this page.',
    actionLabel: 'Save Changes',
    onAction: fn(),
  },
}

export const LongDuration: Story = {
  args: {
    type: 'info',
    title: 'Background Task Running',
    message: 'Your data export is being processed. This may take several minutes.',
    duration: 10000, // 10 seconds
  },
}

export const NoDismiss: Story = {
  args: {
    type: 'error',
    title: 'Critical System Error',
    message: 'A critical error has occurred. Please contact system administrator.',
    duration: 0, // Persistent notification
  },
}

// Interactive demo with hook
export const InteractiveDemo: Story = {
  render: () => {
    const notifications = useNotifications()

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => notifications.success(
              'Order Completed',
              'Order #ORD-001 has been successfully processed and shipped.'
            )}
            variant="default"
          >
            Show Success
          </Button>
          
          <Button
            onClick={() => notifications.error(
              'Payment Failed',
              'Payment for order #ORD-003 could not be processed.'
            )}
            variant="destructive"
          >
            Show Error
          </Button>
          
          <Button
            onClick={() => notifications.warning(
              'Low Stock Alert',
              'Standing Desk (SKU: DSK-STD-003) is out of stock.'
            )}
            variant="outline"
          >
            Show Warning
          </Button>
          
          <Button
            onClick={() => notifications.info(
              'New Customer Registration',
              'Mike Chen has registered and is pending approval.'
            )}
            variant="secondary"
          >
            Show Info
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => notifications.addNotification({
              type: 'success',
              title: 'Data Export Ready',
              message: 'Your customer data export is ready for download.',
              actionLabel: 'Download',
              onAction: () => alert('Download started!')
            })}
            variant="outline"
          >
            With Action Button
          </Button>
          
          <Button
            onClick={() => notifications.clearAll()}
            variant="ghost"
          >
            Clear All
          </Button>
        </div>

        <NotificationContainer
          notifications={notifications.notifications}
          onDismiss={notifications.removeNotification}
          position="top-right"
        />
      </div>
    )
  },
}

export const ERPNotifications: Story = {
  render: () => {
    const notifications = useNotifications()

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={() => {
              mockNotifications.forEach((notif, index) => {
                setTimeout(() => {
                  notifications.addNotification({
                    type: notif.type === 'error' ? 'error' : notif.type,
                    title: notif.title,
                    message: notif.message,
                    actionLabel: notif.actionUrl ? 'View Details' : undefined,
                    onAction: notif.actionUrl ? () => alert(`Navigate to ${notif.actionUrl}`) : undefined
                  })
                }, index * 500) // Stagger notifications
              })
            }}
          >
            Show ERP Notifications
          </Button>
          
          <Button
            onClick={() => notifications.clearAll()}
            variant="outline"
          >
            Clear All
          </Button>
        </div>

        <NotificationContainer
          notifications={notifications.notifications}
          onDismiss={notifications.removeNotification}
          position="top-right"
        />
      </div>
    )
  },
}

export const DifferentPositions: Story = {
  render: () => {
    const topRight = useNotifications()
    const topLeft = useNotifications()
    const bottomRight = useNotifications()
    const bottomLeft = useNotifications()

    return (
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => topRight.success('Top Right', 'Notification in top-right corner')}
        >
          Top Right
        </Button>
        
        <Button
          onClick={() => topLeft.info('Top Left', 'Notification in top-left corner')}
        >
          Top Left
        </Button>
        
        <Button
          onClick={() => bottomRight.warning('Bottom Right', 'Notification in bottom-right corner')}
        >
          Bottom Right
        </Button>
        
        <Button
          onClick={() => bottomLeft.error('Bottom Left', 'Notification in bottom-left corner')}
        >
          Bottom Left
        </Button>

        <NotificationContainer
          notifications={topRight.notifications}
          onDismiss={topRight.removeNotification}
          position="top-right"
        />
        
        <NotificationContainer
          notifications={topLeft.notifications}
          onDismiss={topLeft.removeNotification}
          position="top-left"
        />
        
        <NotificationContainer
          notifications={bottomRight.notifications}
          onDismiss={bottomRight.removeNotification}
          position="bottom-right"
        />
        
        <NotificationContainer
          notifications={bottomLeft.notifications}
          onDismiss={bottomLeft.removeNotification}
          position="bottom-left"
        />
      </div>
    )
  },
}

export const BusinessWorkflow: Story = {
  render: () => {
    const notifications = useNotifications()

    const simulateOrderWorkflow = () => {
      // Step 1: Order received
      notifications.info('Order Received', 'New order #ORD-124 has been received.')
      
      // Step 2: Payment processing
      setTimeout(() => {
        notifications.warning('Processing Payment', 'Payment is being processed for order #ORD-124.')
      }, 2000)
      
      // Step 3: Payment successful
      setTimeout(() => {
        notifications.success('Payment Confirmed', 'Payment for order #ORD-124 has been confirmed.')
      }, 4000)
      
      // Step 4: Preparing shipment
      setTimeout(() => {
        notifications.info('Preparing Shipment', 'Order #ORD-124 is being prepared for shipment.')
      }, 6000)
      
      // Step 5: Shipped
      setTimeout(() => {
        notifications.success(
          'Order Shipped',
          'Order #ORD-124 has been shipped. Tracking number: TRK123456789.',
          {
            actionLabel: 'Track Package',
            onAction: () => alert('Opening tracking page...')
          }
        )
      }, 8000)
    }

    return (
      <div className="space-y-4">
        <Button onClick={simulateOrderWorkflow}>
          Simulate Order Workflow
        </Button>
        
        <Button
          onClick={() => notifications.clearAll()}
          variant="outline"
        >
          Clear All
        </Button>

        <NotificationContainer
          notifications={notifications.notifications}
          onDismiss={notifications.removeNotification}
          position="top-right"
        />
      </div>
    )
  },
} 