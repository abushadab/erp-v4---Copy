"use client"

import * as React from "react"
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, Filter, Search, Package } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { type StockMovement } from "@/lib/mock-data/erp-data"

export default function StockMovementsPage() {
  const [movements, setMovements] = React.useState<StockMovement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [filterType, setFilterType] = React.useState<string>("all")
  const [filterDirection, setFilterDirection] = React.useState<string>("all")

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.referenceId.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === "all" || movement.movementType === filterType
    const matchesDirection = filterDirection === "all" || movement.direction === filterDirection
    
    return matchesSearch && matchesType && matchesDirection
  })

  const getMovementIcon = (direction: string) => {
    return direction === 'in' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getMovementColor = (direction: string) => {
    return direction === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-blue-100 text-blue-800'
      case 'return':
        return 'bg-orange-100 text-orange-800'
      case 'adjustment':
        return 'bg-purple-100 text-purple-800'
      case 'sale':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <motion.div
      className="container mx-auto px-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Link href="/logs/activity">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Logs
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground mt-2">
            Complete audit trail of all stock changes
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search movements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Movement Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="return">Return</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterDirection} onValueChange={setFilterDirection}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="in">Stock In</SelectItem>
            <SelectItem value="out">Stock Out</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Stock Movements Table */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Movement History
            </CardTitle>
            <CardDescription>
              {filteredMovements.length} movement{filteredMovements.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredMovements.length > 0 ? (
              <div className="space-y-4">
                {filteredMovements
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((movement) => (
                  <Card key={movement.id} className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Date & Time */}
                      <div className="flex-shrink-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Date</div>
                        <div className="text-sm font-medium">
                          {new Date(movement.createdAt).toLocaleDateString('en-BD', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(movement.createdAt).toLocaleTimeString('en-BD', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Product</div>
                        <div className="font-medium text-sm">{movement.productName}</div>
                        {movement.variationId && (
                          <div className="text-xs text-muted-foreground">
                            Variation: {movement.variationId}
                          </div>
                        )}
                      </div>

                      {/* Type & Direction */}
                      <div className="flex gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getTypeColor(movement.movementType)}`}
                          >
                            {movement.movementType}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Direction</div>
                          <div className="flex items-center gap-1">
                            {getMovementIcon(movement.direction)}
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getMovementColor(movement.direction)}`}
                            >
                              {movement.direction === 'in' ? 'In' : 'Out'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex-shrink-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Quantity</div>
                        <div className={`text-lg font-bold ${movement.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.direction === 'in' ? '+' : '-'}{movement.quantity}
                        </div>
                      </div>

                      {/* Stock Levels */}
                      <div className="hidden md:block flex-shrink-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Stock</div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{movement.previousStock}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{movement.newStock}</span>
                        </div>
                      </div>

                      {/* Reference */}
                      <div className="hidden lg:block flex-shrink-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Reference</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {movement.referenceId}
                        </Badge>
                      </div>
                    </div>

                    {/* Second Row - Additional Info */}
                    <div className="mt-4 pt-4 border-t border-border/50 flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Reason */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Reason</div>
                        <div className="text-sm text-muted-foreground">{movement.reason}</div>
                        {movement.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Note: {movement.notes}
                          </div>
                        )}
                      </div>

                      {/* Created By */}
                      <div className="flex-shrink-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Created By</div>
                        <div className="text-sm">{movement.createdBy}</div>
                      </div>

                      {/* Mobile Stock Levels */}
                      <div className="md:hidden">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Stock Change</div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{movement.previousStock}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{movement.newStock}</span>
                        </div>
                      </div>

                      {/* Mobile Reference */}
                      <div className="lg:hidden">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Reference</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {movement.referenceId}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No stock movements found</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchTerm || filterType !== "all" || filterDirection !== "all"
                    ? "Try adjusting your search or filters"
                    : "Stock movements will appear here when products are purchased, sold, or adjusted."
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
} 