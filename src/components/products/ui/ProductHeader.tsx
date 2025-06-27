'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProductHeaderProps {
  productId: string
  title?: string
  description?: string
}

export function ProductHeader({ 
  productId, 
  title = "Edit Product",
  description = "Update product information and settings"
}: ProductHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Link href="/products">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="text-sm">
        ID: {productId}
      </Badge>
    </div>
  )
}