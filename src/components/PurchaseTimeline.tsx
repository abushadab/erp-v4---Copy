import * as React from "react"
import { motion } from "framer-motion"
import { Calendar, Package, Truck, Clock, CheckCircle, RotateCcw, X, AlertTriangle, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type PurchaseEvent } from "@/lib/supabase/purchases"

interface PurchaseTimelineProps {
  events: PurchaseEvent[]
  isLoading?: boolean
}

export function PurchaseTimeline({ events, isLoading }: PurchaseTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Order Timeline
          </CardTitle>
          <CardDescription>Track the progress of your purchase order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getEventIcon = (eventType: PurchaseEvent['event_type']) => {
    switch (eventType) {
      case 'order_placed':
        return <CheckCircle className="h-4 w-4 text-white" />
      case 'partial_receipt':
      case 'full_receipt':
        return <Package className="h-4 w-4 text-white" />
      case 'partial_return':
      case 'full_return':
        return <RotateCcw className="h-4 w-4 text-white" />
      case 'payment_made':
        return <DollarSign className="h-4 w-4 text-white" />
      case 'payment_voided':
        return <X className="h-4 w-4 text-white" />
      case 'balance_resolved':
        return <CheckCircle className="h-4 w-4 text-white" />
      case 'cancelled':
        return <X className="h-4 w-4 text-white" />
      default:
        return <Clock className="h-4 w-4 text-white" />
    }
  }

  const getEventColor = (eventType: PurchaseEvent['event_type']) => {
    switch (eventType) {
      case 'order_placed':
        return 'bg-blue-600'
      case 'partial_receipt':
        return 'bg-green-600'
      case 'full_receipt':
        return 'bg-green-700'
      case 'partial_return':
        return 'bg-orange-600'
      case 'full_return':
        return 'bg-red-600'
      case 'payment_made':
        return 'bg-purple-600'
      case 'payment_voided':
        return 'bg-red-700'
      case 'balance_resolved':
        return 'bg-yellow-600'
      case 'cancelled':
        return 'bg-red-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getStatusBadge = (eventType: PurchaseEvent['event_type'], newStatus?: string) => {
    const badgeClass = () => {
      switch (eventType) {
        case 'order_placed':
          return 'bg-yellow-100 text-yellow-800'
        case 'partial_receipt':
          return 'bg-blue-100 text-blue-800'
        case 'full_receipt':
          return 'bg-green-100 text-green-800'
        case 'partial_return':
          return 'bg-orange-100 text-orange-800'
        case 'full_return':
          return 'bg-red-100 text-red-800'
        case 'payment_made':
          return 'bg-purple-100 text-purple-800'
        case 'payment_voided':
          return 'bg-red-100 text-red-800'
        case 'balance_resolved':
          return 'bg-yellow-100 text-yellow-800'
        case 'cancelled':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const statusText = () => {
      switch (eventType) {
        case 'order_placed':
          return 'Pending'
        case 'partial_receipt':
          return 'Partially Received'
        case 'full_receipt':
          return 'Received'
        case 'partial_return':
          return 'Partially Returned'
        case 'full_return':
          return 'Returned'
        case 'payment_made':
          return newStatus === 'paid' ? 'Paid' : newStatus === 'partial' ? 'Partially Paid' : newStatus === 'overpaid' ? 'Overpaid' : 'Payment Made'
        case 'payment_voided':
          return 'Payment Voided'
        case 'balance_resolved':
          return 'Pending'
        case 'cancelled':
          return 'Cancelled'
        default:
          return newStatus?.replace('_', ' ') || 'Unknown'
      }
    }

    return (
      <Badge variant="secondary" className={`text-xs ${badgeClass()}`}>
        {statusText()}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return '৳ ' + new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Order Timeline
          </CardTitle>
          <CardDescription>Track the progress of your purchase order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-muted-foreground">No timeline events found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Order Timeline
        </CardTitle>
        <CardDescription>Track the progress of your purchase order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-6 bottom-6 w-px bg-gray-200"></div>
          
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              className="flex items-start gap-4 relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              {/* Event Icon */}
              <div className={`w-8 h-8 ${getEventColor(event.event_type)} rounded-full flex items-center justify-center relative z-10 flex-shrink-0`}>
                {getEventIcon(event.event_type)}
              </div>

              {/* Event Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{event.event_title}</h4>
                    {event.event_description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {event.event_description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {getStatusBadge(event.event_type, event.new_status)}
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(event.event_date)}
                  </p>

                  {/* Affected Items Count */}
                  {event.affected_items_count !== undefined && event.affected_items_count > 0 && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {event.affected_items_count} item{event.affected_items_count !== 1 ? 's' : ''} affected
                      </span>
                      {event.total_items_count && (
                        <span>
                          out of {event.total_items_count} total
                        </span>
                      )}
                    </div>
                  )}

                  {/* Return Amount */}
                  {event.return_amount && event.return_amount > 0 && (
                    <div className="text-xs text-red-600 font-medium">
                      Return Amount: {formatCurrency(event.return_amount)}
                    </div>
                  )}

                  {/* Payment Amount */}
                  {event.payment_amount && event.payment_amount > 0 && (
                    <div className="text-xs text-purple-600 font-medium">
                      Payment Amount: {formatCurrency(event.payment_amount)}
                      {event.payment_method && (
                        <span className="text-gray-500 ml-2">
                          via {event.payment_method.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Payment ID */}
                  {event.payment_id && (
                    <div className="text-xs text-gray-500">
                      Payment ID: {event.payment_id}
                    </div>
                  )}

                  {/* Return Reason */}
                  {event.return_reason && (
                    <div className="mt-2 p-2 bg-orange-50 rounded text-xs border-l-2 border-orange-200">
                      <span className="font-medium text-orange-800">Return reason: </span>
                      <span className="text-orange-700">{event.return_reason}</span>
                    </div>
                  )}

                  {/* Created By */}
                  {event.created_by && event.created_by !== 'system' && (
                    <div className="text-xs text-muted-foreground">
                      by {event.created_by}
                    </div>
                  )}

                  {/* Status Change */}
                  {event.previous_status && event.new_status && event.previous_status !== event.new_status && (
                    <div className="text-xs text-muted-foreground">
                      Status changed from <span className="font-medium">{event.previous_status.replace('_', ' ')}</span> to{' '}
                      <span className="font-medium">{event.new_status.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 