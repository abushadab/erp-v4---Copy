'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, UserCheck, Shield, Calendar } from "lucide-react"
import { type User as UserType } from '@/lib/types'

interface UserSummaryCardsProps {
  users: UserType[]
}

export function UserSummaryCards({ users }: UserSummaryCardsProps) {
  const summaryStats = React.useMemo(() => {
    const totalUsers = users.length
    const activeUsers = users.filter(user => user.status === 'active').length
    const adminUsers = users.filter(user => user.role === 'admin' || user.role === 'super_admin').length
    
    const recentLogins = users.filter(user => {
      if (!user.lastLogin) return false
      const lastLogin = new Date(user.lastLogin)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return lastLogin > oneDayAgo
    }).length

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      recentLogins
    }
  }, [users])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryStats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            All registered users
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryStats.activeUsers}</div>
          <p className="text-xs text-muted-foreground">
            Currently active accounts
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Administrators</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryStats.adminUsers}</div>
          <p className="text-xs text-muted-foreground">
            Admin level access
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summaryStats.recentLogins}</div>
          <p className="text-xs text-muted-foreground">
            Last 24 hours
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 