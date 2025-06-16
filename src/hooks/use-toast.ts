import * as React from "react"
import { useNotifications } from "@/components/ui/notification"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

export interface Toast extends ToastProps {
  id: string
}

export function useToast() {
  const { addNotification, removeNotification, clearAll, notifications } = useNotifications();

  const toast = React.useCallback(({ 
    title,
    description,
    variant = 'default',
    duration = 3000,
    action,
    actionLabel,
  }: ToastProps) => {
    addNotification({
      id: crypto.randomUUID(),
      title,
      message: description,
      type: variant,
      duration,
      action,
      actionLabel,
    });
  }, [addNotification]);

  const success = React.useCallback((messageOrOptions: string | {
    title?: string;
    description: string;
    duration?: number;
  }) => {
    if (typeof messageOrOptions === 'string') {
      addNotification({
        id: crypto.randomUUID(),
        title: 'Success',
        message: messageOrOptions,
        type: 'success',
        duration: 3000,
      });
    } else {
      addNotification({
        id: crypto.randomUUID(),
        title: messageOrOptions.title || 'Success',
        message: messageOrOptions.description,
        type: 'success',
        duration: messageOrOptions.duration || 3000,
      });
    }
  }, [addNotification]);

  const error = React.useCallback((messageOrOptions: string | {
    title?: string;
    description: string;
    duration?: number;
  }) => {
    if (typeof messageOrOptions === 'string') {
      addNotification({
        id: crypto.randomUUID(),
        title: 'Error',
        message: messageOrOptions,
        type: 'error',
        duration: 5000,
      });
    } else {
      addNotification({
        id: crypto.randomUUID(),
        title: messageOrOptions.title || 'Error',
        message: messageOrOptions.description,
        type: 'error',
        duration: messageOrOptions.duration || 5000,
      });
    }
  }, [addNotification]);

  const dismiss = React.useCallback((id: string) => {
    removeNotification(id);
  }, [removeNotification]);

  return {
    toast,
    success,
    error,
    dismiss,
    notifications,
    removeNotification,
    clearAll,
  };
}

// Export the main hook
export default useToast