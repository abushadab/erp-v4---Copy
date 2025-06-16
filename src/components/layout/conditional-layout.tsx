"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

const authRoutes = ['/login', '/signup', '/auth', '/reset-password', '/verify-email']

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Check if current path is an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // If it's an auth route, render children without sidebar
  if (isAuthRoute) {
    return <>{children}</>
  }
  
  // Otherwise, render with sidebar
  return (
    <Sidebar>
      {children}
    </Sidebar>
  )
} 