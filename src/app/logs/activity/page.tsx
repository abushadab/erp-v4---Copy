"use client"

import * as React from "react"
import { Activity, Filter, Search, User, Calendar, Eye, Download, RefreshCw } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { getRecentActivities } from "@/lib/supabase/queries"

interface ActivityLog {
  id: string
  user_name: string | null
  user_email: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  description: string
  created_at: string
  ip_address?: string
  user_agent?: string
}

// Global cache and request deduplication to prevent duplicate API calls
const activityDataCache = {
  activities: [] as ActivityLog[],
  lastFetch: 0,
  currentRequest: null as Promise<ActivityLog[]> | null
}

const CACHE_DURATION = 30000 // 30 seconds

export default function ActivityLogsPage() {
  const [activities, setActivities] = React.useState<ActivityLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [filterAction, setFilterAction] = React.useState<string>("all")
  const [filterResourceType, setFilterResourceType] = React.useState<string>("all")
  const [selectedDate, setSelectedDate] = React.useState<string>("")

  // Refs to prevent duplicate calls
  const loadingRef = React.useRef(false)
  const dataLoadedRef = React.useRef(false)

  // Expose debug helper for the Activity page cache
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugActivityPageCache = () => {
        const now = Date.now()
        console.log('[debugActivityPageCache] Current time:', new Date(now).toISOString())
        console.table({
          hasData: Boolean(activityDataCache.activities.length > 0),
          dataLength: activityDataCache.activities.length,
          ageMs: now - activityDataCache.lastFetch,
          requestInFlight: Boolean(activityDataCache.currentRequest),
          loadingRefCurrent: loadingRef.current,
          dataLoadedRefCurrent: dataLoadedRef.current,
          componentLoading: loading
        })
        return activityDataCache
      }
    }
  }, [loading])

  // Load activities with deduplication
  const loadActivitiesWithDeduplication = React.useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    console.log('🔍 loadActivities called with forceRefresh:', forceRefresh)
    
    // Prevent duplicate calls
    if (loadingRef.current && !forceRefresh) {
      console.log('🔄 Activity data loading already in progress, skipping...')
      return
    }

    // Check cache first - only use cache if data exists and is fresh
    if (!forceRefresh && 
        activityDataCache.activities.length > 0 && 
        (now - activityDataCache.lastFetch) < CACHE_DURATION) {
      console.log('📦 Using cached activity data')
      setActivities(activityDataCache.activities)
      setLoading(false)
      dataLoadedRef.current = true
      return
    }

    // If there's already a request in progress, wait for it
    if (activityDataCache.currentRequest && !forceRefresh) {
      console.log('⏳ Request already in progress, waiting for existing promise...')
      try {
        loadingRef.current = true
        const cachedData = await activityDataCache.currentRequest
        setActivities(cachedData)
        setLoading(false)
        dataLoadedRef.current = true
      } catch (error) {
        console.error('⚠️ Error in concurrent request:', error)
      } finally {
        loadingRef.current = false
      }
      return
    }

    // Start fresh loading
    try {
      loadingRef.current = true
      setLoading(true)
      console.log('🔄 Loading fresh activity data...')

      const loadData = async (): Promise<ActivityLog[]> => {
        try {
          // Use the cached query function to get real database data
          const data = await getRecentActivities(100)
          
          // If we get an empty result but we have cached data, keep the cached data
          if ((!data || data.length === 0) && activityDataCache.activities.length > 0) {
            console.warn('⚠️ [ActivityPage] getRecentActivities returned empty, keeping cached data')
            return activityDataCache.activities
          }
          
          // Transform the database result to match our interface
          const transformedActivities: ActivityLog[] = data?.map((activity: any) => ({
            id: activity.id,
            user_name: activity.user_name,
            user_email: activity.user_email,
            action: activity.action,
            resource_type: activity.resource_type,
            resource_id: activity.resource_id,
            resource_name: activity.resource_name,
            description: activity.description,
            created_at: activity.created_at,
          })) || []
          
          return transformedActivities
        } catch (error) {
          console.error('Error loading activities:', error)
          // If we have cached data, return it; otherwise empty array
          if (activityDataCache.activities.length > 0) {
            console.warn('⚠️ [ActivityPage] Error loading activities, keeping cached data')
            return activityDataCache.activities
          }
          return []
        }
      }

      // Create and store the current request
      activityDataCache.currentRequest = loadData()
      const freshData = await activityDataCache.currentRequest

      // Update cache
      activityDataCache.activities = freshData
      activityDataCache.lastFetch = now
      activityDataCache.currentRequest = null

      setActivities(freshData)
      dataLoadedRef.current = true
      console.log('✅ Activity data loaded and cached')
    } catch (error) {
      console.error('Error loading activities:', error)
      setActivities([])
      activityDataCache.currentRequest = null
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  // Load activities on component mount - with duplicate prevention
  React.useEffect(() => {
    if (!dataLoadedRef.current && !loadingRef.current) {
      loadActivitiesWithDeduplication()
    }
  }, [loadActivitiesWithDeduplication])

  // Refresh function with cache clearing
  const handleRefresh = React.useCallback(async () => {
    // Clear cache and force refresh
    activityDataCache.activities = []
    activityDataCache.lastFetch = 0
    activityDataCache.currentRequest = null
    dataLoadedRef.current = false
    await loadActivitiesWithDeduplication(true)
  }, [loadActivitiesWithDeduplication])

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = filterAction === "all" || activity.action === filterAction
    const matchesResourceType = filterResourceType === "all" || activity.resource_type === filterResourceType
    
    const matchesDate = !selectedDate || activity.created_at.startsWith(selectedDate)
    
    return matchesSearch && matchesAction && matchesResourceType && matchesDate
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'login':
        return 'bg-purple-100 text-purple-800'
      case 'view':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getResourceTypeColor = (resourceType: string) => {
    switch (resourceType) {
      case 'product':
        return 'bg-orange-100 text-orange-800'
      case 'warehouse':
        return 'bg-indigo-100 text-indigo-800'
      case 'purchase':
        return 'bg-teal-100 text-teal-800'
      case 'sale':
        return 'bg-emerald-100 text-emerald-800'
      case 'customer':
        return 'bg-pink-100 text-pink-800'
      case 'supplier':
        return 'bg-cyan-100 text-cyan-800'
      case 'system':
        return 'bg-slate-100 text-slate-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-BD', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track all user activities and system events
          </p>
        </div>
        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger>
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="view">View</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterResourceType} onValueChange={setFilterResourceType}>
          <SelectTrigger>
            <SelectValue placeholder="All Resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="packaging">Packaging</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="supplier">Supplier</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          placeholder="Filter by date"
        />
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total Activities</p>
                <p className="text-2xl font-bold">{filteredActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Active Users</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredActivities.map(a => a.user_email).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Today's Activities</p>
                <p className="text-2xl font-bold">
                  {filteredActivities.filter(a => 
                    new Date(a.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Recent Logins</p>
                <p className="text-2xl font-bold">
                  {filteredActivities.filter(a => a.action === 'login').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Count */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredActivities.length} activit{filteredActivities.length !== 1 ? 'ies' : 'y'} found
          </p>
          <p className="text-xs text-muted-foreground hidden sm:block">
            ← Scroll horizontally to view all columns →
          </p>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {filteredActivities.length > 0 ? (
              <div className="overflow-x-auto max-w-full scrollbar-visible">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Date & Time</TableHead>
                        <TableHead className="w-[180px]">User</TableHead>
                        <TableHead className="w-[100px]">Action</TableHead>
                        <TableHead className="w-[140px]">Resource</TableHead>
                        <TableHead className="min-w-[200px]">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActivities
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((activity) => {
                          const { date, time } = formatDateTime(activity.created_at)
                          return (
                            <TableRow key={activity.id} className="hover:bg-gray-50">
                              <TableCell className="w-[140px]">
                                <div>
                                  <div className="font-medium text-sm">{date}</div>
                                  <div className="text-xs text-muted-foreground">{time}</div>
                                </div>
                              </TableCell>
                              <TableCell className="w-[180px]">
                                <div>
                                  <div className="font-medium text-sm">
                                    {activity.user_name || 'Unknown User'}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {activity.user_email}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="w-[100px]">
                                <Badge 
                                  className={getActionColor(activity.action)}
                                  variant="secondary"
                                >
                                  {activity.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="w-[140px]">
                                <div>
                                  <Badge 
                                    className={getResourceTypeColor(activity.resource_type)}
                                    variant="secondary"
                                  >
                                    {activity.resource_type}
                                  </Badge>
                                  {activity.resource_name && (
                                    <div className="text-xs text-muted-foreground mt-1 truncate">
                                      {activity.resource_name}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[200px]">
                                <div className="text-sm">{activity.description}</div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : loading ? (
              <div className="p-6">
                <div className="overflow-x-auto max-w-full scrollbar-visible">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">
                            <Skeleton className="h-4 w-24" />
                          </TableHead>
                          <TableHead className="w-[180px]">
                            <Skeleton className="h-4 w-20" />
                          </TableHead>
                          <TableHead className="w-[100px]">
                            <Skeleton className="h-4 w-16" />
                          </TableHead>
                          <TableHead className="w-[140px]">
                            <Skeleton className="h-4 w-20" />
                          </TableHead>
                          <TableHead className="min-w-[200px]">
                            <Skeleton className="h-4 w-32" />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell className="w-[140px]">
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </TableCell>
                            <TableCell className="w-[180px]">
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                            </TableCell>
                            <TableCell className="w-[100px]">
                              <Skeleton className="h-6 w-16" />
                            </TableCell>
                            <TableCell className="w-[140px]">
                              <div className="space-y-1">
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <Skeleton className="h-4 w-48" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No activities found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 