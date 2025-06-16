"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Search, 
  Eye, 
  RotateCcw,
  Calendar,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  Receipt
} from "lucide-react"
import { getReturns, getReturnsBySaleId, getSaleById, type ReturnWithItems } from "@/lib/supabase/sales-client"
import { apiCache } from "@/lib/supabase/cache"
import { toast } from "sonner"

export default function ReturnsPage() {
  const searchParams = useSearchParams()
  const [returns, setReturns] = React.useState<ReturnWithItems[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [saleInfo, setSaleInfo] = React.useState<any>(null)
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

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded mb-4"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {saleId ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Link href="/sales/returns">
                  <Button variant="ghost" size="sm">
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
              <p className="text-muted-foreground">
                {returns.length === 0 
                  ? "No returns found for this sale" 
                  : `${returns.length} return${returns.length === 1 ? '' : 's'} found`
                }
              </p>
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

      {/* Success Alert */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="success">
              <AlertDescription>
                {successMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={saleId ? "Search returns for this sale..." : "Search returns..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredReturns.length)} of {filteredReturns.length} returns
        </div>
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {currentReturns.map((returnItem) => (
          <Card key={returnItem.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold">Return #{returnItem.id}</h3>
                      {returnItem.customer_name && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <User className="mr-1 h-3 w-3" />
                          {returnItem.customer_name}
                      </p>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                      {returnItem.status}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(returnItem.created_at)}
                    </div>
                    {!saleId && returnItem.sale_id && (
                    <div>
                        <Link 
                          href={`/sales/${returnItem.sale_id}`}
                          className="hover:text-primary transition-colors"
                        >
                          Original Sale: {returnItem.sale_id}
                        </Link>
                    </div>
                    )}
                    {returnItem.reason && (
                    <div className="flex items-center">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {returnItem.reason}
                    </div>
                    )}
                  </div>
                  
                  {returnItem.return_items && returnItem.return_items.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {returnItem.return_items.length} item{returnItem.return_items.length === 1 ? '' : 's'} returned
                    </div>
                  )}
                </div>

                <div className="text-right space-y-2">
                  <div className="text-2xl font-bold">৳{(returnItem.total_amount || 0).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">
                    Refund Amount
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/sales/returns/${returnItem.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
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
                      className="w-8 h-8 p-0"
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
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

      {filteredReturns.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12">
          <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No returns found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {saleId 
              ? "No returns have been processed for this sale yet"
              : searchTerm 
                ? "No returns match your search criteria" 
                : "No return requests have been submitted yet"
            }
          </p>
          {saleId && (
            <Link href={`/sales/${saleId!}`}>
              <Button variant="outline">
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