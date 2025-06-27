"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  TrendingUp,
  Building,
  CreditCard,
} from "lucide-react"

interface FinancialSummary {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
}

interface FinancialSummaryCardsProps {
  financialSummary: FinancialSummary
}

export function FinancialSummaryCards({ financialSummary }: FinancialSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            ৳{financialSummary.totalAssets.toFixed(2)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            ৳{financialSummary.totalLiabilities.toFixed(2)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">
            ৳{financialSummary.totalEquity.toFixed(2)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-xl sm:text-2xl font-bold ${
            financialSummary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ৳{financialSummary.netIncome.toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 