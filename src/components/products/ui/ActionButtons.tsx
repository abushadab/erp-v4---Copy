'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ActionButtonsProps {
  onSave: () => void
  loading: boolean
  disabled?: boolean
}

export function ActionButtons({ onSave, loading, disabled = false }: ActionButtonsProps) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={onSave}
          className="w-full"
          disabled={loading || disabled}
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => router.push('/products')}
          className="w-full"
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  )
}