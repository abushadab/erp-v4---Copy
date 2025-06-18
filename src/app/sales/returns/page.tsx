"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Search, 
  Eye, 
  RotateCcw,
  Calendar,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  ArrowLeft,
  Receipt,
  Package
} from "lucide-react"
import { getReturns, getReturnsBySaleId, getSaleById, type ReturnWithItems } from "@/lib/supabase/sales-client"
import { apiCache } from "@/lib/supabase/cache"
import { toast } from "sonner"

function ReturnsPageContent() {
  const searchParams = useSearchParams()
  const [returns, setReturns] = React.useState<ReturnWithItems[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [saleInfo, setSaleInfo] = React.useState<any>(null)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const itemsPerPage = 10
  
  // Get saleId from URL parameters
  const saleId = searchParams.get('saleId')

  // Check for success message in URL params
  React.useEffect(() => {
    const success = searchParams.get('success')
    if (success) {
      setSuccessMessage(decodeURIComponent(success))
      // Clear the message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    }
  }, [searchParams])

  // Fetch returns data
  React.useEffect(() => {
    const fetchReturns = async () => {
      try {
        setLoading(true)
        
        if (saleId) {
          // Use cache for returns by sale ID and sale data
          const [returnsData, saleData] = await Promise.all([
            apiCache.get(`returns-by-sale-${saleId!}`, () => getReturnsBySaleId(saleId!)),
            apiCache.get(`sale-${saleId!}`, () => getSaleById(saleId!)).catch(() => null) // Don't fail if sale not found
          ])
          setReturns(returnsData)
          setSaleInfo(saleData?.sale || null)
        } else {
          // Use cache for all returns
          const returnsData = await apiCache.get('all-returns', () => getReturns())
          setReturns(returnsData)
          setSaleInfo(null)
        }
      } catch (error) {
        console.error('Error fetching returns:', error)
        toast.error('Failed to load returns')
      } finally {
        setLoading(false)
      }
    }

    fetchReturns()
  }, [saleId])

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.sale_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentReturns = filteredReturns.slice(startIndex, endIndex)

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  const toggleRowExpansion = (returnId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(returnId)) {
      newExpanded.delete(returnId)
    } else {
      newExpanded.add(returnId)
    }
    setExpandedRows(newExpanded)
  }
  
  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Skeleton className="h-4 w-4" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-32" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {saleId ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Link href="/sales/returns">
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    All Returns
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Returns for Sale #{saleId}
              </h1>
              {saleInfo && (
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Receipt className="mr-1 h-3 w-3" />
                    Sale Date: {formatDate(saleInfo.created_at)}
                  </div>
                  <div>
                    Total: ৳{saleInfo.total_amount?.toFixed(2)}
                  </div>
                  {saleInfo.customer_name && (
                    <div className="flex items-center">
                      <User className="mr-1 h-3 w-3" />
                      {saleInfo.customer_name}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
              <p className="text-muted-foreground">
                Manage product returns and refund requests
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredReturns.length}</div>
            <p className="text-xs text-muted-foreground">
              {saleId ? "for this sale" : "across all sales"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Returns</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredReturns.filter(r => r.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              successfully processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredReturns.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              awaiting review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{filteredReturns.reduce((sum, r) => sum + (r.total_amount || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              refund amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <Alert variant="success">
          <AlertDescription>
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder={saleId ? "Search returns for this sale..." : "Search returns..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Return / Customer</TableHead>
                  <TableHead>Original Sale</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {saleId 
                        ? "No returns found for this sale" 
                        : searchTerm 
                          ? "No returns match your search criteria" 
                          : "No return requests have been submitted yet"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  currentReturns.map((returnItem) => {
                    const isExpanded = expandedRows.has(returnItem.id);
                    const hasItems = returnItem.return_items && returnItem.return_items.length > 0;
                    
                    return (
                      <React.Fragment key={returnItem.id}>
                        <TableRow className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            {hasItems && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 cursor-pointer"
                                onClick={() => toggleRowExpansion(returnItem.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">Return #{returnItem.id}</div>
                              {returnItem.customer_name && (
                                <div className="text-sm text-muted-foreground flex items-center">
                                  <User className="mr-1 h-3 w-3" />
                                  {returnItem.customer_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {!saleId && returnItem.sale_id ? (
                              <div className="text-sm">
                                <Link 
                                  href={`/sales/${returnItem.sale_id}`}
                                  className="text-primary hover:underline flex items-center"
                                >
                                  <Receipt className="mr-1 h-3 w-3" />
                                  {returnItem.sale_id}
                                </Link>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(returnItem.status || 'pending')}>
                              {returnItem.status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Calendar className="mr-1 h-3 w-3" />
                              {formatDate(returnItem.created_at || new Date().toISOString())}
                            </div>
                          </TableCell>
                          <TableCell>
                            {returnItem.reason && (
                              <div className="flex items-center text-sm">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                {returnItem.reason}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/sales/returns/${returnItem.id}`}>
                              <Button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 cursor-pointer">
                                <Eye />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expandable Items Section */}
                        {isExpanded && hasItems && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-gray-50 p-0">
                              <div className="p-4">
                                <h4 className="font-medium mb-3 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Return Items ({returnItem.return_items.length})
                                </h4>
                                <div className="space-y-2">
                                  {returnItem.return_items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          <div className="flex-1">
                                            <div className="font-medium text-sm">{item.product_name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                              <span>Qty: {item.quantity}</span>
                                              {item.product_sku && <span>• SKU: {item.product_sku}</span>}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <div className="font-medium text-sm">{formatCurrency(item.price * item.quantity)}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {formatCurrency(item.price)} each
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredReturns.length)} of {filteredReturns.length} returns
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8 h-8 p-0 cursor-pointer"
                    >
                      {page}
                    </Button>
                  )
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return (
                    <span key={page} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )
                }
                return null
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State - Only show when not using table view */}
      {filteredReturns.length === 0 && !searchTerm && (
        <Card className="flex flex-col items-center justify-center py-12 mt-6">
          <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No returns found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {saleId 
              ? "No returns have been processed for this sale yet"
              : "No return requests have been submitted yet"
            }
          </p>
          {saleId && (
            <Link href={`/sales/${saleId}`}>
              <Button variant="outline" className="cursor-pointer">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Sale
              </Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  )
}

export default function ReturnsPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ReturnsPageContent />
    </React.Suspense>
  )
}