"use client"

import * as React from "react"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AnimatedCard } from "@/components/animations/animated-card"
import { AnimatedButton } from "@/components/animations/animated-button"
import { StaggerContainer, StaggerItem } from "@/components/animations/stagger-container"
import { PageWrapper } from "@/components/animations/page-wrapper"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign,
  AlertTriangle,
  Eye,
  Edit,
  MoreHorizontal
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  mockProducts, 
  mockSales, 
  mockReturns, 
  mockCustomers 
} from "@/lib/mock-data/erp-data"

export default function DashboardPage() {
  const [products] = React.useState(mockProducts)
  const [sales] = React.useState(mockSales)
  const [returns] = React.useState(mockReturns)
  const [customers] = React.useState(mockCustomers)

  // Calculate dashboard statistics
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0)
  const totalCustomers = customers.length
  const totalProducts = products.length
  const totalSales = sales.length
  const lowStockProducts = products.filter(product => product.stock <= 10)
  const recentSales = sales.slice(0, 5)
  const recentReturns = returns.slice(0, 3)

  return (
    <PageWrapper>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <StaggerContainer>
          <StaggerItem>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back! Here's what's happening with your business today.
                </p>
              </div>
              <AnimatedButton>
                <Plus className="mr-2 h-4 w-4" />
                Quick Actions
              </AnimatedButton>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Statistics Cards */}
        <StaggerContainer delay={0.05}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StaggerItem>
              <AnimatedCard>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
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
                  <div className="text-2xl font-bold">{totalCustomers}</div>
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
                  <div className="text-2xl font-bold">{totalProducts}</div>
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
                  <div className="text-2xl font-bold">{totalSales}</div>
                  <p className="text-xs text-muted-foreground">
                    <TrendingDown className="inline h-3 w-3 text-red-500 mr-1" />
                    -2.1% from last month
                  </p>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>
          </div>
        </StaggerContainer>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <StaggerContainer delay={0.1}>
            <StaggerItem>
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Low Stock Alert</AlertTitle>
                <AlertDescription className="text-orange-700">
                  {lowStockProducts.length} products are running low on stock. 
                  <AnimatedButton variant="link" className="p-0 h-auto ml-1 text-orange-800">
                    View products
                  </AnimatedButton>
                </AlertDescription>
              </Alert>
            </StaggerItem>
          </StaggerContainer>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Sales */}
          <StaggerContainer delay={0.15}>
            <StaggerItem>
              <AnimatedCard>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Latest sales transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentSales.map((sale, index) => (
                      <StaggerContainer key={sale.id} delay={0.05}>
                        <StaggerItem>
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Sale #{sale.id}</p>
                                                             <p className="text-xs text-muted-foreground">
                                 {sale.customerName} • {sale.date}
                               </p>
                             </div>
                             <div className="flex items-center space-x-2">
                               <div className="text-right">
                                 <div className="text-sm font-medium">${sale.totalAmount.toFixed(2)}</div>
                                <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                                  {sale.status}
                                </Badge>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Sale
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </StaggerItem>
                      </StaggerContainer>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>
          </StaggerContainer>

          {/* Recent Returns */}
          <StaggerContainer delay={0.2}>
            <StaggerItem>
              <AnimatedCard>
                <CardHeader>
                  <CardTitle>Recent Returns</CardTitle>
                  <CardDescription>Items returned by customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentReturns.map((returnItem, index) => (
                      <StaggerContainer key={returnItem.id} delay={0.05}>
                        <StaggerItem>
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Return #{returnItem.id}</p>
                                                             <p className="text-xs text-muted-foreground">
                                 {returnItem.customerName} • {returnItem.date}
                               </p>
                             </div>
                             <div className="flex items-center space-x-2">
                               <div className="text-right">
                                 <div className="text-sm font-medium">${returnItem.totalAmount.toFixed(2)}</div>
                                <Badge variant={
                                  returnItem.status === 'approved' ? 'default' :
                                  returnItem.status === 'pending' ? 'secondary' : 'destructive'
                                }>
                                  {returnItem.status}
                                </Badge>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Process Return
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </StaggerItem>
                      </StaggerContainer>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
            </StaggerItem>
          </StaggerContainer>
        </div>

        {/* Quick Actions */}
        <StaggerContainer delay={0.25}>
          <StaggerItem>
            <AnimatedCard>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <AnimatedButton variant="outline" className="h-20 flex-col">
                    <Plus className="h-6 w-6 mb-2" />
                    Add Product
                  </AnimatedButton>
                  <AnimatedButton variant="outline" className="h-20 flex-col">
                    <DollarSign className="h-6 w-6 mb-2" />
                    New Sale
                  </AnimatedButton>
                  <AnimatedButton variant="outline" className="h-20 flex-col">
                    <TrendingDown className="h-6 w-6 mb-2" />
                    Process Return
                  </AnimatedButton>
                  <AnimatedButton variant="outline" className="h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Add Customer
                  </AnimatedButton>
                </div>
              </CardContent>
            </AnimatedCard>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageWrapper>
  )
} 