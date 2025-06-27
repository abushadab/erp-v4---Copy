"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AccountsLoadingSkeleton() {
  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Loading Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-40" />
          <Skeleton className="h-3 sm:h-4 w-48 sm:w-60 mt-2" />
        </div>
        <div className="flex flex-row space-x-2">
          <Skeleton className="h-9 flex-1 sm:w-20 sm:flex-initial" />
          <Skeleton className="h-9 flex-1 sm:w-32 sm:flex-initial" />
        </div>
      </div>

      {/* Loading Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-16 sm:w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading Content */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 sm:h-6 w-28 sm:w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 sm:w-24 flex-shrink-0" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#f4f8f9] rounded-lg p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 