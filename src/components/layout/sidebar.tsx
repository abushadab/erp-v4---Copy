"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Search, 
  User, 
  LogOut, 
  Settings as SettingsIcon,
  LayoutDashboard,
  Warehouse,
  Package,
  DollarSign,
  RotateCcw,
  BookOpen,
  Users,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  UserCheck,
  ShoppingBag,
  Truck,
  UserPlus,
  Settings,
  Home,
  ArrowLeft,
  Plus,
  CreditCard,
  Box,
  Receipt,
  Shield,
  FileText,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { UserProfile } from "./user-profile"

interface NavItem {
  name: string
  href?: string
  icon: any
  submenu?: {
    name: string
    href: string
    icon: any
  }[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { 
    name: 'Products', 
    href: '/products', 
    icon: Package,
    submenu: [
      { name: 'Add Product', href: '/products/add', icon: Package },
      { name: 'Attributes', href: '/products/attributes', icon: Settings },
      { name: 'Categories', href: '/products/categories', icon: BookOpen },
    ]
  },
  { 
    name: 'Packaging', 
    href: '/packaging', 
    icon: Box,
    submenu: [
      { name: 'Add Packaging', href: '/packaging/add', icon: Plus },
      { name: 'Packaging Attributes', href: '/packaging/attributes', icon: Settings },
    ]
  },
  { 
    name: 'Purchases', 
    href: '/purchases',
    icon: ShoppingBag,
    submenu: [
      { name: 'Create Purchase', href: '/purchases/add', icon: ShoppingCart },
      { name: 'Suppliers', href: '/purchases/suppliers', icon: UserPlus },
    ]
  },
  { 
    name: 'Expenses', 
    href: '/expenses',
    icon: Receipt,
    submenu: [
      { name: 'Expense Types', href: '/expenses/types', icon: Settings },
    ]
  },
  { 
    name: 'Sales', 
    href: '/sales',
    icon: DollarSign,
    submenu: [
      { name: 'New Sale', href: '/sales/new', icon: ShoppingCart },
      { name: 'Customers', href: '/sales/customers', icon: UserCheck },
      { name: 'Returns', href: '/sales/returns', icon: RotateCcw },
    ]
  },
  { 
    name: 'Logs', 
    href: '/logs/activity', 
    icon: FileText,
    submenu: [
      { name: 'Activity Logs', href: '/logs/activity', icon: Activity },
      { name: 'Stock Movements', href: '/logs/stock-movements', icon: RotateCcw },
    ]
  },
  { 
    name: 'Accounts', 
    href: '/accounts', 
    icon: BookOpen,
    submenu: [
      { name: 'Chart of Accounts', href: '/accounts', icon: BookOpen },
      { name: 'Transactions', href: '/transactions', icon: CreditCard },
    ]
  },
  { 
    name: 'Users', 
    href: '/users', 
    icon: Users,
    submenu: [
      { name: 'User Management', href: '/users', icon: Users },
      { name: 'Role Management', href: '/roles', icon: Shield },
    ]
  },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
]

const sidebarVariants = {
  closed: {
    x: '-100%',
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeInOut'
    }
  },
  open: {
    x: 0,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeInOut'
    }
  },
  desktop: {
    x: 0,
    transition: {
      duration: 0
    }
  }
}

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>([]) // Empty by default
  const [isSticky, setIsSticky] = React.useState(false)
  const supabase = createClient()

  // First useEffect to set mounted state
  React.useEffect(() => {
    console.log('🚀 Sidebar mounting, setting mounted to true')
    setMounted(true)
  }, [])

  // Second useEffect for scroll detection
  React.useEffect(() => {
    
    // Check if it's desktop size
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    
    // Use a ref to track main content and add scroll listener
    let mainContentElement: HTMLElement | null = null
    
    const handleMainScroll = () => {
      if (mainContentElement) {
        const scrolled = mainContentElement.scrollTop > 0
        setIsSticky(scrolled)
      }
    }
    
    // Find and attach to main content scroll - use a more targeted approach
    const findAndAttachScroll = () => {
      // Try to find the main content element
      const main = document.querySelector('main') as HTMLElement
      
      if (main && main.classList.contains('overflow-auto')) {
        mainContentElement = main
        main.addEventListener('scroll', handleMainScroll, { passive: true })
        return true
      }
      return false
    }
    
    // Try immediately
    if (!findAndAttachScroll()) {
      // If not found, retry after DOM is ready
      const timeoutId = setTimeout(() => {
        findAndAttachScroll()
      }, 100)
      
      return () => {
        window.removeEventListener('resize', checkDesktop)
        if (mainContentElement) {
          mainContentElement.removeEventListener('scroll', handleMainScroll)
        }
        clearTimeout(timeoutId)
      }
    }
    
    return () => {
      window.removeEventListener('resize', checkDesktop)
      if (mainContentElement) {
        mainContentElement.removeEventListener('scroll', handleMainScroll)
      }
    }
  }, [mounted])

  // Auto-expand Sales menu if user is on any sales-related page
  React.useEffect(() => {
    if (pathname.startsWith('/sales/') || pathname.startsWith('/returns')) {
      setExpandedMenus(prev => prev.includes('Sales') ? prev : [...prev, 'Sales'])
    }
    if (pathname.startsWith('/purchases/')) {
      setExpandedMenus(prev => prev.includes('Purchases') ? prev : [...prev, 'Purchases'])
    }
    if (pathname.startsWith('/products/') && !pathname.startsWith('/products/stock-movements')) {
      setExpandedMenus(prev => prev.includes('Products') ? prev : [...prev, 'Products'])
    }
    if (pathname.startsWith('/expenses/')) {
      setExpandedMenus(prev => prev.includes('Expenses') ? prev : [...prev, 'Expenses'])
    }
    if (pathname.startsWith('/accounts') || pathname.startsWith('/transactions')) {
      setExpandedMenus(prev => prev.includes('Accounts') ? prev : [...prev, 'Accounts'])
    }
    if (pathname.startsWith('/logs/')) {
      setExpandedMenus(prev => prev.includes('Logs') ? prev : [...prev, 'Logs'])
    }
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)  // Close this menu
        : [menuName]  // Close all others and open only this one
    )
  }

  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName)

  // Prevent hydration mismatch
   if (!mounted) {
    return (
      <div className="flex h-screen bg-background">
        {/* Sidebar Skeleton - Hidden on mobile, shown on lg+ screens */}
        <div className="hidden lg:block w-64 bg-background border-r" suppressHydrationWarning>
          <div className="flex flex-col h-full">
            {/* Logo Skeleton */}
            <div className="flex items-center justify-between px-6 py-4" style={{ minHeight: '72px' }} suppressHydrationWarning>
              <div className="h-6 w-24 rounded-md animate-pulse" style={{ backgroundColor: '#e2e8f0' }}></div>
            </div>

            {/* Navigation Skeleton */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-9 w-full rounded-md animate-pulse" style={{ backgroundColor: '#e2e8f0' }}></div>
              ))}
            </nav>


          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar Skeleton */}
          <header className="px-6 py-4 lg:px-8" style={{ backgroundColor: '#f4f8f9', minHeight: '76px' }} suppressHydrationWarning>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-5 w-5 rounded-md animate-pulse lg:hidden" style={{ backgroundColor: '#e2e8f0' }}></div>
                <div className="h-9 w-64 lg:w-96 rounded-md animate-pulse" style={{ backgroundColor: '#e2e8f0' }}></div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Notifications Skeleton */}
                <div className="h-9 w-9 rounded-md animate-pulse" style={{ backgroundColor: '#e2e8f0' }}></div>
                
                {/* User Profile Skeleton */}
                <UserProfile />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto" style={{ backgroundColor: '#f4f8f9' }} suppressHydrationWarning>
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" 
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className="fixed inset-y-0 left-0 z-50 w-64 bg-background lg:translate-x-0 lg:static lg:inset-0"
        style={{ boxShadow: '2px 0 8px #00000005' }}
        variants={sidebarVariants}
        animate={isDesktop ? "desktop" : sidebarOpen ? "open" : "closed"}
        initial={isDesktop ? "desktop" : "closed"}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4">
            <Link href="/dashboard" className="text-xl font-bold" style={{ paddingBlock: '6px' }}>
              ERP System
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item, index) => {
              const Icon = item.icon
              const hasSubmenu = item.submenu && item.submenu.length > 0
              const isExpanded = hasSubmenu ? isMenuExpanded(item.name) : false
              const isActive = item.href ? pathname === item.href : false
              
              // Enhanced logic for parent active state - includes edit sale pages and returns
              const isParentActive = hasSubmenu && item.submenu ? 
                // Special handling for Stock Movements under Logs
                (item.name === 'Logs' && pathname === '/logs/stock-movements') ||
                // Regular submenu matching
                (item.submenu.some(sub => pathname.startsWith(sub.href))) ||
                // Sales specific logic
                (item.name === 'Sales' && (pathname.startsWith('/sales/') && pathname.includes('/edit'))) ||
                (item.name === 'Sales' && pathname.startsWith('/sales/') && !pathname.includes('/add') && !pathname.includes('/customers') && !pathname.includes('/returns')) ||
                (item.name === 'Sales' && pathname.startsWith('/returns')) ||
                // Purchases specific logic
                (item.name === 'Purchases' && pathname.startsWith('/purchases/') && !pathname.includes('/add') && !pathname.includes('/suppliers')) ||
                // Products specific logic
                (item.name === 'Products' && pathname.startsWith('/products/') && !pathname.includes('/add') && !pathname.includes('/attributes') && !pathname.includes('/categories')) ||
                // Logs specific logic
                (item.name === 'Logs' && pathname.startsWith('/logs/') && !pathname.includes('/activity'))
                : false
              
              return (
                <div key={item.name}>
                  {hasSubmenu && item.submenu ? (
                    // Parent menu item with submenu
                    <div className="space-y-1">
                      <Link
                        href={item.href!}
                        onClick={(e) => {
                          // Navigate to the page
                          setSidebarOpen(false)
                          // Also expand the menu
                          toggleMenu(item.name)
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                          isActive || isParentActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
                        )}
                      >
                        <div className="flex items-center">
                          <Icon className="mr-3 h-5 w-5" />
                          {item.name}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Link>
                      
                      {/* Submenu items */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-6 space-y-1"
                          >
                            {item.submenu.map((subItem) => {
                              const SubIcon = subItem.icon
                              // Special handling for Returns submenu - match both /sales/returns and /returns routes
                              const isSubActive = subItem.name === 'Returns' 
                                ? (pathname.startsWith('/sales/returns') || pathname.startsWith('/returns'))
                                : pathname.startsWith(subItem.href)
                              
                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={cn(
                                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                                    isSubActive
                                      ? "bg-primary/20 text-primary border border-primary/30"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
                                  )}
                                >
                                  <SubIcon className="mr-3 h-4 w-4" />
                                  {subItem.name}
                                </Link>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    // Regular menu item
                    <Link
                      href={item.href!}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <header 
          className="sticky top-0 z-40 px-6 py-4 lg:px-8 transition-all duration-200"
          style={{ 
            backgroundColor: isSticky ? '#fff' : '#f4f8f9',
            boxShadow: isSticky ? '0 2px 8px #00000005' : 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search - moved to left */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-64 lg:w-96 focus:ring-0 focus:ring-offset-0 focus:shadow-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div>
                <Button variant="ghost" size="sm" className="relative" style={{ backgroundColor: '#d4dfe1' }}>
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs" />
                </Button>
              </div>

              {/* User Profile */}
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#f4f8f9' }} suppressHydrationWarning>
          {children}
        </main>
      </div>
    </div>
  )
}