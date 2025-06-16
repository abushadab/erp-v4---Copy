import * as React from "react"
import { Alert, AlertTitle, AlertDescription } from "./alert"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface NotificationProps {
  id?: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  onDismiss?: (id?: string) => void
  actionLabel?: string
  onAction?: () => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export const Notification = React.forwardRef<
  HTMLDivElement,
  NotificationProps
>(({ 
  id,
  type, 
  title, 
  message, 
  duration = 5000, 
  onDismiss, 
  actionLabel, 
  onAction,
  position = 'top-right',
  ...props 
}, ref) => {
  const [isVisible, setIsVisible] = React.useState(true)

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss?.(id)
    }, 300) // Wait for exit animation
  }

  if (!isVisible) return null

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4', 
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <div
      ref={ref}
      className={cn(
        "w-full transition-all duration-300 ease-in-out",
        isVisible ? "animate-in slide-in-from-top-2" : "animate-out slide-out-to-top-2"
      )}
      {...props}
    >
      <Alert 
        variant={type === 'error' ? 'destructive' : type} 
        className="shadow-lg border-2" 
        dismissible 
        onDismiss={handleDismiss}
      >
        <AlertTitle className="font-bold">{title}</AlertTitle>
        <AlertDescription>{message}
          {actionLabel && onAction && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onAction}
                className="h-8"
              >
                {actionLabel}
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
})
Notification.displayName = "Notification"

// Notification Container Component
export interface NotificationContainerProps {
  notifications: NotificationProps[]
  onDismiss: (id?: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onDismiss,
  position = 'top-right'
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <div className={cn(
        "absolute flex flex-col gap-2",
        position === 'top-right' && "top-4 right-4",
        position === 'top-left' && "top-4 left-4",
        position === 'bottom-right' && "bottom-4 right-4",
        position === 'bottom-left' && "bottom-4 left-4"
      )}>
        {notifications.map((notification, index) => (
          <div key={notification.id || index} className="pointer-events-auto w-96">
            <Notification
              {...notification}
              onDismiss={onDismiss}
              position={position}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<NotificationProps[]>([])

  const addNotification = React.useCallback((notification: Omit<NotificationProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { ...notification, id }])
  }, [])

  const removeNotification = React.useCallback((id?: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = React.useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods
  const success = React.useCallback((title: string, message: string, options?: Partial<NotificationProps>) => {
    addNotification({ type: 'success', title, message, ...options })
  }, [addNotification])

  const error = React.useCallback((title: string, message: string, options?: Partial<NotificationProps>) => {
    addNotification({ type: 'error', title, message, ...options })
  }, [addNotification])

  const warning = React.useCallback((title: string, message: string, options?: Partial<NotificationProps>) => {
    addNotification({ type: 'warning', title, message, ...options })
  }, [addNotification])

  const info = React.useCallback((title: string, message: string, options?: Partial<NotificationProps>) => {
    addNotification({ type: 'info', title, message, ...options })
  }, [addNotification])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  }
}