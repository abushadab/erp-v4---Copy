'use client'

import React from 'react'
import { Package } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProductStatusMessagesProps {
  showSuccess: boolean
  errors: string[]
  validationErrors: string[]
}

export function ProductStatusMessages({ 
  showSuccess, 
  errors, 
  validationErrors 
}: ProductStatusMessagesProps) {
  const allErrors = [...errors, ...validationErrors]

  return (
    <>
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6">
          <Alert className="border-green-200 bg-green-50">
            <Package className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Product has been updated successfully! Redirecting...
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Error Messages */}
      {allErrors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <ul className="list-disc list-inside">
              {allErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}