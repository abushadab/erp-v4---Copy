"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Calendar,
  User,
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Users,
  MoreHorizontal,
  RotateCcw,
  Printer,
  CreditCard
} from "lucide-react"
import SalePaymentModal from "@/components/SalePaymentModal"
import { type SaleWithItems } from "@/lib/supabase/sales-client"
import { useSalesData } from "@/lib/hooks/useSalesData"
import { toast } from "sonner"

export default function SalesPage() {
  // Use the optimized hook for data fetching
  const { sales, isLoading, error, refetch } = useSalesData()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(['completed', 'returned', 'partially returned'])
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false)
  const [selectedSale, setSelectedSale] = React.useState<SaleWithItems | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  
  // Handle payment modal
  const handleMakePayment = (sale: SaleWithItems) => {
    setSelectedSale(sale)
    setPaymentModalOpen(true)
  }
  
  const handlePaymentCreated = () => {
    // Refresh the sales data
    refetch()
  }
  
  const handlePrint = (sale: SaleWithItems) => {
    // TODO: Implement print functionality
    toast.info('Print functionality coming soon!')
  }

  // Show error toast if there's an error
  React.useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.salesperson.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatuses.includes(sale.status || '')
    return matchesSearch && matchesStatus
  })

  // Pagination calculations
  const totalItems = filteredSales.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSales = filteredSales.slice(startIndex, endIndex)

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatuses])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'returned':
        return <XCircle className="h-4 w-4 text-gray-600" />
      case 'partially returned':
        return <Clock className="h-4 w-4 text-orange-600" />
      default:
        return <ShoppingCart className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      case 'returned':
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
      case 'partially returned':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 px-4 sm:px-6 lg:px-8 py-6" suppressHydrationWarning>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Table Skeleton */}
        <Card>
          {/* Mobile Card Skeletons for very small screens */}
          <div className="block sm:hidden">
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} style={{ backgroundColor: '#f4f8f9' }} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    
                    <div>
                      <Skeleton className="h-3 w-10 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    
                    <div>
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-4 w-18" />
                    </div>
                    
                    <div>
                      <Skeleton className="h-3 w-10 mb-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    
                    <div className="col-span-2">
                      <Skeleton className="h-3 w-12 mb-1" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    
                    <div className="col-span-2">
                      <Skeleton className="h-3 w-20 mb-1" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Table Skeleton for small screens and up */}
          <div className="hidden sm:block overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 px-4 sm:px-6 lg:px-8 py-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Track and manage your sales transactions
          </p>
        </div>
        <Link href="/sales/new">
          <Button size="sm" suppressHydrationWarning>
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-muted-foreground">
              All time sales count
            </p>
          </CardContent>
        </Card>
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total sales revenue
            </p>
          </CardContent>
        </Card>
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Sales</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales.filter(sale => sale.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
        <Card suppressHydrationWarning>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(sales.map(sale => sale.customer_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            suppressHydrationWarning
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" suppressHydrationWarning>
              <Filter className="mr-2 h-4 w-4" />
              Filter by Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent suppressHydrationWarning>
            <DropdownMenuLabel>Sale Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.includes('completed')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedStatuses([...selectedStatuses, 'completed'])
                } else {
                  setSelectedStatuses(selectedStatuses.filter(s => s !== 'completed'))
                }
              }}
            >
              Completed
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.includes('returned')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedStatuses([...selectedStatuses, 'returned'])
                } else {
                  setSelectedStatuses(selectedStatuses.filter(s => s !== 'returned'))
                }
              }}
            >
              Returned
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.includes('partially returned')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedStatuses([...selectedStatuses, 'partially returned'])
                } else {
                  setSelectedStatuses(selectedStatuses.filter(s => s !== 'partially returned'))
                }
              }}
            >
              Partially Returned
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
          setItemsPerPage(parseInt(value))
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[100px]" suppressHydrationWarning>
            <SelectValue />
          </SelectTrigger>
          <SelectContent suppressHydrationWarning>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Table */}
      <Card suppressHydrationWarning>
        {/* Mobile Card Layout for very small screens */}
        <div className="block sm:hidden">
          <div className="space-y-4 p-4">
            {currentSales.length > 0 ? (
              currentSales.map((sale) => (
                <Card key={sale.id} className="p-4" style={{ backgroundColor: '#f4f8f9' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-sm text-muted-foreground">Sale ID</div>
                      <div className="font-bold">{sale.id}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="bg-black hover:bg-gray-800 text-white hover:text-white"
                          suppressHydrationWarning
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" suppressHydrationWarning>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/sales/${sale.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Sale
                          </Link>
                        </DropdownMenuItem>
                        {sale.status === 'completed' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/returns?saleId=${sale.id}`}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Return
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handlePrint(sale)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMakePayment(sale)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Make Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Customer</div>
                      <div className="flex items-center space-x-1">
                        <UserCheck className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{sale.customer_name}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1">Date</div>
                      <div>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1">Amount</div>
                      <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground mb-1">Items</div>
                      <div className="flex items-center space-x-1">
                        <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                        <span>{sale.sale_items?.length || 0}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="text-muted-foreground mb-1">Status</div>
                      <Badge className={`flex items-center gap-1 w-fit ${getStatusColor(sale.status || '')}`}>
                        {getStatusIcon(sale.status || '')}
                        {sale.status}
                      </Badge>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="text-muted-foreground mb-1">Salesperson</div>
                      <div className="truncate">{sale.salesperson}</div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No sales found
              </div>
            )}
          </div>
        </div>

        {/* Table Layout for small screens and up */}
        <div className="hidden sm:block overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Sale ID</TableHead>
                <TableHead className="min-w-[150px]">Customer</TableHead>
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[80px]">Items</TableHead>
                <TableHead className="min-w-[120px]">Amount</TableHead>
                <TableHead className="min-w-[140px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Salesperson</TableHead>
                <TableHead className="text-right min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSales.length > 0 ? (
                currentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span>{sale.customer_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span>{sale.sale_items?.length || 0} items</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex items-center gap-1 w-fit ${getStatusColor(sale.status || '')}`}>
                        {getStatusIcon(sale.status || '')}
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sale.salesperson}</TableCell>
                    <TableCell className="text-right">
                                          <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0 bg-black hover:bg-gray-800 text-white hover:text-white"
                          suppressHydrationWarning
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" suppressHydrationWarning>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/sales/${sale.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Sale
                          </Link>
                        </DropdownMenuItem>
                        {sale.status === 'completed' && (
                          <DropdownMenuItem asChild>
                            <Link href={`/returns?saleId=${sale.id}`}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Return
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handlePrint(sale)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMakePayment(sale)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Make Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No sales found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground order-2 sm:order-1">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{' '}
            {totalItems} sales
          </div>
          <div className="flex items-center space-x-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              suppressHydrationWarning
              className="px-2 sm:px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                  // On mobile, show fewer pages
                  if (typeof window !== 'undefined' && window.innerWidth < 640) {
                    return page === currentPage || page === 1 || page === totalPages;
                  }
                  return showPage;
                })
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-1 sm:px-2 text-muted-foreground text-sm">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0 text-sm"
                      suppressHydrationWarning
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              suppressHydrationWarning
              className="px-2 sm:px-3"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Payment Modal */}
      {selectedSale && (
        <SalePaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setSelectedSale(null)
          }}
          saleId={selectedSale.id}
          customerName={selectedSale.customer_name}
          totalAmount={selectedSale.total_amount}
          amountPaid={(selectedSale as any).amount_paid || 0}
          sale={selectedSale}
          onPaymentCreated={handlePaymentCreated}
        />
      )}
    </div>
  )
}