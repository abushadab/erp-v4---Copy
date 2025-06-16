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
  Shield
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
      { name: 'Stock Movements', href: '/products/stock-movements', icon: RotateCcw },
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
  const supabase = createClient()

  React.useEffect(() => {
    setMounted(true)
    
    // Check if it's desktop size
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Auto-expand Sales menu if user is on any sales-related page
  React.useEffect(() => {
    if (pathname.startsWith('/sales/') || pathname.startsWith('/returns')) {
      setExpandedMenus(prev => prev.includes('Sales') ? prev : [...prev, 'Sales'])
    }
    if (pathname.startsWith('/purchases/') || pathname === '/products/stock-movements') {
      setExpandedMenus(prev => prev.includes('Purchases') ? prev : [...prev, 'Purchases'])
    }
    if (pathname.startsWith('/products/') && pathname !== '/products/stock-movements') {
      setExpandedMenus(prev => prev.includes('Products') ? prev : [...prev, 'Products'])
    }
    if (pathname.startsWith('/expenses/')) {
      setExpandedMenus(prev => prev.includes('Expenses') ? prev : [...prev, 'Expenses'])
    }
    if (pathname.startsWith('/accounts') || pathname.startsWith('/transactions')) {
      setExpandedMenus(prev => prev.includes('Accounts') ? prev : [...prev, 'Accounts'])
    }
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    )
  }

  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName)

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen bg-background">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-background border-r">
          <div className="flex flex-col h-full">
            {/* Logo Skeleton */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <Skeleton className="h-6 w-24" />
            </div>

            {/* Navigation Skeleton */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </nav>

            {/* User Section Skeleton */}
            <div className="border-t p-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar Skeleton */}
          <header className="bg-background border-b px-6 py-4 lg:px-8 h-16">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-5 lg:hidden" />
              <div className="flex items-center space-x-4 ml-auto">
                <Skeleton className="h-9 w-64 lg:w-96" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
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
        className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r lg:translate-x-0 lg:static lg:inset-0"
        variants={sidebarVariants}
        animate={isDesktop ? "desktop" : sidebarOpen ? "open" : "closed"}
        initial={isDesktop ? "desktop" : "closed"}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
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
                // Special handling for Stock Movements under Purchases
                (item.name === 'Purchases' && pathname === '/products/stock-movements') ||
                // Regular submenu matching (excluding stock movements for other menus)
                (item.name !== 'Purchases' && item.submenu.some(sub => pathname.startsWith(sub.href) && sub.href !== '/products/stock-movements')) ||
                (item.name === 'Purchases' && item.submenu.some(sub => pathname.startsWith(sub.href) && sub.href !== '/products/stock-movements')) ||
                // Sales specific logic
                (item.name === 'Sales' && (pathname.startsWith('/sales/') && pathname.includes('/edit'))) ||
                (item.name === 'Sales' && pathname.startsWith('/sales/') && !pathname.includes('/add') && !pathname.includes('/customers') && !pathname.includes('/returns')) ||
                (item.name === 'Sales' && pathname.startsWith('/returns')) ||
                // Purchases specific logic (excluding stock movements since it's handled above)
                (item.name === 'Purchases' && pathname.startsWith('/purchases/') && !pathname.includes('/add') && !pathname.includes('/suppliers')) ||
                // Products specific logic (excluding stock movements)
                (item.name === 'Products' && pathname.startsWith('/products/') && pathname !== '/products/stock-movements' && !pathname.includes('/add') && !pathname.includes('/attributes') && !pathname.includes('/categories'))
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

          {/* User section */}
          <UserProfile />
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top bar */}
        <header className="bg-background border-b px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-4 ml-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-64 lg:w-96 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Notifications */}
              <div>
                <Button variant="ghost" size="sm" className="relative hover:bg-muted transition-colors">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}