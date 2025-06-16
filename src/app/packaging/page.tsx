"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Box,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle
} from "lucide-react"
import { ViewPackagingModal } from "@/components/packaging/ViewPackagingModal"
import { getPackaging, DatabasePackaging, getTotalPackagingStock, invalidatePackagingCache, getAllPackagingWarehouseStock } from "@/lib/supabase/queries"
import { toast } from "sonner"

export default function PackagingPage() {
  const [packagingItems, setPackagingItems] = React.useState<DatabasePackaging[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(['active', 'inactive'])
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(['simple', 'variable'])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  
  // View Packaging Modal state
  const [selectedPackaging, setSelectedPackaging] = React.useState<DatabasePackaging | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false)

  // Deduplication cache and initial load tracker
  const initialLoadTriggered = React.useRef(false)
  const CACHE_DURATION = 30000 // 30 seconds
  
  const dataCache = React.useRef<{
    packagingItems: DatabasePackaging[]
    stockData: { [key: string]: number }
    lastFetch: number
    currentRequest: Promise<void> | null
  }>({
    packagingItems: [],
    stockData: {},
    lastFetch: 0,
    currentRequest: null
  })

  // Load packaging data with stock information and deduplication
  const loadPackagingWithStock = async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadPackagingWithStock called with forceRefresh:', forceRefresh)
    
    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        dataCache.current.packagingItems.length > 0 && 
        (now - dataCache.current.lastFetch) < CACHE_DURATION) {
      console.log('📦 Using cached packaging data')
      setPackagingItems(dataCache.current.packagingItems)
      setStockData(dataCache.current.stockData)
      setIsLoading(false)
      return
    }

    // If there's already a request in progress, wait for it
    if (dataCache.current.currentRequest) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        await dataCache.current.currentRequest
        // After the request completes, update state with cached data
        if (dataCache.current.packagingItems.length > 0) {
          console.log('📦 Using data from completed request')
          setPackagingItems(dataCache.current.packagingItems)
          setStockData(dataCache.current.stockData)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('⚠️ Error in concurrent request:', error)
      }
      return
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log('🔄 Fetching fresh packaging data from API')
        setIsLoading(true)
        
        const data = await getPackaging()
        
        // Batch load all stock data in one query to prevent duplicate API calls
        console.log('🔄 Fetching stock data for all packaging items...')
        const allStockData = await getAllPackagingWarehouseStock()
        
        // Create a map for quick stock lookups
        const batchStockMap = new Map<string, number>()
        
        if (allStockData) {
          allStockData.forEach((stock: any) => {
            const key = stock.variation_id 
              ? `${stock.packaging_id}-${stock.variation_id}`
              : stock.packaging_id
            const currentTotal = batchStockMap.get(key) || 0
            batchStockMap.set(key, currentTotal + (stock.current_stock || 0))
          })
        }
        
        // Calculate total stock for each packaging item using the batch-loaded data
        const packagingWithStock = data.map((packaging) => {
          try {
            let totalStock = 0
            
            if (packaging.type === 'simple') {
              totalStock = batchStockMap.get(packaging.id) || 0
            } else if (packaging.type === 'variable' && packaging.variations) {
              totalStock = packaging.variations.reduce((sum, variation) => {
                const variationStock = batchStockMap.get(`${packaging.id}-${variation.id}`) || 0
                return sum + variationStock
              }, 0)
            }
            
            return {
              ...packaging,
              totalStock
            }
          } catch (error) {
            console.error(`Error calculating stock for packaging ${packaging.id}:`, error)
            return {
              ...packaging,
              totalStock: 0
            }
          }
        })
        
        // Create stock data map for easy access
        const finalStockMap = packagingWithStock.reduce((acc, packaging) => {
          acc[packaging.id] = packaging.totalStock || 0
          return acc
        }, {} as { [key: string]: number })
        
        console.log('✅ Packaging data fetched successfully')
        
        // Update cache
        dataCache.current.packagingItems = packagingWithStock
        dataCache.current.stockData = finalStockMap
        dataCache.current.lastFetch = now
        
        // Update state
        setPackagingItems(packagingWithStock)
        setStockData(finalStockMap)
        
      } catch (error) {
        console.error('❌ Error loading packaging data:', error)
        toast.error('Failed to load packaging data')
        setPackagingItems([])
        setStockData({})
      } finally {
        console.log('🏁 Request completed, setting loading to false')
        setIsLoading(false)
        dataCache.current.currentRequest = null
      }
    })()

    // Store the request promise so other calls can wait for it
    dataCache.current.currentRequest = requestPromise
    
    // Wait for the request to complete
    await requestPromise
  }

  // Load initial data only once
  React.useEffect(() => {
    console.log('🚀 useEffect triggered - mounting component')
    if (!initialLoadTriggered.current) {
      console.log('🎯 First time loading - triggering data fetch')
      initialLoadTriggered.current = true
      loadPackagingWithStock(false)
    } else {
      console.log('⚠️ useEffect called again but initial load already triggered')
    }
  }, []) // Empty dependency array to run only once on mount

  const filteredPackaging = packagingItems.filter(packaging => {
    const matchesSearch = packaging.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (packaging.sku && packaging.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         packaging.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatuses.includes(packaging.status)
    const matchesType = selectedTypes.includes(packaging.type)
    return matchesSearch && matchesStatus && matchesType
  })

  // Pagination logic
  const totalItems = filteredPackaging.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPackaging = filteredPackaging.slice(startIndex, endIndex)

  const handleViewPackaging = (packaging: DatabasePackaging) => {
    setSelectedPackaging(packaging)
    setIsViewModalOpen(true)
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedPackaging(null)
  }

  const [stockData, setStockData] = React.useState<{ [key: string]: number }>({})

  const getStockDisplay = (packaging: DatabasePackaging) => {
    const stock = stockData[packaging.id] || 0
    
    if (stock === 0) {
      return (
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-red-100 text-red-800 hover:bg-red-200">
          out of stock
        </span>
      )
    }
    
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-green-600">
          {stock}
        </span>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Box className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 flex-1 max-w-md" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Table Skeleton */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
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
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packaging</h1>
          <p className="text-muted-foreground">
            Manage packaging options and variations for your products
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/packaging/attributes">
            <Button variant="outline">
              Packaging Attributes
            </Button>
          </Link>
          <Link href="/packaging/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Packaging
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search packaging..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter by Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Packaging Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.includes('active')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedStatuses([...selectedStatuses, 'active'])
                } else {
                  setSelectedStatuses(selectedStatuses.filter(s => s !== 'active'))
                }
              }}
            >
              Active
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.includes('inactive')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedStatuses([...selectedStatuses, 'inactive'])
                } else {
                  setSelectedStatuses(selectedStatuses.filter(s => s !== 'inactive'))
                }
              }}
            >
              Inactive
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter by Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Packaging Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes('simple')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedTypes([...selectedTypes, 'simple'])
                } else {
                  setSelectedTypes(selectedTypes.filter(t => t !== 'simple'))
                }
              }}
            >
              Simple
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes('variable')}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedTypes([...selectedTypes, 'variable'])
                } else {
                  setSelectedTypes(selectedTypes.filter(t => t !== 'variable'))
                }
              }}
            >
              Variable
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
          setItemsPerPage(parseInt(value))
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Packaging Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {paginatedPackaging.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Packaging</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPackaging.map((packaging) => (
                    <TableRow key={packaging.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{packaging.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {packaging.id}
                            <span className="sm:hidden ml-2">
                              • {packaging.type === 'simple' ? 'Simple' : `Variable (${packaging.variations?.length || 0})`}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {packaging.type === 'simple' ? 'Simple' : 'Variable'}
                        </Badge>
                        {packaging.type === 'variable' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {packaging.variations?.length || 0} variants
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={packaging.status === 'active' ? 'default' : 'secondary'}>
                          {packaging.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStockDisplay(packaging)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(packaging.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => handleViewPackaging(packaging)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Link href={`/packaging/edit/${packaging.id}`}>
                            <Button variant="ghost" size="sm" className="cursor-pointer">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            ) : (
              <div className="text-center py-12">
                <Box className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No packaging found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || selectedStatuses.length < 2 || selectedTypes.length < 2
                    ? "Try adjusting your search or filters" 
                    : "Get started by adding your first packaging"}
                </p>
                <Link href="/packaging/add">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Packaging
                  </Button>
                </Link>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paginatedPackaging.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} packaging items
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Packaging Modal */}
      <ViewPackagingModal
        packaging={selectedPackaging}
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
      />
    </div>
  )
}